// Apple Watch band options: styles, colourways and their procedural surfaces.
// Textures are drawn per pixel from periodic functions of (u, v) in [0, 1),
// so they tile seamlessly; one tile spans BAND_TILE cm of strap.
import * as THREE from 'three';

export const BAND_TILE = 1;   // cm of strap per texture tile (both directions)

// style: geometry + material family. 'match' sport bands follow the case finish.
export const bandOptions = [
  { id: 'sport-match', name: 'Sport Band', color: 'Matches case', style: 'sport', match: true },
  { id: 'sport-olive', name: 'Sport Band', color: 'Olive', style: 'sport', hex: '#8a8456' },
  { id: 'loop-burgundy-plaid', name: 'Sport Loop', color: 'Burgundy Plaid', style: 'sportLoop', hardware: '#5e2533',
    rows: ['#5a2030', '#1a1418', '#6a2838', '#d9c6c8', '#5a2030', '#1a1418'], cols: ['#4e1c2a', '#cdb8bc', '#22161c'] },
  { id: 'loop-burgundy', name: 'Sport Loop', color: 'Burgundy', style: 'sportLoop', hardware: '#5e2533',
    rows: ['#4b1d2c', '#3a1626', '#552233'], cols: ['#2e1a33', '#3b1c30', '#2a1730'] },
  { id: 'loop-umber-plaid', name: 'Sport Loop', color: 'Light Umber Plaid', style: 'sportLoop', hardware: '#9a7454',
    rows: ['#b88a4e', '#2a1f16', '#c49558', '#6b4a2a', '#b88a4e', '#2a1f16'], cols: ['#a97c44', '#e0c08e', '#2a1f16'] },
  { id: 'ocean-cloud', name: 'Ocean Band', color: 'Cloud', style: 'ocean', hex: '#cfcdc6', hardware: '#a9a7a0' },
  { id: 'braided-magenta', name: 'Braided Solo Loop', color: 'Magenta', style: 'braided', hex: '#a11fb6' },
  { id: 'milanese-slate', name: 'Milanese Loop', color: 'Slate', style: 'milanese', hex: '#5e4e3d' },
];
export const bandOption = (id) => bandOptions.find(o => o.id === id) || bandOptions[0];
export const bandLabel = (o) => o.name + ' · ' + o.color;

const rgb = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };
const fract = (x) => x - Math.floor(x);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(i, j) { let h = Math.imul(i * 374761393 + j * 668265263, 1274126177) >>> 0; h ^= h >>> 13; return (Math.imul(h, 1103515245) >>> 0) / 4294967296; }

// Per-style pixel functions: return [height 0..1, r, g, b].
function sportLoopPixel(o) {
  const rows = o.rows.map(rgb), cols = o.cols.map(rgb);
  const CHECK = 16, THREADS = 3;            // plaid checks per cm, threads per check
  return (u, v) => {
    const cu = u * CHECK, cv = v * CHECK * 1.3;
    const iu = Math.floor(cu * THREADS), iv = Math.floor(cv * THREADS);
    const warp = cols[Math.floor(cu) % cols.length], weft = rows[Math.floor(cv) % rows.length];
    const fu = fract(cu * THREADS), fv = fract(cv * THREADS);
    const top = (iu + iv) % 2 === 0;        // plain weave: alternate which thread is on top
    const prof = top ? Math.sin(Math.PI * fu) : Math.sin(Math.PI * fv);
    const h = .35 + .65 * prof * (.85 + .15 * hash(iu, iv));
    const c = top ? warp : weft, k = .62 + .5 * prof + (hash(iv, iu) - .5) * .12;
    return [h, c[0] * k, c[1] * k, c[2] * k];
  };
}
function braidedPixel(o) {
  const base = rgb(o.hex);
  const COLS = 5, STRANDS = 14;             // chevron columns and strands per cm
  return (u, v) => {
    const cu = u * COLS, col = Math.floor(cu), fu = fract(cu);
    const dir = col % 2 ? 1 : -1;
    const s = v * STRANDS + dir * fu * 1.4;  // diagonal strand coordinate
    const fs = fract(s), strand = Math.floor(s);
    const prof = Math.sin(Math.PI * fs);
    const groove = smooth(0, .08, fu) * smooth(1, .92, fu);
    const fibre = .9 + .1 * Math.sin((fu * 46 + fs * 9) * Math.PI * 2);
    const h = prof * groove * fibre;
    const k = (.45 + .75 * h) * (.92 + .16 * hash(strand, col));
    return [h, base[0] * k, base[1] * k, base[2] * k];
  };
}
function milanesePixel(o) {
  const base = rgb(o.hex);
  const F = 42;                              // wire pitch per cm
  return (u, v) => {
    const a = fract((u + v * .5) * F), b = fract((u - v * .5) * F + .5);
    const wa = Math.sin(Math.PI * a), wb = Math.sin(Math.PI * b);
    const h = Math.max(wa * .9, wb);
    const k = .55 + .6 * h;
    return [h, base[0] * k, base[1] * k, base[2] * k];
  };
}
const PIXEL = { sportLoop: sportLoopPixel, braided: braidedPixel, milanese: milanesePixel };

