import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileGeometry, perimeter } from '../casework.js';
import { lathe } from '../optics.js';
import { makeLogo } from '../exterior.js';

// iMac 24-inch (M4, 2024 design), procedural. 1 unit = 1 cm.
// Apple's figures: 46.1 cm tall with the stand, 54.7 cm wide, stand depth
// 14.7 cm, display enclosure 1.15 cm thick. 23.5-inch visible 4.5K Retina
// display, 4480 × 2520 px at 218 ppi (52.2 × 29.36 cm active area, 16:9).
//
// Model frame: the display stands upright on its stand, the screen faces −Z
// (towards the studio's front camera), the long axis runs along X, +Y is up.
// y = 0 is the desk (underside of the foot). Seen from the front the viewer's
// right is −X, so seen from the back:
//   −X (back, lower left)   four Thunderbolt / USB-C ports, vertical slots
//   +X (back, lower right)  power button
//   +X edge (the user's left, seen from the front) headphone jack
//
// Layout (from Apple's photography and the dimensions above):
//   white glass border     1.25 cm on the sides, top and above the chin
//                          ((54.7 − 52.2) / 2), uniform; thin black line at
//                          the panel boundary; FaceTime camera centred in the top border
//   chin                   5.0 cm tall, pastel aluminium, no logo
//                          (36.86 = 1.25 + 29.36 + 1.25 + 5.0)
//   plan corner radius     0.7 cm; edges broken with a 0.6 mm roll
//   stand                  one bent aluminium sheet, 0.45 cm thick, 20 cm wide:
//                          foot plate on the desk (14.7 cm deep including the
//                          rear bend), a rear bend, and a riser leaning back
//                          from the hinge to the bend (~26° from vertical);
//                          vertical oval cut-out in the riser
//   hinge                  barrel across the riser top, polished caps on both
//                          ends; on the display back 40 % up from its bottom;
//                          default tilt 6° back (screen faces slightly up)
export const IMAC = {
  W: 54.7, H: 36.86, T: 1.15, R: .7, BORDER: 1.25, CHIN: 5.0, HEIGHT: 46.1,
  ACTIVE: { w: 52.2, h: 29.36, r: .1 },
  stand: { w: 20, t: .45, bendR: .55, z0: -3.4, depth: 14.7, hingeR: .8, hingeOffset: 1.1, hingeFrac: .4 },
  tilt: { min: -5, max: 15, rest: 6 },
};
const { W, H, T, R, BORDER, CHIN, ACTIVE } = IMAC;
const HW = W / 2, HH = H / 2, HT = T / 2;
export const IMAC_ASPECT = 4480 / 2520;
const ZF = -HT, ZB = HT;
const ZGLASS = ZF - .008, ZLINE = ZF - .014, ZS = ZF - .02;   // 0.08–0.2 mm stand-offs keep the layers stable at grazing angles          // panel edge line, display emission plane
const GLASS_H = H - CHIN, GLASS_CY = HH - GLASS_H / 2;
const ACTIVE_CY = HH - BORDER - ACTIVE.h / 2;
const CHIN_CY = -HH + CHIN / 2;
const CAM_Y = HH - BORDER / 2;
const PORT_X0 = -HW + 3.6, PORT_STEP = 1.3, PORT_Y = -HH + 3.1;
const POWER = { x: HW - 2.4, y: -HH + 2.4, r: .5 };
const JACK_Y = -HH + 2.6;
const LOGO_Y = 4.6, LOGO_W = 10.2;
// Hinge axis in display coordinates.
const HINGE_Y = -HH + IMAC.stand.hingeFrac * H, HINGE_Z = ZB + IMAC.stand.hingeOffset;

// Finishes: [name, anodised back, pastel chin, pastel stand]. Blue is the default.
export const imacFinishes = [
  ['Blue', '#4f7fb8', '#bcd0ea', '#b0c4e0'],
  ['Purple', '#8a82c8', '#d4d0ec', '#c8c3e6'],
  ['Pink', '#d9547a', '#f2c9d3', '#ecbcc8'],
  ['Orange', '#e87d4f', '#f5cdb6', '#f0c0a6'],
  ['Yellow', '#e8c94a', '#f4e6b0', '#efdc9c'],
  ['Green', '#4fa86a', '#c4e2cc', '#b4d8bd'],
  ['Silver', '#d6d8dc', '#eceef0', '#e2e4e7'],
];

