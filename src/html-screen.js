// HTML screens: a web page laid out at the display's point size and drawn into
// the screen texture at high resolution (SVG <foreignObject>, so the canvas
// stays exportable). Pages are static: scripts do not run; <img> sources and
// linked stylesheets are inlined first; `html`, `body` and `:root` rules apply
// to the page box. Layout is fluid, so one page fits any display aspect.
import { notifyScreenImage } from './screen-images.js';

const cache = new Map();
const XHTML = 'http://www.w3.org/1999/xhtml';
const toDataURL = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob); });
const rootify = (css) => css.replace(/(^|[\s,}>~+(])(html|body|:root)(?=[\s,{.:#[>~+)]|$)/g, '$1.html-screen-root');

async function inline(doc, base) {
  const css = [];
  for (const link of doc.querySelectorAll('link[rel~=stylesheet][href]')) {
    try { css.push(await fetch(new URL(link.getAttribute('href'), base)).then((r) => r.text())); } catch { /* skip */ }
  }
  for (const style of doc.querySelectorAll('style')) css.push(style.textContent);
  for (const img of doc.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (src.startsWith('data:')) continue;
    try { img.setAttribute('src', await toDataURL(await fetch(new URL(src, base)).then((r) => r.blob()))); } catch { img.removeAttribute('src'); }
  }
  for (const n of doc.querySelectorAll('script,link,style,meta,title,noscript,iframe')) n.remove();
  return rootify(css.join('\n'));
}

async function render({ url, text }, W, H, layout) {
  const base = url ? new URL(url, location.href) : new URL(location.href);
  const source = text ?? await fetch(base).then((r) => { if (!r.ok) throw Error('Screen page not found.'); return r.text(); });
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const css = await inline(doc, base);
  const Lw = layout || W, Lh = Math.round(Lw * H / W);
  const scale = Math.min(4096 / Math.max(Lw, Lh), 3);
  const root = document.implementation.createDocument(XHTML, 'div', null).documentElement;
  root.setAttribute('class', ('html-screen-root ' + (doc.body.getAttribute('class') || '')).trim());
  root.setAttribute('style', `width:${Lw}px;height:${Lh}px;overflow:hidden;position:relative;margin:0;${doc.body.getAttribute('style') || ''}`);
  const style = root.ownerDocument.createElementNS(XHTML, 'style'); style.textContent = css; root.appendChild(style);
  for (const n of [...doc.body.childNodes]) root.appendChild(root.ownerDocument.importNode(n, true));
  const xml = new XMLSerializer().serializeToString(root);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(Lw * scale)}" height="${Math.round(Lh * scale)}" viewBox="0 0 ${Lw} ${Lh}"><foreignObject x="0" y="0" width="${Lw}" height="${Lh}">${xml}</foreignObject></svg>`;
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = Math.round(Lw * scale); c.height = Math.round(Lh * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// A canvas of the page at W × H (artwork frame). While it renders, a dark
// placeholder with `pending` set is returned; screen-images listeners fire when
// it is ready, and the next call returns the finished canvas.
export function htmlScreenCanvas(source, W, H, layout) {
  const key = (source.key || source.url) + '|' + W + 'x' + H + '|' + layout;
  const entry = cache.get(key);
  if (entry?.canvas) return entry.canvas;
  if (!entry) {
    const e = { canvas: null, error: null }; cache.set(key, e);
    render(source, W, H, layout).then((c) => { e.canvas = c; }, (err) => { e.error = err; console.warn('HTML screen:', err); e.canvas = placeholder(W, H); }).finally(() => notifyScreenImage());
  }
  const c = placeholder(W, H); c.pending = true; return c;
}
function placeholder(W, H) { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, W, H); return c; }
export const isHTMLFile = (file) => file && (file.type === 'text/html' || /\.html?$/i.test(file.name || ''));
