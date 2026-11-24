// Vector screen graphics: the status bar (time, signal, Wi-Fi, battery) and
// the FARBOUND wordmark are real geometry laid on the display glass, so they
// stay sharp at any camera distance. The wallpaper underneath is a bitmap.
//
// Layout is written in the artwork's pixel frame (W × H, y down) and mapped
// onto every mesh that uses the screen material through an affine fit of
// that mesh's UVs, so it follows any panel shape, the Duo's folding halves
// and the iPad's portrait/landscape swap.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { glyphs } from './glyphs.js';

// iOS status-bar glyphs in points (y down), after Apple's iOS UI kit.
const SIGNAL = { w: 17, h: 10.67, svg: [[0, 4], [4.67, 6], [9.33, 8.33], [14, 10.67]].map(([x, h]) => `<rect x="${x}" y="${10.67 - h}" width="3" height="${h}" rx="1"/>`).join('') };
function wifiSVG() {
  // Three bands of a 90° fan around the bottom point.
  const cx = 7.635, cy = 10.97, a = Math.PI / 4;
  const pt = (r, s) => `${(cx + s * r * Math.sin(a)).toFixed(3)} ${(cy - r * Math.cos(a)).toFixed(3)}`;
  const band = (r0, r1) => r0 === 0
    ? `M${cx} ${cy}L${pt(r1, -1)}A${r1} ${r1} 0 0 1 ${pt(r1, 1)}Z`
    : `M${pt(r0, -1)}L${pt(r1, -1)}A${r1} ${r1} 0 0 1 ${pt(r1, 1)}L${pt(r0, 1)}A${r0} ${r0} 0 0 0 ${pt(r0, -1)}Z`;
  return `<path d="${band(0, 3.3)}"/><path d="${band(4.75, 7.05)}"/><path d="${band(8.5, 10.97)}"/>`;
}
const WIFI = { w: 15.27, h: 10.97, svg: wifiSVG() };
const rr = (x, y, w, h, r, cw = true) => {
  // Rounded rectangle path; cw = false winds it the other way (for holes).
  const p = [`M${x + r} ${y}`, `L${x + w - r} ${y}`, `A${r} ${r} 0 0 1 ${x + w} ${y + r}`, `L${x + w} ${y + h - r}`, `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}`, `L${x + r} ${y + h}`, `A${r} ${r} 0 0 1 ${x} ${y + h - r}`, `L${x} ${y + r}`, `A${r} ${r} 0 0 1 ${x + r} ${y}`, 'Z'];
  if (cw) return p.join('');
  return [`M${x + r} ${y}`, `A${r} ${r} 0 0 0 ${x} ${y + r}`, `L${x} ${y + h - r}`, `A${r} ${r} 0 0 0 ${x + r} ${y + h}`, `L${x + w - r} ${y + h}`, `A${r} ${r} 0 0 0 ${x + w} ${y + h - r}`, `L${x + w} ${y + r}`, `A${r} ${r} 0 0 0 ${x + w - r} ${y}`, 'Z'].join('');
};
const BATTERY = {
  w: 27.33, h: 13,
  svg: `<path fill-opacity=".38" d="${rr(0, 0, 25, 13, 4.3)}${rr(1, 1, 23, 11, 3.4, false)}"/>`
    + `<path fill-opacity=".45" d="M26 4.6h.33a1 1 0 0 1 1 1v1.8a1 1 0 0 1 -1 1H26Z"/>`
    + `<path d="${rr(2.5, 2.5, 20, 8, 2.1)}"/>`,
};

function textSVG(run, x, baseline, size, { align = 'left', tracking = 0 } = {}) {
  const g = glyphs[run], k = size / 1000, track = tracking * 1000;
  const width = (g.advance + track * (g.glyphs.length - 1)) * k;
  const x0 = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  const paths = g.glyphs.map((gl, i) => gl.d ? `<path transform="translate(${(x0 + (gl.x + track * i) * k).toFixed(2)} ${baseline.toFixed(2)}) scale(${k.toFixed(5)})" d="${gl.d}"/>` : '').join('');
  return { svg: paths, width, capHeight: g.capHeight * k };
}
const icon = (ic, x, cy, k) => `<g transform="translate(${x.toFixed(2)} ${(cy - ic.h * k / 2).toFixed(2)}) scale(${k.toFixed(4)})">${ic.svg}</g>`;