// ── Stand geometry (side profile in Z–Y) ──
// Rear bend centre, then the riser angle that puts the riser's mid-plane
// through the hinge axis at the rest tilt, with the display top at 46.1 cm.
const S = IMAC.stand;
const BEND = (() => {
  const rest = THREE.MathUtils.degToRad(IMAC.tilt.rest);
  // Highest point of the tilted slab is its front top edge.
  const up = HH - HINGE_Y, back = HINGE_Z - ZF;
  const hingeY = IMAC.HEIGHT - (up * Math.cos(rest) + back * Math.sin(rest));
  const hingeZ = 0;
  const ro = S.bendR + S.t, rm = S.bendR + S.t / 2;
  const cz = S.z0 + S.depth - ro, cy = ro;
  const dz = hingeZ - cz, dy = hingeY - cy, rho = Math.hypot(dz, dy);
  const phi = Math.atan2(dy, dz) - Math.acos(rm / rho);   // riser lean from vertical
  const n = [Math.cos(phi), Math.sin(phi)], u = [-Math.sin(phi), Math.cos(phi)]; // (z, y)
  const length = dz * u[0] + dy * u[1];
  return { hingeY, hingeZ, ro, ri: S.bendR, rm, cz, cy, phi, n, u, length };
})();
const HOLE = { s: .5 * BEND.length, w: 4.2, h: 8.0 };
const riserPoint = (s, off = 0) => [BEND.cz + BEND.n[0] * (BEND.rm + off) + BEND.u[0] * s, BEND.cy + BEND.n[1] * (BEND.rm + off) + BEND.u[1] * s];

// ── Textures ──
let blastCache = null;
function blastMaps() {
  // Bead blast: fine random micro-normal plus a gentle roughness scatter.
  if (blastCache) return blastCache;
  const size = 256, n = document.createElement('canvas'), r = document.createElement('canvas');
  n.width = n.height = r.width = r.height = size;
  const nc = n.getContext('2d'), rc = r.getContext('2d');
  const ni = nc.createImageData(size, size), ri = rc.createImageData(size, size);
  let seed = 24240;
  const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => (rand() + rand() + rand() - 1.5) * .9;
  for (let i = 0; i < size * size; i++) {
    const x = gauss() * .5, y = gauss() * .5, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    ni.data.set([(x * .5 + .5) * 255, (y * .5 + .5) * 255, (z * .5 + .5) * 255, 255], i * 4);
    const g = 236 + gauss() * 18;
    ri.data.set([g, g, g, 255], i * 4);
  }
  nc.putImageData(ni, 0, 0); rc.putImageData(ri, 0, 0);
  const normalMap = new THREE.CanvasTexture(n), roughnessMap = new THREE.CanvasTexture(r);
  for (const t of [normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.anisotropy = 8; }
  blastCache = { normalMap, roughnessMap };
  return blastCache;
}
// Concentric lathe-turned rings for the polished hinge caps (bump map).
let ringCache = null;
function ringBump() {
  if (ringCache) return ringCache;
  const size = 256, c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'), im = ctx.createImageData(size, size);
  let seed = 991;
  const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const rings = Array.from({ length: 200 }, () => rand());
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot(x - size / 2 + .5, y - size / 2 + .5) / (size / 2);
    const k = Math.min(199, Math.floor(r * 199));
    const v = 128 + (rings[k] - .5) * 40;
    im.data.set([v, v, v, 255], (y * size + x) * 4);
  }
  ctx.putImageData(im, 0, 0);
  ringCache = new THREE.CanvasTexture(c); ringCache.anisotropy = 8;
  return ringCache;
}

