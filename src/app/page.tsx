import Atlas from "@/components/Atlas";
import { requireUser } from "@/lib/session";
import { listTopics } from "@/lib/topics";

export default async function Home() {
  const user = await requireUser();
  const topics = await listTopics(user.id);
  return (
    <Atlas
      userName={user.name}
      topics={topics.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        createdAt: t.createdAt.toISOString().slice(0, 10),
      }))}
    />
  );
}
