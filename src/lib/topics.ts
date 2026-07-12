import "server-only";

import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { generateNodeContent, type GeneratedTopic } from "@/lib/generate";
import type { Manifest } from "@/lib/topic";

const newId = () => randomBytes(6).toString("base64url");

// Persists a fully generated, sanitized graph. Generation itself streams —
// see streamTopicGraph and POST /api/topics.
export async function persistTopic(
  userId: string,
  prompt: string,
  graph: GeneratedTopic,
) {
  const id = newId();
  await db.insert(schema.topics).values({
    id,
    userId,
    title: graph.title,
    description: graph.description,
    prompt,
  });
  await db.insert(schema.topicNodes).values(
    graph.nodes.map((n) => ({ topicId: id, ...n })),
  );
  if (graph.edges.length) {
    await db.insert(schema.topicEdges).values(
      graph.edges.map((e) => ({ topicId: id, ...e })),
    );
  }
  return id;
}

export async function listTopics(userId: string) {
  return db
    .select({
      id: schema.topics.id,
      title: schema.topics.title,
      description: schema.topics.description,
      createdAt: schema.topics.createdAt,
    })
    .from(schema.topics)
    .where(eq(schema.topics.userId, userId))
    .orderBy(desc(schema.topics.createdAt));
}

// Assembles a FORMAT.md-shaped manifest from DB rows. Returns null when the
// topic doesn't exist or belongs to someone else — topics are private.
export async function getTopicManifest(
  userId: string,
  topicId: string,
): Promise<Manifest | null> {
  const [topic] = await db
    .select()
    .from(schema.topics)
    .where(and(eq(schema.topics.id, topicId), eq(schema.topics.userId, userId)));
  if (!topic) return null;

  const nodes = await db
    .select({
      id: schema.topicNodes.id,
      title: schema.topicNodes.title,
      summary: schema.topicNodes.summary,
      level: schema.topicNodes.level,
    })
    .from(schema.topicNodes)
    .where(eq(schema.topicNodes.topicId, topicId));
  const edges = await db
    .select({
      source: schema.topicEdges.source,
      target: schema.topicEdges.target,
      type: schema.topicEdges.type,
      weight: schema.topicEdges.weight,
    })
    .from(schema.topicEdges)
    .where(eq(schema.topicEdges.topicId, topicId));

  return {
    format: "nodeledge-package",
    formatVersion: "1.0",
    topic: {
      slug: topic.id,
      title: topic.title,
      description: topic.description,
      language: "en",
      version: "1",
    },
    nodes,
    edges,
  };
}

// Returns the node's markdown body, generating and caching it on first open.
export async function ensureNodeContent(
  userId: string,
  topicId: string,
  nodeId: string,
): Promise<string | null> {
  const [topic] = await db
    .select({ id: schema.topics.id, title: schema.topics.title })
    .from(schema.topics)
    .where(and(eq(schema.topics.id, topicId), eq(schema.topics.userId, userId)));
  if (!topic) return null;

  const [node] = await db
    .select()
    .from(schema.topicNodes)
    .where(
      and(eq(schema.topicNodes.topicId, topicId), eq(schema.topicNodes.id, nodeId)),
    );
  if (!node) return null;
  if (node.content) return node.content;

  const prereqEdges = await db
    .select({ source: schema.topicEdges.source })
    .from(schema.topicEdges)
    .where(
      and(
        eq(schema.topicEdges.topicId, topicId),
        eq(schema.topicEdges.target, nodeId),
        eq(schema.topicEdges.type, "prerequisite"),
      ),
    );
  const prereqTitles: string[] = [];
  for (const e of prereqEdges) {
    const [p] = await db
      .select({ title: schema.topicNodes.title })
      .from(schema.topicNodes)
      .where(
        and(
          eq(schema.topicNodes.topicId, topicId),
          eq(schema.topicNodes.id, e.source),
        ),
      );
    if (p) prereqTitles.push(p.title);
  }

  const content = await generateNodeContent({
    topicTitle: topic.title,
    node: { title: node.title, summary: node.summary },
    prerequisites: prereqTitles,
  });
  await db
    .update(schema.topicNodes)
    .set({ content })
    .where(
      and(eq(schema.topicNodes.topicId, topicId), eq(schema.topicNodes.id, nodeId)),
    );
  return content;
}

/* ——— learner state ——— */

export async function listKnownNodes(userId: string, topicId: string) {
  const rows = await db
    .select({ nodeId: schema.knownNodes.nodeId })
    .from(schema.knownNodes)
    .where(
      and(
        eq(schema.knownNodes.userId, userId),
        eq(schema.knownNodes.topicId, topicId),
      ),
    );
  return rows.map((r) => r.nodeId);
}

export async function setNodeKnown(
  userId: string,
  topicId: string,
  nodeId: string,
  known: boolean,
) {
  if (known) {
    await db
      .insert(schema.knownNodes)
      .values({ userId, topicId, nodeId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(schema.knownNodes)
      .where(
        and(
          eq(schema.knownNodes.userId, userId),
          eq(schema.knownNodes.topicId, topicId),
          eq(schema.knownNodes.nodeId, nodeId),
        ),
      );
  }
}