function makeMaterials() {
  const blast = blastMaps();
  // Front layers sit a fraction of a millimetre proud of the slab; a depth
  // offset keeps them clean at long focal lengths and on 16-bit depth buffers.
  const front = (m, k) => { m.polygonOffset = true; m.polygonOffsetFactor = -k; m.polygonOffsetUnits = -2 * k; return m; };
  const anodised = (name, roughness, env) => {
    const m = new THREE.MeshPhysicalMaterial({ name, color: 0x4f7fb8, metalness: .9, roughness, ...blast,
      normalScale: new THREE.Vector2(.1, .1), clearcoat: .08, clearcoatRoughness: .5 });
    m.envMapIntensity = env; return m;
  };
  return {
    back: anodised('Anodised aluminium back', .35, 1.8),
    chin: (() => { const m = anodised('Pastel aluminium chin', .38, 1.25); m.metalness = .78; return front(m, 1); })(),
    stand: (() => { const m = anodised('Pastel aluminium stand', .32, 1.25); m.metalness = .72; return m; })(),
    keyBase: anodised('Magic Keyboard aluminium base', .32, 1.5),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Embossed Apple logo', color: 0x8fb0d6, metalness: .9, roughness: .2, clearcoat: .3, clearcoatRoughness: .2, envMapIntensity: 1.7 }),
    glass: front(new THREE.MeshPhysicalMaterial({ name: 'White glass border', color: 0xf6f7f8, emissive: 0x3a3b3d, metalness: 0, roughness: .22, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.0 }), 1),
    polished: new THREE.MeshPhysicalMaterial({ name: 'Polished hinge cap', color: 0xeeeff1, metalness: 1, roughness: .13, bumpMap: ringBump(), bumpScale: .3, clearcoat: .5, clearcoatRoughness: .04, envMapIntensity: 2.1 }),
    edge: front(new THREE.MeshBasicMaterial({ name: 'Panel edge line', color: 0x050506 }), 2),
    camWin: new THREE.MeshPhysicalMaterial({ name: 'FaceTime camera window', color: 0x0b0c10, metalness: .3, roughness: .15, clearcoat: 1 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x040405, metalness: .2, roughness: .85 }),
    tongue: new THREE.MeshStandardMaterial({ name: 'USB-C tongue', color: 0x1a1b1f, metalness: .4, roughness: .45 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Seam', color: 0x1d1e22, metalness: .5, roughness: .55 }),
    chassis: new THREE.MeshStandardMaterial({ name: 'Black mid-frame', color: 0x09090b, metalness: .3, roughness: .6 }),
    board: new THREE.MeshStandardMaterial({ name: 'Logic board', color: 0x16241c, metalness: .35, roughness: .5 }),
    chip: new THREE.MeshPhysicalMaterial({ name: 'M4 package', color: 0x2a2b2e, metalness: .7, roughness: .3, clearcoat: .4 }),
    speaker: new THREE.MeshStandardMaterial({ name: 'Speaker module', color: 0x2d2e33, metalness: .5, roughness: .45 }),
    keys: new THREE.MeshPhysicalMaterial({ name: 'White keycaps', color: 0xf6f6f4, metalness: 0, roughness: .48, clearcoat: .1, envMapIntensity: .9 }),
    mouse: new THREE.MeshPhysicalMaterial({ name: 'Magic Mouse glossy top', color: 0xf5f5f3, metalness: 0, roughness: .14, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.1 }),
  };
}

const white = new THREE.Color(1, 1, 1), tmp = new THREE.Color();
function finishRow(hex) {
  const row = imacFinishes.find(f => f[1].toLowerCase() === String(hex).toLowerCase());
  if (row) return row;
  // Unknown colour: derive the pastel chin / stand tones from the back.
  const b = new THREE.Color(hex), hsl = {}; b.getHSL(hsl);
  const pastel = (l) => '#' + new THREE.Color().setHSL(hsl.h, hsl.s * .55, l).getHexString();
  return ['Custom', hex, pastel(.86), pastel(.82)];
}
function applyFinish(M, hex) {
  const [, back, chin, stand] = finishRow(hex);
  M.back.color.set(back);
  M.chin.color.set(chin);
  M.stand.color.set(stand); M.keyBase.color.set(stand);
  M.logo.color.copy(tmp.set(back).lerp(white, .32));
}

// ── Geometry helpers ──
function flatShape(w, h, r, z, facing, material, name) {
  const pts = perimeter(w, h, r).map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(pts), 24);
  const pos = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  for (let i = 0; i < pos.count; i++) { pos.setZ(i, z); normal.setXYZ(i, 0, 0, facing); }
  if (facing < 0) {
    const index = geometry.index.array;
    for (let i = 0; i < index.length; i += 3) { const t = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = t; }
  }
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; return mesh;
}
// A closed pill (stadium) contour, clockwise, for profileGeometry holes.
function pillContour(cx, cy, w, h, seg = 20) {
  const r = Math.min(w, h) / 2, out = [];
  if (h >= w) {
    const top = cy + h / 2 - r, bot = cy - h / 2 + r;
    for (let i = 0; i <= seg; i++) { const a = Math.PI - Math.PI * i / seg; out.push([cx + r * Math.cos(a), top + r * Math.sin(a)]); }
    for (let i = 0; i <= seg; i++) { const a = -Math.PI * i / seg; out.push([cx + r * Math.cos(a), bot + r * Math.sin(a)]); }
  } else {
    const right = cx + w / 2 - r, left = cx - w / 2 + r;
    for (let i = 0; i <= seg; i++) { const a = Math.PI / 2 - Math.PI * i / seg; out.push([right + r * Math.cos(a), cy + r * Math.sin(a)]); }
    for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 - Math.PI * i / seg; out.push([left + r * Math.cos(a), cy + r * Math.sin(a)]); }
  }
  return out;
}
// Vertical stadium shape centred on the origin (for extrusions).
function pillShape(w, h) {
  const r = w / 2, s = new THREE.Shape();
  s.absarc(0, h / 2 - r, r, 0, Math.PI, false); s.absarc(0, -h / 2 + r, r, Math.PI, Math.PI * 2, false);
  return s;
}
function basis(mesh, x, y, z) { mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z))); return mesh; }
function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}
function box(w, h, d, material, name, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.name = name; return m;
}

