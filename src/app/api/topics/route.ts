import { NextResponse } from "next/server";
import { streamTopicGraph } from "@/lib/generate";
import { getSession } from "@/lib/session";
import { persistTopic } from "@/lib/topics";

// Graph generation is a single long model call, streamed to the client.
export const maxDuration = 300;

// Streams NDJSON events while the model draws the graph: "meta", then "node"
// and "edge" as each element completes, then "done" with the persisted topic
// id — or "error". Validation failures still return plain JSON errors.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { prompt?: string } | null;
  const prompt = body?.prompt?.trim();
  if (!prompt || prompt.length < 3 || prompt.length > 500) {
    return NextResponse.json({ error: "say what you want to learn" }, { status: 400 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const gen = streamTopicGraph(prompt);
        let step = await gen.next();
        while (!step.done) {
          send(step.value);
          step = await gen.next();
        }
        const id = await persistTopic(userId, prompt, step.value);
        send({ type: "done", id });
      } catch (err) {
        console.error("topic generation failed:", err);
        const message =
          err instanceof Error && /api key|authentication/i.test(err.message)
            ? "no model API key configured — set ANTHROPIC_API_KEY or GEMINI_API_KEY"
            : "generation failed — try again";
        send({ type: "error", message });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
