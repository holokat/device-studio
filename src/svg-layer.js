// SVG presentation layer: a user SVG laid over the screen artwork.
//
// Solid fills and solid strokes become real geometry (mapped onto the display
// by screen-overlay.js), so UI shapes, icons and type set as outlines stay
// sharp at any zoom and export size. Whatever SVGLoader cannot draw as flat
// geometry — gradients, <text>, <image>, clip paths, masks, filters — is left
// to a bitmap of the same SVG (with the vector parts hidden) composited into
// the screen texture underneath, so nothing in the file is lost or doubled.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const loader = new SVGLoader();
const SVGNS = 'http://www.w3.org/2000/svg';
const solid = (v) => v !== undefined && v !== 'none' && !/url\(/i.test(v);
const unset = (v) => v === undefined || v === 'none';
const ROOT_ONLY = new Set(['width', 'height', 'viewBox', 'x', 'y', 'version', 'preserveAspectRatio', 'baseProfile']);

export const isSVGFile = (file) => file && (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || ''));

// Read and check an SVG file; returns its text.
export async function readSVG(file) {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw Error('This SVG could not be read.');
  return text;
}

// The SVG scaled to cover a W × H artwork frame (centre crop, the same rule as
// bitmap uploads), as a standalone SVG string in that pixel frame.
export function fitSVG(text, W, H) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml'), root = doc.documentElement;
  let vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) {
    const w = parseFloat(root.getAttribute('width')) || W, h = parseFloat(root.getAttribute('height')) || H;
    vb = [0, 0, w, h];
  }
  const [x, y, w, h] = vb, s = Math.max(W / w, H / h), tx = (W - w * s) / 2 - x * s, ty = (H - h * s) / 2 - y * s;
  const out = document.implementation.createDocument(SVGNS, 'svg', null), svg = out.documentElement;
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const g = out.createElementNS(SVGNS, 'g');
  // Presentation attributes on the root (fill, stroke, style, class…) carry over to the group.
  for (const a of root.attributes) if (!ROOT_ONLY.has(a.name) && !a.name.startsWith('xmlns')) g.setAttribute(a.name, a.value);
  g.setAttribute('transform', `matrix(${s} 0 0 ${s} ${tx} ${ty})`);
  for (const n of [...root.childNodes]) g.appendChild(out.importNode(n, true));
  svg.appendChild(g);
  return new XMLSerializer().serializeToString(out);
}

// True when the element (or a group around it) is clipped, masked or filtered:
// SVGLoader ignores those, so the element must stay in the bitmap.
function effected(node) {
  for (let n = node; n && n.nodeType === 1; n = n.parentNode) {
    if (n.hasAttribute('clip-path') || n.hasAttribute('mask') || n.hasAttribute('filter')) return true;
    if (/(clip-path|mask|filter)\s*:/.test(n.getAttribute('style') || '')) return true;
  }
  return false;
}

// Split a fitted SVG into vector parts ({geometry, color, opacity}, in the
// W × H pixel frame, y down) and the bitmap remainder (an SVG string, or null
// when everything became geometry).
export function splitSVG(fitted) {
  const data = loader.parse(fitted), parts = [], vector = new Set(), raster = new Set();
  let doc = null;
  for (const path of data.paths) {
    const st = path.userData.style, node = path.userData.node;
    doc ||= node?.ownerDocument;
    const ok = (unset(st.fill) || solid(st.fill)) && (unset(st.stroke) || solid(st.stroke)) && st.visibility !== 'hidden' && !effected(node);
    if (!ok) { raster.add(node); continue; }
    const op = st.opacity ?? 1;
    if (solid(st.fill) && st.fillOpacity * op > 0) {
      const shapes = SVGLoader.createShapes(path);
      if (shapes.length) parts.push({ geometry: new THREE.ShapeGeometry(shapes, 12), color: path.color.clone(), opacity: st.fillOpacity * op });
    }
    if (solid(st.stroke) && st.strokeWidth > 0 && st.strokeOpacity * op > 0) {
      const color = new THREE.Color().setStyle(st.stroke, THREE.SRGBColorSpace);
      for (const sub of path.subPaths) {
        const g = SVGLoader.pointsToStroke(sub.getPoints(), st);
        if (g) parts.push({ geometry: g, color, opacity: st.strokeOpacity * op });
      }
    }
    vector.add(node);
  }
  // A <use> can draw one element several times; only hide what is all vector.
  for (const n of raster) vector.delete(n);
  let rest = null;
  if (doc) {
    for (const n of vector) n.setAttribute('visibility', 'hidden');
    const leftover = raster.size || doc.querySelector('text,image,foreignObject,pattern') || [...doc.querySelectorAll('[fill],[stroke],[style]')].some((n) => /url\(/.test(n.getAttribute('fill') + n.getAttribute('stroke') + n.getAttribute('style')));
    if (leftover) rest = new XMLSerializer().serializeToString(doc.documentElement);
  } else rest = fitted;
  return { parts, rest };
}

// Loads the bitmap remainder; resolves to an <img> (or null).
export function rasterImage(rest) {
  if (!rest) return Promise.resolve(null);
  const url = URL.createObjectURL(new Blob([rest], { type: 'image/svg+xml' })), img = new Image();
  return new Promise((resolve) => {
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