// ── Enclosure: aluminium slab (side wall, back with port openings, logo) ──
function buildEnclosure(M) {
  const g = new THREE.Group(); g.name = 'Aluminium enclosure';
  // One closed slab: rolled front and back edges; caps are the front and back
  // faces. (Port slots are drawn on the back in buildPorts.)
  const slab = new THREE.Mesh(profileGeometry(W, H, R, [
    [.06, ZF], [.018, ZF + .01], [.004, ZF + .03], [0, ZF + .06], [0, ZB - .06], [.004, ZB - .03], [.018, ZB - .01], [.06, ZB],
  ]), M.back);
  slab.name = 'Aluminium enclosure'; g.add(slab);
  // Pastel chin, the lower front face (aluminium, no logo).
  const chin = flatShape(W - .1, CHIN - .05, [.02, .02, R - .05, R - .05], ZGLASS, -1, M.chin, 'Pastel chin');
  chin.position.y = CHIN_CY - .025; g.add(chin);
  // Embossed Apple logo on the back, upper centre.
  const logo = makeLogo(M.logo); logo.scale.setScalar(LOGO_W); logo.position.set(0, LOGO_Y, ZB + .003); g.add(logo);
  // Display-side hinge bracket (hidden behind the barrel).
  g.add(box(S.w - 1.2, 1.3, HINGE_Z - ZB, M.stand, 'Hinge bracket', 0, HINGE_Y, (HINGE_Z + ZB) / 2));
  return g;
}

// ── Front: white glass border, black panel edge, active display, camera ──
function buildFront(M, screenMaterial) {
  const g = new THREE.Group(); g.name = 'Front glass and display';
  const glass = flatShape(W - .1, GLASS_H - .05, [R - .05, R - .05, .02, .02], ZGLASS, -1, M.glass, 'White glass border');
  glass.position.y = GLASS_CY + .025; g.add(glass);
  const edge = flatShape(ACTIVE.w + .1, ACTIVE.h + .1, ACTIVE.r + .05, ZLINE, -1, M.edge, 'Panel edge line');
  edge.position.y = ACTIVE_CY; g.add(edge);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display');
  screen.position.y = ACTIVE_CY; g.add(screen);
  // Screen UVs: 0..1 across the active area, upright seen from the front
  // (the viewer's right is −X).
  const uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (ACTIVE.w / 2 - p.getX(i)) / ACTIVE.w, (p.getY(i) + ACTIVE.h / 2) / ACTIVE.h);
  uv.needsUpdate = true;
  const cam = new THREE.Mesh(new THREE.CircleGeometry(.13, 40), M.camWin); cam.rotation.y = Math.PI; cam.position.set(0, CAM_Y, ZS); cam.name = 'FaceTime camera'; g.add(cam);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.05, 32), M.polished); lens.rotation.y = Math.PI; lens.position.set(0, CAM_Y, ZS - .0005); lens.name = 'Camera lens'; g.add(lens);
  return { front: g, screen };
}

