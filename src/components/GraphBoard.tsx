"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Manifest } from "@/lib/topic";

type Vec = { x: number; y: number; vx: number; vy: number };
type NodeStatus = "known" | "open" | "locked";

// What render reads: an immutable snapshot the simulation publishes each
// frame — the mutable Vec map stays inside the loop, out of render.
type View = {
  positions: ReadonlyMap<string, { x: number; y: number }>;
  running: boolean;
  dragging: boolean;
};

const PAD_X = 120;
const PAD_TOP = 140;
const PAD_BOTTOM = 100;
const ALPHA_MIN = 0.004;
// Minimum pair spacing — an ellipse, wider than tall, because each node
// carries a text label underneath that needs horizontal clearance.
const SEP_X = 108;
const SEP_Y = 60;

// Theme lives outside React: the <html> data-theme attribute (stamped by the
// pre-hydration script or the toggle), falling back to the OS preference.
function subscribeTheme(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", onChange);
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    mq.removeEventListener("change", onChange);
    mo.disconnect();
  };
}

function readTheme(): "dark" | "light" {
  const forced = document.documentElement.dataset.theme;
  if (forced === "dark" || forced === "light") return forced;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

// Stages of a live generation, in order: waiting for the route to ack the
// stream, waiting for the model's first tokens, title parsed but no node yet,
// nodes arriving. Each transition is a real stream event, never a timer.
export type ChartingPhase =
  | "contacting"
  | "surveying"
  | "resolving"
  | "drawing";

const CHARTING_STATUS: Record<Exclude<ChartingPhase, "drawing">, string> = {
  contacting: "contacting the model",
  surveying: "surveying the subject",
  resolving: "resolving knownodes",
};

export default function GraphBoard({
  manifest,
  topicId,
  initialKnown,
  charting = false,
}: {
  manifest: Manifest;
  topicId: string;
  initialKnown: string[];
  // Live-generation mode: nodes are still streaming in, nothing is persisted
  // yet — no node pages, no learner state, HUD reports charting progress.
  charting?: ChartingPhase | false;
}) {
  const { nodes, edges, topic } = manifest;

  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) {
      d.set(e.source, (d.get(e.source) ?? 0) + 1);
      d.set(e.target, (d.get(e.target) ?? 0) + 1);
    }
    return d;
  }, [edges]);

  const prereqOf = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of edges) {
      if (e.type !== "prerequisite") continue;
      m.set(e.target, [...(m.get(e.target) ?? []), e.source]);
    }
    return m;
  }, [edges]);

  const maxLevel = useMemo(
    () => Math.max(1, ...nodes.map((n) => n.level)),
    [nodes],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const posRef = useRef<Map<string, Vec>>(new Map());
  const alphaRef = useRef(1);
  const dragRef = useRef<{ id: string; moved: number } | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({
    positions: new Map(),
    running: true,
    dragging: false,
  });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [known, setKnown] = useState<Set<string>>(() => new Set(initialKnown));
  const [trace, setTrace] = useState<string[] | null>(null);

  // null during SSR/hydration, so server and client render identically.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => null);

  // Elapsed time since the charting board mounted — the HUD's proof that the
  // request is alive while the model is still silent. Tenths of a second so
  // it visibly moves.
  const isCharting = Boolean(charting);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isCharting) return;
    const start = performance.now();
    const id = setInterval(
      () => setElapsed((performance.now() - start) / 1000),
      100,
    );
    return () => clearInterval(id);
  }, [isCharting]);
  const elapsedLabel = `t+${Math.floor(elapsed / 60)}:${(elapsed % 60)
    .toFixed(1)
    .padStart(4, "0")}`;

  const statusOf = useMemo(() => {
    return (id: string): NodeStatus => {
      if (known.has(id)) return "known";
      const reqs = prereqOf.get(id) ?? [];
      return reqs.every((r) => known.has(r)) ? "open" : "locked";
    };
  }, [known, prereqOf]);

  const frontierCount = useMemo(
    () => nodes.filter((n) => statusOf(n.id) === "open").length,
    [nodes, statusOf],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // seed positions: x by prerequisite level, y spread deterministically.
  // Runs whenever nodes change so streamed-in nodes get seats too; existing
  // positions are never touched, and arrivals reheat the simulation.
  useEffect(() => {
    if (!size.w || !size.h) return;
    let added = false;
    nodes.forEach((n, i) => {
      if (posRef.current.has(n.id)) return;
      posRef.current.set(n.id, {
        x: PAD_X + (n.level / maxLevel) * (size.w - PAD_X * 2),
        y: PAD_TOP + (((i * 0.618034) % 1) * (size.h - PAD_TOP - PAD_BOTTOM)),
        vx: 0,
        vy: 0,
      });
      added = true;
    });
    // Reheat; the simulation publishes the new seats on its next frame.
    if (added) alphaRef.current = Math.max(alphaRef.current, 0.6);
  }, [size, nodes, maxLevel]);

  // force simulation
  useEffect(() => {
    if (!size.w || !size.h) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      alphaRef.current = Math.min(alphaRef.current, 0.3); // settle fast, no long animation

    const publish = (running: boolean) =>
      setView({
        positions: new Map(
          Array.from(posRef.current, ([id, v]) => [id, { x: v.x, y: v.y }]),
        ),
        running,
        dragging: Boolean(dragRef.current),
      });

    let raf = 0;
    let idle = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const a = alphaRef.current;
      if (a <= ALPHA_MIN && !dragRef.current) {
        if (!idle) {
          idle = true;
          publish(false);
        }
        return;
      }
      idle = false;

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
        const rest = e.type === "prerequisite" ? 210 : 270;
        const k = e.type === "prerequisite" ? 0.04 : 0.01;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = (k * (d - rest) * a) / d;
        p.vx += dx * f;
        p.vy += dy * f;
        q.vx -= dx * f;
        q.vy -= dy * f;
      }
      // firm spacing floor, resolved positionally (not via velocity) so
      // overlaps untangle even as the simulation cools; a dragged node stays
      // pinned and its neighbour takes the whole push
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const p = pts[i].p;
          const q = pts[j].p;
          let dx = q.x - p.x;
          const dy = q.y - p.y;
          if (!dx && !dy) dx = 0.5;
          const nd = Math.hypot(dx / SEP_X, dy / SEP_Y);
          if (nd >= 1) continue;
          const k = (1 / Math.max(nd, 0.2) - 1) * 0.35;
          const iPinned = dragRef.current?.id === pts[i].n.id;
          const jPinned = dragRef.current?.id === pts[j].n.id;
          if (!iPinned) {
            p.x -= dx * k * (jPinned ? 1 : 0.5);
            p.y -= dy * k * (jPinned ? 1 : 0.5);
          }
          if (!jPinned) {
            q.x += dx * k * (iPinned ? 1 : 0.5);
            q.y += dy * k * (iPinned ? 1 : 0.5);
          }
        }
      }
      for (const { n, p } of pts) {
        if (dragRef.current?.id === n.id) {
          p.vx = 0;
          p.vy = 0;
        } else {
          const tx = PAD_X + (n.level / maxLevel) * (size.w - PAD_X * 2);
          p.vx += (tx - p.x) * 0.08 * a;
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
      publish(true);
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
        setTrace(null);
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
    // The data-theme MutationObserver in subscribeTheme picks this up.
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("nl-theme", next);
    } catch {}
  };

  const markKnown = async (id: string, next: boolean) => {
    setKnown((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
    const res = await fetch("/api/known", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, nodeId: id, known: next }),
    });
    if (!res.ok) {
      setKnown((prev) => {
        const s = new Set(prev);
        if (next) s.delete(id);
        else s.add(id);
        return s;
      });
    }
  };

  // Prerequisite path: every not-yet-understood ancestor of the target,
  // topologically ordered — the curriculum the graph implies.
  const traceTo = (target: string) => {
    const needed = new Set<string>();
    const visit = (id: string) => {
      if (needed.has(id) || known.has(id)) return;
      needed.add(id);
      for (const r of prereqOf.get(id) ?? []) visit(r);
    };
    visit(target);

    const indegree = new Map<string, number>();
    for (const id of needed) indegree.set(id, 0);
    for (const e of edges) {
      if (e.type !== "prerequisite") continue;
      if (needed.has(e.source) && needed.has(e.target)) {
        indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
      }
    }
    const queue = [...needed].filter((id) => indegree.get(id) === 0).sort();
    const order: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const e of edges) {
        if (e.type !== "prerequisite" || e.source !== id) continue;
        if (!needed.has(e.target)) continue;
        const d = (indegree.get(e.target) ?? 0) - 1;
        indegree.set(e.target, d);
        if (d === 0) queue.push(e.target);
      }
    }
    setTrace(order);
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
    ? (prereqOf.get(selected.id) ?? [])
        .map((id) => nodes.find((n) => n.id === id))
        .filter((n): n is NonNullable<typeof n> => Boolean(n))
    : [];
  const unmet = selected
    ? prereqs.filter((p) => !known.has(p.id)).length
    : 0;
  const selectedStatus = selected ? statusOf(selected.id) : null;

  const traceSet = trace ? new Set(trace) : null;
  const traceIndex = trace
    ? new Map(trace.map((id, i) => [id, i + 1]))
    : null;

  const hovered =
    hoverId && hoverId !== selectedId && !view.dragging
      ? nodes.find((n) => n.id === hoverId) ?? null
      : null;
  const hoverPos = hovered ? view.positions.get(hovered.id) : null;

  const label = (title: string) => title.split(" & ")[0];

  return (
    <div ref={containerRef} className="board">
      {charting && (
        // Breathing glow where the graph will resolve; the first knownode
        // visually takes over from it.
        <div
          className={nodes.length ? "pulse off" : "pulse"}
          aria-hidden="true"
        />
      )}
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
            const p = view.positions.get(e.source);
            const t = view.positions.get(e.target);
            if (!p || !t) return null;
            const touchesSelected =
              selectedId !== null &&
              (e.source === selectedId || e.target === selectedId);
            const base = e.type === "prerequisite" ? 0.38 : 0.14;
            const inTrace =
              traceSet &&
              e.type === "prerequisite" &&
              traceSet.has(e.source) &&
              traceSet.has(e.target);
            const dimmed = traceSet
              ? !inTrace
              : matchSet && !matchSet.has(e.source) && !matchSet.has(e.target);
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={t.x}
                y2={t.y}
                stroke={inTrace || touchesSelected ? "var(--ink)" : "var(--muted)"}
                strokeWidth={e.type === "prerequisite" ? 1.2 : 1}
                opacity={
                  dimmed
                    ? base * 0.2
                    : inTrace
                      ? 0.8
                      : touchesSelected
                        ? Math.min(base * 1.8, 0.75)
                        : base
                }
              />
            );
          })}

          {nodes.map((n) => {
            const p = view.positions.get(n.id);
            if (!p) return null;
            const deg = degree.get(n.id) ?? 1;
            const r = 4 + Math.min(4, deg * 0.6);
            const isSel = n.id === selectedId;
            const isHover = n.id === hoverId;
            const status = statusOf(n.id);
            const inTrace = traceSet?.has(n.id) ?? false;
            const dimmed = traceSet
              ? !inTrace && !isSel
              : matchSet
                ? !matchSet.has(n.id)
                : false;

            // brightness carries learner state: frontier brightest, then
            // locked territory, then what's already understood (settled)
            const groupOpacity = dimmed
              ? 0.15
              : status === "known"
                ? 0.4
                : status === "locked" && !inTrace
                  ? 0.65
                  : 1;
            const fill = isSel
              ? "var(--bright)"
              : status === "open" || inTrace
                ? "var(--ink)"
                : "var(--muted)";
            const glowScale =
              isSel ? 2.6 : isHover ? 1.7 : status === "open" ? 1.3 : 0.6;

            return (
              <g
                key={n.id}
                className="knownode"
                transform={`translate(${p.x},${p.y})`}
                opacity={groupOpacity}
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
                  style={{ opacity: `calc(var(--glow) * ${glowScale})` }}
                />
                <circle r={Math.max(r + 12, 16)} fill="transparent" />
                <circle r={isSel ? r + 1.5 : r} fill={fill} />
                {isSel && (
                  <circle
                    r={r + 10}
                    fill="none"
                    stroke="var(--bright)"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                )}
                {inTrace && traceIndex && (
                  <text
                    y={-(r + 10)}
                    textAnchor="middle"
                    className="node-label trace-index"
                    pointerEvents="none"
                    fill="var(--bright)"
                  >
                    {traceIndex.get(n.id)}
                  </text>
                )}
                <text
                  y={r + 22}
                  textAnchor="middle"
                  className="node-label"
                  pointerEvents="none"
                  fill={
                    isSel
                      ? "var(--bright)"
                      : status === "open" || inTrace
                        ? "var(--ink)"
                        : "var(--muted)"
                  }
                  fontWeight={isSel || inTrace ? 500 : 400}
                >
                  {label(n.title)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      <div className="hud hud-tl">
        <Link href="/" className="wordmark">
          nodeledge
        </Link>
        <span
          className={
            charting === "contacting" || charting === "surveying"
              ? "hud-title pending"
              : "hud-title"
          }
        >
          / {topic.title.toLowerCase()}
        </span>
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
          placeholder="search this graph"
          aria-label="Search knownodes"
          spellCheck={false}
        />
        <span className="kbd">⌘K</span>
      </div>

      <div className="hud hud-tr">
        {!charting && (
          <span>
            {known.size}/{nodes.length} understood
          </span>
        )}
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
        <span>
          {charting
            ? charting === "drawing"
              ? `charting the territory · ${nodes.length} knownode${nodes.length === 1 ? "" : "s"}`
              : CHARTING_STATUS[charting]
            : `layout: force · ${view.running ? "running" : "settled"}`}
          {charting && <span className="cursor" aria-hidden="true" />}
        </span>
      </div>

      <div className="hud hud-br">
        <span className={charting ? "elapsed" : undefined}>
          {charting
            ? elapsedLabel
            : trace
              ? `trace: ${trace.length} step${trace.length === 1 ? "" : "s"}`
              : matchSet
                ? `${matchSet.size} match${matchSet.size === 1 ? "" : "es"}`
                : `${frontierCount} within reach`}
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
          <p className="eyebrow">
            {selectedStatus === "known"
              ? "understood"
              : selectedStatus === "open"
                ? "within reach"
                : `${unmet} prerequisite${unmet === 1 ? "" : "s"} unmet`}
          </p>
          <h2>{selected.title}</h2>
          <p className="summary">{selected.summary}</p>
          <p className="row">
            prerequisites{prereqs.length === 0 && ": none — an entry point"}
            {prereqs.map((p) => (
              <button
                key={p.id}
                className="chip"
                style={known.has(p.id) ? { opacity: 0.5 } : undefined}
                onClick={() => setSelectedId(p.id)}
              >
                {label(p.title).toLowerCase()}
              </button>
            ))}
          </p>
          {!charting && (
            <p className="row" style={{ marginTop: 14 }}>
              <Link href={`/t/${topicId}/node/${selected.id}`} className="action">
                open node →
              </Link>
              <button
                className="chip"
                onClick={() =>
                  markKnown(selected.id, selectedStatus !== "known")
                }
              >
                {selectedStatus === "known" ? "unmark ×" : "mark as understood"}
              </button>
              {selectedStatus === "locked" && (
                <button className="chip" onClick={() => traceTo(selected.id)}>
                  trace prerequisites
                </button>
              )}
            </p>
          )}
        </div>
      )}

      {trace && (
        <div className="panel trace-panel">
          <button
            className="close"
            onClick={() => setTrace(null)}
            aria-label="Clear trace"
          >
            ×
          </button>
          <p className="eyebrow">prerequisite path</p>
          <p className="row trace-steps">
            {trace.map((id, i) => {
              const n = nodes.find((x) => x.id === id);
              if (!n) return null;
              return (
                <button
                  key={id}
                  className="chip"
                  onClick={() => setSelectedId(id)}
                >
                  {i + 1} · {label(n.title).toLowerCase()}
                </button>
              );
            })}
          </p>
        </div>
      )}
    </div>
  );
}