// Status bar + wordmark for one display, as an SVG document in pixels.
//   style 'phone'  : Dynamic Island phones; `islandY` is the island centre (px).
//   style 'tablet' : iPad / Duo inner; time and date at the left.
export function presentationSVG({ W, H, style = 'phone', islandY = null, wordmark = true, color = '#fff' }) {
  const short = Math.min(W, H), parts = [];
  if (style === 'phone') {
    const k = W / 402, cy = islandY ?? 21 * k, ear = (402 - 125) / 2 * k;
    const t = textSVG('time', ear * .47, 0, 17 * k, { align: 'center' });
    parts.push(textSVG('time', ear * .47, cy + t.capHeight / 2, 17 * k, { align: 'center' }).svg);
    const gap = 6.5 * k, total = (SIGNAL.w + WIFI.w + BATTERY.w) * k + gap * 2;
    let x = W - ear * .47 - total / 2;
    parts.push(icon(SIGNAL, x, cy, k)); x += SIGNAL.w * k + gap;
    parts.push(icon(WIFI, x, cy, k)); x += WIFI.w * k + gap;
    parts.push(icon(BATTERY, x, cy, k));
  } else {
    const k = short / 820, cy = 15 * k, m = 24 * k, size = 15 * k;
    const t = textSVG('time', m, 0, size);
    parts.push(textSVG('time', m, cy + t.capHeight / 2, size).svg);
    parts.push(textSVG('date', m + t.width + 7 * k, cy + t.capHeight / 2, size).svg);
    const s = k * .92, gap = 6 * k, total = (SIGNAL.w + WIFI.w + BATTERY.w) * s + gap * 2;
    let x = W - m - total;
    parts.push(icon(SIGNAL, x, cy, s)); x += SIGNAL.w * s + gap;
    parts.push(icon(WIFI, x, cy, s)); x += WIFI.w * s + gap;
    parts.push(icon(BATTERY, x, cy, s));
  }
  if (wordmark) {
    // FARBOUND, widely tracked, centred near the foot of the screen as on the
    // farbound.fyi wallpapers (≈ 0.225 of the short edge wide on a phone).
    const width = short * (style === 'phone' ? .225 : .16), tracking = .62, g = glyphs.wordmark;
    const size = width / ((g.advance + tracking * 1000 * (g.glyphs.length - 1)) / 1000);
    parts.push(`<g fill-opacity=".9">${textSVG('wordmark', W / 2, H * (style === 'phone' ? .953 : .955), size, { align: 'center', tracking }).svg}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g fill="${color}">${parts.join('')}</g></svg>`;
}

// Least-squares affine map (u, v, 1) → local xyz for a mesh's UVs.
function fitUV(geometry) {
  const uv = geometry.getAttribute('uv'), pos = geometry.getAttribute('position');
  const M = new THREE.Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0), b = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const m = M.elements, box = new THREE.Box2();
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i), r = [u, v, 1], c = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    box.expandByPoint(new THREE.Vector2(u, v));
    for (let a = 0; a < 3; a++) { for (let d = 0; d < 3; d++) m[d * 3 + a] += r[a] * r[d]; for (let k = 0; k < 3; k++) b[k].setComponent(a, b[k].getComponent(a) + r[a] * c[k]); }
  }
  const inv = M.clone().invert();
  const coef = b.map(v => v.clone().applyMatrix3(inv));   // per output axis: [cu, cv, c1]
  const du = new THREE.Vector3(coef[0].x, coef[1].x, coef[2].x), dv = new THREE.Vector3(coef[0].y, coef[1].y, coef[2].y), o = new THREE.Vector3(coef[0].z, coef[1].z, coef[2].z);
  return { du, dv, o, box, map: (u, v, out = new THREE.Vector3()) => out.copy(o).addScaledVector(du, u).addScaledVector(dv, v) };
}
// Local point → uv through the fitted map (least squares on the plane).
function toUV(fit, p) {
  const q = p.clone().sub(fit.o), a = fit.du.dot(fit.du), b = fit.du.dot(fit.dv), c = fit.dv.dot(fit.dv), d = fit.du.dot(q), e = fit.dv.dot(q), det = a * c - b * b;
  return new THREE.Vector2((c * d - b * e) / det, (a * e - b * d) / det);
}

