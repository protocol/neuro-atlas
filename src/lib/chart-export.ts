import { performanceUrl } from "@/lib/field-velocity/navigation";
import { performanceTarget } from "@/data/field-velocity-links";
import { recordingViewQuery, recordingViewToken } from "@/lib/recording-view";
import { EXPORT_BLUE, PL_RESEARCH_LOGO } from "@/lib/chart-export-brand";

export type ChartLegendEntry = { label: string; color: string; marker?: "circle" | "square" | "triangle" | "line" | "dashed" };
export type ChartExport = { svg: SVGSVGElement; title: string; anchor: string; notes: string[]; captionNotes?: string[]; legend?: ChartLegendEntry[] };
export type ChartImage = { svg: string; width: number; height: number; url: string; title: string };
const NS = "http://www.w3.org/2000/svg";
const tags = new Set(["svg", "g", "path", "line", "polyline", "polygon", "rect", "circle", "ellipse", "text", "tspan", "title", "desc"]);
const attributes = new Set(["viewBox", "preserveAspectRatio", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "d", "points", "dx", "dy", "transform", "textLength", "lengthAdjust"]);
const styles = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "opacity", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "paint-order", "letter-spacing"];
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const INK = "#172033";
// SVG-image decoding cannot rely on the page's loaded webfont. These system
// faces are metric-compatible; Linux rasterizers resolve Arial to Liberation Sans.
const EXPORT_FONT = "Arial, Helvetica, Liberation Sans, sans-serif";

function colorKey(value: string) {
  const color = value.trim().toLowerCase();
  if (color === "white") return "#ffffff";
  if (color === "black") return "#000000";
  if (/^#[\da-f]{3}$/.test(color)) return `#${[...color.slice(1)].map(c => c + c).join("")}`;
  const rgb = color.match(/^rgb\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)\s*\)$/);
  return rgb ? `#${rgb.slice(1).map(c => Number(c).toString(16).padStart(2, "0")).join("")}` : color;
}

/** Match the actual resolved theme, not a presumed dark-mode hex palette.
 * Only neutral theme paints change; quantitative series colors remain intact. */
function exportPalette(source: Element) {
  const palette = new Map<string, string>();
  for (const [token, paint] of Object.entries({ surface: "#ffffff", "surface-raised": "#ffffff", background: "#ffffff", foreground: INK, muted: "#616b7c", faint: "#677184", border: "#dfe5ec", "border-strong": "#c3ccda" })) {
    const value = resolved(`var(--${token})`, source);
    if (value) palette.set(colorKey(value), paint);
  }
  return palette;
}

function exportPaint(value: string, source: Element, palette: Map<string, string>, text = false) {
  const paint = resolved(value, source), key = colorKey(paint);
  const themed = palette.get(key);
  if (themed) return text && themed === "#ffffff" ? INK : themed;
  // Explicit/inherited white or black labels also need dark ink on white.
  if (text && /^#[\da-f]{6}$/.test(key)) {
    const rgb = [1, 3, 5].map(i => parseInt(key.slice(i, i + 2), 16));
    if (Math.max(...rgb) - Math.min(...rgb) < 12) return INK;
  }
  return paint;
}

/** Share stable chart identity, never credentials or arbitrary query tokens.
 * Only this chart's exact, single enum may carry measurement-view state.
 * Navigation and existing Copy link controls retain their original URL contract. */