// ── Internals (seen when the front glass lifts off) ──
function buildInternals(M) {
  const g = new THREE.Group(); g.name = 'Logic board and speakers';
  const tray = flatShape(W - .5, GLASS_H - .5, .4, ZF + .3, -1, M.chassis, 'Black mid-frame'); tray.position.y = GLASS_CY; g.add(tray);
  g.add(box(30, 3.4, .12, M.board, 'Logic board', 0, CHIN_CY, -.05));
  g.add(box(2.4, 2.4, .1, M.chip, 'M4 chip', -2, CHIN_CY, -.16));
  for (const x of [1.6, 3.4, 5.2]) g.add(box(1.2, 1.4, .08, M.chip, 'Memory', x, CHIN_CY, -.15));
  for (const s of [-1, 1]) g.add(box(9, 2.8, .7, M.speaker, 'Speaker module', s * 20.5, CHIN_CY, 0));
  return g;
}

// ── Ports, power button and headphone jack ──
function buildPorts(M) {
  const g = new THREE.Group(); g.name = 'Ports and buttons';
  // Vertical USB-C slots: chamfer ring, dark opening and the connector tongue.
  const rim = new THREE.ShapeGeometry(pillShape(.36, .92), 12), mouth = new THREE.ShapeGeometry(pillShape(.3, .86), 12), tongueGeo = new THREE.ShapeGeometry(pillShape(.07, .62), 6);
  for (let i = 0; i < 4; i++) {
    const x = PORT_X0 + i * PORT_STEP;
    const r = new THREE.Mesh(rim, M.seam); r.position.set(x, PORT_Y, ZB + .0015); r.name = 'Port chamfer'; g.add(r);
    const s = new THREE.Mesh(mouth, M.dark); s.position.set(x, PORT_Y, ZB + .002); s.name = i < 2 ? 'Thunderbolt / USB 4 port' : 'USB 3 port'; g.add(s);
    const t = new THREE.Mesh(tongueGeo, M.tongue); t.position.set(x, PORT_Y, ZB + .0025); t.name = 'Port tongue'; g.add(t);
  }
  // Power button, flush, with a fine seam.
  const btn = new THREE.Mesh(new THREE.CircleGeometry(POWER.r - .02, 48), M.back); btn.position.set(POWER.x, POWER.y, ZB + .0015); btn.name = 'Power button'; g.add(btn);
  const seam = new THREE.Mesh(new THREE.RingGeometry(POWER.r - .02, POWER.r + .015, 64), M.seam); seam.position.set(POWER.x, POWER.y, ZB + .0016); seam.name = 'Power button seam'; g.add(seam);
  // Headphone jack on the +X edge.
  const jack = new THREE.Mesh(new THREE.CircleGeometry(.18, 32), M.dark); jack.rotation.y = Math.PI / 2; jack.position.set(HW + .0015, JACK_Y, 0); jack.name = 'Headphone jack'; g.add(jack);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.18, .21, 40), M.seam); ring.rotation.y = Math.PI / 2; ring.position.set(HW + .0016, JACK_Y, 0); ring.name = 'Headphone jack chamfer'; g.add(ring);
  return g;
}

