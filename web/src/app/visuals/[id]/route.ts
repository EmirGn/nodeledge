import { readVisual } from "@/lib/topic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const html = readVisual("quantum-mechanics", id);
  if (html === null) return new Response("not found", { status: 404 });
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