export function chartShareUrl(current: string, anchor: string) {
  const url = new URL(performanceUrl(current, anchor));
  if (!/^https?:$/.test(url.protocol)) throw new Error("Chart links require HTTP(S)");
  const recordingView = performanceTarget(anchor) === "simultaneously-recorded-neurons" ? recordingViewToken(url) : undefined;
  url.username = ""; url.password = ""; url.search = "";
  if (recordingView) url.searchParams.set(recordingViewQuery, recordingView);
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
function safePlot(source: Element, palette: Map<string, string>): Element | null {
  if (!tags.has(source.localName) || source.getAttribute("role") === "tooltip" || source.hasAttribute("data-export-exclude")) return null;
  const doc = source.ownerDocument;
  const result = doc.createElementNS(NS, source.localName);
  for (const attr of source.attributes) {
    if (attributes.has(attr.name) || /^data-(source-observation|curve-point|value|trend-point|date|term|target-line|extrapolation-line|confidence|under-indexed|annotation-key|annotation-leader)$/.test(attr.name)) result.setAttribute(attr.name, attr.value);
  }
  const computed = doc.defaultView!.getComputedStyle(source);
  for (const name of styles) {
    // Explicit mark paint is the data/style contract, not pointer-only CSS emphasis.
    const raw = (source as SVGElement).style.getPropertyValue(name) || source.getAttribute(name) || computed.getPropertyValue(name) || "";
    const value = name === "fill" || name === "stroke" ? exportPaint(raw, source, palette, name === "fill" && ["text", "tspan"].includes(source.localName)) : resolved(raw, source);
    if (value) result.setAttribute(name, value);
  }
  if (source.localName === "rect" && source.parentElement?.localName === "svg" && !source.hasAttribute("data-value") && result.getAttribute("fill") !== "none") {
    const frame = (source.parentElement.getAttribute("viewBox") ?? "").split(/[ ,]+/).map(Number);
    const extent = (name: string, dimension: number) => source.getAttribute(name) === "100%" ? dimension : Number(source.getAttribute(name) ?? 0);
    if (frame.length === 4 && Number(source.getAttribute("x") ?? 0) <= frame[0] && Number(source.getAttribute("y") ?? 0) <= frame[1] && extent("width", frame[2]) >= frame[2] && extent("height", frame[3]) >= frame[3]) result.setAttribute("fill", "#ffffff");
  }
  for (const name of ["r", "stroke-width"]) {
    const value = source.getAttribute(`data-export-${name}`);
    if (value && /^\d+(\.\d+)?$/.test(value)) result.setAttribute(name, value);
  }
  // Screen-space UI labels use canonical coordinate-size type in the full-width
  // export, independent of the browser viewport/height cap that produced it.
  if (source.getAttribute("vector-effect") === "non-scaling-stroke") result.setAttribute("vector-effect", "non-scaling-stroke");
  const explicitFont = source.getAttribute("data-export-font-size");
  const exportFont = Number(explicitFont ?? source.closest("svg[data-export-font-size]")?.getAttribute("data-export-font-size") ?? 12);
  const validFont = Number.isFinite(exportFont) && exportFont >= 8 && exportFont <= 24;
  result.setAttribute("font-size", String(validFont ? exportFont : 12));
  // A per-label role preserves count/label hierarchy in canonical chart units.
  if (explicitFont !== null && validFont && ["text", "tspan"].includes(source.localName)) result.setAttribute("data-export-font-size", String(exportFont));
  // Use a portable font, not an unavailable external webfont in an SVG image.
  if (["text", "tspan"].includes(source.localName)) result.setAttribute("font-family", EXPORT_FONT);
  if (source.localName === "text") {
    const root = source.parentElement;
    const frame = (root?.getAttribute("viewBox") ?? "").split(/[ ,]+/).map(Number);
    const labelY = Number(source.getAttribute("y") ?? 0);
    // Explicit family captions, plus the fixed-viewBox Curve unit/date captions.
    // Numeric ticks and observation/target labels keep their quantitative anchors.
    if (source.classList.contains("draft-plot-axis-title") || (root?.localName === "svg" && frame.length === 4 && /[a-z]/i.test(source.textContent ?? "") && (labelY <= frame[1] + 24 || labelY >= frame[1] + frame[3] - 12))) result.setAttribute("data-export-axis-caption", "true");
  }
  for (const child of source.childNodes) {
    if (child.nodeType === 3) result.append(doc.createTextNode(child.textContent ?? ""));
    else if (child.nodeType === 1) { const clean = safePlot(child as Element, palette); if (clean) result.append(clean); }
  }
  return result;
}

/** Measure only the inert, canonical-font clone in a CSS-isolated hidden tree.
 * getBBox includes actual glyphs (anchors, tspans and transforms), not viewport
 * clipping or source CSS. No source element is resized, recolored or moved. */
function plotBounds(plot: Element) {
  if (typeof (plot as SVGGraphicsElement).getBBox !== "function") return null;
  const host = plot.ownerDocument.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;contain:strict;width:0;height:0";
  host.attachShadow({ mode: "closed" }).append(plot);
  try {
    plot.ownerDocument.body.append(host);
    const box = (plot as SVGGraphicsElement).getBBox();
    return [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width > 0 ? box : null;
  } catch { return null; }
  finally { plot.remove(); host.remove(); }
}

function safeFrame(plot: Element, original: number[]) {
  const [x, y, width, height] = original;
  const captions = [...plot.querySelectorAll('[data-export-axis-caption]')];
  for (const caption of captions) caption.setAttribute("display", "none");
  const bounds = plotBounds(plot);
  let left = x, top = y, right = x + width, bottom = y + height;
  if (bounds) {
    left = Math.min(left, bounds.x - 4); top = Math.min(top, bounds.y - 4);
    right = Math.max(right, bounds.x + bounds.width + 4); bottom = Math.max(bottom, bounds.y + bounds.height + 4);
  } else {
    // DOM-only tests/older SVG engines: conservative em envelopes, never a tiny
    // getBoundingClientRect viewport. Native rasterizers use actual glyph bounds.
    for (const label of plot.querySelectorAll("text, tspan")) {
      if (label.closest('[data-export-axis-caption]')) continue;
      const parent = label.parentElement!;
      const px = Number(label.getAttribute("x") ?? parent.getAttribute("x") ?? 0);
      const py = Number(label.getAttribute("y") ?? parent.getAttribute("y") ?? 0);
      const size = Number(label.getAttribute("font-size"));
      const length = [...(label.textContent ?? "")].length * size;
      const anchor = label.getAttribute("text-anchor") ?? parent.getAttribute("text-anchor");
      const start = px - (anchor === "end" ? length : anchor === "middle" ? length / 2 : 0);
      left = Math.min(left, start - 4); right = Math.max(right, start + length + 4);
      top = Math.min(top, py - size - 4); bottom = Math.max(bottom, py + size * .3 + 4);
    }
  }
  for (const caption of captions) {
    caption.removeAttribute("display");
    for (const label of [caption, ...caption.querySelectorAll("tspan")]) {
      label.setAttribute("x", String(left)); label.setAttribute("text-anchor", "start");
    }
  }
  return [left, top, right - left, bottom - top];
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
  const url = chartShareUrl(currentUrl, anchor);
  const width = 1200, inset = 48, plotWidth = width - inset * 2;
  const background = "#ffffff", ink = INK;
  const palette = exportPalette(source);
  const body: string[] = [`<rect data-export-signature="blue" x="48" y="0" width="84" height="9" fill="${EXPORT_BLUE}"/>`];
  let cursor = 40;
  const text = (content: string, size = 18, bold = false, left = inset, paint = ink) => {
    for (const line of wrap(content, Math.floor((width - inset - left) / (size * .62)))) {
      cursor += size * 1.45;
      body.push(`<text x="${left}" y="${cursor}" fill="${escape(paint)}" font-family="${EXPORT_FONT}" font-size="${size}"${bold ? ' font-weight="700"' : ""}>${escape(line)}</text>`);
    }
  };
  text(title, 30, true);
  cursor += 24;
  const clone = safePlot(source, palette)!;
  let frame = box;
  // Adaptive source frames can be phone- or desktop-wide. Keep canonical 12
  // coordinate units where practical, bounded to 16–22 image pixels, then refit
  // the internal glyph gutter. Only presentation type changes, never mark data.
  for (let pass = 0; pass < 3; pass++) {
    const scale = plotWidth / frame[2];
    for (const label of clone.querySelectorAll("text, tspan")) {
      if (label.hasAttribute("data-export-font-size")) continue;
      const size = Number(label.getAttribute("font-size"));
      label.setAttribute("font-size", String(Math.max(16 / scale, Math.min(22 / scale, size))));
    }
    frame = safeFrame(clone, box);
  }
  const plotHeight = frame[3] * plotWidth / frame[2];
  clone.setAttribute("x", String(inset)); clone.setAttribute("y", String(cursor));
  clone.setAttribute("width", String(plotWidth)); clone.setAttribute("height", String(plotHeight));
  clone.setAttribute("viewBox", frame.join(" "));
  body.push(new source.ownerDocument.defaultView!.XMLSerializer().serializeToString(clone));
  cursor += plotHeight + 12;
  for (const entry of chart.legend ?? []) {
    const color = escape(exportPaint(entry.color, source, palette) || ink);
    const cy = cursor + 21;
    const marker = entry.marker === "line" || entry.marker === "dashed"
      ? `<line x1="48" x2="70" y1="${cy}" y2="${cy}" stroke="${color}" stroke-width="3"${entry.marker === "dashed" ? ' stroke-dasharray="7 3"' : ""}/>`
      : entry.marker === "square" ? `<rect x="50" y="${cy - 6}" width="12" height="12" fill="${color}"/>`
      : entry.marker === "triangle" ? `<polygon points="56,${cy - 7} 63,${cy + 6} 49,${cy + 6}" fill="${color}"/>`
      : `<circle cx="56" cy="${cy}" r="6" fill="${color}"/>`;
    body.push(marker); text(entry.label, 18, false, 82);
  }
  cursor += 20;
  const footerY = cursor + 20;
  const footerLink = wrap(url, 85);
  const footerHeight = Math.max(54, 26 + footerLink.length * 22);
  body.push(`<g data-export-footer="true"><line x1="${inset}" x2="${width - inset}" y1="${cursor}" y2="${cursor}" stroke="#dfe5ec" stroke-width="1"/><svg data-export-brand="pl-rd" x="${inset}" y="${footerY}" width="124" height="54" viewBox="0 0 406 176">${PL_RESEARCH_LOGO}</svg><text x="${width - inset}" y="${footerY + 19}" text-anchor="end" fill="${ink}" font-family="${EXPORT_FONT}" font-size="20" font-weight="700" data-export-info="true">More information on Neuro Atlas.</text>${footerLink.map((line, i) => `<text x="${width - inset}" y="${footerY + 44 + i * 22}" text-anchor="end" fill="#52647d" font-family="${EXPORT_FONT}" font-size="16">${escape(line)}</text>`).join("")}</g>`);
  cursor = footerY + footerHeight;
  const height = Math.ceil(cursor + 40);
  const evidence = `<desc>${escape(chart.notes.join("\n"))}</desc>`;
  // Fail explicitly rather than silently clipping scientific scope or overflowing a canvas.
  if (height > 6000 || body.join("").length + evidence.length > 4_000_000) throw new Error("Chart export exceeds safe image bounds");
  return { svg: `<svg xmlns="${NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${evidence}<rect width="100%" height="100%" fill="${escape(background)}"/>${body.join("")}</svg>`, width, height, url, title };
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
