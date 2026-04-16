import "server-only";

import { GoogleGenerativeAI, SchemaType, FunctionCallingMode } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";
import type { VoiceTool } from "./tools/types";

export { FunctionCallingMode };

export function buildGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.MATTERHUB_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No Gemini API key found. Set MATTERHUB_GEMINI_API_KEY or GEMINI_API_KEY."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

function mapPropertySchema(schema: {
  type: string;
  description: string;
  enum?: string[];
}): Schema {
  if (schema.enum) {
    return {
      type: SchemaType.STRING,
      description: schema.description,
      format: "enum",
      enum: schema.enum,
    } as Schema;
  }

  let type: SchemaType;
  switch (schema.type) {
    case "string":
      type = SchemaType.STRING;
      break;
    case "number":
    case "integer":
      type = SchemaType.NUMBER;
      break;
    case "boolean":
      type = SchemaType.BOOLEAN;
      break;
    case "array":
      type = SchemaType.ARRAY;
      break;
    default:
      type = SchemaType.OBJECT;
  }

  return { type, description: schema.description } as Schema;
}

export function buildFunctionDeclarations(tools: VoiceTool[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, schema]) => [
          key,
          mapPropertySchema(schema),
        ])
      ),
      required: tool.parameters.required,
    },
  }));
}