// Colour, normal and roughness maps for a textile/metal option (null for rubber).
const cache = new Map();
export function bandMaps(o) {
  if (!PIXEL[o.style]) return null;
  if (cache.has(o.id)) return cache.get(o.id);
  const N = 512, f = PIXEL[o.style](o);
  const H = new Float32Array(N * N);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };
  const cc = mk(), nc = mk(), rc = mk();
  const ci = cc.getContext('2d').createImageData(N, N), ni = nc.getContext('2d').createImageData(N, N), ri = rc.getContext('2d').createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const [h, r, g, b] = f((x + .5) / N, (y + .5) / N), i = y * N + x;
    H[i] = h; ci.data.set([r, g, b, 255], i * 4);
    const rough = o.style === 'milanese' ? 70 + (1 - h) * 110 : 205 + (1 - h) * 40; ri.data.set([rough, rough, rough, 255], i * 4);
  }
  const strength = o.style === 'milanese' ? 2.2 : 3.2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const at = (xx, yy) => H[((yy + N) % N) * N + (xx + N) % N];
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    ni.data.set([(-dx / l * .5 + .5) * 255, (dy / l * .5 + .5) * 255, (1 / l * .5 + .5) * 255, 255], (y * N + x) * 4);
  }
  cc.getContext('2d').putImageData(ci, 0, 0); nc.getContext('2d').putImageData(ni, 0, 0); rc.getContext('2d').putImageData(ri, 0, 0);
  const maps = { map: new THREE.CanvasTexture(cc), normalMap: new THREE.CanvasTexture(nc), roughnessMap: new THREE.CanvasTexture(rc), canvas: cc };
  maps.map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  cache.set(o.id, maps);
  return maps;
}

// Strap material for an option. Rubber bands keep the fluoroelastomer look.
export function bandMaterialFor(o, rubber) {
  const maps = bandMaps(o);
  if (!maps) return rubber;
  if (o.style === 'milanese') return new THREE.MeshPhysicalMaterial({ name: 'Milanese stainless mesh', map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.roughnessMap,
    normalScale: new THREE.Vector2(.9, .9), metalness: 1, roughness: 1, clearcoat: .25, clearcoatRoughness: .3, envMapIntensity: 1.6 });
  return new THREE.MeshPhysicalMaterial({ name: o.style === 'braided' ? 'Braided recycled yarn' : 'Woven nylon', map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.roughnessMap,
    normalScale: new THREE.Vector2(1.1, 1.1), metalness: 0, roughness: 1, sheen: .5, sheenRoughness: .6, sheenColor: new THREE.Color(o.hex || o.rows[0]).lerp(new THREE.Color(0xffffff), .25), envMapIntensity: .55 });
}

// CSS background for the picker swatch: a crop of the texture, or a rubber gradient.
export function bandSwatch(o, caseBand) {
  const maps = bandMaps(o);
  if (maps) { const c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(maps.canvas, 0, 0, 160, 160, 0, 0, 96, 96); return `url(${c.toDataURL()}) center/cover`; }
  const hex = o.match ? caseBand : o.hex, c = new THREE.Color(hex), lo = c.clone().multiplyScalar(.7).getStyle(), hi = c.clone().lerp(new THREE.Color(0xffffff), .35).getStyle();
  return `linear-gradient(132deg,${lo} 0%,${hex} 40%,${hi} 72%,${hex} 100%)`;
}
