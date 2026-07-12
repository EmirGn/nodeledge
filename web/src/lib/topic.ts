import fs from "node:fs";
import path from "node:path";

export type ManifestNode = {
  id: string;
  title: string;
  summary: string;
  level: number;
};

export type ManifestEdge = {
  source: string;
  target: string;
  type: "prerequisite" | "related";
  weight: number;
};

export type Manifest = {
  format: string;
  formatVersion: string;
  topic: {
    slug: string;
    title: string;
    description: string;
    language: string;
    version: string;
  };
  nodes: ManifestNode[];
  edges: ManifestEdge[];
};

// Packages live at ./topics when the app is the repo root (standalone deploy),
// or one level up in the monorepo layout (see FORMAT.md).
const LOCAL_TOPICS = path.resolve(process.cwd(), "topics");
const TOPICS_DIR = fs.existsSync(LOCAL_TOPICS)
  ? LOCAL_TOPICS
  : path.resolve(process.cwd(), "..", "topics");

const SAFE_ID = /^[a-z0-9-]+$/;

export function loadManifest(slug: string): Manifest {
  if (!SAFE_ID.test(slug)) throw new Error(`invalid topic slug: ${slug}`);
  const raw = fs.readFileSync(path.join(TOPICS_DIR, slug, "manifest.json"), "utf8");
  return JSON.parse(raw) as Manifest;
}

export function readVisual(slug: string, id: string): string | null {
  if (!SAFE_ID.test(slug) || !SAFE_ID.test(id)) return null;
  const p = path.join(TOPICS_DIR, slug, "visuals", `${id}.html`);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

export function readContentBody(slug: string, id: string): string | null {
  if (!SAFE_ID.test(slug) || !SAFE_ID.test(id)) return null;
  const p = path.join(TOPICS_DIR, slug, "content", `${id}.md`);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}
