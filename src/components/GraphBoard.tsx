"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Manifest, ManifestEdge, ManifestNode } from "@/lib/topic";

type Vec = { x: number; y: number; vx: number; vy: number };
type Seat = { x: number; y: number };
type Cam = { k: number; x: number; y: number };
type NodeStatus = "known" | "open" | "locked";

// What render reads: an immutable snapshot the simulation publishes each
// frame — the mutable Vec map stays inside the loop, out of render.
type View = {
  positions: ReadonlyMap<string, { x: number; y: number }>;
  cam: Cam;
  dragging: boolean;
};

// Anchored constellation: a deterministic layered layout decides where every
// knownode belongs (its seat); springs decide how it behaves. Drag a node and
// the disturbance travels through its edges — prerequisites tug along — then
// the map settles back into shape. Layout carries the meaning, physics
// carries the feel; no arrangement the user makes can outlive letting go.
const COL_GAP = 250; // world px between prerequisite layers
const ROW_GAP = 92; // vertical clearance inside a layer (labels need room)
const SWEEPS = 14; // barycenter ordering iterations
const RELATED_W = 0.3; // pull of related edges on row ordering
const HOME_K = 0.028; // spring toward the seat
const EDGE_K = { prerequisite: 0.016, related: 0.006 } as const;
const DAMPING = 0.86;
const BREATHE = 1.4; // sub-pixel drift amplitude at rest
const FLICK_MAX = 40; // velocity cap when a drag releases mid-throw
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

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

// Column = longest prerequisite path from any entry point. More robust than
// the model-provided level field, and it keeps streamed-in nodes honest: a
// node parks at column 0 until its prerequisite edge arrives, then glides
// right on its spring.
function computeDepth(
  nodes: ManifestNode[],
  prereqOf: Map<string, string[]>,
): Map<string, number> {
  const m = new Map<string, number>();
  const visiting = new Set<string>();
  const d = (id: string): number => {
    const have = m.get(id);
    if (have !== undefined) return have;
    if (visiting.has(id)) return 0; // cycle guard; sanitizeGraph forbids these
    visiting.add(id);
    const reqs = prereqOf.get(id) ?? [];
    const v = reqs.length ? Math.max(...reqs.map(d)) + 1 : 0;
    m.set(id, v);
    return v;
  };
  for (const n of nodes) d(n.id);
  return m;
}

// Sugiyama-lite: nodes group into columns by prerequisite depth; rows within
// a column are ordered by the weighted mean row of their neighbors
// (barycenter sweeps), which removes most edge crossings. Deterministic: the
// same graph always draws the same map.
function layeredLayout(
  nodes: ManifestNode[],
  edges: ManifestEdge[],
  depth: Map<string, number>,
): Map<string, Seat> {
  const ids = new Set(nodes.map((n) => n.id));
  const cols = new Map<number, string[]>();
  for (const n of nodes) {
    const c = depth.get(n.id) ?? 0;
    cols.set(c, [...(cols.get(c) ?? []), n.id]);
  }
  const colKeys = [...cols.keys()].sort((a, b) => a - b);

  const nb = new Map<string, { id: string; w: number }[]>();
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    const w = e.type === "prerequisite" ? 1 : RELATED_W;
    nb.set(e.source, [...(nb.get(e.source) ?? []), { id: e.target, w }]);
    nb.set(e.target, [...(nb.get(e.target) ?? []), { id: e.source, w }]);
  }

  const y = new Map<string, number>();
  for (const c of colKeys) {
    const col = cols.get(c)!;
    col.forEach((id, i) => y.set(id, (i - (col.length - 1) / 2) * ROW_GAP));
  }

  for (let it = 0; it < SWEEPS; it++) {
    const keys = it % 2 ? [...colKeys].reverse() : colKeys;
    for (const c of keys) {
      const col = cols.get(c)!;
      const wish = new Map<string, number>();
      for (const id of col) {
        let sum = 0;
        let wsum = 0;
        for (const { id: m, w } of nb.get(id) ?? []) {
          const my = y.get(m);
          if (my === undefined) continue;
          sum += my * w;
          wsum += w;
        }
        wish.set(id, wsum ? sum / wsum : y.get(id)!);
      }
      col.sort((a, b) => wish.get(a)! - wish.get(b)! || a.localeCompare(b));
      // place at wished rows, sweep down enforcing the gap, then re-center
      // so the enforcement doesn't drift the column
      const placed = col.map((id) => wish.get(id)!);
      for (let i = 1; i < placed.length; i++) {
        placed[i] = Math.max(placed[i], placed[i - 1] + ROW_GAP);
      }
      const off =
        placed.reduce((s, v) => s + v, 0) / placed.length -
        col.reduce((s, id) => s + wish.get(id)!, 0) / col.length;
      col.forEach((id, i) => y.set(id, placed[i] - off));
    }
  }

  const seats = new Map<string, Seat>();
  for (const c of colKeys) {
    for (const id of cols.get(c)!) {
      seats.set(id, { x: c * COL_GAP, y: y.get(id)! });
    }
  }
  return seats;
}

