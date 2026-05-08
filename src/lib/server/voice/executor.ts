import "server-only";

import { loadHomeAssistantConfig } from "@/lib/server/ha/config";
import { loadSystemConfig } from "@/lib/server/system/config";
import { buildGeminiClient, buildFunctionDeclarations } from "./gemini";
import { buildToolRegistry } from "./tools/registry";
import { vlog } from "./log";
import type {
  VoiceTool,
  ToolContext,
  ExecutedAction,
  ClientDirective,
} from "./tools/types";

export interface VoiceContext {
  devices: Array<{
    entityId: string;
    name: string;
    type: string;
    roomName: string;
    isOn: boolean;
    value?: number;
    temperature?: number;
    targetTemperature?: number;
    isLocked?: boolean;
  }>;
  rooms: Array<{ id: string; name: string }>;
  scenes: Array<{ entityId: string; name: string }>;
}

export interface VoiceResponse {
  userText: string;
  text: string;
  actionsExecuted: ExecutedAction[];
  clientDirectives: ClientDirective[];
}

function buildSystemPrompt(ctx: VoiceContext): string {
  const deviceList = (ctx.devices || [])
    .map((d) => {
      const parts = [`${d.name} (${d.entityId}): ${d.isOn ? "on" : "off"}`];
      if (typeof d.value === "number") parts.push(`brightness ${d.value}%`);
      if (typeof d.temperature === "number") parts.push(`temp ${d.temperature}°C`);
      if (typeof d.targetTemperature === "number") parts.push(`target ${d.targetTemperature}°C`);
      if (typeof d.isLocked === "boolean") parts.push(d.isLocked ? "locked" : "unlocked");
      return `  - ${parts.join(", ")} [room: ${d.roomName}]`;
    })
    .join("\n");

  const sceneList = (ctx.scenes || [])
    .map((s) => `  - ${s.name} (${s.entityId})`)
    .join("\n");

  return [
    "You are a smart home assistant built into a household kiosk running on a Raspberry Pi.",
    "Respond in 1–2 concise sentences. Confirm what you did or explain why you cannot.",
    "Use entity IDs exactly as listed below — never invent entity IDs.",
    "",
    "Current devices and their states:",
    deviceList || "  (no devices available)",
    "",
    "Available scenes:",
    sceneList || "  (no scenes available)",
    "",
    "Available capabilities: control smart home devices, adjust display brightness/power,",
    "navigate the kiosk UI screens, show images, and search the web for current information.",
    "Use web_search for: weather, news, sports scores, general knowledge, anything needing real-time data.",
  ].join("\n");
}

async function runGroundedSearch(
  genAI: ReturnType<typeof buildGeminiClient>,
  query: string
): Promise<string> {
  try {
    vlog.info("gemini", `Google Search grounding: "${query}"`);
    const searchModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // @ts-expect-error runtime-valid
      tools: [{ googleSearch: {} }],
    });
    const result = await searchModel.generateContent(query);
    const text = result.response.text().trim();
    return text || "No results found.";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vlog.error("error", `Grounded search failed: ${msg}`);
    return `Search failed: ${msg}`;
  }
}

export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string
): Promise<string> {
  try {
    const genAI = buildGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      {
        text: [
          "Transcribe this audio utterance in plain text.",
          "Return only the transcript with no commentary.",
          "If speech is unclear, return an empty string.",
        ].join(" "),
      },
      { inlineData: { data: audioBase64, mimeType } },
    ]);
    return result.response.text().trim();
  } catch {
    return "";
  }
}

interface ConversationExecutionResult {
  text: string;
  actionsExecuted: ExecutedAction[];
  clientDirectives: ClientDirective[];
  iterations: number;
}

