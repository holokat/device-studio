import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileGeometry, perimeter } from '../casework.js';
import { glassElement, opticalCoating } from '../optics.js';
import { makeLogo } from '../exterior.js';

// MacBook Pro 14-inch (M6), procedural. 1 unit = 1 cm.
// Apple's figures (apple.com/macbook-pro/specs): 1.55 × 31.26 × 22.12 cm,
// 14.2-inch Liquid Retina XDR, 3024 × 1964 px at 254 ppi (30.24 × 19.64 cm
// active area, including the menu-bar strip either side of the notch).
//
// Model frame: the base lies flat in XZ with +Y up and its underside at Y = 0
// (the feet stand 1 mm below). The keyboard deck faces +Y, the front lip is at
// -Z, the hinge runs along X at +Z. Open, the display faces -Z. Seen from the
// front (the user's seat) the user's right is -X, so:
//   +X side  (user's left)   MagSafe 3, Thunderbolt × 2, headphone jack
//   -X side  (user's right)  HDMI, Thunderbolt, SDXC
//
// Measurements. Scales come from the known 31.26 cm width (22.12 cm depth or
// 1.55 cm height where the view is a profile):
//   apple.com keyboard_14_inch (orthographic top view, 920 px = 31.26 cm, 29.43 px/cm):
//     keyboard well    821 × 337 px -> 27.90 × 11.46 cm, centred in X, Z -2.06 … 9.40
//     key pitch        55.8 px across -> 1.90 cm; 54.4 px down -> 1.85 cm
//     keycap           47 × 46.5 px -> 1.60 × 1.58 cm, 0.30 cm gaps; rows 14.5 u
//                      wide (esc / tab / delete 1.5 u, caps / return 1.75 u,
//                      shifts 2.25 u, commands 1.25 u, space 5 u); full-height
//                      function row with Touch ID at its right end; inverted-T
//                      arrows with half-height keys
//     trackpad         381 × 239 px -> 12.95 × 8.12 cm, centred, Z -2.36 … -10.48
//                      (0.58 cm from the front edge), corner r ≈ 0.4 cm
//     speaker grilles  ~35 × 314 px -> 1.2 × 10.7 cm either side of the well,
//                      |X| 14.10 … 15.30, Z -1.62 … 9.00
//     thumb scoop      160 px -> 5.44 cm wide at the deck, 8 px -> 0.27 cm deep
//     plan corner r    ~30 px -> 1.0 cm (also 42 px / 44.15 px/cm on lid-top-space-black)
//     hinge arms       2 × 44 px -> 1.5 cm wide, centred |X| = 11.1 cm, bridging a
//                      0.5 cm dark gap between the deck and the open lid
//   front-closed-black-notch (1379 px = 31.26 cm, 44.1 px/cm):
//     lid 17 px -> 0.39 cm, base 48 px -> 1.09 cm (+ rolled underside)
//     scoop 219 px -> 4.97 cm at its foot, 243 px -> 5.5 cm at the top,
//     20 px -> 0.45 cm tall: an elliptical cove, crisp at both ends
//     feet 89 px -> 2.0 cm wide, centres 2.75 cm in from the sides
//   ports_1/2_14_inch (side profiles, 93 px = 1.55 cm, 60 px/cm):
//     lid 24 px -> 0.40 cm, base 68 px -> 1.13 cm; lower roll ~0.45 cm radius,
//     upper edge crisp (r ≈ 0.06 cm); lid top edge rolled r ≈ 0.15 cm
//     left, from the back:  MagSafe 3 at 2.78 cm (1.75 × 0.36 pill, 5 pins
//                           0.18 cm apart), Thunderbolt at 4.62 and 6.10 cm
//                           (0.84 × 0.27 cm), headphone at 7.40 cm (ø 0.36 cm)
//     right, from the back: HDMI at 2.78 cm (1.42 × 0.45 cm), Thunderbolt at
//                           4.63 cm, SDXC at 7.08 cm (2.63 × 0.23 cm)
//     port centres 0.40 cm below the top of the base
//     intake slot along the lower roll from 9.0 cm behind the back … 2.5 cm from the front
//     feet 1.9 cm across, centres 2.75 cm from the back
//   front-open-silver-safari / front-open-black-after-effects (lid 1484 px = 31.26 cm):
//     side bezels 23 px -> 0.49 cm (31.26 - 30.24 = 1.02 cm, 0.51 per side),
//     top bezel 0.50-0.55 cm, display top corners 20 px -> 0.42 cm, notch
//     156 × 27 px -> 3.25 × 0.58 cm with the camera in its upper half, lower
//     bezel 0.37 cm then ~0.75 cm of matte black hinge cover above the deck
//   side-both-sizes-open-90 (676 px = 22.12 cm): lid 12.5 px -> 0.40 cm
// The base is drawn a little slimmer than Apple's 1.13 cm (0.98 cm), with the
// roll, scoop and ports scaled to suit; it reads closer to the product photos.
export const MBP = { W: 31.26, D: 22.12, H: 1.55, BASE: .98, LID: 0.40, FOOT: 0.10, R: 1.0, OPEN: 110 };
const W = MBP.W, D = MBP.D, HW = W / 2, HD = D / 2, R = MBP.R, YB = MBP.BASE, TL = MBP.LID;
export const MBP_ASPECT = 3024 / 1964;            // landscape artwork, full panel including the notch strip
const DISPLAY = { w: 30.24, h: 19.64, rTop: .42, rBottom: .05 };
const NOTCH = { w: 3.25, h: .60, r: .21, flare: .07, cam: .27 };   // camera centre .27 below the top

// Hinge. The lid turns about an axis inside the back of the base, 0.55 cm below
// the deck, so that opened it drops behind the base with the black hinge cover
// showing above the deck (as in Apple's photography) and the aluminium hinge
// arms bridging the gap. Pivot space: lid closed, origin on the axis.
const AXIS = { y: YB - .55, z: 10.80 };
const LY = YB - AXIS.y;                            // display face of the closed lid
const LID_FRONT = -HD - AXIS.z, LID_REAR = HD - .02 - AXIS.z;
const TOP_BEZEL = .55;
const ACTIVE_CZ = LID_FRONT + TOP_BEZEL + DISPLAY.h / 2;   // active centre (pivot z)
const BEZEL_LOW = .37;                              // black glass below the active area

// Keyboard and deck layout in world X / Z (top view numbers above).
const WELL = { x: 13.95, z0: -2.06, z1: 9.40, r: .35, depth: .12 };
const PAD = { w: 12.95, z0: -10.48, z1: -2.36, r: .42 };
const KEY = { pitch: 1.898, row: 1.846, h: 1.58, gap: .30, left: 13.61, row0: 8.29, r: .13, top: YB - .015 };
const GRILLE = { x0: 14.10, x1: 15.30, z0: -1.62, z1: 9.00 };
const SCOOP = { a: 2.5, f: .25, depth: .27, h: .40 };
const PORT_Y = YB - .34;
const FEET = { x: HW - 2.75, z: HD - 2.75, r: .95 };

