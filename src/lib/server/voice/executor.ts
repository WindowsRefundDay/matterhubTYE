import "server-only";

import { loadHomeAssistantConfig } from "@/lib/server/ha/config";
import { loadSystemConfig } from "@/lib/server/system/config";
import { buildGeminiClient, buildFunctionDeclarations } from "./gemini";
import { buildToolRegistry } from "./tools/registry";
import { vlog } from "./log";
import type { VoiceTool, ToolContext, ExecutedAction, ClientDirective } from "./tools/types";

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
  const deviceList = ctx.devices
    .map((d) => {
      const parts = [`${d.name} (${d.entityId}): ${d.isOn ? "on" : "off"}`];
      if (typeof d.value === "number") parts.push(`brightness ${d.value}%`);
      if (typeof d.temperature === "number") parts.push(`temp ${d.temperature}°C`);
      if (typeof d.targetTemperature === "number") parts.push(`target ${d.targetTemperature}°C`);
      if (typeof d.isLocked === "boolean") parts.push(d.isLocked ? "locked" : "unlocked");
      return `  - ${parts.join(", ")} [room: ${d.roomName}]`;
    })
    .join("\n");

  const sceneList = ctx.scenes
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
      // @ts-expect-error — googleSearch is valid at runtime but not yet typed in this SDK version
      tools: [{ googleSearch: {} }],
    });
    const result = await searchModel.generateContent(query);
    const text = result.response.text().trim();
    const queries = (result.response.candidates?.[0] as unknown as {
      groundingMetadata?: { webSearchQueries?: string[] };
    })?.groundingMetadata?.webSearchQueries;
    if (queries?.length) {
      vlog.info("gemini", `Search queries used: ${queries.join(", ")}`);
    }
    return text || "No results found.";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vlog.error("error", `Grounded search failed: ${msg}`);
    return `Search failed: ${msg}`;
  }
}

async function transcribeUserAudio(
  genAI: ReturnType<typeof buildGeminiClient>,
  audioBase64: string,
  mimeType: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });
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

export async function runVoiceConversationTurn(
  audioBase64: string,
  mimeType: string,
  voiceContext: VoiceContext
): Promise<VoiceResponse> {
  const turnStart = Date.now();
  vlog.info("session", "Turn started", { mimeType, audioBytes: Math.round(audioBase64.length * 0.75) });

  const [haConfig, systemConfig] = await Promise.all([
    loadHomeAssistantConfig().catch((e) => {
      vlog.warn("session", "HA config unavailable — tool calls will use mock mode", { error: String(e) });
      return null;
    }),
    loadSystemConfig(),
  ]);

  vlog.info("audio", "Audio received", {
    mimeType,
    estimatedBytes: Math.round(audioBase64.length * 0.75),
    deviceCount: voiceContext.devices.length,
    sceneCount: voiceContext.scenes.length,
  });

  const toolCtx: ToolContext = { haConfig, systemConfig };
  const tools = buildToolRegistry();
  const functionDeclarations = buildFunctionDeclarations(tools);
  const toolMap = new Map<string, VoiceTool>(tools.map((t) => [t.name, t]));

  vlog.info("gemini", `Sending audio to gemini-2.5-flash (${tools.length} tools registered)`);

  const genAI = buildGeminiClient();
  const userTextPromise = transcribeUserAudio(genAI, audioBase64, mimeType);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildSystemPrompt(voiceContext),
    tools: [{ functionDeclarations }],
    // AUTO is the default — Gemini decides when to call tools vs respond directly
  });

  const chat = model.startChat();

  let result = await chat.sendMessage([
    { inlineData: { data: audioBase64, mimeType } },
  ]);

  const firstResponseMs = Date.now() - turnStart;
  const firstParts = result.response.candidates?.[0]?.content?.parts ?? [];
  const firstFcCount = firstParts.filter((p) => p.functionCall != null).length;
  const firstText = firstParts.find((p) => p.text)?.text?.slice(0, 120);

  vlog.info("gemini", `First response received (${firstResponseMs}ms)`, {
    toolCallsRequested: firstFcCount,
    textPreview: firstText ?? "(none)",
    finishReason: result.response.candidates?.[0]?.finishReason,
  });

  const actionsExecuted: ExecutedAction[] = [];
  const clientDirectives: ClientDirective[] = [];

  // Tool call loop — Gemini may chain multiple rounds of tool calls
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const functionCallParts = parts.filter((p) => p.functionCall != null);

    if (functionCallParts.length === 0) break;

    vlog.info("tool", `Round ${iterations}: executing ${functionCallParts.length} tool call(s)`, {
      tools: functionCallParts.map((p) => p.functionCall!.name),
    });

    // Execute all tool calls in parallel
    const toolResults = await Promise.all(
      functionCallParts.map(async (part) => {
        const fc = part.functionCall!;
        const args = (fc.args ?? {}) as Record<string, unknown>;

        // web_search is handled specially — run a separate Gemini call with
        // Google Search grounding (can't combine grounding + function calling).
        if (fc.name === "web_search") {
          const query = (args.query as string | undefined) ?? "";
          vlog.info("tool", `→ web_search (grounded)`, { query });
          const searchResult = await runGroundedSearch(genAI, query);
          vlog.info("tool", `← web_search: ${searchResult.slice(0, 120)}`);
          actionsExecuted.push({ tool: "web_search", args, success: true, message: searchResult });
          return { name: "web_search", result: { success: true, message: searchResult }, args };
        }

        const tool = toolMap.get(fc.name);

        if (!tool) {
          vlog.warn("tool", `Unknown tool called: ${fc.name}`, { args });
          return {
            name: fc.name,
            result: { success: false, message: `Unknown tool: ${fc.name}` },
            args,
          };
        }

        vlog.info("tool", `→ ${fc.name}`, { args });
        const toolResult = await tool.execute(args, toolCtx);
        vlog.info("tool", `← ${fc.name}: ${toolResult.success ? "ok" : "fail"} — ${toolResult.message}`, {
          success: toolResult.success,
          directive: toolResult.clientDirective,
        });

        if (toolResult.clientDirective) {
          clientDirectives.push(toolResult.clientDirective);
          vlog.info("directive", `Client directive issued: ${toolResult.clientDirective.kind}`, {
            directive: toolResult.clientDirective,
          });
        }

        actionsExecuted.push({
          tool: fc.name,
          args,
          success: toolResult.success,
          message: toolResult.message,
        });

        return { name: fc.name, result: toolResult, args };
      })
    );

    const functionResponseParts = toolResults.map((tr) => ({
      functionResponse: {
        name: tr.name,
        response: { result: tr.result.message },
      },
    }));

    vlog.info("gemini", `Sending ${toolResults.length} tool result(s) back to Gemini`);
    result = await chat.sendMessage(functionResponseParts);
  }

  // Extract final text response
  const finalParts = result.response.candidates?.[0]?.content?.parts ?? [];
  const text =
    finalParts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join(" ")
      .trim() || "Done.";

  const totalMs = Date.now() - turnStart;
  const userText = await userTextPromise;
  vlog.info("session", `Turn complete (${totalMs}ms total)`, {
    userText: userText.slice(0, 120),
    text: text.slice(0, 200),
    toolRounds: iterations,
    actionsExecuted: actionsExecuted.length,
    clientDirectives: clientDirectives.length,
  });

  return { userText, text, actionsExecuted, clientDirectives };
}
