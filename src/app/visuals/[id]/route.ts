import { loadManifest, readVisual } from "@/lib/topic";

// Baked at build time: topics/ lives outside web/ and is not available on the
// serverless filesystem at runtime.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return loadManifest("quantum-mechanics").nodes.map((n) => ({ id: n.id }));
}

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