// Finishes: [name, anodized aluminium hex, keyboard hex]. Space Black first (default).
export const mbpFinishes = [
  ['Space Black', '#262527', '#0c0c0d'],
  ['Silver', '#e3e4e5', '#0e0e0f'],
];

// ── Materials ──────────────────────────────────────────────────────────────
// Bead-blasted anodizing: a fine random micro-normal (the sparkle under a
// raking light) and a little roughness scatter; isotropic.
let blastCache = null;
function blastMaps() {
  if (blastCache) return blastCache;
  const size = 256, n = document.createElement('canvas'), r = document.createElement('canvas');
  n.width = n.height = r.width = r.height = size;
  const nc = n.getContext('2d'), rc = r.getContext('2d');
  const ni = nc.createImageData(size, size), ri = rc.createImageData(size, size);
  let seed = 51133;
  const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => (rand() + rand() + rand() - 1.5) * .9;
  for (let i = 0; i < size * size; i++) {
    // Mostly gentle bumps, a few steeper facets that glint.
    const k = rand() < .06 ? 1.25 : .5;
    const x = gauss() * k, y = gauss() * k, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    ni.data.set([(x * .5 + .5) * 255, (y * .5 + .5) * 255, (z * .5 + .5) * 255, 255], i * 4);
    const g = 232 + gauss() * 18;
    ri.data.set([g, g, g, 255], i * 4);
  }
  nc.putImageData(ni, 0, 0); rc.putImageData(ri, 0, 0);
  const normalMap = new THREE.CanvasTexture(n), roughnessMap = new THREE.CanvasTexture(r);
  for (const t of [normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5.6, 5.6); t.anisotropy = 8; }
  blastCache = { normalMap, roughnessMap };
  return blastCache;
}

