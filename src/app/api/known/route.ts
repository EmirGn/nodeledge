import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { setNodeKnown } from "@/lib/topics";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    topicId?: string;
    nodeId?: string;
    known?: boolean;
  } | null;
  if (!body?.topicId || !body.nodeId || typeof body.known !== "boolean") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  await setNodeKnown(session.user.id, body.topicId, body.nodeId, body.known);
  return NextResponse.json({ ok: true });
}
