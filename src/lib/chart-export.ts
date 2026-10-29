import { performanceUrl } from "@/lib/field-velocity/navigation";

export type ChartLegendEntry = { label: string; color: string; marker?: "circle" | "square" | "triangle" | "line" | "dashed" };
export type ChartExport = { svg: SVGSVGElement; title: string; anchor: string; notes: string[]; legend?: ChartLegendEntry[] };
export type ChartImage = { svg: string; width: number; height: number; url: string; title: string };
const NS = "http://www.w3.org/2000/svg";
const tags = new Set(["svg", "g", "path", "line", "polyline", "polygon", "rect", "circle", "ellipse", "text", "tspan", "title", "desc"]);
const attributes = new Set(["viewBox", "preserveAspectRatio", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "d", "points", "dx", "dy", "transform", "textLength", "lengthAdjust"]);
const styles = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "opacity", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "paint-order", "letter-spacing"];
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** Share only the stable origin/path/validated fragment, never credentials or query tokens.
 * Navigation and the existing Copy link controls retain their original URL contract. */
export function chartShareUrl(current: string, anchor: string) {
  const url = new URL(performanceUrl(current, anchor));
  if (!/^https?:$/.test(url.protocol)) throw new Error("Chart links require HTTP(S)");
  url.username = ""; url.password = ""; url.search = "";
  return url.href;
}

