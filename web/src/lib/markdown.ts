import katex from "katex";

// Minimal renderer for the subset of Markdown the package format allows in
// node bodies (h2–h4, paragraphs, lists, bold/italic/code, TeX math).
// No HTML passthrough.

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Placeholder delimiter for stashed spans: NUL cannot occur in markdown text.
const NUL = String.fromCharCode(0);
const RESTORE = new RegExp(`${NUL}(\\d+)${NUL}`, "g");

// Code spans and math are lifted out before escaping/formatting (so `$`, `_`,
// `*`, `<` inside them survive — and a `$` in code can't pair with a `$` in
// prose), then spliced back at the end.
function inline(s: string): string {
  const stash: string[] = [];
  const put = (html: string) => {
    stash.push(html);
    return `${NUL}${stash.length - 1}${NUL}`;
  };
  const tex = (t: string, displayMode: boolean) =>
    put(katex.renderToString(t, { displayMode, throwOnError: false }));
  const text = s
    .replace(/`([^`]+)`/g, (_, code: string) =>
      put(`<code>${escapeHtml(code)}</code>`),
    )
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t: string) => tex(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t: string) => tex(t, true))
    .replace(/\\\((.+?)\\\)/g, (_, t: string) => tex(t, false))
    // $inline$: no whitespace just inside the delimiters and no digit after
    // the closing one, so "$5 and $10" stays prose (pandoc's rule)
    .replace(/\$(?!\s)([^$\n]*[^$\s])\$(?!\d)/g, (_, t: string) =>
      tex(t, false),
    );
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(RESTORE, (_, i: string) => stash[Number(i)]);
}

export function renderMarkdown(md: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
      list = null;
    }
  };

  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{2,4})\s+(.*)/);
    if (heading) {
      flushPara();
      flushList();
      const depth = heading[1].length;
      out.push(`<h${depth}>${inline(heading[2])}</h${depth}>`);
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)/);
    if (item) {
      flushPara();
      (list ??= []).push(item[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join("\n");
}
