"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import GraphBoard, { type ChartingPhase } from "@/components/GraphBoard";
import { authClient } from "@/lib/auth-client";
import type { ManifestEdge, ManifestNode } from "@/lib/topic";

type TopicRow = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

// The graph being drawn live while /api/topics streams it in. `acked` flips
// when the route confirms the model stream is open — the waiting HUD stages
// itself on that, the title, and the first node.
type LiveGraph = {
  acked: boolean;
  title: string | null;
  nodes: ManifestNode[];
  edges: ManifestEdge[];
};

type StreamEvent =
  | { type: "status" }
  | { type: "meta"; title: string }
  | { type: "node"; node: ManifestNode }
  | { type: "edge"; edge: ManifestEdge }
  | { type: "done"; id: string }
  | { type: "error"; message: string };

export default function Atlas({
  userName,
  topics,
}: {
  userName: string;
  topics: TopicRow[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [live, setLive] = useState<LiveGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (ev: StreamEvent): boolean => {
    switch (ev.type) {
      case "status":
        setLive((l) => l && { ...l, acked: true });
        return false;
      case "meta":
        setLive((l) => l && { ...l, title: ev.title });
        return false;
      case "node":
        setLive((l) => {
          if (!l || l.nodes.some((n) => n.id === ev.node.id)) return l;
          return { ...l, nodes: [...l.nodes, ev.node] };
        });
        return false;
      case "edge":
        setLive((l) => l && { ...l, edges: [...l.edges, ev.edge] });
        return false;
      case "done":
        router.push(`/t/${ev.id}`);
        return true;
      case "error":
        throw new Error(ev.message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = prompt.trim();
    if (!p || live) return;
    setError(null);
    // Switch to the board immediately; nodes light up as the model draws them.
    setLive({ acked: false, title: null, nodes: [], edges: [] });
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "generation failed — try again");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          if (apply(JSON.parse(line) as StreamEvent)) return;
        }
      }
      // Stream ended without a "done" event — treat as failure.
      throw new Error("generation failed — try again");
    } catch (err) {
      setLive(null);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "generation failed — try again",
      );
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  if (live) {
    const phase: ChartingPhase = live.nodes.length
      ? "drawing"
      : live.title
        ? "resolving"
        : live.acked
          ? "surveying"
          : "contacting";
    return (
      <GraphBoard
        charting={phase}
        topicId=""
        initialKnown={[]}
        manifest={{
          format: "nodeledge-package",
          formatVersion: "1.0",
          topic: {
            slug: "charting",
            title: live.title ?? "charting the territory…",
            description: "",
            language: "en",
            version: "0",
          },
          nodes: live.nodes,
          edges: live.edges,
        }}
      />
    );
  }

  return (
    <div className="board atlas">
      <div className="hud hud-tl">
        <span className="wordmark">nodeledge</span>
        <span>/ atlas</span>
      </div>
      <div className="hud hud-tr">
        <span>{userName}</span>
        <button className="hud-btn" onClick={signOut}>
          sign out
        </button>
      </div>
      <div className="hud hud-bl">
        <span>
          {topics.length} graph{topics.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="atlas-center">
        <form className="atlas-ask" onSubmit={submit}>
          <p className="eyebrow">new graph</p>
          <div
            className="search atlas-input"
            onClick={() => inputRef.current?.focus()}
          >
            <span className="prompt">&gt;</span>
            <input
              ref={inputRef}
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="what do you want to learn — in your own words"
              spellCheck={false}
              maxLength={500}
            />
          </div>
          {error ? (
            <p className="atlas-status atlas-error">{error}</p>
          ) : (
            <p className="atlas-status">
              the model maps the subject: concepts, prerequisites, connections
            </p>
          )}
        </form>

        <div className="atlas-list">
          {topics.length > 0 && <p className="eyebrow">your graphs</p>}
          {topics.map((t) => (
            <Link key={t.id} href={`/t/${t.id}`} className="atlas-row">
              <span className="atlas-row-title">{t.title}</span>
              <span className="atlas-row-meta">{t.createdAt}</span>
            </Link>
          ))}
          <p className="eyebrow" style={{ marginTop: topics.length ? 20 : 0 }}>
            shared demo
          </p>
          <Link href="/t/quantum-mechanics" className="atlas-row">
            <span className="atlas-row-title">Quantum Mechanics</span>
            <span className="atlas-row-meta">15 knownodes · hand-built</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