const loader = new SVGLoader();
function shapesOf(svg) {
  const out = [];
  for (const path of loader.parse(svg).paths) {
    const shapes = SVGLoader.createShapes(path);
    if (shapes.length) out.push({ geometry: new THREE.ShapeGeometry(shapes, 8), color: path.color, opacity: path.userData.style.fillOpacity ?? 1 });
  }
  return out;
}

export function createScreenOverlay() {
  let key = '', attached = [];
  const materials = new Map();
  const matFor = (color, opacity) => {
    const id = color.getHexString() + opacity;
    if (!materials.has(id)) materials.set(id, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    return materials.get(id);
  };
  function clear() { for (const m of attached) { m.parent?.remove(m); m.geometry.dispose(); } attached = []; key = ''; }
  // spec: { root, material, W, H, style, island (model-space point or null), model }
  //   or, for an SVG layer: { root, material, W, H, parts, layerKey, order }
  function sync(spec) {
    if (!spec) { clear(); return; }
    const meshes = [];
    spec.root.traverse(o => { if (o.isMesh && o.material === spec.material && o.geometry.getAttribute('uv')) meshes.push(o); });
    const stamp = meshes.map(m => m.uuid + ':' + m.geometry.getAttribute('uv').version).join('|');
    const next = [spec.W, spec.H, spec.style, stamp, spec.wordmark !== false, spec.layerKey || ''].join('/');
    if (next === key) return;
    clear(); key = next;
    if (!meshes.length) return;
    // Island centre in the artwork frame, from the first display mesh.
    let islandY = null;
    const first = meshes[0], fit0 = fitUV(first.geometry);
    if (!spec.parts && spec.island && spec.model) {
      spec.model.updateMatrixWorld(true);
      const world = spec.model.localToWorld(spec.island.clone()), local = first.worldToLocal(world);
      const uv = toUV(fit0, local);
      if (uv.y > .5 && uv.y < 1.05) islandY = (1 - uv.y) * spec.H;
    }
    const parts = spec.parts || shapesOf(presentationSVG({ ...spec, islandY }));
    const tmp = new THREE.Vector3(), normal = new THREE.Vector3();
    for (const mesh of meshes) {
      const fit = mesh === first ? fit0 : fitUV(mesh.geometry);
      normal.crossVectors(fit.du, fit.dv).normalize();
      // Face the viewer: the display normal attribute says which side.
      const n = mesh.geometry.getAttribute('normal');
      if (n && normal.dot(new THREE.Vector3(n.getX(0), n.getY(0), n.getZ(0))) < 0) normal.negate();
      const lift = Math.max(fit.du.length(), fit.dv.length()) * 2e-4;
      const box = fit.box.clone().expandByScalar(1e-4);
      for (const part of parts) {
        const src = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry, p = src.getAttribute('position'), keep = [];
        for (let i = 0; i < p.count; i += 3) {
          const cu = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3 / spec.W, cv = 1 - (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / spec.H;
          if (!box.containsPoint(new THREE.Vector2(cu, cv))) continue;
          for (let j = 0; j < 3; j++) { fit.map(p.getX(i + j) / spec.W, 1 - p.getY(i + j) / spec.H, tmp).addScaledVector(normal, lift); keep.push(tmp.x, tmp.y, tmp.z); }
        }
        if (src !== part.geometry) src.dispose();
        if (!keep.length) continue;
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
        const m = new THREE.Mesh(g, matFor(part.color, part.opacity)); m.name = spec.parts ? 'Screen SVG layer' : 'Screen vector overlay'; m.renderOrder = spec.order ?? 3;
        mesh.add(m); attached.push(m);
      }
    }
    if (!spec.parts) for (const part of parts) part.geometry.dispose();
  }
  return { sync, clear };
}