async function executeConversation(
  userMessage: string,
  voiceContext: VoiceContext
): Promise<ConversationExecutionResult> {
  const [haConfig, systemConfig] = await Promise.all([
    loadHomeAssistantConfig().catch(() => null),
    loadSystemConfig(),
  ]);

  const toolCtx: ToolContext = { haConfig, systemConfig };
  const tools = buildToolRegistry();
  const functionDeclarations = buildFunctionDeclarations(tools);
  const toolMap = new Map<string, VoiceTool>(tools.map((t) => [t.name, t]));

  const genAI = buildGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(voiceContext),
    tools: [{ functionDeclarations }],
  });

  const chat = model.startChat();
  let result = await chat.sendMessage([{ text: userMessage }]);

  const firstParts = result.response.candidates?.[0]?.content?.parts ?? [];
  const firstFcCount = firstParts.filter((p) => p.functionCall != null).length;
  const firstText = firstParts.find((p) => p.text)?.text?.slice(0, 120);
  vlog.info("gemini", "First text-turn response", {
    toolCallsRequested: firstFcCount,
    textPreview: firstText ?? "(none)",
    finishReason: result.response.candidates?.[0]?.finishReason,
  });

  const actionsExecuted: ExecutedAction[] = [];
  const clientDirectives: ClientDirective[] = [];

  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations += 1;
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const functionCallParts = parts.filter((p) => p.functionCall != null);

    if (functionCallParts.length === 0) break;

    const toolResults = await Promise.all(
      functionCallParts.map(async (part) => {
        const fc = part.functionCall!;
        const args = (fc.args ?? {}) as Record<string, unknown>;

        if (fc.name === "web_search") {
          const query = (args.query as string | undefined) ?? "";
          const searchResult = await runGroundedSearch(genAI, query);
          actionsExecuted.push({
            tool: "web_search",
            args,
            success: true,
            message: searchResult,
          });
          return {
            name: "web_search",
            result: { success: true, message: searchResult },
          };
        }

        const tool = toolMap.get(fc.name);
        if (!tool) {
          return {
            name: fc.name,
            result: { success: false, message: `Unknown tool: ${fc.name}` },
          };
        }

        const toolResult = await tool.execute(args, toolCtx);

        if (toolResult.clientDirective) {
          clientDirectives.push(toolResult.clientDirective);
        }

        actionsExecuted.push({
          tool: fc.name,
          args,
          success: toolResult.success,
          message: toolResult.message,
        });

        return {
          name: fc.name,
          result: toolResult,
        };
      })
    );

    result = await chat.sendMessage(
      toolResults.map((entry) => ({
        functionResponse: {
          name: entry.name,
          response: { result: entry.result.message },
        },
      }))
    );
  }

  const finalParts = result.response.candidates?.[0]?.content?.parts ?? [];
  const text =
    finalParts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join(" ")
      .trim() || "Done.";

  return {
    text,
    actionsExecuted,
    clientDirectives,
    iterations,
  };
}

export async function runVoiceTextConversationTurn(
  userText: string,
  voiceContext: VoiceContext
): Promise<VoiceResponse> {
  const turnStart = Date.now();
  const normalizedUserText = userText.trim();

  vlog.info("session", "Text turn started", {
    userText: normalizedUserText.slice(0, 160),
  });

  const execution = await executeConversation(normalizedUserText, voiceContext);

  vlog.info("session", `Text turn complete (${Date.now() - turnStart}ms)`, {
    userText: normalizedUserText.slice(0, 120),
    text: execution.text.slice(0, 200),
    toolRounds: execution.iterations,
    actionsExecuted: execution.actionsExecuted.length,
    clientDirectives: execution.clientDirectives.length,
  });

  return {
    userText: normalizedUserText,
    text: execution.text,
    actionsExecuted: execution.actionsExecuted,
    clientDirectives: execution.clientDirectives,
  };
}

export async function runVoiceConversationTurn(
  audioBase64: string,
  mimeType: string,
  voiceContext: VoiceContext
): Promise<VoiceResponse> {
  const turnStart = Date.now();
  const estimatedBytes = Math.round(audioBase64.length * 0.75);

  vlog.info("session", "Audio turn started", { mimeType, audioBytes: estimatedBytes });

  const userText = await transcribeAudioWithGemini(audioBase64, mimeType);

  if (!userText.trim()) {
    vlog.warn("audio", "Gemini transcription came back empty", {
      mimeType,
      estimatedBytes,
    });

    return {
      userText: "",
      text: "I couldn't hear you clearly. Please try again.",
      actionsExecuted: [],
      clientDirectives: [],
    };
  }

  const textTurn = await runVoiceTextConversationTurn(userText, voiceContext);

  vlog.info("session", `Audio turn complete (${Date.now() - turnStart}ms)`);
  return textTurn;
}
