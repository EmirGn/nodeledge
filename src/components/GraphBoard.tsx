"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Manifest } from "@/lib/topic";

type Vec = { x: number; y: number; vx: number; vy: number };

const PAD_X = 120;
const PAD_TOP = 140;
const PAD_BOTTOM = 100;
const ALPHA_MIN = 0.004;

export default function GraphBoard({ manifest }: { manifest: Manifest }) {
  const { nodes, edges, topic } = manifest;

  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) {
      d.set(e.source, (d.get(e.source) ?? 0) + 1);
      d.set(e.target, (d.get(e.target) ?? 0) + 1);
    }
    return d;
  }, [edges]);

  const maxLevel = useMemo(
    () => Math.max(1, ...nodes.map((n) => n.level)),
    [nodes],
  );

  const entryCount = useMemo(
    () =>
      nodes.filter(
        (n) => !edges.some((e) => e.type === "prerequisite" && e.target === n.id),
      ).length,
    [nodes, edges],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const posRef = useRef<Map<string, Vec>>(new Map());
  const alphaRef = useRef(1);
  const dragRef = useRef<{ id: string; moved: number } | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setFrame] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const forced = document.documentElement.dataset.theme;
    if (forced === "dark" || forced === "light") setTheme(forced);
    else
      setTheme(
        window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark",
      );
  }, []);

  // seed positions once: x by prerequisite level, y spread deterministically
  useEffect(() => {
    if (!size.w || !size.h || posRef.current.size) return;
    nodes.forEach((n, i) => {
      posRef.current.set(n.id, {
        x: PAD_X + (n.level / maxLevel) * (size.w - PAD_X * 2),
        y: PAD_TOP + (((i * 0.618034) % 1) * (size.h - PAD_TOP - PAD_BOTTOM)),
        vx: 0,
        vy: 0,
      });
    });
    setFrame((f) => f + 1);
  }, [size, nodes, maxLevel]);

  // force simulation
  useEffect(() => {
    if (!size.w || !size.h) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      alphaRef.current = Math.min(alphaRef.current, 0.3); // settle fast, no long animation

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const a = alphaRef.current;
      if (a <= ALPHA_MIN && !dragRef.current) return;

      const pts = nodes.map((n) => ({ n, p: posRef.current.get(n.id)! }));
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const p = pts[i].p;
          const q = pts[j].p;
          let dx = p.x - q.x;
          let dy = p.y - q.y;
          const d2 = dx * dx + dy * dy || 1;
          const d = Math.sqrt(d2);
          const f = Math.min(26000 / d2, 5) * a;
          dx /= d;
          dy /= d;
          p.vx += dx * f;
          p.vy += dy * f;
          q.vx -= dx * f;
          q.vy -= dy * f;
        }
      }
      for (const e of edges) {
        const p = posRef.current.get(e.source);
        const q = posRef.current.get(e.target);
        if (!p || !q) continue;
        const rest = e.type === "prerequisite" ? 190 : 270;
        const k = e.type === "prerequisite" ? 0.05 : 0.012;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = (k * (d - rest) * a) / d;
        p.vx += dx * f;
        p.vy += dy * f;
        q.vx -= dx * f;
        q.vy -= dy * f;
      }
      for (const { n, p } of pts) {
        if (dragRef.current?.id === n.id) {
          p.vx = 0;
          p.vy = 0;
        } else {
          const tx = PAD_X + (n.level / maxLevel) * (size.w - PAD_X * 2);
          p.vx += (tx - p.x) * 0.05 * a;
          p.vy += (size.h / 2 - p.y) * 0.006 * a;
          p.vx *= 0.6;
          p.vy *= 0.6;
          p.x += p.vx;
          p.y += p.vy;
        }
        p.x = Math.min(Math.max(p.x, PAD_X), size.w - PAD_X);
        p.y = Math.min(Math.max(p.y, PAD_TOP), size.h - PAD_BOTTOM);
      }
      if (!dragRef.current) alphaRef.current *= 0.985;
      setFrame((f) => f + 1);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, nodes, edges, maxLevel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "Escape") {
        setQuery("");
        setSelectedId(null);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startDrag = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const p = posRef.current.get(id);
    if (!p) return;
    const offX = p.x - e.clientX;
    const offY = p.y - e.clientY;
    dragRef.current = { id, moved: 0 };
    alphaRef.current = Math.max(alphaRef.current, 0.25);

    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      d.moved += Math.abs(ev.movementX) + Math.abs(ev.movementY);
      p.x = ev.clientX + offX;
      p.y = ev.clientY + offY;
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      alphaRef.current = Math.max(alphaRef.current, 0.15);
      if (d && d.moved < 5)
        setSelectedId((prev) => (prev === id ? null : id));
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("nl-theme", next);
    } catch {}
    setTheme(next);
  };

  const q = query.trim().toLowerCase();
  const matchSet = useMemo(() => {
    if (!q) return null;
    return new Set(
      nodes
        .filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.id.includes(q) ||
            n.summary.toLowerCase().includes(q),
        )
        .map((n) => n.id),
    );
  }, [q, nodes]);

  const selectFirstMatch = () => {
    if (!matchSet?.size) return;
    const first =
      nodes.find((n) => matchSet.has(n.id) && n.title.toLowerCase().startsWith(q)) ??
      nodes.find((n) => matchSet.has(n.id));
    if (first) {
      setSelectedId(first.id);
      inputRef.current?.blur();
    }
  };

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const prereqs = selected
    ? edges
        .filter((e) => e.type === "prerequisite" && e.target === selected.id)
        .map((e) => nodes.find((n) => n.id === e.source))
        .filter((n): n is NonNullable<typeof n> => Boolean(n))
    : [];

  const hovered =
    hoverId && hoverId !== selectedId && !dragRef.current
      ? nodes.find((n) => n.id === hoverId) ?? null
      : null;
  const hoverPos = hovered ? posRef.current.get(hovered.id) : null;

  const running = alphaRef.current > ALPHA_MIN;
  const label = (title: string) => title.split(" & ")[0];

  return (
    <div ref={containerRef} className="board">
      {size.w > 0 && (
        <svg
          width={size.w}
          height={size.h}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <defs>
            <radialGradient id="nl-glow">
              <stop offset="0%" stopColor="var(--bright)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--bright)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {edges.map((e, i) => {
            const p = posRef.current.get(e.source);
            const t = posRef.current.get(e.target);
            if (!p || !t) return null;
            const touchesSelected =
              selectedId !== null &&
              (e.source === selectedId || e.target === selectedId);
            const base = e.type === "prerequisite" ? 0.38 : 0.14;
            const dimmed =
              matchSet && !matchSet.has(e.source) && !matchSet.has(e.target);
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={t.x}
                y2={t.y}
                stroke={touchesSelected ? "var(--ink)" : "var(--muted)"}
                strokeWidth={e.type === "prerequisite" ? 1.2 : 1}
                opacity={dimmed ? base * 0.25 : touchesSelected ? Math.min(base * 1.8, 0.75) : base}
              />
            );
          })}

          {nodes.map((n) => {
            const p = posRef.current.get(n.id);
            if (!p) return null;
            const deg = degree.get(n.id) ?? 1;
            const r = 4 + Math.min(4, deg * 0.6);
            const isSel = n.id === selectedId;
            const isHover = n.id === hoverId;
            const major = deg >= 4;
            const dimmed = matchSet && !matchSet.has(n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                opacity={dimmed ? 0.18 : 1}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => startDrag(n.id, e)}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() =>
                  setHoverId((h) => (h === n.id ? null : h))
                }
              >
                <circle
                  r={r * 7}
                  fill="url(#nl-glow)"
                  pointerEvents="none"
                  style={{
                    opacity: `calc(var(--glow) * ${isSel ? 2.6 : isHover ? 1.7 : 1})`,
                  }}
                />
                <circle r={Math.max(r + 12, 16)} fill="transparent" />
                <circle
                  r={isSel ? r + 1.5 : r}
                  fill={
                    isSel ? "var(--bright)" : major ? "var(--ink)" : "var(--muted)"
                  }
                />
                {isSel && (
                  <circle
                    r={r + 10}
                    fill="none"
                    stroke="var(--bright)"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                )}
                <text
                  y={r + 22}
                  textAnchor="middle"
                  className="node-label"
                  pointerEvents="none"
                  fill={isSel ? "var(--bright)" : major ? "var(--ink)" : "var(--muted)"}
                  fontWeight={isSel ? 500 : 400}
                >
                  {label(n.title)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      <div className="hud hud-tl">
        <span className="wordmark">nodeledge</span>
        <span>/ {topic.slug}</span>
      </div>

      <div className="search">
        <span className="prompt">&gt;</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") selectFirstMatch();
          }}
          placeholder="search what you want to learn"
          aria-label="Search knownodes"
          spellCheck={false}
        />
        <span className="kbd">⌘K</span>
      </div>

      <div className="hud hud-tr">
        <span>
          {nodes.length} knownodes · {edges.length} edges
        </span>
        {theme && (
          <button
            className="hud-btn"
            onClick={toggleTheme}
            title="Switch theme"
          >
            {theme === "dark" ? "light" : "dark"}
          </button>
        )}
      </div>

      <div className="hud hud-bl">
        <span>layout: force · {running ? "running" : "settled"}</span>
      </div>

      <div className="hud hud-br">
        <span>
          {matchSet
            ? `${matchSet.size} match${matchSet.size === 1 ? "" : "es"}`
            : `${entryCount} entry point${entryCount === 1 ? "" : "s"}`}
        </span>
      </div>

      {hovered && hoverPos && (
        <div
          className="popover"
          style={{
            left: Math.min(Math.max(hoverPos.x - 150, 12), size.w - 312),
            top: Math.min(hoverPos.y + 34, size.h - 160),
          }}
        >
          <p className="title">{hovered.title}</p>
          <p className="summary">{hovered.summary}</p>
        </div>
      )}

      {selected && (
        <div className="panel">
          <button
            className="close"
            onClick={() => setSelectedId(null)}
            aria-label="Deselect node"
          >
            ×
          </button>
          <p className="eyebrow">selected node</p>
          <h2>{selected.title}</h2>
          <p className="summary">{selected.summary}</p>
          <p className="row">
            prerequisites{prereqs.length === 0 && ": none — an entry point"}
            {prereqs.map((p) => (
              <button
                key={p.id}
                className="chip"
                onClick={() => setSelectedId(p.id)}
              >
                {label(p.title).toLowerCase()}
              </button>
            ))}
          </p>
          <p className="row" style={{ marginTop: 14 }}>
            <Link href={`/node/${selected.id}`} className="action">
              open node →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