// Speaker perforation tile: one hexagonal period (2 holes), repeated.
const HOLE = { pitch: .072, r: .021 };
function grilleTile() {
  const w = 64, h = Math.round(64 * Math.sqrt(3)), c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  const rad = HOLE.r / HOLE.pitch * w;
  const hole = (x, y) => {
    const g = ctx.createRadialGradient(x, y - rad * .25, 0, x, y, rad);
    g.addColorStop(0, '#000'); g.addColorStop(.72, '#060606'); g.addColorStop(.9, '#3a3a3a'); g.addColorStop(1, '#fff');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  };
  for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) hole(x, y);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function makeMaterials() {
  const blast = blastMaps();
  const alu = (name, roughness, env, metalness, extra = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ name, color: 0x2f2d30, metalness, roughness, ...blast,
      normalScale: new THREE.Vector2(.11, .11), clearcoat: .05, clearcoatRoughness: .55, ...extra });
    m.envMapIntensity = env; return m;
  };
  const grilleMap = grilleTile();
  grilleMap.repeat.set((GRILLE.x1 - GRILLE.x0) / HOLE.pitch, (GRILLE.z1 - GRILLE.z0) / (HOLE.pitch * Math.sqrt(3)));
  const dark = (name, color, roughness, metalness = .1, extra = {}) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, ...extra });
  return {
    shell: alu('Anodized aluminium', .48, 1.1, .6),
    lid: alu('Anodized aluminium lid', .48, 1.1, .6),
    grille: alu('Speaker perforation', .5, 1.2, .65, { map: grilleMap, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    chamfer: new THREE.MeshPhysicalMaterial({ name: 'Diamond-cut chamfer', color: 0x2f2d30, metalness: .85, roughness: .4, envMapIntensity: .7, side: THREE.DoubleSide }),
    arm: alu('Hinge arm', .34, 1.6, .78),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Mirror insignia', color: 0x2a2a2c, metalness: 1, roughness: .07, clearcoat: .6, clearcoatRoughness: .05, envMapIntensity: 2.2,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x040405, metalness: 0, roughness: .06, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.1 }),
    hingeCover: dark('Matte black hinge cover', 0x0b0b0c, .62, .25, { envMapIntensity: .7 }),
    notch: new THREE.MeshBasicMaterial({ name: 'Notch', color: 0x000000 }),
    camRing: new THREE.MeshPhysicalMaterial({ name: 'Camera surround', color: 0x0a0b0e, metalness: .3, roughness: .2, clearcoat: .8, envMapIntensity: .6 }),
    led: dark('Camera indicator', 0x07120a, .3, 0),
    keycap: new THREE.MeshPhysicalMaterial({ name: 'Keycaps', color: 0xffffff, roughness: .6, metalness: 0, specularIntensity: .2, clearcoat: 0, envMapIntensity: .3 }),
    well: dark('Keyboard well', 0x0b0b0c, .7, .35, { envMapIntensity: .6 }),
    wellWall: dark('Keyboard well wall', 0x101012, .55, .5, { side: THREE.DoubleSide }),
    trackpad: new THREE.MeshPhysicalMaterial({ name: 'Force Touch trackpad glass', color: 0x2b2a2c, metalness: .05, roughness: .36, clearcoat: .45, clearcoatRoughness: .3, envMapIntensity: .7 }),
    gap: dark('Trackpad gap', 0x050506, .8, .1, { side: THREE.DoubleSide }),
    // Port openings are painted with their own depth: the upper inner wall in
    // shadow, a black core, and the lower inner wall catching the top light.
    portDark: new THREE.MeshBasicMaterial({ name: 'Port interior', color: 0xffffff, map: recessMap(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    portFace: new THREE.MeshPhysicalMaterial({ name: 'Recessed port face', color: 0x1c1c1e, metalness: .7, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    tongue: dark('Connector tongue', 0x0d0d0f, .55, .3, { polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    pins: new THREE.MeshPhysicalMaterial({ name: 'MagSafe contacts', color: 0xb99d6a, metalness: 1, roughness: .28, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }),
    vent: dark('Vent slot', 0x030304, .9, 0),
    foot: new THREE.MeshPhysicalMaterial({ name: 'Foot', color: 0x18181a, metalness: 0, roughness: .42, clearcoat: .3, clearcoatRoughness: .4 }),
  };
}

// ── Geometry helpers ───────────────────────────────────────────────────────
// Plan space: x across, y toward the front, z up. toWorld() turns it into the
// model frame (front at -Z, up +Y).
const toWorld = (g) => g.rotateX(-Math.PI / 2);
const superCurve = v => Math.sign(v) * Math.pow(Math.abs(v), .86);   // casework's squircle corners
const CORNER_SEG = 18, FLARE_SEG = 12;

// Outline of the base at an inset, with the thumb scoop cut `dep` deep into
// the front edge. The point count never changes, so rows can be bridged; at
// dep = 0 the scoop points lie on the straight front edge.
function baseOutline(inset, dep) {
  const pts = [], r = Math.max(.02, R - inset), cx = HW - R, cy = HD - R;
  const corner = (k) => {
    const sx = k === 0 || k === 3 ? 1 : -1, sy = k < 2 ? 1 : -1;
    for (let i = 0; i <= CORNER_SEG; i++) {
      const a = (k + i / CORNER_SEG) * Math.PI / 2;
      pts.push([sx * cx + superCurve(Math.cos(a)) * r, sy * cy + superCurve(Math.sin(a)) * r]);
    }
  };
  corner(0);
  // Front edge, +x to -x. The scoop flares wider toward the deck.
  const yEdge = HD - inset, f = Math.max(.002, SCOOP.f * dep / SCOOP.depth), a = SCOOP.a;
  const push = (x) => {
    const u = Math.abs(x) <= a ? 0 : Math.min(1, (Math.abs(x) - a) / f);
    pts.push([x, yEdge - dep * .5 * (1 + Math.cos(Math.PI * u))]);
  };
  for (let i = 0; i < FLARE_SEG; i++) push(a + f * (1 - i / FLARE_SEG));
  for (const x of [a * .5, 0, -a * .5]) push(x);
  for (let i = 0; i < FLARE_SEG; i++) push(-(a + f * i / FLARE_SEG));
  pts.push([-(a + f), yEdge]);
  corner(1); corner(2); corner(3);
  return pts;
}
const scoopDepth = (h) => h <= YB - SCOOP.h ? 0 : SCOOP.depth * Math.sqrt(Math.max(0, 1 - ((YB - h) / SCOOP.h) ** 2));

// Base cross-section, bottom to deck: [inset, height]. A 0.45 cm roll under
// the slab (the soft edge in every side photo), a flat wall carrying the
// ports, a crisp 0.06 cm top edge. The scoop is a cove that starts with a
// crease 0.45 cm below the deck.
const ROLL = .38, TOP_R = .06;
function rollPoint(p) { return [ROLL * (1 - Math.pow(Math.sin(p), .86)), ROLL * (1 - Math.pow(Math.cos(p), .86))]; }
function baseRows() {
  const rows = [];
  for (let i = 0; i <= 12; i++) { const [inset, h] = rollPoint(i / 12 * Math.PI / 2); rows.push([inset, h]); }
  rows.push([0, YB - SCOOP.h]);
  const psiMax = Math.acos(TOP_R / SCOOP.h);            // the cove meets the top-edge roll
  for (let i = 0; i <= 14; i++) { const psi = psiMax * Math.pow(i / 14, .8); rows.push([0, YB - SCOOP.h * Math.cos(psi)]); }
  for (let j = 1; j <= 6; j++) { const p = j / 6 * Math.PI / 2; rows.push([TOP_R * (1 - Math.cos(p)), YB - TOP_R + TOP_R * Math.sin(p)]); }
  return rows.map(([inset, h]) => [inset, h, scoopDepth(h)]);
}

// Bridges rows of equal-length closed outlines into one surface (plan space).
function sweep(rings, heights, tile = 1.4) {
  const n = rings[0].length, pos = [], uv = [], idx = [];
  let v = 0;
  rings.forEach((ring, k) => {
    if (k) { const a = rings[k - 1][0], b = ring[0]; v += Math.hypot(b[0] - a[0], b[1] - a[1], heights[k] - heights[k - 1]) / tile; }
    let d = 0; const lens = [0];
    for (let i = 1; i < n; i++) { d += Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]); lens.push(d); }
    const total = d + Math.hypot(ring[0][0] - ring[n - 1][0], ring[0][1] - ring[n - 1][1]);
    ring.forEach(([x, y], i) => { pos.push(x, y, heights[k]); uv.push(Math.min(lens[i], total - lens[i]) / tile, v); });
  });
  for (let k = 1; k < rings.length; k++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, A = (k - 1) * n + i, B = (k - 1) * n + j, C = k * n + j, Dd = k * n + i;
    idx.push(A, B, C, A, C, Dd);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// Flat cap from an outline (plan space) at height z, facing up (+1) or down (-1).
function cap(outline, z, facing, holes = [], tile = 1.4) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ShapeGeometry(shape);
  const p = g.getAttribute('position'), nrm = g.getAttribute('normal'), uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) { uv.setXY(i, p.getX(i) / tile + .5, p.getY(i) / tile + .5); p.setZ(i, z); nrm.setXYZ(i, 0, 0, facing); }
  if (facing < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
  return g;
}
// Vertical wall along a closed outline between two heights (plan space).
function wall(outline, z0, z1) {
  const pos = [], idx = [], uv = [], n = outline.length;
  for (const z of [z0, z1]) outline.forEach(([x, y], i) => { pos.push(x, y, z); uv.push(i / n, z); });
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + j, i, n + j, n + i); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
const offsetPts = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
// Rounded rectangle in plan space from world X/Z bounds.
function planRect(x0, x1, z0, z1, r) { return offsetPts(perimeter(x1 - x0, z1 - z0, r), (x0 + x1) / 2, -(z0 + z1) / 2); }
// Vertical shading for a port seen square-on, v = 0 at the bottom lip.
function recessMap() {
  const H = 128, c = document.createElement('canvas'); c.width = 4; c.height = H;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0, '#a4a5aa'); g.addColorStop(.1, '#6c6d72'); g.addColorStop(.26, '#2a2b2f'); g.addColorStop(.42, '#08080a');
  g.addColorStop(.76, '#030304'); g.addColorStop(.92, '#0c0c0e'); g.addColorStop(1, '#1a1a1d');
  x.fillStyle = g; x.fillRect(0, 0, 4, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mesh(g, m, name) { const o = new THREE.Mesh(g, m); o.name = name; return o; }

// Flat rounded rectangle (2D frame of the parent) facing +z.
function flatPanel(w, h, radii, material, name, cx = 0, cy = 0, z = 0) {
  const pts = perimeter(w, h, radii).map(([x, y]) => new THREE.Vector2(x + cx, y + cy));
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.translate(0, 0, z);
  return mesh(g, material, name);
}
function stadiumShape(len, across, cx = 0, cy = 0) {
  const r = across / 2, s = new THREE.Shape();
  s.absarc(cx + len / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(cx - len / 2 + r, cy, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}
function roundRectShape(w, h, r, cx = 0, cy = 0) {
  return new THREE.Shape(perimeter(w, h, r).map(([x, y]) => new THREE.Vector2(x + cx, y + cy)));
}
function ringShape(outer, inner) { outer.holes.push(new THREE.Path(inner.getPoints(24).reverse())); return outer; }

function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}

// ── Keyboard legends ──────────────────────────────────────────────────────
// One canvas covers the keyboard well as the user sees it (top = back).
const LEG = { s: 100, w: WELL.x * 2, h: WELL.z1 - WELL.z0 };
const FONT = 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
// Rows of [width in units, legend]. Legend: string = centred letter; [top, bottom]
// = two-line; {f, icon} function key; {bl|br|bc, sym} modifiers.
const ROWS = [
  [[1.5, { bl: 'esc' }], ...['sunLow', 'sunHigh', 'mission', 'search', 'mic', 'moon', 'rew', 'play', 'ff', 'mute', 'volLow', 'volHigh'].map((icon, i) => [1, { f: 'F' + (i + 1), icon }]), [1, { touchId: true }]],
  [...[['~', '`'], ['!', '1'], ['@', '2'], ['#', '3'], ['$', '4'], ['%', '5'], ['^', '6'], ['&', '7'], ['*', '8'], ['(', '9'], [')', '0'], ['—', '-'], ['+', '=']].map(l => [1, l]), [1.5, { br: '⌫' }]],
  [[1.5, { bl: '⇥' }], ...'QWERTYUIOP'.split('').map(c => [1, c]), [1, ['{', '[']], [1, ['}', ']']], [1, ['|', '\\']]],
  [[1.75, { bl: '⇪', dot: true }], ...'ASDFGHJKL'.split('').map(c => [1, c]), [1, [':', ';']], [1, ['"', '\'']], [1.75, { br: '↩' }]],
  [[2.25, { bl: '⇧' }], ...'ZXCVBNM'.split('').map(c => [1, c]), [1, ['<', ',']], [1, ['>', '.']], [1, ['?', '/']], [2.25, { br: '⇧' }]],
  [[1, { globe: true }], [1, { sym: '⌃', word: 'control' }], [1, { sym: '⌥', word: 'option' }], [1.25, { sym: '⌘', word: 'command' }], [5, null],
    [1.25, { sym: '⌘', word: 'command' }], [1, { sym: '⌥', word: 'option' }], [1, { arrow: 'left' }], [1, { arrow: 'updown' }], [1, { arrow: 'right' }]],
];
// Key rectangles in world X/Z: { x0, x1, z0, z1, legend, row }.
function keyLayout() {
  const keys = [];
  ROWS.forEach((row, r) => {
    const zc = KEY.row0 - KEY.row * r;
    let u = 0;
    for (const [w, legend] of row) {
      const xa = KEY.left - u * KEY.pitch, xb = xa - (w * KEY.pitch - KEY.gap);
      const z0 = zc - KEY.h / 2, z1 = zc + KEY.h / 2;
      if (legend && legend.arrow === 'updown') {
        const half = (KEY.h - .08) / 2;
        keys.push({ x0: xb, x1: xa, z0: z1 - half, z1, legend: { arrow: 'up' }, row: r });
        keys.push({ x0: xb, x1: xa, z0, z1: z0 + half, legend: { arrow: 'down' }, row: r });
      } else if (legend && (legend.arrow === 'left' || legend.arrow === 'right')) {
        keys.push({ x0: xb, x1: xa, z0, z1: z0 + (KEY.h - .08) / 2, legend, row: r });
      } else keys.push({ x0: xb, x1: xa, z0, z1, legend, row: r });
      u += w;
    }
  });
  return keys;
}
function drawIcon(ctx, icon, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = s * .09; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const tri = (x0, dir) => { ctx.beginPath(); ctx.moveTo(x0, -s * .28); ctx.lineTo(x0 + dir * s * .4, 0); ctx.lineTo(x0, s * .28); ctx.closePath(); ctx.stroke(); };
  const speaker = () => { ctx.beginPath(); ctx.moveTo(-s * .55, -s * .16); ctx.lineTo(-s * .35, -s * .16); ctx.lineTo(-s * .1, -s * .4); ctx.lineTo(-s * .1, s * .4); ctx.lineTo(-s * .35, s * .16); ctx.lineTo(-s * .55, s * .16); ctx.closePath(); ctx.stroke(); };
  const wave = (r) => { ctx.beginPath(); ctx.arc(-s * .1, 0, r, -.75, .75); ctx.stroke(); };
  const sun = (rays, len) => {
    ctx.beginPath(); ctx.arc(0, 0, s * .18, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < rays; i++) { const a = i / rays * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .3, Math.sin(a) * s * .3); ctx.lineTo(Math.cos(a) * s * (.3 + len), Math.sin(a) * s * (.3 + len)); ctx.stroke(); }
  };
  switch (icon) {
    case 'sunLow': sun(8, .1); break;
    case 'sunHigh': sun(8, .2); break;
    case 'mission': ctx.strokeRect(-s * .5, -s * .3, s * .42, s * .3); ctx.strokeRect(s * .08, -s * .3, s * .42, s * .3); ctx.strokeRect(-s * .5, s * .1, s * .26, s * .2); ctx.strokeRect(-s * .13, s * .1, s * .26, s * .2); ctx.strokeRect(s * .24, s * .1, s * .26, s * .2); break;
    case 'search': ctx.beginPath(); ctx.arc(-s * .06, -s * .06, s * .24, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * .12, s * .12); ctx.lineTo(s * .34, s * .34); ctx.stroke(); break;
    case 'mic': ctx.beginPath(); ctx.roundRect(-s * .11, -s * .42, s * .22, s * .48, s * .11); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -s * .06, s * .24, .1, Math.PI - .1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, s * .18); ctx.lineTo(0, s * .36); ctx.stroke(); break;
    case 'moon': ctx.beginPath(); ctx.arc(0, 0, s * .3, .9, -1.6 + Math.PI * 2 + .9 - .9, false); ctx.arc(s * .14, -s * .1, s * .26, -1.25, 1.6, true); ctx.closePath(); ctx.stroke(); break;
    case 'rew': tri(s * .05, -1); tri(s * .45, -1); break;
    case 'ff': tri(-s * .45, 1); tri(-s * .05, 1); break;
    case 'play': tri(-s * .45, 1); ctx.beginPath(); ctx.moveTo(s * .2, -s * .26); ctx.lineTo(s * .2, s * .26); ctx.moveTo(s * .38, -s * .26); ctx.lineTo(s * .38, s * .26); ctx.stroke(); break;
    case 'mute': speaker(); ctx.beginPath(); ctx.moveTo(-s * .55, -s * .45); ctx.lineTo(s * .35, s * .45); ctx.stroke(); break;
    case 'volLow': speaker(); wave(s * .24); break;
    case 'volHigh': speaker(); wave(s * .24); wave(s * .4); wave(s * .56); break;
  }
  ctx.restore();
}
function drawLegends(canvas, keyHex) {
  const S = LEG.s, ctx = canvas.getContext('2d');
  ctx.fillStyle = keyHex; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const ink = '#c9c9cc';
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.textBaseline = 'middle';
  for (const k of keyLayout()) {
    const L = k.legend; if (!L) continue;
    const l = (WELL.x - k.x1) * S, rgt = (WELL.x - k.x0) * S, t = (WELL.z1 - k.z1) * S, b = (WELL.z1 - k.z0) * S;
    const cx = (l + rgt) / 2, cy = (t + b) / 2, pad = .2 * S;
    const text = (str, px, x, y, align = 'center', weight = 400) => { ctx.font = `${weight} ${px}px ${FONT}`; ctx.textAlign = align; ctx.fillText(str, x, y); };
    if (typeof L === 'string') text(L, 50, cx, cy + 2);
    else if (Array.isArray(L)) { text(L[0], 38, cx, cy - .33 * S); text(L[1], 44, cx, cy + .3 * S); }
    else if (L.f) { drawIcon(ctx, L.icon, cx, cy - .2 * S, .42 * S); text(L.f, 23, cx, cy + .45 * S); }
    else if (L.touchId) { ctx.lineWidth = 2.5; ctx.globalAlpha = .45; ctx.beginPath(); ctx.arc(cx, cy, .56 * S, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (L.bl) { text(L.bl, L.bl === 'esc' ? 30 : 40, l + pad, b - pad - 4, 'left'); if (L.dot) { ctx.beginPath(); ctx.arc(l + pad + 4, t + pad + 4, 4, 0, Math.PI * 2); ctx.fill(); } }
    else if (L.br) text(L.br, 40, rgt - pad, b - pad - 4, 'right');
    else if (L.sym) { text(L.sym, 34, cx, cy - .26 * S); text(L.word, 26, cx, cy + .44 * S); }
    else if (L.globe) {
      const gx = l + pad + 12, gy = b - pad - 12, gr = 13; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(gx, gy, gr * .45, gr, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx - gr, gy); ctx.lineTo(gx + gr, gy); ctx.stroke();
      text('fn', 30, rgt - pad, b - pad - 6, 'right');
    } else if (L.arrow) {
      const s = 10, dir = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[L.arrow];
      ctx.beginPath(); ctx.moveTo(cx + dir[0] * s, cy + dir[1] * s);
      ctx.lineTo(cx - dir[0] * s * .6 - dir[1] * s * .8, cy - dir[1] * s * .6 - dir[0] * s * .8);
      ctx.lineTo(cx - dir[0] * s * .6 + dir[1] * s * .8, cy - dir[1] * s * .6 + dir[0] * s * .8); ctx.closePath(); ctx.fill();
    }
  }
}

// ── Build ─────────────────────────────────────────────────────────────────
function buildBase(M, anchors) {
  const base = new THREE.Group(); base.name = 'Aluminium base';
  const rows = baseRows();
  const rings = rows.map(([inset, , dep]) => baseOutline(inset, dep));
  base.add(mesh(toWorld(sweep(rings, rows.map(r => r[1]))), M.shell, 'Unibody walls'));
  base.add(mesh(toWorld(cap(rings[0], 0, -1)), M.shell, 'Bottom case'));
  const wellOutline = planRect(-WELL.x, WELL.x, WELL.z0, WELL.z1, WELL.r);
  const padOutline = planRect(-PAD.w / 2, PAD.w / 2, PAD.z0, PAD.z1, PAD.r);
  base.add(mesh(toWorld(cap(rings[rings.length - 1], YB, 1, [wellOutline, padOutline])), M.shell, 'Top case deck'));

  // Speaker grilles: perforated patches either side of the keyboard.
  for (const s of [1, -1]) {
    const g = new THREE.PlaneGeometry(GRILLE.x1 - GRILLE.x0, GRILLE.z1 - GRILLE.z0);
    g.rotateX(-Math.PI / 2);
    g.translate(s * (GRILLE.x0 + GRILLE.x1) / 2, YB + .0004, (GRILLE.z0 + GRILLE.z1) / 2);
    base.add(mesh(g, M.grille, 'Speaker grille'));
  }

  // Feet: four round, slightly domed pads.
  const footProfile = [[0, -MBP.FOOT], [FEET.r - .22, -MBP.FOOT], [FEET.r - .1, -MBP.FOOT + .012], [FEET.r - .03, -MBP.FOOT + .04], [FEET.r, -MBP.FOOT + .075], [FEET.r, .02]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const footGeo = new THREE.LatheGeometry(footProfile, 48);
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const f = mesh(footGeo, M.foot, 'Foot'); f.position.set(sx * FEET.x, 0, sz * FEET.z); base.add(f);
  }

  // Intake slots along the lower roll of both sides.
  const slotP = .62, [si, sy] = rollPoint(slotP), [si2, sy2] = rollPoint(slotP + .01);
  const nx = (sy2 - sy), ny = -(si - si2), nl = Math.hypot(nx, ny);   // outward normal in (out, up)
  const zFront = -HD + 2.52, zBack = HD - 9.03;
  for (const s of [1, -1]) {
    const g = new THREE.CylinderGeometry(.03, .03, zBack - zFront, 10); g.rotateX(Math.PI / 2);
    const v = mesh(g, M.vent, 'Intake slot');
    v.position.set(s * (HW - si - nx / nl * .016), sy - ny / nl * .016, (zFront + zBack) / 2); base.add(v);
  }
  // Exhaust slot under the hinge at the back.
  {
    const g = new THREE.BoxGeometry(20.4, .07, .06);
    const v = mesh(g, M.vent, 'Exhaust slot'); v.position.set(0, .78, HD - .015); base.add(v);
  }

  Object.assign(anchors, {
    trackpad: anchor(base, 'trackpad', 0, YB, (PAD.z0 + PAD.z1) / 2, [0, 1, 0]),
    keyboard: anchor(base, 'keyboard', 0, YB, (WELL.z0 + WELL.z1) / 2, [0, 1, 0]),
    scoop: anchor(base, 'thumb scoop', 0, YB - .2, -HD, [0, 0, -1]),
    hinge: anchor(base, 'hinge', -11.1, YB - .1, HD + .2, [0, .6, .8]),
    bottom: anchor(base, 'underside', 0, 0, 0, [0, -1, 0]),
    center: anchor(base, 'center', 0, YB / 2, 0, null),
  });
  return base;
}

function buildKeyboard(M, anchors, legendCanvas) {
  const kb = new THREE.Group(); kb.name = 'Keyboard and trackpad';
  const wellOutline = planRect(-WELL.x, WELL.x, WELL.z0, WELL.z1, WELL.r);
  const floor = YB - WELL.depth;
  kb.add(mesh(toWorld(cap(wellOutline, floor, 1)), M.well, 'Keyboard well floor'));
  kb.add(mesh(toWorld(wall(wellOutline, floor, YB)), M.wellWall, 'Keyboard well wall'));

  // Keycaps: rounded extrusions with a soft top bevel, merged into one mesh.
  // UVs project the legend canvas from above.
  const bevel = .022, depth = .055, geos = [];
  for (const k of keyLayout()) {
    const w = k.x1 - k.x0, h = k.z1 - k.z0;
    const shape = roundRectShape(w - 2 * bevel, h - 2 * bevel, Math.max(.03, KEY.r - bevel), (k.x0 + k.x1) / 2, -(k.z0 + k.z1) / 2);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 6 });
    g.translate(0, 0, KEY.top - depth - bevel);
    geos.push(g);
  }
  const keys = mergeGeometries(geos); geos.forEach(g => g.dispose());
  const p = keys.getAttribute('position'), uv = keys.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, (WELL.x - p.getX(i)) / LEG.w, (-p.getY(i) - WELL.z0) / LEG.h);
  const keyMesh = mesh(toWorld(keys), M.keycap, 'Keycaps'); kb.add(keyMesh);

  // Force Touch trackpad: a glass plate in a 0.25 mm gap.
  const padOutline = planRect(-PAD.w / 2, PAD.w / 2, PAD.z0, PAD.z1, PAD.r);
  kb.add(mesh(toWorld(wall(padOutline, YB - .12, YB)), M.gap, 'Trackpad gap'));
  kb.add(mesh(toWorld(cap(padOutline, YB - .12, 1)), M.gap, 'Trackpad recess'));
  const pg = .028, plate = roundRectShape(PAD.w - 2 * pg - .012, PAD.z1 - PAD.z0 - 2 * pg - .012, PAD.r - pg, 0, -(PAD.z0 + PAD.z1) / 2);
  const tg = new THREE.ExtrudeGeometry(plate, { depth: .06, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 3, curveSegments: 12 });
  tg.translate(0, 0, YB - .004 - .066);
  const tp = tg.getAttribute('position'), tuv = tg.getAttribute('uv');
  for (let i = 0; i < tp.count; i++) tuv.setXY(i, tp.getX(i) / 1.4, tp.getY(i) / 1.4);
  kb.add(mesh(toWorld(tg), M.trackpad, 'Trackpad'));

  const tid = keyLayout().find(k => k.legend && k.legend.touchId);
  Object.assign(anchors, {
    touchid: anchor(kb, 'Touch ID', (tid.x0 + tid.x1) / 2, KEY.top, (tid.z0 + tid.z1) / 2, [0, 1, 0]),
    // Right half of the keyboard with the trackpad's corner, for macro framing.
    keyboardMacro: anchor(kb, 'keyboard macro', -6.2, YB, 1.2, [0, 1, 0]),
  });
  anchors.topButton = anchors.touchid;
  return kb;
}

function buildPorts(M, anchors) {
  const ports = new THREE.Group(); ports.name = 'Ports';
  // Each port is drawn in a local (along, up) frame on the side wall, seen from outside.
  const place = (o, side, z, y = PORT_Y, lift = 0) => {
    // side +1: +X wall, local x -> -Z. side -1: -X wall, local x -> +Z.
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -side), new THREE.Vector3(0, 1, 0), new THREE.Vector3(side, 0, 0)));
    o.position.set(side * (HW + .0004 + lift), y, z); ports.add(o); return o;
  };
  // Layers stack outward in small steps (chamfer, face, opening, tongue, pins).
  const lift = new Map([['Recessed port face', .0002], ['Port interior', .0004], ['Connector tongue', .0006], ['MagSafe contacts', .0008]]);
  const flat = (shape, m, name) => {
    const geo = new THREE.ShapeGeometry(shape, 24);
    // Map UVs to the opening's own bounds so the recess shading fits each port.
    geo.computeBoundingBox(); const b = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x || 1), (p.getY(i) - b.min.y) / (b.max.y - b.min.y || 1));
    const o = mesh(geo, m, name); o.position.z = lift.get(m.name) || 0; return o;
  };
  // Machined chamfer round each opening: a flat ring whose normals lean 45°
  // toward the hole, so its lower lip catches the top light as on the real cut.
  const chamfer = (outer, inner, name) => {
    const N = 96, a = outer.getSpacedPoints(N), b = inner.getSpacedPoints(N), pos = [], nrm = [], idx = [];
    for (let i = 0; i < N; i++) {
      const d = new THREE.Vector3(b[i].x - a[i].x, b[i].y - a[i].y, 0).normalize();
      const n = new THREE.Vector3(d.x * .7, d.y * .7, .72).normalize();
      pos.push(a[i].x, a[i].y, 0, b[i].x, b[i].y, 0); nrm.push(n.x, n.y, n.z, n.x, n.y, n.z);
      const j = (i + 1) % N; idx.push(2 * i, 2 * j, 2 * j + 1, 2 * i, 2 * j + 1, 2 * i + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return mesh(g, M.chamfer, name + ' chamfer');
  };

  function thunderbolt(side, z, name) {
    const g = new THREE.Group(); g.name = name;
    g.add(chamfer(stadiumShape(.86, .3), stadiumShape(.79, .23), name));
    g.add(flat(stadiumShape(.79, .23), M.portDark, name + ' opening'));
    g.add(flat(roundRectShape(.56, .06, .03), M.tongue, name + ' tongue'));
    return place(g, side, z);
  }
  function magsafe(side, z) {
    const g = new THREE.Group(); g.name = 'MagSafe 3';
    g.add(chamfer(stadiumShape(1.76, .37), stadiumShape(1.69, .31), 'MagSafe 3'));
    g.add(flat(stadiumShape(1.69, .31), M.portFace, 'MagSafe face'));
    g.add(flat(stadiumShape(1.16, .13), M.portDark, 'MagSafe slot'));
    for (let i = -2; i <= 2; i++) g.add(flat(roundRectShape(.075, .058, .025, i * .18, 0), M.pins, 'MagSafe pin'));
    return place(g, side, z);
  }
  function headphone(side, z) {
    const g = new THREE.Group(); g.name = 'Headphone jack';
    const c = (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
    g.add(chamfer(c(.19), c(.155), 'Headphone'));
    g.add(flat(c(.155), M.portDark, 'Headphone opening'));
    return place(g, side, z);
  }
  function hdmi(side, z) {
    const g = new THREE.Group(); g.name = 'HDMI';
    const outline = (w, h, ch) => {
      const s = new THREE.Shape(), r = .03;
      s.moveTo(-w / 2 + r, h / 2); s.lineTo(w / 2 - r, h / 2); s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
      s.lineTo(w / 2, -h / 2 + ch); s.lineTo(w / 2 - ch, -h / 2); s.lineTo(-w / 2 + ch, -h / 2); s.lineTo(-w / 2, -h / 2 + ch);
      s.lineTo(-w / 2, h / 2 - r); s.quadraticCurveTo(-w / 2, h / 2, -w / 2 + r, h / 2); return s;
    };
    g.add(chamfer(outline(1.44, .46, .14), outline(1.37, .39, .11), 'HDMI'));
    g.add(flat(outline(1.37, .39, .11), M.portDark, 'HDMI opening'));
    g.add(flat(roundRectShape(1.08, .1, .02, 0, .05), M.tongue, 'HDMI tongue'));
    return place(g, side, z);
  }
  function sdxc(side, z) {
    const g = new THREE.Group(); g.name = 'SDXC card slot';
    g.add(chamfer(stadiumShape(2.63, .25), stadiumShape(2.56, .18), 'SDXC'));
    g.add(flat(stadiumShape(2.56, .18), M.portDark, 'SDXC opening'));
    return place(g, side, z);
  }
  // +X wall (user's left), measured from the back edge.
  const zb = (d) => HD - d;
  magsafe(1, zb(2.78)); thunderbolt(1, zb(4.62), 'Thunderbolt (left, rear)'); thunderbolt(1, zb(6.10), 'Thunderbolt (left, front)'); headphone(1, zb(7.40));
  // -X wall (user's right).
  hdmi(-1, zb(2.78)); thunderbolt(-1, zb(4.63), 'Thunderbolt (right)'); sdxc(-1, zb(7.08));

  Object.assign(anchors, {
    magsafe: anchor(ports, 'MagSafe 3', HW + .02, PORT_Y, zb(2.78), [1, 0, 0]),
    usb: anchor(ports, 'Thunderbolt (left)', HW + .02, PORT_Y, zb(4.62), [1, 0, 0]),
    usb2: anchor(ports, 'Thunderbolt (left, front)', HW + .02, PORT_Y, zb(6.10), [1, 0, 0]),
    headphone: anchor(ports, 'headphone jack', HW + .02, PORT_Y, zb(7.40), [1, 0, 0]),
    hdmi: anchor(ports, 'HDMI', -HW - .02, PORT_Y, zb(2.78), [-1, 0, 0]),
    usbRight: anchor(ports, 'Thunderbolt (right)', -HW - .02, PORT_Y, zb(4.63), [-1, 0, 0]),
    sdcard: anchor(ports, 'SDXC', -HW - .02, PORT_Y, zb(7.08), [-1, 0, 0]),
    portsLeft: anchor(ports, 'left ports', HW + .02, PORT_Y, zb(5.09), [1, 0, 0]),
    portsRight: anchor(ports, 'right ports', -HW - .02, PORT_Y, zb(4.93), [-1, 0, 0]),
  });
  // Phone-move vocabulary: side controls map to the left port cluster.
  anchors.control = anchors.portsLeft;
  anchors.volume = anchors.usb;
  anchors.action = anchors.magsafe;
  anchors.railLow = anchors.sdcard;
  return ports;
}

// Lid in pivot space (closed): display face at y = LY facing -Y, top at LY + TL.
function buildLid(M, screenMaterial, anchors) {
  const pivot = new THREE.Group(); pivot.name = 'Lid'; pivot.position.set(0, AXIS.y, AXIS.z);
  // Lid edge: crisp 0.035 cm chamfer on the display side, flat wall, 0.15 cm roll into the top.
  const S = [[.06, 0], [.032, 0], [.01, .01], [0, .034], [0, TL - .15]];
  for (let i = 1; i <= 9; i++) { const a = i / 9 * Math.PI / 2; S.push([.15 * (1 - Math.cos(a)), TL - .15 + .15 * Math.sin(a)]); }
  const lidLen = LID_REAR - LID_FRONT;
  const shell = toWorld(profileGeometry(W, lidLen, R, S));
  shell.translate(0, LY, (LID_FRONT + LID_REAR) / 2);
  pivot.add(mesh(shell, M.lid, 'Lid shell'));

  // Mirror Apple logo, upright when the open lid is seen from behind.
  // lid-top-space-black: 157 × 194 px of a 1380 px lid -> 3.75 × 4.63 cm, centre 0.35 cm toward the free edge.
  const logo = makeLogo(M.logo); logo.scale.setScalar(3.75);
  const logoFrame = new THREE.Group(); logoFrame.name = 'Apple logo';
  logoFrame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)));
  const logoZ = (LID_FRONT + LID_REAR) / 2 - .35;
  logoFrame.position.set(0, LY + TL + .0005, logoZ); logoFrame.add(logo); pivot.add(logoFrame);

  // Hinge arms: aluminium blocks round the axis, rising to the lid.
  const armShape = roundRectShape(.32, .67, [.06, .06, .15, .15], 0, .165);
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: 1.49, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 10 });
  armGeo.rotateY(Math.PI / 2);
  for (const s of [1, -1]) {
    const a = mesh(armGeo, M.arm, 'Hinge arm'); a.position.x = s > 0 ? 10.35 : -11.84; pivot.add(a);
  }

  // Display: a 2D frame on the lid face. +x = viewer's right, +y = up the
  // display, +z = out of the glass; origin at the centre of the active area.
  const display = new THREE.Group(); display.name = 'Display';
  display.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0)));
  display.position.set(0, LY, ACTIVE_CZ);
  pivot.add(display);
  const yTop = ACTIVE_CZ - LID_FRONT, yRear = ACTIVE_CZ - LID_REAR;          // lid edges in display y
  const ah = DISPLAY.h / 2, glassLow = -ah - BEZEL_LOW, rim = .08;
  // perimeter() radii order: top-right, top-left, bottom-left, bottom-right.
  display.add(flatPanel(W - 2 * rim, yTop - rim - glassLow, [R - rim, R - rim, .02, .02], M.glass, 'Display glass', 0, (yTop - rim + glassLow) / 2, .0008));
  display.add(flatPanel(W - 2 * rim, glassLow - (yRear + rim), [.02, .02, R - rim, R - rim], M.hingeCover, 'Hinge cover', 0, (glassLow + yRear + rim) / 2, .0008));
  const screen = flatPanel(DISPLAY.w, DISPLAY.h, [DISPLAY.rTop, DISPLAY.rTop, DISPLAY.rBottom, DISPLAY.rBottom], screenMaterial, 'Active display', 0, 0, .0016);
  const uv = screen.geometry.getAttribute('uv'), sp = screen.geometry.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, sp.getX(i) / DISPLAY.w + .5, sp.getY(i) / DISPLAY.h + .5);
  display.add(screen);

  // Notch: drawn over the artwork as a black cut-out with tiny flares into the top edge.
  const nw = NOTCH.w / 2, nf = NOTCH.flare, top = ah + .002, bot = ah - NOTCH.h, nr = NOTCH.r;
  const ns = new THREE.Shape();
  ns.moveTo(-nw - nf, top); ns.quadraticCurveTo(-nw, top, -nw, top - nf);
  ns.lineTo(-nw, bot + nr); ns.quadraticCurveTo(-nw, bot, -nw + nr, bot);
  ns.lineTo(nw - nr, bot); ns.quadraticCurveTo(nw, bot, nw, bot + nr);
  ns.lineTo(nw, top - nf); ns.quadraticCurveTo(nw, top, nw + nf, top); ns.lineTo(-nw - nf, top);
  const notch = mesh(new THREE.ShapeGeometry(ns, 16), M.notch, 'Camera notch'); notch.position.z = .0022; display.add(notch);

  // 1080p FaceTime HD camera (12MP Center Stage on M-series), indicator LED to its right.
  const cameras = new THREE.Group(); cameras.name = 'FaceTime camera';
  const cy = ah - NOTCH.cam;
  const ring = mesh(new THREE.CircleGeometry(.15, 48), M.camRing, 'Camera surround'); ring.position.set(0, cy, .0026); cameras.add(ring);
  const lens = glassElement('FaceTime camera lens', .085, .004, opticalCoating(1)); lens.position.set(0, cy, .0034); cameras.add(lens);
  const led = mesh(new THREE.CircleGeometry(.03, 20), M.led, 'Camera indicator'); led.position.set(.36, cy, .0026); cameras.add(led);
  const als = mesh(new THREE.CircleGeometry(.035, 20), M.camRing, 'Ambient light sensor'); als.position.set(-.42, cy, .0026); cameras.add(als);
  display.add(cameras);

  const camNormal = [0, 0, 1];
  Object.assign(anchors, {
    notch: anchor(display, 'notch camera', 0, cy, .005, camNormal),
    logo: anchor(logoFrame, 'logo', 0, 0, .001, [0, 0, 1]),
    lidEdge: anchor(display, 'lid top edge', 0, yTop, -TL / 2, [0, 1, 0]),
  });
  anchors.island = anchors.main = anchors.array = anchors.notch;
  // Screen anchors in the display's reading frame (fractions of half extents).
  const SCREEN = {
    scrTop: [0, .74], scrUpper: [0, .385], scrMid: [0, 0], scrLower: [0, -.385], scrBottom: [0, -.74],
    scrTL: [-.65, .715], scrTR: [.65, .715], scrBL: [-.65, -.715], scrBR: [.65, -.715], scrLeft: [-.62, .08], scrRight: [.62, -.08],
  };
  for (const [key, [fr, fu]] of Object.entries(SCREEN)) anchors[key] = anchor(display, key, fr * DISPLAY.w / 2, fu * ah, .002, [0, 0, 1]);
  return { pivot, display, cameras, screen };
}