function resolved(value: string, source: Element): string {
  const view = source.ownerDocument.defaultView!;
  let output = value;
  for (let depth = 0; depth < 5 && output.includes("var("); depth++) {
    output = output.replace(/var\((--[\w-]+)(?:,\s*([^()]+))?\)/g, (_, name, fallback) => {
      let node: Element | null = source;
      while (node) {
        const token = view.getComputedStyle(node).getPropertyValue(name).trim();
        if (token) return token;
        node = node.parentElement;
      }
      return fallback ?? "";
    });
  }
  if (output === "currentColor") output = view.getComputedStyle(source).color;
  // No CSS resource loads, active markup, or unresolved custom properties.
  return /url\s*\(|var\s*\(|[<>]/i.test(output) ? "" : output;
}

/** Geometry-only allowlist: no HTML, links, images, stylesheets, scripts or resources. */
function safePlot(source: Element): Element | null {
  if (!tags.has(source.localName) || source.getAttribute("role") === "tooltip" || source.hasAttribute("data-export-exclude")) return null;
  const doc = source.ownerDocument;
  const result = doc.createElementNS(NS, source.localName);
  for (const attr of source.attributes) {
    if (attributes.has(attr.name) || /^data-(source-observation|curve-point|value|trend-point|date|term|target-line|extrapolation-line|confidence|under-indexed|annotation-key|annotation-leader)$/.test(attr.name)) result.setAttribute(attr.name, attr.value);
  }
  const computed = doc.defaultView!.getComputedStyle(source);
  for (const name of styles) {
    // Explicit mark paint is the data/style contract, not pointer-only CSS emphasis.
    const value = resolved((source as SVGElement).style.getPropertyValue(name) || source.getAttribute(name) || computed.getPropertyValue(name) || "", source);
    if (value) result.setAttribute(name, value);
  }
  for (const name of ["r", "stroke-width"]) {
    const value = source.getAttribute(`data-export-${name}`);
    if (value && /^\d+(\.\d+)?$/.test(value)) result.setAttribute(name, value);
  }
  // Use a portable font, not an unavailable external webfont in an SVG image.
  if (["text", "tspan"].includes(source.localName)) result.setAttribute("font-family", "Arial, Helvetica, sans-serif");
  for (const child of source.childNodes) {
    if (child.nodeType === 3) result.append(doc.createTextNode(child.textContent ?? ""));
    else if (child.nodeType === 1) { const clean = safePlot(child as Element); if (clean) result.append(clean); }
  }
  return result;
}

function wrap(text: string, columns: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    // Also bound long links/unbroken source names, without losing any characters.
    const chunks = word.match(new RegExp(`.{1,${columns}}`, "gu")) ?? [""];
    for (const chunk of chunks) {
      if (line && line.length + chunk.length + 1 > columns) { lines.push(line); line = ""; }
      line += `${line ? " " : ""}${chunk}`;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Snapshot synchronously on the click: never screenshot a clipped viewport or UI. */
export function buildChartImage(chart: ChartExport, currentUrl: string): ChartImage {
  const { svg: source, title, anchor } = chart;
  const box = (source.getAttribute("viewBox") ?? "").trim().split(/[ ,]+/).map(Number);
  if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) throw new Error("Chart has no usable viewBox");
  const [x, y, sourceWidth, sourceHeight] = box;
  const url = chartShareUrl(currentUrl, anchor);
  const width = 1200, inset = 48, plotWidth = width - inset * 2;
  const plotHeight = sourceHeight * plotWidth / sourceWidth;
  const background = resolved(source.ownerDocument.defaultView!.getComputedStyle(source).getPropertyValue("--surface"), source) || "#ffffff";
  const ink = resolved(source.ownerDocument.defaultView!.getComputedStyle(source).getPropertyValue("--foreground"), source) || "#172033";
  const body: string[] = [];
  let cursor = 40;
  const text = (content: string, size = 18, bold = false, left = inset) => {
    for (const line of wrap(content, Math.floor((width - inset - left) / (size * .62)))) {
      cursor += size * 1.45;
      body.push(`<text x="${left}" y="${cursor}" fill="${escape(ink)}" font-family="Arial, Helvetica, sans-serif" font-size="${size}"${bold ? ' font-weight="700"' : ""}>${escape(line)}</text>`);
    }
  };
  text(title, 30, true);
  cursor += 24;
  const clone = safePlot(source)!;
  clone.setAttribute("x", String(inset)); clone.setAttribute("y", String(cursor));
  clone.setAttribute("width", String(plotWidth)); clone.setAttribute("height", String(plotHeight));
  clone.setAttribute("viewBox", `${x} ${y} ${sourceWidth} ${sourceHeight}`);
  body.push(new source.ownerDocument.defaultView!.XMLSerializer().serializeToString(clone));
  cursor += plotHeight + 12;
  for (const entry of chart.legend ?? []) {
    const color = escape(resolved(entry.color, source) || ink);
    const cy = cursor + 21;
    const marker = entry.marker === "line" || entry.marker === "dashed"
      ? `<line x1="48" x2="70" y1="${cy}" y2="${cy}" stroke="${color}" stroke-width="3"${entry.marker === "dashed" ? ' stroke-dasharray="7 3"' : ""}/>`
      : entry.marker === "square" ? `<rect x="50" y="${cy - 6}" width="12" height="12" fill="${color}"/>`
      : entry.marker === "triangle" ? `<polygon points="56,${cy - 7} 63,${cy + 6} 49,${cy + 6}" fill="${color}"/>`
      : `<circle cx="56" cy="${cy}" r="6" fill="${color}"/>`;
    body.push(marker); text(entry.label, 18, false, 82);
  }
  cursor += 12;
  for (const note of chart.notes.filter(Boolean)) { text(note); cursor += 8; }
  cursor += 12;
  text("Neuro Atlas", 20, true); text(url, 16);
  const height = Math.ceil(cursor + 40);
  // Fail explicitly rather than silently clipping scientific scope or overflowing a canvas.
  if (height > 6000 || body.join("").length > 4_000_000) throw new Error("Chart export exceeds safe image bounds");
  return { svg: `<svg xmlns="${NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${escape(background)}"/>${body.join("")}</svg>`, width, height, url, title };
}

export async function chartPng(image: ChartImage): Promise<Blob> {
  const blob = new Blob([image.svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Chart image could not be rendered")); img.src = url; });
    const canvas = document.createElement("canvas");
    // 2× normally; cap large charts at 16MP and 8192px per side.
    const scale = Math.min(2, 8192 / Math.max(image.width, image.height), Math.sqrt(16_000_000 / (image.width * image.height)));
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result?.type === "image/png" ? resolve(result) : reject(new Error("PNG export unavailable")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

async function richHtml(png: Blob, image: ChartImage) {
  const bytes = new Uint8Array(await png.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return new Blob([`<p><img src="data:image/png;base64,${btoa(binary)}" alt="${escape(image.title)}" /></p><p><a href="${escape(image.url)}">${escape(image.title)} — Neuro Atlas</a></p>`], { type: "text/html" });
}

/** Start the native write in the gesture, with promise-valued representations (Safari). */
export async function copyChartImage(image: ChartImage) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write || (ClipboardItem.supports && (!ClipboardItem.supports("image/png") || !ClipboardItem.supports("text/plain")))) throw new Error("Image clipboard unavailable");
  const png = chartPng(image);
  const data: Record<string, Blob | Promise<Blob>> = { "image/png": png, "text/plain": new Blob([image.url], { type: "text/plain" }) };
  if (!ClipboardItem.supports || ClipboardItem.supports("text/html")) data["text/html"] = png.then(blob => richHtml(blob, image));
  // A denied write can reject before the deferred image. Always consume rejections.
  for (const value of Object.values(data)) if (value instanceof Promise) void value.catch(() => {});
  await navigator.clipboard.write([new ClipboardItem(data)]);
}

export async function downloadChartImage(image: ChartImage) {
  const png = await chartPng(image);
  const url = URL.createObjectURL(png);
  const link = document.createElement("a");
  link.href = url; link.download = `neuro-atlas-${new URL(image.url).hash.slice(1)}.png`;
  document.body.append(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
