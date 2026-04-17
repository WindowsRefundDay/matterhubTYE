import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const DEFAULT_PIPER_BINARY = "/home/pi/.venv/bin/piper";
const DEFAULT_PIPER_MODEL =
  "/home/pi/piper-models/en_US-amy-medium.onnx";

type TtsRequestBody = {
  text?: string;
};

/**
 * Synthesis-only endpoint. Live capture stays in the browser and speech-to-text
 * stays on /api/voice/chat until a dedicated streaming design is approved.
 */
/** WAV header for raw PCM: 22050 Hz, mono, 16-bit signed little-endian */
function buildWavHeader(pcmByteLength: number): Buffer {
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataChunkSize = pcmByteLength;
  const riffChunkSize = 36 + dataChunkSize;

  const header = Buffer.alloc(44);
  // RIFF chunk
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(riffChunkSize, 4);
  header.write("WAVE", 8, "ascii");
  // fmt sub-chunk
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // PCM sub-chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  // data sub-chunk
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataChunkSize, 40);

  return header;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as TtsRequestBody;

    if (!text?.trim()) {
      return NextResponse.json({ status: "error", error: "Missing text." }, { status: 400 });
    }

    const piperBin =
      process.env.PIPER_BINARY_PATH ?? DEFAULT_PIPER_BINARY;
    const modelPath =
      process.env.PIPER_MODEL_PATH ?? DEFAULT_PIPER_MODEL;

    if (!existsSync(piperBin)) {
      // Dev fallback: tell client to use browser TTS
      return NextResponse.json({ status: "no-tts" });
    }

    const pcmChunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      const piper = spawn(piperBin, ["--model", modelPath, "--output_raw"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      piper.stdin.write(text.trim());
      piper.stdin.end();

      piper.stdout.on("data", (chunk: Buffer) => pcmChunks.push(chunk));
      piper.stderr.on("data", () => { /* suppress piper progress output */ });

      piper.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Piper exited with code ${code}`));
        }
      });

      piper.on("error", reject);
    });

    const pcm = Buffer.concat(pcmChunks);
    const wav = Buffer.concat([buildWavHeader(pcm.length), pcm]);

    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}