function fitCam(seats: Map<string, Seat>, w: number, h: number): Cam {
  if (!seats.size || !w || !h) return { k: 1, x: 0, y: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of seats.values()) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }
  const bw = Math.max(maxX - minX, 1) + 200; // label + glow margin
  const bh = Math.max(maxY - minY, 1) + 170;
  const k = Math.min((w - 120) / bw, (h - 200) / bh, 1.35);
  return {
    k,
    x: w / 2 - ((minX + maxX) / 2) * k,
    y: h / 2 - ((minY + maxY) / 2) * k + 14,
  };
}

function norm(x: number, y: number) {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

// Flow curve for a prerequisite edge: leaves the source horizontally and
// arrives horizontally, shortened at both ends so the chevron sits clear of
// the node dot. Brightness ramps toward the target — the direction of
// learning made visible.
function prereqGeometry(p: Seat, q: Seat, rS: number, rT: number) {
  const dx = q.x - p.x;
  const bend = Math.max(Math.abs(dx) * 0.45, 40) * (dx >= 0 ? 1 : -1);
  const c1 = { x: p.x + bend, y: p.y };
  const c2 = { x: q.x - bend, y: q.y };
  const inD = norm(q.x - c2.x, q.y - c2.y);
  const outD = norm(c1.x - p.x, c1.y - p.y);
  const start = { x: p.x + outD.x * (rS + 4), y: p.y + outD.y * (rS + 4) };
  const end = { x: q.x - inD.x * (rT + 7), y: q.y - inD.y * (rT + 7) };
  const perp = { x: -inD.y, y: inD.x };
  return {
    d: `M${start.x},${start.y}C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`,
    start,
    end,
    chev:
      `M${end.x},${end.y}` +
      `L${end.x - inD.x * 6 + perp.x * 3.2},${end.y - inD.y * 6 + perp.y * 3.2}` +
      `L${end.x - inD.x * 6 - perp.x * 3.2},${end.y - inD.y * 6 - perp.y * 3.2}Z`,
  };
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

  const depth = useMemo(
    () => computeDepth(nodes, prereqOf),
    [nodes, prereqOf],
  );

  const seats = useMemo(
    () => layeredLayout(nodes, edges, depth),
    [nodes, edges, depth],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const posRef = useRef<Map<string, Vec>>(new Map());
  const tgtRef = useRef<Map<string, Seat>>(new Map());
  const restRef = useRef<Map<number, number>>(new Map());
  const phaseRef = useRef<Map<string, number>>(new Map());
  const camRef = useRef<Cam>({ k: 1, x: 0, y: 0 });
  const camTgtRef = useRef<Cam>({ k: 1, x: 0, y: 0 });
  const firstFitRef = useRef(true);
  const dragRef = useRef<{
    id: string;
    moved: number;
    lvx: number;
    lvy: number;
  } | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({
    positions: new Map(),
    cam: { k: 1, x: 0, y: 0 },
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

  // Apply the computed layout: seats become spring anchors, edge rest lengths
  // are the seat distances (so springs are relaxed exactly at the layout),
  // and new arrivals seed just left of their seat and glide in. Existing
  // positions are never touched — the springs carry nodes to moved seats.
  useEffect(() => {
    if (!size.w || !size.h) return;
    tgtRef.current = seats;
    const rest = new Map<number, number>();
    edges.forEach((e, i) => {
      const a = seats.get(e.source);
      const b = seats.get(e.target);
      if (a && b) rest.set(i, Math.hypot(b.x - a.x, b.y - a.y));
    });
    restRef.current = rest;
    nodes.forEach((n, i) => {
      // golden-angle phases so no two nodes breathe in sync
      if (!phaseRef.current.has(n.id)) {
        phaseRef.current.set(n.id, i * 2.39996);
      }
      if (!posRef.current.has(n.id)) {
        const s = seats.get(n.id)!;
        posRef.current.set(n.id, { x: s.x - 30, y: s.y, vx: 0, vy: 0 });
      }
    });
    camTgtRef.current = fitCam(seats, size.w, size.h);
    if (firstFitRef.current) {
      firstFitRef.current = false;
      camRef.current = { ...camTgtRef.current };
    }
  }, [seats, nodes, edges, size]);

  // spring simulation
  useEffect(() => {
    if (!size.w || !size.h) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const publish = () =>
      setView({
        positions: new Map(
          Array.from(posRef.current, ([id, v]) => [id, { x: v.x, y: v.y }]),
        ),
        cam: { ...camRef.current },
        dragging: Boolean(dragRef.current),
      });

    let raf = 0;
    let idle = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cam = camRef.current;
      const ct = camTgtRef.current;
      const camActive =
        Math.abs(cam.k - ct.k) > 1e-4 ||
        Math.abs(cam.x - ct.x) > 0.2 ||
        Math.abs(cam.y - ct.y) > 0.2;
      if (camActive) {
        const ck = reduced ? 1 : 0.16;
        cam.k += (ct.k - cam.k) * ck;
        cam.x += (ct.x - cam.x) * ck;
        cam.y += (ct.y - cam.y) * ck;
      } else {
        Object.assign(cam, ct);
      }

      // Reduced motion: no springs, no breathing — nodes sit at their seats,
      // and the loop idles once everything is in place.
      if (reduced) {
        let moved = false;
        for (const [id, p] of posRef.current) {
          if (dragRef.current?.id === id) {
            moved = true;
            continue;
          }
          const s = tgtRef.current.get(id);
          if (!s) continue;
          if (p.x !== s.x || p.y !== s.y) {
            p.x = s.x;
            p.y = s.y;
            moved = true;
          }
          p.vx = 0;
          p.vy = 0;
        }
        if (!camActive && !moved && !dragRef.current) {
          if (!idle) {
            idle = true;
            publish();
          }
          return;
        }
        idle = false;
        publish();
        return;
      }

      const now = performance.now();
      // disturbances travel through the edges
      edges.forEach((e, i) => {
        const rest = restRef.current.get(i);
        const p = posRef.current.get(e.source);
        const q = posRef.current.get(e.target);
        if (rest === undefined || !p || !q) return;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = (EDGE_K[e.type] * (d - rest)) / d;
        p.vx += dx * f;
        p.vy += dy * f;
        q.vx -= dx * f;
        q.vy -= dy * f;
      });
      for (const [id, p] of posRef.current) {
        if (dragRef.current?.id === id) {
          p.vx = 0;
          p.vy = 0;
          continue;
        }
        const s = tgtRef.current.get(id);
        if (!s) continue;
        // home spring toward the seat, with a faint breathing offset at rest
        const ph = phaseRef.current.get(id) ?? 0;
        const ox = Math.sin(now * 0.00045 + ph) * BREATHE;
        const oy = Math.cos(now * 0.00038 + ph * 1.7) * BREATHE;
        p.vx += (s.x + ox - p.x) * HOME_K;
        p.vy += (s.y + oy - p.y) * HOME_K;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
      }
      publish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, nodes, edges]);

  // Wheel zoom, anchored at the cursor. Native listener: React's onWheel is
  // passive, and we need preventDefault to keep the page from scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const cam = camRef.current;
      const k2 = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, cam.k * Math.exp(-ev.deltaY * 0.0016)),
      );
      const wx = (ev.clientX - cam.x) / cam.k;
      const wy = (ev.clientY - cam.y) / cam.k;
      cam.k = k2;
      cam.x = ev.clientX - wx * k2;
      cam.y = ev.clientY - wy * k2;
      camTgtRef.current = { ...cam };
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
    const cam = camRef.current;
    const offX = p.x - (e.clientX - cam.x) / cam.k;
    const offY = p.y - (e.clientY - cam.y) / cam.k;
    dragRef.current = { id, moved: 0, lvx: 0, lvy: 0 };

    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      d.moved += Math.abs(ev.movementX) + Math.abs(ev.movementY);
      d.lvx = ev.movementX / camRef.current.k;
      d.lvy = ev.movementY / camRef.current.k;
      p.x = (ev.clientX - camRef.current.x) / camRef.current.k + offX;
      p.y = (ev.clientY - camRef.current.y) / camRef.current.k + offY;
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (d && d.moved < 5) {
        setSelectedId((prev) => (prev === id ? null : id));
      } else if (d) {
        // a flick carries through: the node springs home with the throw's
        // momentum, and its neighbors ripple
        p.vx = Math.max(-FLICK_MAX, Math.min(FLICK_MAX, d.lvx * 0.8));
        p.vy = Math.max(-FLICK_MAX, Math.min(FLICK_MAX, d.lvy * 0.8));
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const cam = camRef.current;
    const start = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
    const move = (ev: PointerEvent) => {
      cam.x = start.cx + (ev.clientX - start.x);
      cam.y = start.cy + (ev.clientY - start.y);
      camTgtRef.current = { k: cam.k, x: cam.x, y: cam.y };
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const refit = () => {
    camTgtRef.current = fitCam(tgtRef.current, size.w, size.h);
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
  const hoverWorld = hovered ? view.positions.get(hovered.id) : null;
  const hoverPos = hoverWorld
    ? {
        x: hoverWorld.x * view.cam.k + view.cam.x,
        y: hoverWorld.y * view.cam.k + view.cam.y,
      }
    : null;

  const radiusOf = (id: string) =>
    4 + Math.min(4, (degree.get(id) ?? 1) * 0.6);

  const label = (title: string) => title.split(" & ")[0];

  // "start here" floats over the entry column until something is understood
  const entryCaption = useMemo(() => {
    if (isCharting || known.size > 0) return null;
    let x = 0;
    let top = Infinity;
    for (const n of nodes) {
      if ((depth.get(n.id) ?? 0) !== 0) continue;
      const s = seats.get(n.id);
      if (!s) continue;
      x = s.x;
      top = Math.min(top, s.y);
    }
    return top < Infinity ? { x, y: top - 52 } : null;
  }, [isCharting, known, nodes, depth, seats]);

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
            if (e.target !== e.currentTarget) return;
            setSelectedId(null);
            startPan(e);
          }}
          onDoubleClick={(e) => {
            if (e.target === e.currentTarget) refit();
          }}
        >
          <defs>
            <radialGradient id="nl-glow">
              <stop offset="0%" stopColor="var(--bright)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--bright)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g
            transform={`translate(${view.cam.x},${view.cam.y}) scale(${view.cam.k})`}
          >
            <g pointerEvents="none">
              {edges.map((e, i) => {
                const p = view.positions.get(e.source);
                const t = view.positions.get(e.target);
                if (!p || !t) return null;
                const isPre = e.type === "prerequisite";
                const touchesSelected =
                  selectedId !== null &&
                  (e.source === selectedId || e.target === selectedId);
                const inTrace =
                  traceSet &&
                  isPre &&
                  traceSet.has(e.source) &&
                  traceSet.has(e.target);
                const dimmed = traceSet
                  ? !inTrace
                  : matchSet &&
                    !matchSet.has(e.source) &&
                    !matchSet.has(e.target);
                const highlight = Boolean(inTrace) || touchesSelected;
                const base = isPre ? 1 : 0.14;
                const opacity = dimmed
                  ? base * 0.2
                  : inTrace
                    ? 0.8
                    : touchesSelected
                      ? isPre
                        ? 0.75
                        : Math.min(base * 1.8, 0.75)
                      : base;

                if (!isPre) {
                  return (
                    <line
                      key={i}
                      x1={p.x}
                      y1={p.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={highlight ? "var(--ink)" : "var(--muted)"}
                      strokeWidth={1}
                      opacity={opacity}
                    />
                  );
                }
                const geo = prereqGeometry(
                  p,
                  t,
                  radiusOf(e.source),
                  radiusOf(e.target),
                );
                return (
                  <g key={i} opacity={opacity}>
                    <linearGradient
                      id={`ge-${i}`}
                      gradientUnits="userSpaceOnUse"
                      x1={geo.start.x}
                      y1={geo.start.y}
                      x2={geo.end.x}
                      y2={geo.end.y}
                    >
                      <stop
                        offset="0%"
                        style={{ stopColor: "var(--ink)" }}
                        stopOpacity="0.1"
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: "var(--ink)" }}
                        stopOpacity="0.62"
                      />
                    </linearGradient>
                    <path
                      d={geo.d}
                      fill="none"
                      stroke={highlight ? "var(--ink)" : `url(#ge-${i})`}
                      strokeWidth={1.2}
                    />
                    <path
                      d={geo.chev}
                      fill="var(--ink)"
                      opacity={highlight ? 0.9 : 0.55}
                    />
                  </g>
                );
              })}
            </g>

            {entryCaption && (
              <text
                x={entryCaption.x}
                y={entryCaption.y}
                textAnchor="middle"
                className="entry-caption"
                fill="var(--muted)"
                pointerEvents="none"
              >
                entry points — start here
              </text>
            )}

            {nodes.map((n) => {
              const p = view.positions.get(n.id);
              if (!p) return null;
              const r = radiusOf(n.id);
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
          </g>
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
            : "layout: anchored"}
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
        <button className="hud-btn" onClick={refit} title="Fit graph to view">
          fit
        </button>
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
