import "katex/dist/katex.min.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import KnownToggle from "@/components/KnownToggle";
import { renderMarkdown } from "@/lib/markdown";
import { requireUser } from "@/lib/session";
import {
  DEMO_TOPIC,
  loadManifest,
  readContentBody,
} from "@/lib/topic";
import {
  ensureNodeContent,
  getTopicManifest,
  listKnownNodes,
} from "@/lib/topics";

export default async function NodePage({
  params,
}: {
  params: Promise<{ topic: string; id: string }>;
}) {
  const { topic: topicId, id } = await params;
  const user = await requireUser();
  const isDemo = topicId === DEMO_TOPIC;

  const manifest = isDemo
    ? loadManifest(DEMO_TOPIC)
    : await getTopicManifest(user.id, topicId);
  if (!manifest) notFound();

  const node = manifest.nodes.find((n) => n.id === id);
  if (!node) notFound();

  const prereqs = manifest.edges
    .filter((e) => e.type === "prerequisite" && e.target === id)
    .map((e) => manifest.nodes.find((n) => n.id === e.source))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const known = await listKnownNodes(user.id, topicId);

  return (
    <main className="article">
      <nav className="article-top">
        <Link href={`/t/${topicId}`} className="action">
          ← graph
        </Link>
        <span>/ {manifest.topic.title.toLowerCase()}</span>
        <span style={{ marginLeft: "auto" }}>
          <KnownToggle
            topicId={topicId}
            nodeId={id}
            initialKnown={known.includes(id)}
          />
        </span>
      </nav>

      <h1>{node.title}</h1>
      <p className="lede">{node.summary}</p>
      <p className="meta">
        prerequisites:{" "}
        {prereqs.length === 0
          ? "none — this is an entry point"
          : prereqs.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " · "}
                <Link href={`/t/${topicId}/node/${p.id}`}>
                  {p.title.toLowerCase()}
                </Link>
              </span>
            ))}
      </p>

      {isDemo && (
        <div className="visual-wrap">
          <p className="eyebrow">interactive — cause it yourself</p>
          <iframe
            className="visual"
            src={`/visuals/${node.id}`}
            sandbox="allow-scripts"
            title={`${node.title} — interactive visual`}
          />
        </div>
      )}

      {isDemo ? (
        <DemoBody id={id} />
      ) : (
        <Suspense
          fallback={
            <p className="meta generating">
              writing this knownode — first open generates it, ~30 seconds
            </p>
          }
        >
          <GeneratedBody userId={user.id} topicId={topicId} nodeId={id} />
        </Suspense>
      )}
    </main>
  );
}

function DemoBody({ id }: { id: string }) {
  const body = readContentBody(DEMO_TOPIC, id);
  if (!body) return null;
  return (
    <div
      className="body"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
    />
  );
}

async function GeneratedBody({
  userId,
  topicId,
  nodeId,
}: {
  userId: string;
  topicId: string;
  nodeId: string;
}) {
  const body = await ensureNodeContent(userId, topicId, nodeId);
  if (!body) return null;
  return (
    <div
      className="body"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
    />
  );
}