export function createMacbook() {
  const root = new THREE.Group(); root.name = 'MacBook Pro 14-inch (M6)';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  const legendCanvas = document.createElement('canvas');
  legendCanvas.width = Math.round(LEG.w * LEG.s); legendCanvas.height = Math.round(LEG.h * LEG.s);
  const legendTex = new THREE.CanvasTexture(legendCanvas);
  legendTex.colorSpace = THREE.SRGBColorSpace; legendTex.anisotropy = 8;
  M.keycap.map = legendTex;

  const anchors = {};
  const base = buildBase(M, anchors);
  const keyboard = buildKeyboard(M, anchors, legendCanvas);
  const ports = buildPorts(M, anchors);
  const lid = buildLid(M, screenMaterial, anchors);
  root.add(base, keyboard, ports, lid.pivot);
  const groups = { base, lid: lid.pivot, display: lid.display, keyboard, ports, cameras: lid.cameras };

  // ── Lid angle. 0 = closed; progress 1 = open at 110°. ──
  let progress = 0, angle = 0;
  function setLidAngle(deg) {
    angle = THREE.MathUtils.clamp(deg, 0, 135);
    lid.pivot.rotation.x = THREE.MathUtils.degToRad(angle);
    progress = Math.min(1, angle / MBP.OPEN);
  }
  function setProgress(t) { setLidAngle(MBP.OPEN * THREE.MathUtils.clamp(t, 0, 1)); progress = THREE.MathUtils.clamp(t, 0, 1); }

  // ── Finish ──
  const tmp = new THREE.Color();
  function setFinish(hex) {
    const known = mbpFinishes.find(f => f[1].toLowerCase() === String(hex).toLowerCase());
    const body = new THREE.Color(known ? known[1] : hex), keys = known ? known[2] : '#0d0d0e';
    const hsl = {}; body.getHSL(hsl);
    const light = hsl.l > .5;
    for (const m of [M.shell, M.lid, M.grille]) m.color.copy(body);
    M.arm.color.copy(body).multiplyScalar(light ? .9 : .92);
    // Diamond-cut chamfers read a little brighter than the blasted surface.
    M.chamfer.color.copy(body).lerp(tmp.set(light ? '#ffffff' : '#8d8a90'), light ? .15 : .06);
    // The lit lower wall inside each port is the bare aluminium of the finish.
    M.portDark.color.copy(body).lerp(tmp.set('#ffffff'), light ? .05 : .35).multiplyScalar(light ? .78 : .7);
    M.portFace.color.copy(body).multiplyScalar(light ? .55 : .8);
    // Mirror logo: bright polish on light finishes, a deep mirror on dark ones.
    M.logo.color.copy(light ? tmp.set('#e9e9ea') : tmp.set('#3a393c'));
    // Trackpad glass sits a shade apart from the aluminium.
    M.trackpad.color.copy(body).multiplyScalar(light ? .93 : .62);
    M.trackpad.roughness = light ? .42 : .34;
    drawLegends(legendCanvas, keys); legendTex.needsUpdate = true;
    M.well.color.set(keys).multiplyScalar(.9);
  }

  // ── Anchors in `model` space with outward normals. ──
  const q = new THREE.Quaternion(), mq = new THREE.Quaternion();
  function points(model = root) {
    model.updateMatrixWorld(true);
    model.getWorldQuaternion(mq).invert();
    const out = {};
    for (const [key, o] of Object.entries(anchors)) {
      const p = model.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
      const n = o.userData.normal ? o.userData.normal.clone().applyQuaternion(o.getWorldQuaternion(q)).applyQuaternion(mq).normalize() : null;
      out[key] = { p, n };
    }
    return out;
  }

  setFinish(mbpFinishes[0][1]);
  setProgress(0);
  return {
    root, groups, screenMaterial, setFinish, setProgress, setLidAngle, points, anchors,
    state: () => ({ angle }), setState(s) { if (s && typeof s.angle === 'number') setLidAngle(s.angle); },
    get progress() { return progress; }, get lidAngle() { return angle; },
  };
}
