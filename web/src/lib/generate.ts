import "server-only";

import { completeText, streamModelText } from "@/lib/model";
import type { ManifestEdge, ManifestNode } from "@/lib/topic";

export type GeneratedTopic = {
  title: string;
  description: string;
  nodes: ManifestNode[];
  edges: ManifestEdge[];
};

const GRAPH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "nodes", "edges"],
  properties: {
    title: { type: "string", description: "Short subject title, e.g. 'Linear Algebra'" },
    description: {
      type: "string",
      description: "One or two sentences describing the topic and the learner's angle on it",
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "summary", "level"],
        properties: {
          id: { type: "string", description: "kebab-case identifier, unique within the topic" },
          title: { type: "string" },
          summary: {
            type: "string",
            description: "2-3 plain-language sentences; shown as the hover popup",
          },
          level: {
            type: "integer",
            description: "1-5 depth in the learning progression; 1 = entry point",
          },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["source", "target", "type", "weight"],
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          type: { type: "string", enum: ["prerequisite", "related"] },
          weight: { type: "number", description: "relevance 0-1; prerequisites default to 1" },
        },
      },
    },
  },
} as const;

const GRAPH_SYSTEM = `You are the graph author for nodeledge, a learning platform where knowledge is an interactive graph instead of a wall of text. Every concept is a "knownode"; edges carry meaning: "prerequisite" (directed — learn source before target) or "related" (undirected cross-connection, stored once).

Given what a learner says they want to learn, design the knownode graph for that subject.

Rules:
- 12 to 18 nodes. Each node is one teachable concept, not a chapter.
- Node ids are kebab-case and unique. Titles are concise noun phrases.
- Summaries are 2-3 plain-language sentences a newcomer understands — they answer "what is this and why would I care", not textbook definitions.
- "level" is 1-5 depth in the learning progression; at least one node is level 1 with no prerequisite pointing at it (an entry point).
- Prerequisite edges express genuine conceptual dependency only — what you truly must understand first. Do not build a linear chain; real subjects branch and reconverge.
- Related edges connect concepts that illuminate each other across branches. Use them sparingly (roughly half as many as prerequisites) with weight 0.4-0.8.
- No pair of nodes may have both a prerequisite and a related edge. No self-edges. Every edge endpoint must be an existing node id. The graph must be connected.
- Shape the graph to the learner's stated goal and phrasing: if they say why they want to learn it, weight the map toward that path.
- Accuracy is non-negotiable: this teaches real subjects. Never invent concepts or dependencies that experts would dispute.`;

export type GraphStreamEvent =
  | { type: "meta"; title: string; description: string }
  | { type: "node"; node: ManifestNode }
  | { type: "edge"; edge: ManifestEdge };

// Streams graph elements as the model emits them, so the client can draw the
// board node by node. Yields best-effort partial events; the returned value is
// the full graph, parsed and sanitized, and is the only thing to persist.
export async function* streamTopicGraph(
  prompt: string,
): AsyncGenerator<GraphStreamEvent, GeneratedTopic> {
  let buf = "";
  let sentMeta = false;
  let sentNodes = 0;
  let sentEdges = 0;

  for await (const delta of streamModelText({
    system: GRAPH_SYSTEM,
    user: `The learner says: "${prompt}"\n\nDesign the knownode graph.`,
    maxTokens: 32000,
    jsonSchema: GRAPH_SCHEMA,
  })) {
    buf += delta;
    const part = scanPartialGraph(buf);
    if (!sentMeta && part.title !== undefined && part.description !== undefined) {
      sentMeta = true;
      yield { type: "meta", title: part.title, description: part.description };
    }
    for (; sentNodes < part.nodes.length; sentNodes++) {
      yield { type: "node", node: part.nodes[sentNodes] };
    }
    for (; sentEdges < part.edges.length; sentEdges++) {
      yield { type: "edge", edge: part.edges[sentEdges] };
    }
  }

  // Tolerate accidental markdown fencing from JSON-mode outputs.
  const text = buf.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return sanitizeGraph(JSON.parse(text) as GeneratedTopic);
}

type PartialGraph = {
  title?: string;
  description?: string;
  nodes: ManifestNode[];
  edges: ManifestEdge[];
};

