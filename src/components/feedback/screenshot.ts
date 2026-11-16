'use client';
import {getFontEmbedCSS} from 'html-to-image';
import type {FeedbackScreenshot} from '../../lib/feedback-public/contracts';
const excluded = '[data-atlas-feedback],input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-feedback-private],script,style,iframe,video,audio,object,embed';
const MAX_BYTES = 768 * 1024;
/** Synchronous snapshot: later typing, theme changes, chart animation and overlays cannot change it. */
export function freezeFeedbackRegion(target: Element) {
  const doc = target.ownerDocument, win = doc.defaultView!;
  if (!target.isConnected || target.matches('html,body') || target.closest(excluded)) throw Error('not_visible');
  const selected = target.getBoundingClientRect();
  const candidate = target.closest('[data-performance-card],[data-draft-popout],[data-trends-card],.milestone-year-scroll,dialog[open],article') ?? target.closest('svg')?.parentElement ?? target.parentElement ?? target;
  const root = candidate.matches('html,body') ? target : candidate;
  const bounds = root.getBoundingClientRect();
  const left = Math.max(0, bounds.left, Math.min(selected.left - 48, bounds.right - 1200));
  const top = Math.max(0, bounds.top, Math.min(selected.top - 48, bounds.bottom - 800));
  const right = Math.min(win.innerWidth, bounds.right, left + 1200), bottom = Math.min(win.innerHeight, bounds.bottom, top + 800);
  if (selected.right <= left || selected.bottom <= top || selected.left >= right || selected.top >= bottom || right <= left || bottom <= top) throw Error('not_visible');
  const width = Math.ceil(right - left), height = Math.ceil(bottom - top);
  let count = 0;
  const clone = (source: Node): Node | undefined => {
    if (++count > 5000) throw Error('too_large');
    if (source.nodeType === 3) return source.cloneNode();
    if (source.nodeType !== 1) return;
    const element = source as Element;
    if (element.matches(excluded)) return;
    const style = win.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    let copy = element.cloneNode(false) as HTMLElement;
    if (element.localName === 'img' || element.localName === 'canvas') {
      // Freeze already-rendered pixels. Never re-fetch a caller URL or send it server-side.
      const canvas = doc.createElement('canvas');
      const image = element as HTMLImageElement;
      const sourceCanvas = element as HTMLCanvasElement;
      canvas.width = element.localName === 'img' ? image.naturalWidth : sourceCanvas.width;
      canvas.height = element.localName === 'img' ? image.naturalHeight : sourceCanvas.height;
      if (!canvas.width || !canvas.height || canvas.width * canvas.height > 8388608 || element.localName === 'img' && !image.complete) throw Error('unsupported');
      const context = canvas.getContext('2d'); if (!context) throw Error('unsupported');
      context.drawImage(element as HTMLImageElement | HTMLCanvasElement, 0, 0);
      copy = doc.createElement('img');
      (copy as HTMLImageElement).src = canvas.toDataURL('image/png');
    }
    // Copy computed layout/paint now, not after asynchronous font/image processing.
    for (const property of Array.from(style)) copy.style.setProperty(property, style.getPropertyValue(property), style.getPropertyPriority(property));
    copy.style.setProperty('animation','none'); copy.style.setProperty('transition','none');
    // No live input values, callbacks, foreign browsing contexts or network-bearing images.
    for (const attr of Array.from(copy.attributes)) if (/^on/i.test(attr.name)) copy.removeAttribute(attr.name);
    if (element.localName === 'image') throw Error('unsupported');
    if (/url\(/i.test(style.backgroundImage) && style.backgroundImage !== 'none') throw Error('unsupported');
    for (const child of Array.from(source.childNodes)) {const copied = clone(child); if (copied) copy.append(copied);}
    if (element.scrollTop || element.scrollLeft) {
      // Preserve the visible position of independently scrollable chart panels.
      const inner = doc.createElement('div'); while (copy.firstChild) inner.append(copy.firstChild);
      inner.style.transform = `translate(${-element.scrollLeft}px,${-element.scrollTop}px)`;copy.append(inner);
    }
    return copy;
  };
  const frozen = clone(root) as HTMLElement | undefined;
  if (!frozen) throw Error('not_visible');
  Object.assign(frozen.style,{position:'absolute',margin:'0',left:`${bounds.left-left}px`,top:`${bounds.top-top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`});
  const node = doc.createElement('div');node.setAttribute('data-feedback-snapshot','');
  Object.assign(node.style,{position:'relative',width:`${width}px`,height:`${height}px`,overflow:'hidden',background:win.getComputedStyle(doc.body).backgroundColor || '#fff'});
  node.append(frozen);
  return {node,root,width,height,highlight:{left:Math.max(0,selected.left-left),top:Math.max(0,selected.top-top),width:Math.min(right,selected.right)-Math.max(left,selected.left),height:Math.min(bottom,selected.bottom)-Math.max(top,selected.top)}};
}
export async function captureFeedbackScreenshot(target: Element): Promise<FeedbackScreenshot> {
  try {
    const frozen = freezeFeedbackRegion(target);
    // Render the frozen, already-styled tree directly. Re-cloning a detached tree
    // through a DOM capture library recomputes empty styles and can yield blank images.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    let canvas: HTMLCanvasElement;
    try {
      const work = async () => {
        const css = await getFontEmbedCSS(frozen.root as HTMLElement,{preferredFontFormat:'woff2',fetchRequestInit:{signal:controller.signal,credentials:'same-origin'}});
        const style = target.ownerDocument.createElement('style');style.textContent=css;frozen.node.prepend(style);
        frozen.node.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
        const serialized = new XMLSerializer().serializeToString(frozen.node);
        const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${frozen.width}" height="${frozen.height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`)}`;
        const image = new Image();image.src=source;await image.decode();
        const result = target.ownerDocument.createElement('canvas');result.width=frozen.width;result.height=frozen.height;
        result.getContext('2d')!.drawImage(image,0,0);return result;
      };
      canvas = await Promise.race([work(),new Promise<never>((_resolve,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('capture_failed')),{once:true}))]);
    } finally {clearTimeout(timer);controller.abort();}
    const context = canvas.getContext('2d'); if (!context) throw Error('unsupported');
    const h = frozen.highlight;context.strokeStyle='#1677ff';context.lineWidth=3;context.strokeRect(h.left+1.5,h.top+1.5,Math.max(1,h.width-3),Math.max(1,h.height-3));
    const data = canvas.toDataURL('image/png').split(',')[1];
    if (!data || data.length * 3 / 4 > MAX_BYTES) throw Error('too_large');
    return {status:'captured',mimeType:'image/png',width:canvas.width,height:canvas.height,data};
  } catch (cause) {
    const reason = cause instanceof Error && ['unsupported','too_large','not_visible'].includes(cause.message) ? cause.message as 'unsupported'|'too_large'|'not_visible' : 'capture_failed';
    return {status:'unavailable',reason};
  }
}
