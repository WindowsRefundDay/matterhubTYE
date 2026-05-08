import "server-only";

import { NextRequest } from "next/server";
import {
  getVoiceEngineSessionState,
  subscribeVoiceEngineSession,
} from "@/lib/server/voice-engine";

export const dynamic = "force-dynamic";

function toEventPayload(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const initial = getVoiceEngineSessionState(id);
  if (!initial) {
    return new Response(
      JSON.stringify({ status: "error", error: "Voice session not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(toEventPayload(payload)));
      };

      send({ status: "ok", session: initial });

      const unsubscribe = subscribeVoiceEngineSession(id, (session) => {
        send({ status: "ok", session });
      });

      const heartbeat = setInterval(() => {
        send({ status: "heartbeat", ts: Date.now() });
      }, 15000);

      request.signal.addEventListener("abort", () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
