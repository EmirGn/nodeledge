import { notFound } from "next/navigation";
import GraphBoard from "@/components/GraphBoard";
import { requireUser } from "@/lib/session";
import { DEMO_TOPIC, loadManifest } from "@/lib/topic";
import { getTopicManifest, listKnownNodes } from "@/lib/topics";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  if (topic === DEMO_TOPIC) return { title: "Quantum Mechanics — nodeledge" };
  return { title: "nodeledge" };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const user = await requireUser();

  const manifest =
    topic === DEMO_TOPIC
      ? loadManifest(DEMO_TOPIC)
      : await getTopicManifest(user.id, topic);
  if (!manifest) notFound();

  const known = await listKnownNodes(user.id, topic);

  return <GraphBoard manifest={manifest} topicId={topic} initialKnown={known} />;
}