// ── Stand: foot plate, rear bend, riser with cable cut-out, hinge barrel ──
function buildStand(M) {
  const g = new THREE.Group(); g.name = 'Stand';
  const t = S.t, B = BEND;
  // Foot plate (plan in X–Z): rounded front corners, square where it meets the bend.
  const footD = B.cz - S.z0;
  const foot = new THREE.Mesh(profileGeometry(S.w, footD, [1.4, 1.4, .02, .02], [[.05, 0], [.012, .012], [0, .045], [0, t - .045], [.012, t - .012], [.05, t]]), M.stand);
  foot.rotation.x = -Math.PI / 2; foot.position.z = (S.z0 + B.cz) / 2; foot.name = 'Foot plate'; g.add(foot);
  // Rear bend: annular sector swept across the width.
  const bs = new THREE.Shape();
  bs.absarc(B.cz, B.cy, B.ro, -Math.PI / 2, B.phi, false);
  bs.lineTo(B.cz + B.ri * Math.cos(B.phi), B.cy + B.ri * Math.sin(B.phi));
  bs.absarc(B.cz, B.cy, B.ri, B.phi, -Math.PI / 2, true); bs.closePath();
  const bend = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: S.w - .1, bevelEnabled: false, curveSegments: 32 }), M.stand);
  basis(bend, [0, 0, 1], [0, 1, 0], [-1, 0, 0]); bend.position.x = (S.w - .1) / 2; bend.name = 'Rear bend'; g.add(bend);
  // Riser plate with the vertical cable pass-through.
  const L = B.length;
  const riser = new THREE.Mesh(profileGeometry(S.w, L, .02, [[.05, -t / 2], [.012, -t / 2 + .012], [0, -t / 2 + .045], [0, t / 2 - .045], [.012, t / 2 - .012], [.05, t / 2]], false,
    [{ contour: pillContour(0, HOLE.s - L / 2, HOLE.w, HOLE.h, 28) }]), M.stand);
  const [mz, my] = riserPoint(L / 2);
  basis(riser, [1, 0, 0], [0, B.u[1], B.u[0]], [0, B.n[1], B.n[0]]); riser.position.set(0, my, mz); riser.name = 'Riser'; g.add(riser);
  // Hinge barrel and the polished caps on both ends.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(S.hingeR, S.hingeR, S.w + .1, 64), M.stand);
  barrel.rotation.z = Math.PI / 2; barrel.position.set(0, B.hingeY, B.hingeZ); barrel.name = 'Hinge barrel'; g.add(barrel);
  const capProfile = [[0, .03], [.2, .03], [.5, .026], [S.hingeR - .1, .02], [S.hingeR - .06, .008], [S.hingeR - .05, 0]];
  for (const s of [-1, 1]) {
    const holder = new THREE.Group(); holder.rotation.y = s * Math.PI / 2; holder.position.set(s * (S.w + .1) / 2, B.hingeY, B.hingeZ); g.add(holder);
    const cap = lathe('Polished hinge cap', [...capProfile].reverse(), M.polished); holder.add(cap);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(S.hingeR - .05, 64), M.polished); disc.position.z = .03; disc.name = 'Hinge cap face'; holder.add(disc);
    const gap = new THREE.Mesh(new THREE.RingGeometry(S.hingeR - .05, S.hingeR - .02, 64), M.seam); gap.position.z = .001; gap.name = 'Hinge cap gap'; holder.add(gap);
  }
  return g;
}

// ── Accessories: Magic Keyboard with Touch ID and Magic Mouse ──
function buildAccessories(M) {
  const g = new THREE.Group(); g.name = 'Magic Keyboard and Magic Mouse';
  // Keyboard: 27.9 × 11.5 cm wedge, 0.4 cm at the front to 1.08 cm at the back.
  const KW = 27.9, KD = 11.5, front = .4, back = 1.08;
  const kb = new THREE.Group(); kb.name = 'Magic Keyboard with Touch ID'; kb.position.set(1, 0, -17); g.add(kb);
  const baseGeo = profileGeometry(KW, KD, .9, [[.12, 0], [.03, .03], [0, .12], [0, .88], [.02, .97], [.08, 1]]);
  baseGeo.rotateX(-Math.PI / 2);
  const bp = baseGeo.getAttribute('position');
  for (let i = 0; i < bp.count; i++) { const k = (bp.getZ(i) + KD / 2) / KD; bp.setY(i, bp.getY(i) * (front + (back - front) * k)); }
  baseGeo.computeVertexNormals();
  const base = new THREE.Mesh(baseGeo, M.keyBase); base.name = 'Keyboard base'; kb.add(base);
  // Keys: rows from the back (function row) to the front, laid out from the
  // user's left (+X) to right (−X); 1 u = 1.9 cm, 0.2 cm gaps.
  const U = 1.9, gap = .2, slope = Math.atan((back - front) / KD);
  const rows = [
    { h: .5, keys: [1.5, ...Array(12).fill(1), 'touch'] },
    { h: 1, keys: [...Array(13).fill(1), 1.5] },
    { h: 1, keys: [1.5, ...Array(13).fill(1)] },
    { h: 1, keys: [1.75, ...Array(11).fill(1), 1.75] },
    { h: 1, keys: [2.25, ...Array(10).fill(1), 2.25] },
    { h: 1, keys: [1, 1, 1, 1.25, 5, 1.25, 1, 1, 'updown', 1] },
  ];
  const keyGeos = [], cache = {};
  const keyGeo = (w, h) => {
    const id = w.toFixed(3) + 'x' + h.toFixed(3);
    if (!cache[id]) { const kg = profileGeometry(w, h, .16, [[.04, 0], [0, .03], [0, .08], [.03, .11], [.06, .12]]); kg.rotateX(-Math.PI / 2); kg.deleteAttribute('uv'); cache[id] = kg; }
    return cache[id];
  };
  const totalD = rows.reduce((a, r) => a + r.h * U, 0);
  let zRow = totalD / 2;                                 // back edge of the current row (key frame, +Z back)
  const keys = new THREE.Group(); keys.name = 'Keys';
  const midY = (front + back) / 2;
  keys.rotation.x = -slope; keys.position.set(0, midY - .01, -.05); kb.add(keys);
  let touch = null;
  for (const row of rows) {
    const rowD = row.h * U, zc = zRow - rowD / 2;
    let u = -7.25;                                       // user's left edge in units
    for (const k of row.keys) {
      const w = typeof k === 'number' ? k : 1, cx = (u + w / 2) * U, x = -cx;
      if (k === 'updown') {
        for (const dz of [rowD / 4, -rowD / 4]) keyGeos.push(keyGeo(U - gap, rowD / 2 - gap).clone().translate(x, 0, zc + dz));
      } else if (k === 'touch') {
        touch = { x, z: zc, w: U - gap, d: rowD - gap };
      } else keyGeos.push(keyGeo(w * U - gap, rowD - gap).clone().translate(x, 0, zc));
      u += w;
    }
    zRow -= rowD;
  }
  const keyMesh = new THREE.Mesh(mergeGeometries(keyGeos), M.keys); keyMesh.name = 'Keycaps'; keys.add(keyMesh);
  // Touch ID key: glossy cap inside a polished ring.
  const tk = new THREE.Mesh(keyGeo(touch.w, touch.d), M.mouse); tk.position.set(touch.x, 0, touch.z); tk.name = 'Touch ID key'; keys.add(tk);
  const tr = new THREE.Mesh(new THREE.RingGeometry(.36, .42, 48), M.polished); tr.rotation.x = -Math.PI / 2; tr.position.set(touch.x, .121, touch.z); tr.name = 'Touch ID ring'; keys.add(tr);
  // Mouse: 11.4 × 5.7 cm glossy dome on a colour-matched base.
  const mouse = new THREE.Group(); mouse.name = 'Magic Mouse'; mouse.position.set(-21, 0, -17); g.add(mouse);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), M.mouse);
  dome.scale.set(2.85, 1.75, 5.7); dome.position.y = .35; dome.name = 'Glossy top'; mouse.add(dome);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(1, .94, .35, 64), M.keyBase); foot.scale.set(2.82, 1, 5.64); foot.position.y = .175; foot.name = 'Aluminium base'; mouse.add(foot);
  return g;
}

