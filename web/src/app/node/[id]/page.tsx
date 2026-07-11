import Link from "next/link";
import { notFound } from "next/navigation";
import { loadManifest, readContentBody } from "@/lib/topic";
import { renderMarkdown } from "@/lib/markdown";

const TOPIC = "quantum-mechanics";

export function generateStaticParams() {
  return loadManifest(TOPIC).nodes.map((n) => ({ id: n.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const node = loadManifest(TOPIC).nodes.find((n) => n.id === id);
  return { title: node ? `${node.title} — nodeledge` : "nodeledge" };
}

export default async function NodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const manifest = loadManifest(TOPIC);
  const node = manifest.nodes.find((n) => n.id === id);
  if (!node) notFound();

  const body = readContentBody(TOPIC, id);
  const prereqs = manifest.edges
    .filter((e) => e.type === "prerequisite" && e.target === id)
    .map((e) => manifest.nodes.find((n) => n.id === e.source))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  return (
    <main className="article">
      <nav className="article-top">
        <Link href="/" className="action">
          ← graph
        </Link>
        <span>/ {manifest.topic.slug}</span>
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
                <Link href={`/node/${p.id}`}>{p.title.toLowerCase()}</Link>
              </span>
            ))}
      </p>

      <div className="visual-wrap">
        <p className="eyebrow">interactive — cause it yourself</p>
        <iframe
          className="visual"
          src={`/visuals/${node.id}`}
          sandbox="allow-scripts"
          title={`${node.title} — interactive visual`}
        />
      </div>

      {body && (
        <div
          className="body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
        />
      )}
    </main>
  );
}
