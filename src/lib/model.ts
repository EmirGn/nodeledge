import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

// One model surface, two providers. Claude is the production model;
// Gemini is the cheap dev-time backend. Selection: MODEL_PROVIDER env if set,
// otherwise whichever API key is present (Anthropic wins when both are).

const ANTHROPIC_MODEL = "claude-opus-4-8";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

type Provider = "anthropic" | "gemini";

function provider(): Provider {
  const forced = process.env.MODEL_PROVIDER;
  if (forced === "anthropic" || forced === "gemini") return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  throw new Error(
    "no model API key configured — set ANTHROPIC_API_KEY or GEMINI_API_KEY",
  );
}

async function anthropicCall(args: {
  system: string;
  user: string;
  maxTokens: number;
  jsonSchema?: Record<string, unknown>;
}): Promise<string> {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: args.maxTokens,
    thinking: { type: "adaptive" },
    system: args.system,
    ...(args.jsonSchema
      ? {
          output_config: {
            format: { type: "json_schema" as const, schema: args.jsonSchema },
          },
        }
      : {}),
    messages: [{ role: "user", content: args.user }],
  });
  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("model returned no text");
  return text.text;
}

async function* anthropicStream(args: {
  system: string;
  user: string;
  maxTokens: number;
  jsonSchema?: Record<string, unknown>;
}): AsyncGenerator<string> {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: args.maxTokens,
    thinking: { type: "adaptive" },
    system: args.system,
    ...(args.jsonSchema
      ? {
          output_config: {
            format: { type: "json_schema" as const, schema: args.jsonSchema },
          },
        }
      : {}),
    messages: [{ role: "user", content: args.user }],
  });
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

async function* geminiStream(args: {
  system: string;
  user: string;
  jsonSchema?: Record<string, unknown>;
}): AsyncGenerator<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const user = args.jsonSchema
    ? `${args.user}\n\nRespond with a single JSON object matching exactly this JSON Schema:\n${JSON.stringify(args.jsonSchema)}`
    : args.user;
  const res = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: user,
    config: {
      systemInstruction: args.system,
      ...(args.jsonSchema ? { responseMimeType: "application/json" } : {}),
    },
  });
  for await (const chunk of res) {
    if (chunk.text) yield chunk.text;
  }
}

async function geminiCall(args: {
  system: string;
  user: string;
  jsonSchema?: Record<string, unknown>;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Schema goes in the prompt rather than responseSchema: Gemini's schema
  // dialect diverges from standard JSON Schema, and sanitizeGraph already
  // validates structure after parsing.
  const user = args.jsonSchema
    ? `${args.user}\n\nRespond with a single JSON object matching exactly this JSON Schema:\n${JSON.stringify(args.jsonSchema)}`
    : args.user;
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: {
      systemInstruction: args.system,
      ...(args.jsonSchema ? { responseMimeType: "application/json" } : {}),
    },
  });
  const text = res.text;
  if (!text) throw new Error("model returned no text");
  return text;
}

export async function completeText(args: {
  system: string;
  user: string;
  maxTokens: number;
}): Promise<string> {
  return provider() === "anthropic"
    ? anthropicCall(args)
    : geminiCall(args);
}

// Streams raw text deltas as the model produces them. With jsonSchema the
// deltas concatenate to one JSON document (possibly markdown-fenced on Gemini).
export function streamModelText(args: {
  system: string;
  user: string;
  maxTokens: number;
  jsonSchema?: Record<string, unknown>;
}): AsyncGenerator<string> {
  return provider() === "anthropic"
    ? anthropicStream(args)
    : geminiStream(args);
}