export function createImac() {
  const root = new THREE.Group(); root.name = 'iMac 24-inch (M4)';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  screenMaterial.polygonOffset = true; screenMaterial.polygonOffsetFactor = -3; screenMaterial.polygonOffsetUnits = -6;

  const stand = buildStand(M); root.add(stand);
  const headPivot = new THREE.Object3D(); headPivot.name = 'Hinge'; headPivot.position.set(0, BEND.hingeY, BEND.hingeZ); root.add(headPivot);
  const head = new THREE.Group(); head.name = 'Display head'; head.position.set(0, -HINGE_Y, -HINGE_Z); headPivot.add(head);
  const enclosure = buildEnclosure(M); head.add(enclosure);
  const { front: display, screen } = buildFront(M, screenMaterial); head.add(display);
  const internals = buildInternals(M); head.add(internals);
  const ports = buildPorts(M); head.add(ports);
  const accessories = buildAccessories(M); accessories.visible = false; root.add(accessories);
  const groups = { display, enclosure, internals, ports, stand, accessories };

  // ── Anchors ──
  const [hz, hy] = riserPoint(HOLE.s, S.t / 2 + .01);
  const anchors = {
    camera: anchor(display, 'camera', 0, CAM_Y, ZF - .01, [0, 0, -1]),
    ports: anchor(ports, 'ports', PORT_X0 + 1.5 * PORT_STEP, PORT_Y, ZB + .01, [0, 0, 1]),
    power: anchor(ports, 'power button', POWER.x, POWER.y, ZB + .01, [0, 0, 1]),
    jack: anchor(ports, 'headphone jack', HW + .01, JACK_Y, 0, [1, 0, 0]),
    hinge: anchor(stand, 'hinge cap', S.w / 2 + .08, BEND.hingeY, BEND.hingeZ, [1, 0, 0]),
    cable: anchor(stand, 'cable cut-out', 0, hy, hz, [0, BEND.n[1], BEND.n[0]]),
    stand: anchor(stand, 'foot', 0, S.t, (S.z0 + BEND.cz) / 2, [0, 1, 0]),
    logo: anchor(enclosure, 'logo', 0, LOGO_Y, ZB + .01, [0, 0, 1]),
    chin: anchor(enclosure, 'chin', 0, CHIN_CY, ZF - .01, [0, 0, -1]),
    corner: anchor(enclosure, 'top-left corner (front)', HW - 3.2, HH - 2.8, ZF, [0, 0, -1]),
    keyboard: anchor(accessories, 'keyboard', 1, .9, -17, [0, 1, 0]),
    mouse: anchor(accessories, 'mouse', -21, 2.1, -17, [0, 1, 0]),
    // Phone-oriented moves: aliases onto the nearest iMac feature.
    control: anchor(stand, 'hinge cap', S.w / 2, BEND.hingeY, BEND.hingeZ, [1, 0, 0]),
    volume: anchor(ports, 'side edge', HW + .01, 0, 0, [1, 0, 0]),
    action: anchor(ports, 'power button', POWER.x, POWER.y, ZB + .01, [0, 0, 1]),
    topButton: anchor(enclosure, 'top edge', -HW + 8, HH + .01, 0, [0, 1, 0]),
    center: anchor(root, 'center', 0, 0, 0, null),
  };
  anchors.island = anchors.main = anchors.array = anchors.camera;
  anchors.usb = anchors.ports;
  // Screen anchors in the display's reading frame (fractions of half extents).
  const SCREEN = {
    scrTop: [0, .74], scrUpper: [0, .385], scrMid: [0, 0], scrLower: [0, -.385], scrBottom: [0, -.74],
    scrTL: [-.7, .7], scrTR: [.7, .7], scrBL: [-.7, -.7], scrBR: [.7, -.7], scrLeft: [-.62, .08], scrRight: [.62, -.08],
  };
  for (const [k, [fr, fu]] of Object.entries(SCREEN)) anchors[k] = anchor(display, k, -fr * ACTIVE.w / 2, ACTIVE_CY + fu * ACTIVE.h / 2, ZF - .01, [0, 0, -1]);

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

  // ── Articulation: tilt in degrees about the hinge (+ leans the top back,
  // the screen facing slightly up). ──
  let tiltDeg = IMAC.tilt.rest, showAccessories = false;
  function pose() {
    headPivot.rotation.x = THREE.MathUtils.degToRad(tiltDeg);
    accessories.visible = showAccessories;
  }
  function setTilt(deg) { tiltDeg = THREE.MathUtils.clamp(deg, IMAC.tilt.min, IMAC.tilt.max); pose(); }
  function setAccessories(on) { showAccessories = !!on; pose(); }
  // Shot pose: { tilt?: degrees, accessories?: bool }; undefined resets to rest.
  function setPose(p) { tiltDeg = THREE.MathUtils.clamp(p?.tilt ?? IMAC.tilt.rest, IMAC.tilt.min, IMAC.tilt.max); showAccessories = !!p?.accessories; pose(); }

  // ── Exploded view: the front glass and panel lift forward, the internals
  // follow part of the way. ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    const e = t * t * (3 - 2 * t);
    display.position.z = -8 * e;
    internals.position.z = -3 * e;
    // Fully enclosed when assembled: skip its draw calls (and any bleed
    // through the 0.1 mm chin stand-off at long focal lengths).
    internals.visible = t > 0;
  }

  let finishHex = imacFinishes[0][1];
  function setFinish(hex) { finishHex = hex; applyFinish(M, hex); }

  setFinish(finishHex);
  setProgress(0); pose();
  return {
    root, groups, screenMaterial, screen, setFinish, setProgress, setTilt, setPose, setAccessories, points, anchors, materials: M,
    // Landscape only; keeps the iPad-style state contract.
    setScreenOrientation() {}, get screenOrientation() { return 'landscape'; },
    state: () => ({ tilt: tiltDeg, accessories: showAccessories }),
    setState(s) { if (s) { if (s.tilt !== undefined) tiltDeg = THREE.MathUtils.clamp(s.tilt, IMAC.tilt.min, IMAC.tilt.max); if (s.accessories !== undefined) showAccessories = !!s.accessories; pose(); } },
    get progress() { return progress; }, get tilt() { return tiltDeg; }, get accessories() { return showAccessories; }, get finish() { return finishHex; },
  };
}