// One pass over a truncated JSON document: collects every complete object
// inside the top-level "nodes"/"edges" arrays plus the top-level title and
// description strings. Reacts only to JSON structure, so markdown fences and
// braces inside strings can't confuse it. Rescanning the whole buffer per
// delta is fine at ~30 KB of output.
function scanPartialGraph(buf: string): PartialGraph {
  const out: PartialGraph = { nodes: [], edges: [] };
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strStart = -1;
  let lastStr = ""; // most recently completed string literal, with quotes
  let valueKey: string | null = null; // key whose value comes next
  let arrKey: "nodes" | "edges" | null = null; // which top-level array we're in
  let arrDepth = 0;
  let objStart = -1;

  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') {
        inStr = false;
        lastStr = buf.slice(strStart, i + 1);
        if (valueKey && depth === 1) {
          try {
            const v = JSON.parse(lastStr) as string;
            if (valueKey === "title") out.title = v;
            else if (valueKey === "description") out.description = v;
          } catch {}
          valueKey = null;
        }
      }
      continue;
    }
    switch (c) {
      case '"':
        inStr = true;
        strStart = i;
        break;
      case ":":
        try {
          valueKey = JSON.parse(lastStr) as string;
        } catch {
          valueKey = null;
        }
        break;
      case "{":
        if (arrKey && depth === arrDepth && objStart < 0) objStart = i;
        depth++;
        valueKey = null;
        break;
      case "}":
        depth--;
        if (arrKey && depth === arrDepth && objStart >= 0) {
          try {
            const parsed = JSON.parse(buf.slice(objStart, i + 1));
            if (arrKey === "nodes") out.nodes.push(parsed as ManifestNode);
            else out.edges.push(parsed as ManifestEdge);
          } catch {}
          objStart = -1;
        }
        break;
      case "[":
        depth++;
        if (depth === 2 && (valueKey === "nodes" || valueKey === "edges")) {
          arrKey = valueKey;
          arrDepth = depth;
        }
        valueKey = null;
        break;
      case "]":
        if (arrKey && depth === arrDepth) arrKey = null;
        depth--;
        break;
    }
  }
  return out;
}

// Enforce FORMAT.md validity rules on model output before persisting.
function sanitizeGraph(g: GeneratedTopic): GeneratedTopic {
  const nodes = g.nodes.filter(
    (n, i, arr) => arr.findIndex((m) => m.id === n.id) === i,
  );
  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const paired = new Set<string>(); // node pairs that already have an edge of any type
  const edges = g.edges.filter((e) => {
    if (!ids.has(e.source) || !ids.has(e.target) || e.source === e.target) return false;
    const key = `${e.type}:${e.source}->${e.target}`;
    const pair = [e.source, e.target].sort().join("|");
    if (seen.has(key) || paired.has(pair)) return false;
    seen.add(key);
    paired.add(pair);
    return true;
  });
  if (nodes.length < 3) throw new Error("graph too small");
  return { ...g, nodes, edges };
}

const NODE_SYSTEM = `You write the knowledge body of a single nodeledge knownode: short, intuition-first markdown that teaches one concept.

Rules:
- 300-450 words. Markdown only, no top-level heading (the page renders the title).
- Sections, in order: "## The idea" (the core intuition, plainly), "## Why it matters" (what it unlocks, where it shows up), "## The math (light)" (only if math genuinely clarifies — a formula with every symbol named; omit the section otherwise), "## Hold it in your head" (one concrete mental experiment the learner can run without any apparatus).
- Math is TeX: $...$ inline, $$...$$ for display equations. Never write raw unicode math or ASCII approximations of formulas.
- Assume the learner knows the prerequisite concepts listed, nothing more.
- Accuracy is non-negotiable — never trade correctness for a neat story.
- Voice: declarative, a little defiant, zero fluff. No "in this section", no exclamation marks.`;

export async function generateNodeContent(args: {
  topicTitle: string;
  node: { title: string; summary: string };
  prerequisites: string[];
}): Promise<string> {
  const text = await completeText({
    system: NODE_SYSTEM,
    user: [
      `Topic: ${args.topicTitle}`,
      `Knownode: ${args.node.title}`,
      `Summary already shown to the learner: ${args.node.summary}`,
      args.prerequisites.length
        ? `Prerequisite concepts the learner already knows: ${args.prerequisites.join(", ")}`
        : "This is an entry point — assume no prior knowledge of the topic.",
      "",
      "Write the body.",
    ].join("\n"),
    maxTokens: 8000,
  });
  return text.trim();
}
