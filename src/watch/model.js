import * as THREE from 'three';
import { profileGeometry, perimeter } from '../casework.js';
import { lathe } from '../optics.js';
import { bandOptions, bandOption, bandMaterialFor, BAND_TILE } from './bands.js';

// Apple Watch (current aluminium model, 46 mm case), procedural. 1 unit = 1 cm.
// Case 46 × 39 × 9.7 mm (glass crown to sensor dome), 416 × 496 px display.
// Model frame (studio convention): long axis +Y (12 o'clock up), display faces
// -Z, back +Z. Seen from the front the viewer's right is -X; from behind it is +X:
//   -X side   Digital Crown above the side button, microphone between them
//   +X side   speaker slot
//   ±Y edges  band slots; the sport band runs ±Y from them
//   back      domed sensor crystal (Fresnel ring, LEDs, photodiodes), two
//             band-release buttons near the slots
//
// Measurements from Apple's product photography (px → mm against the 39 mm width):
//   front, straight (19.2 px/mm)  plan corner radius ≈11 mm (squircle), metal
//                                 seen around the glass ≈0.75 mm, display inset
//                                 ≈2 mm from the case edge, its corners concentric
//   crown                         Ø ≈6.6 mm, ≈2.6 mm proud, centre ≈15 mm below the top
//   side button                   ≈13 × 2.6 mm stadium, centred ≈30 mm below the top
//   back (11.7 px/mm)             sensor crystal Ø ≈26.7 mm; release buttons
//                                 ≈8 × 2 mm, ≈3.4 mm in from the top and bottom edges
//   profile                       glass rolls ≈2 mm into the metal; short straight
//                                 side, then a long curve into the domed back
//   sport band                    ≈24 mm where it leaves the slot, ≈21 mm along the
//                                 strap, ≈2.4 mm thick; pin-and-tuck closure
export const WATCH = { W: 3.90, H: 4.60, T: 0.97 };
const W = WATCH.W, H = WATCH.H, HW = W / 2, HH = H / 2, HT = WATCH.T / 2;
const RC = 1.3;                                        // plan corner radius (perimeter() squircle), rounder per Apple's front shot
// Active area: 416 × 496 px, 2 mm in from each long edge.
const ACTIVE = { w: 3.50, h: 3.50 * 496 / 416, r: 1.1 };
export const WATCH_ASPECT = ACTIVE.w / ACTIVE.h;       // portrait artwork, width / height (416 / 496)
// Recommended screen artwork: the full 416 × 496 panel.
export const WATCH_ARTWORK = { width: 416, height: 496 };
const ZF = -HT;                                        // glass top
const ZS = ZF - .0006;                                 // display emission plane, a hair over the glass

// ── Side profile [inset, z] ──
// Front: one squircle-ish roll from the side wall (inset 0, z = Z_SHOULDER) to
// the flat glass (inset GLASS_A, z = ZF); the metal owns the outer part of it,
// the glass the inner part, so the case flows into the domed glass.
const Z_SHOULDER = -.205, GLASS_A = .215, J_INSET = .075;
// Back: a long curve from the side wall (z = Z_SIDE) to the flat back
// (inset BACK_A, z = Z_BACK); the case/back seam sits at inset SEAM.
const Z_SIDE = .0, BACK_A = .30, Z_BACK = .40, SEAM = .15;
const frontRoll = (phi) => {
  phi = THREE.MathUtils.clamp(phi, 0, Math.PI / 2);
  const c = Math.pow(Math.cos(phi), .85), s = Math.pow(Math.sin(phi), .9);
  return [GLASS_A * (1 - c), Z_SHOULDER - (Z_SHOULDER - ZF) * s];
};
const backRoll = (psi) => {
  psi = THREE.MathUtils.clamp(psi, 0, Math.PI / 2);
  const c = Math.pow(Math.cos(psi), .9), s = Math.sin(psi);
  return [BACK_A * (1 - c), Z_SIDE + (Z_BACK - Z_SIDE) * s];
};
const solve = (fn, target) => { let lo = 0, hi = Math.PI / 2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fn(m)[0] < target) lo = m; else hi = m; } return (lo + hi) / 2; };
const PHI_J = solve(frontRoll, J_INSET), PSI_S = solve(backRoll, SEAM);
const Z_J = frontRoll(PHI_J)[1], Z_SEAM = backRoll(PSI_S)[1];
const range = (a, b, n, fn) => Array.from({ length: n + 1 }, (_, i) => fn(a + (b - a) * i / n));
// Outer case surface, front (glass junction) to back (seam).
const CASE_OUT = [
  ...range(PHI_J, 0, 9, frontRoll),
  [0, -.12], [0, -.06],
  ...range(0, PSI_S, 9, backRoll),
];
// Closed loop: outer surface, then the inner wall back up to the glass seat.
const CASE_RING = [...CASE_OUT, [SEAM + .1, Z_SEAM - .01], [.32, Z_SEAM - .03], [.32, Z_J + .03], [J_INSET + .03, Z_J + .006]];
// Glass, flat top first, rolling down to the metal.
const GLASS = [[GLASS_A + .002, ZF], ...range(Math.PI / 2 - .0001, PHI_J, 10, frontRoll).map(([i, z]) => [i, z]), [J_INSET + .004, Z_J + .012]];
// Back cover, seam to the flat back.
const BACK = [...range(PSI_S, Math.PI / 2, 7, backRoll), [BACK_A + .06, Z_BACK]];
// Inset of the outer surface at a given z (for parts on the side walls).
function insetAt(z) {
  for (let i = 1; i < CASE_OUT.length; i++) {
    const [i0, z0] = CASE_OUT[i - 1], [i1, z1] = CASE_OUT[i];
    if ((z - z0) * (z - z1) <= 0 && z1 !== z0) return i0 + (i1 - i0) * (z - z0) / (z1 - z0);
  }
  return 0;
}
const Z_AXIS = -.10;                                   // crown / button / slot axis: middle of the straight side
const CROWN = { y: HH - 1.5, r: .33, len: .245, ridges: 44 };
const BUTTON = { y: HH - 3.0, len: 1.3, across: .26 };
const MIC = { y: (CROWN.y - CROWN.r + BUTTON.y + BUTTON.len / 2) / 2 };
const SPEAKER = { y: -.35, len: 1.5 };
const SLOT = { w: 2.84, h: .3 };
const CRYSTAL = { r: 1.335 };
const Z_CRYSTAL_EDGE = Z_BACK - .006, Z_CRYSTAL_TOP = HT;
const domeZ = (r) => Z_CRYSTAL_EDGE + (Z_CRYSTAL_TOP - Z_CRYSTAL_EDGE) * Math.pow(Math.max(0, 1 - (r / CRYSTAL.r) ** 2), .5);
const RELEASE = { y: HH - .46, len: .8, across: .2 };
// Half-widths: the neck fills the slot nearly edge to edge, then narrows to
// the strap in a concave sweep over NECK cm (as on Apple's sport band).
const BAND = { root: 1.5, body: 1.03, rootT: .145, bodyT: .118, neck: 1.15 };

// Finishes: [name, anodised case, default sport band]. Gold is the default.
// Jet Black is polished; the others bead-blasted.
export const watchFinishes = [
  ['Gold', '#c3a57c', '#3d3529'],
  ['Starlight', '#ddd5c7', '#d3cbbb'],
  ['Bronze', '#4c4036', '#2c2722'],
  ['Jet Black', '#22252d', '#18191d'],
];
const POLISHED = new Set(['#22252d']);

// ── Surface maps ──────────────────────────────────────────────────────
function lcg(seed) { return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }; }
function noiseMaps(seed, size, slope, rough, spread, repeat) {
  const n = document.createElement('canvas'), r = document.createElement('canvas');
  n.width = n.height = r.width = r.height = size;
  const nc = n.getContext('2d'), rc = r.getContext('2d');
  const ni = nc.createImageData(size, size), ri = rc.createImageData(size, size);
  const rand = lcg(seed), gauss = () => (rand() + rand() + rand() - 1.5) * .9;
  for (let i = 0; i < size * size; i++) {
    const x = gauss() * slope, y = gauss() * slope, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    ni.data.set([(x * .5 + .5) * 255, (y * .5 + .5) * 255, (z * .5 + .5) * 255, 255], i * 4);
    const g = rough + gauss() * spread; ri.data.set([g, g, g, 255], i * 4);
  }
  nc.putImageData(ni, 0, 0); rc.putImageData(ri, 0, 0);
  const normalMap = new THREE.CanvasTexture(n), roughnessMap = new THREE.CanvasTexture(r);
  for (const t of [normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; }
  return { normalMap, roughnessMap };
}
// Sensor crystal artwork in polar UVs (u = angle, v = radius / R): the Fresnel
// ring's radial facets between two rings, darker optical centre.
function sensorTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  const row = (r) => (1 - r / CRYSTAL.r) * 256;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#16171a'); g.addColorStop(.25, '#202125'); g.addColorStop(.55, '#141518'); g.addColorStop(1, '#0a0a0c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 256);
  // Facet spokes.
  for (let k = 0; k < 48; k++) {
    const x = k / 48 * 1024;
    const lg = ctx.createLinearGradient(0, row(1.24), 0, row(.6));
    lg.addColorStop(0, 'rgba(120,124,132,.55)'); lg.addColorStop(1, 'rgba(120,124,132,.15)');
    ctx.fillStyle = lg; ctx.fillRect(x - 1.5, row(1.24), 3, row(.6) - row(1.24));
  }
  const ring = (r, w, a) => { ctx.fillStyle = `rgba(150,154,160,${a})`; ctx.fillRect(0, row(r) - w / 2, 1024, w); };
  ring(1.25, 3, .6); ring(.6, 3, .55); ring(.47, 2, .35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  return t;
}
let mapCache = null;
function surfaceMaps() { return mapCache ||= { blast: noiseMaps(52219, 256, .34, 150, 16, 6), sensor: sensorTexture() }; }

function makeMaterials() {
  const { blast, sensor } = surfaceMaps();
  const M = {
    case: new THREE.MeshPhysicalMaterial({ name: 'Anodised aluminium', color: 0xc3a57c, metalness: .9, roughness: .32, clearcoat: .2, clearcoatRoughness: .25, envMapIntensity: 2 }),
    crown: new THREE.MeshPhysicalMaterial({ name: 'Crown aluminium', color: 0xc3a57c, metalness: .95, roughness: .24, clearcoat: .3, clearcoatRoughness: .15, envMapIntensity: 2.1 }),
    crownFace: new THREE.MeshPhysicalMaterial({ name: 'Crown face', color: 0xc3a57c, metalness: 1, roughness: .1, clearcoat: .6, clearcoatRoughness: .05, envMapIntensity: 2.3 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x040405, metalness: .15, roughness: .1, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.4 }),
    crystal: new THREE.MeshPhysicalMaterial({ name: 'Sensor crystal', map: sensor, color: 0xffffff, metalness: .1, roughness: .12, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.1 }),
    lens: new THREE.MeshPhysicalMaterial({ name: 'Sensor lens', color: 0x0b0d10, metalness: .3, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    led: new THREE.MeshPhysicalMaterial({ name: 'Green LED', color: 0x0e2a18, emissive: 0x06170c, metalness: .1, roughness: .25, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    diode: new THREE.MeshPhysicalMaterial({ name: 'Photodiode', color: 0x1c1a20, metalness: .5, roughness: .3, clearcoat: .8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Opening shadow', color: 0x040405, metalness: .1, roughness: .85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    slot: new THREE.MeshStandardMaterial({ name: 'Band slot', color: 0x040405, metalness: .1, roughness: .85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Button gap', color: 0x121316, metalness: .4, roughness: .6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    band: new THREE.MeshPhysicalMaterial({ name: 'Sport band fluoroelastomer', color: 0x3d3529, metalness: 0, roughness: .52, sheen: .35, sheenRoughness: .55, sheenColor: 0xffffff,
      clearcoat: .12, clearcoatRoughness: .45, specularIntensity: .45, envMapIntensity: .9 }),
    hardware: new THREE.MeshPhysicalMaterial({ name: 'Titanium band hardware', color: 0xa9a7a0, metalness: 1, roughness: .32, clearcoat: .2, envMapIntensity: 1.8 }),
    keeper: new THREE.MeshPhysicalMaterial({ name: 'Sport Loop keeper', color: 0x5e2533, metalness: 0, roughness: .45, clearcoat: .3, clearcoatRoughness: .3 }),
    hole: new THREE.MeshStandardMaterial({ name: 'Band hole', color: 0x050505, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    battery: new THREE.MeshPhysicalMaterial({ name: 'Battery pouch', color: 0x2a2826, metalness: .45, roughness: .45 }),
    board: new THREE.MeshStandardMaterial({ name: 'S-series SiP', color: 0x15171a, metalness: .3, roughness: .5 }),
    shield: new THREE.MeshPhysicalMaterial({ name: 'Shield can', color: 0xa7a9ad, metalness: .9, roughness: .32 }),
    taptic: new THREE.MeshPhysicalMaterial({ name: 'Taptic Engine', color: 0x6d6e72, metalness: .8, roughness: .4 }),
  };
  M.blast = blast;
  return M;
}

const C = (h) => new THREE.Color(h);
function bandFor(hex) {
  const known = watchFinishes.find(f => f[1].toLowerCase() === hex.toLowerCase());
  if (known) return known[2];
  // Custom case colour: a deeper, softer band in the same hue.
  const hsl = {}; C(hex).getHSL(hsl);
  return '#' + new THREE.Color().setHSL(hsl.h, hsl.s * .7, hsl.l > .6 ? hsl.l * .92 : hsl.l * .55).getHexString();
}
function applyFinish(M, hex) {
  const c = C(hex), polished = POLISHED.has('#' + c.getHexString());
  const hsl = {}; c.getHSL(hsl);
  for (const m of [M.case, M.crown]) {
    m.color.copy(c);
    if (polished) {
      // Mirror-polished anodising: dark, glossy, crisp reflections.
      m.metalness = .85; m.roughness = m === M.crown ? .14 : .12; m.clearcoat = .8; m.clearcoatRoughness = .04; m.envMapIntensity = 2.2;
      m.normalMap = null; m.roughnessMap = null;
    } else {
      // Bead-blasted: soft, broad highlights. Dark anodising keeps a little more gloss.
      m.metalness = .9; m.roughness = (m === M.crown ? .26 : .34) - (hsl.l < .3 ? .05 : 0); m.clearcoat = .15; m.clearcoatRoughness = .3; m.envMapIntensity = hsl.l < .3 ? 2.4 : 2;
      m.normalMap = M.blast.normalMap; m.roughnessMap = M.blast.roughnessMap; m.normalScale = new THREE.Vector2(.06, .06);
    }
    m.needsUpdate = true;
  }
  M.crownFace.color.copy(c).lerp(C(0xffffff), hsl.l > .6 ? .15 : .08);
}

// ── Geometry helpers ─────────────────────────────────────────────────
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
function stadium(len, across) {
  const r = across / 2, s = new THREE.Shape();
  s.absarc(len / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(-len / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}
function edgeBasis(obj, along, outward) {
  const a = new THREE.Vector3(...along), o = new THREE.Vector3(...outward), c = new THREE.Vector3().crossVectors(o, a);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, c, o));
}
function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}
// Flip triangle winding if the first face points against `out(p)`.
function orient(idx, pos, out) {
  // Judge by the first non-degenerate face (fans start with zero-area faces).
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let f = 0; f < idx.length; f += 3) {
    a.fromArray(pos, idx[f] * 3); b.fromArray(pos, idx[f + 1] * 3); c.fromArray(pos, idx[f + 2] * 3);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (n.lengthSq() > 1e-14) break;
  }
  if (n.dot(out(a)) < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
}
// Top/bottom edge of the plan outline at `inset`, as y for a given x (y > 0 half).
function edgeY(x, inset) {
  const pts = perimeter(W - 2 * inset, H - 2 * inset, RC - inset).filter(([, y]) => y > 0).sort((p, q) => p[0] - q[0]);
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / Math.max(1e-6, x1 - x0); }
  return pts[pts.length - 1][1];
}
// Polar dome / disc in the XY plane: z = zOf(r), uv = (angle, r / rMax).
function polarDome(rMax, zOf, rings, segs) {
  const pos = [], uv = [], idx = [];
  for (let k = 0; k <= rings; k++) {
    const r = rMax * k / rings;
    for (let i = 0; i <= segs; i++) { const a = i / segs * Math.PI * 2; pos.push(r * Math.cos(a), r * Math.sin(a), zOf(r)); uv.push(i / segs, r / rMax); }
  }
  const row = segs + 1;
  for (let k = 0; k < rings; k++) for (let i = 0; i < segs; i++) { const a = k * row + i, b = a + 1, c = a + row + 1, d = a + row; idx.push(a, b, c, a, c, d); }
  orient(idx, pos, () => new THREE.Vector3(0, 0, 1));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ── Digital Crown ────────────────────────────────────────────────────
// Local +Z is the crown axis (outward), z = 0 at the case's widest point.
function knurledCrown(M) {
  const grp = new THREE.Group(); grp.name = 'Digital Crown';
  const { r: R, len, ridges } = CROWN, z0 = .03, depth = .013, segs = ridges * 8;
  // [radius, z, knurl amount]
  const rows = [[R - .028, z0], [R - .012, z0 + .006], [R - .003, z0 + .016], [R, z0 + .03], [R, len - .03], [R - .003, len - .016], [R - .012, len - .006], [R - .03, len]];
  const amount = [0, .25, .7, 1, 1, .7, .25, 0];
  const pos = [], idx = [];
  rows.forEach(([r, z], k) => {
    for (let i = 0; i <= segs; i++) {
      const a = i / segs * Math.PI * 2, groove = Math.pow(.5 - .5 * Math.cos(ridges * a), 5);
      const rr = r - depth * amount[k] * groove;
      pos.push(rr * Math.cos(a), rr * Math.sin(a), z);
    }
  });
  const row = segs + 1;
  for (let k = 0; k < rows.length - 1; k++) for (let i = 0; i < segs; i++) { const a = k * row + i, b = a + 1, c = a + row + 1, d = a + row; idx.push(a, b, c, a, c, d); }
  orient(idx, pos, (p) => new THREE.Vector3(p.x, p.y, 0));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const body = new THREE.Mesh(g, M.crown); body.name = 'Crown knurling'; grp.add(body);
  // End: a chamfered rim into a slightly domed polished face.
  const rim = lathe('Crown rim', [[R - .03, len], [R - .045, len + .006], [R - .07, len + .009], [.22, len + .01]], M.crown);
  grp.add(rim);
  const face = new THREE.Mesh(polarDome(.225, (r) => len + .01 + .006 * (1 - (r / .225) ** 2), 6, 64), M.crownFace); face.name = 'Crown face'; grp.add(face);
  // Inner face (hidden by the case) and the neck that sits in the case recess.
  const back = new THREE.Mesh(new THREE.CircleGeometry(R - .028, 64), M.crown); back.position.z = z0; back.rotation.y = Math.PI; grp.add(back);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .14, 48, 1, true), M.seam); neck.rotation.x = Math.PI / 2; neck.position.z = z0 - .07 + .01; neck.name = 'Crown neck'; grp.add(neck);
  return grp;
}

// ── Sport band ───────────────────────────────────────────────────────
// Rounded-edge strap swept along a centreline in the YZ plane. `side` = +1 for
// a strap that leaves the case towards +Y, -1 towards -Y (keeps the outward
// face consistent). Width / thickness / outward offset are functions of the
// arc length s. Returns { mesh, frame(s) } where frame gives the centre,
// tangent and outward normal for placing holes and the pin.
function sweepBand(curve, side, length, hw, ht, off, material, name, bend = null) {
  const N = Math.max(24, Math.round(length / .04)), X = new THREE.Vector3(1, 0, 0);
  const L = curve.getLength(), frames = [];
  for (let k = 0; k <= N; k++) {
    const s = length * k / N, u = Math.min(1, s / L);
    const p = curve.getPointAt(u), t = curve.getTangentAt(u).normalize();
    const n = side > 0 ? new THREE.Vector3().crossVectors(t, X) : new THREE.Vector3().crossVectors(X, t);
    n.normalize(); p.addScaledVector(n, off(s));
    frames.push({ s, p, t, n });
  }
  const pos = [], uv = [], idx = [], ring = [];
  // Cross-section: flat faces, fully rounded edges.
  const CS = 10;
  const section = (w, h) => {
    const pts = [], e = Math.min(h, w) * .95, flatW = Math.max(0, w - e);
    for (const [cx, a0] of [[flatW, -Math.PI / 2], [-flatW, Math.PI / 2]]) for (let i = 0; i <= CS; i++) {
      const a = a0 + i / CS * Math.PI; pts.push([cx + e * Math.cos(a) * (w > h ? 1 : w / e), h * Math.sin(a)]);
    }
    return pts;
  };
  let per = 0;
  for (const f of frames) {
    const pts = section(hw(f.s), ht(f.s)); per = pts.length;
    for (const [x, v] of pts) { const q = f.p.clone().addScaledVector(X, x).addScaledVector(f.n, v); if (bend) q.addScaledVector(f.t, bend(x, f.s)); pos.push(q.x, q.y, q.z); uv.push(x / BAND_TILE + .5, f.s / BAND_TILE); }
    ring.push(f.p);
  }
  for (let k = 0; k < N; k++) for (let i = 0; i < per; i++) {
    const j = (i + 1) % per, a = k * per + i, b = k * per + j, c = (k + 1) * per + j, d = (k + 1) * per + i; idx.push(a, b, c, a, c, d);
  }
  orient(idx, pos, (p) => { const f = frames[0]; return p.clone().sub(f.p).sub(f.t.clone().multiplyScalar(p.clone().sub(f.p).dot(f.t))); });
  // End caps with their own vertices.
  for (const [k, dir] of [[0, -1], [N, 1]]) {
    const start = pos.length / 3, f = frames[k];
    for (let i = 0; i < per; i++) { pos.push(pos[(k * per + i) * 3], pos[(k * per + i) * 3 + 1], pos[(k * per + i) * 3 + 2]); uv.push(uv[(k * per + i) * 2], uv[(k * per + i) * 2 + 1]); }
    pos.push(f.p.x, f.p.y, f.p.z); uv.push(.5, f.s / BAND_TILE);
    const cap = [];
    for (let i = 0; i < per; i++) cap.push(start + per, start + i, start + (i + 1) % per);
    orient(cap, pos, () => f.t.clone().multiplyScalar(dir));
    idx.push(...cap);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material); mesh.name = name;
  const frame = (s) => frames[Math.max(0, Math.min(N, Math.round(s / length * N)))];
  return { mesh, frame };
}
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// Width / thickness: flared where the strap leaves the slot, rounded tip.
// Concave neck: steep where it leaves the case, easing into the strap.
const neckF = (s) => { const t = THREE.MathUtils.clamp((s - .12) / BAND.neck, 0, 1); return (1 - t) ** 2.2; };
const bandHW = (length, tip = true) => (s) => {
  const w = BAND.body + (BAND.root - BAND.body) * neckF(s);
  if (!tip) return w;
  const d = s - (length - BAND.body);
  return d > 0 ? Math.max(.06, w * Math.sqrt(Math.max(0, 1 - (d / BAND.body) ** 2))) : w;
};
const bandHT = (length, bodyT = BAND.bodyT, ridge = null) => (s) => {
  const t = BAND.rootT + (bodyT - BAND.rootT) * smooth(.15, 1.6, s);
  return t * (1 - .25 * smooth(length - .8, length, s)) * (ridge ? 1 + ridge(s) : 1);
};
// Per style: strap half-thickness, and the Ocean Band's raised cross ribs.
const STYLE_T = { sport: BAND.bodyT, ocean: .13, sportLoop: .082, braided: .135, milanese: .048 };
const oceanRidge = (s) => s < 1.4 ? 0 : .55 * Math.pow(.5 + .5 * Math.cos(2 * Math.PI * (s - 1.4) / .46), 3);
// A continuous loop (Solo / Sport / Milanese loops): necks at both slots.
const loopHW = (L) => (s) => BAND.body + (BAND.root - BAND.body) * Math.max(neckF(s), neckF(L - s));
const loopHT = (L, bodyT) => (s) => BAND.rootT + (bodyT - BAND.rootT) * Math.max(1 - smooth(.15, 1.6, s), 1 - smooth(.15, 1.6, L - s));
const loopBend = (L) => (x, s) => neckBend(x, s) - neckBend(x, L - s);
// The neck's end follows the case's curved top/bottom edge (corners drop back
// into the case), so it leaves the slot flush along its whole width.
let edgeLUT = null;
function neckBend(x, s) {
  if (!edgeLUT) { const inset = insetAt(Z_AXIS), y0 = edgeY(0, inset); edgeLUT = Array.from({ length: 65 }, (_, i) => edgeY(i / 64 * (HW - inset - .01), inset) - y0); edgeLUT.max = HW - insetAt(Z_AXIS) - .01; }
  const u = Math.min(1, Math.abs(x) / edgeLUT.max) * 64, i = Math.min(63, Math.floor(u)), d = edgeLUT[i] + (edgeLUT[i + 1] - edgeLUT[i]) * (u - i);
  return d * (1 - smooth(.3, .3 + BAND.neck * .8, s));
}
function holeDisc(M, f, ht, r = .065) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), M.hole); m.name = 'Band hole';
  m.position.copy(f.p).addScaledVector(f.n, ht + .0015);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.n); return m;
}
function pinStud(M, f, ht) {
  const m = lathe('Pin-and-tuck stud', [[0, .052], [.26, .05], [.34, .044], [.39, .03], [.41, .012], [.415, -.01]], M.band);
  // lathe() already turns its profile axis to local +Z; align that with the outward normal.
  const g = new THREE.Group(); g.name = 'Pin stud'; g.add(m);
  g.position.copy(f.p).addScaledVector(f.n, ht - .004);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.n);
  return g;
}
// Path pieces in (y, z).
const ZB0 = Z_AXIS;                     // strap centreline where it leaves the slot
const ROOT = HH - .22;                  // strap end, inside the slot
function buildBands(M, opt = bandOptions[0], mat = M.band) {
  const style = opt.style, bodyT = STYLE_T[style] ?? BAND.bodyT;
  const isLoop = style === 'sportLoop' || style === 'braided' || style === 'milanese';
  const ridge = style === 'ocean' ? oceanRidge : null;
  const hw = M.hardware;
  const top = new THREE.Group(); top.name = 'Top band';
  const bottom = new THREE.Group(); bottom.name = 'Bottom band';
  const loop = { top: new THREE.Group(), bottom: new THREE.Group() }, open = { top: new THREE.Group(), bottom: new THREE.Group() };
  loop.top.name = loop.bottom.name = 'Band worn (loop)'; open.top.name = open.bottom.name = 'Band laid open';
  top.add(loop.top, open.top); bottom.add(loop.bottom, open.bottom);
  const V = (y, z) => new THREE.Vector3(0, y, z);

  // Worn: a closed wrist loop through the case. Top strap carries the pin and
  // rides outside over the back; the bottom strap (holes) lies under it.
  const ring = [V(-1.2, ZB0), V(1.2, ZB0), V(ROOT, ZB0), V(2.65, ZB0 + .03), V(3.15, .22), V(3.5, .8), V(3.62, 1.6), V(3.45, 2.45), V(2.95, 3.2),
    V(2.1, 3.7), V(1.05, 3.95), V(0, 4.02), V(-1.05, 3.95), V(-2.1, 3.7), V(-2.95, 3.2), V(-3.45, 2.45), V(-3.62, 1.6), V(-3.5, .8), V(-3.15, .22), V(-2.65, ZB0 + .03), V(-ROOT, ZB0)];
  // Split the closed ring into the two strap paths (each from its slot).
  const closed = new THREE.CatmullRomCurve3(ring, true, 'centripetal', .5);
  const dense = closed.getSpacedPoints(2400), rootIdx = (sign) => { let best = 0, bd = Infinity; dense.forEach((p, i) => { const d = Math.abs(p.y - sign * ROOT) + Math.abs(p.z - ZB0) * 4; if (d < bd) { bd = d; best = i; } }); return best; };
  const iT = rootIdx(1), iB = rootIdx(-1), M2 = dense.length - 1;
  const path = (from, step, stopY, after) => {
    const pts = []; let i = from, passed = false;
    for (let n = 0; n < M2; n++) {
      const p = dense[(i + M2) % M2]; pts.push(p.clone());
      if (p.z > 3.2) passed = true;
      if (passed && (after ? p.y < stopY : p.y > stopY)) break;
      i += step;
    }
    return new THREE.CatmullRomCurve3(pts.filter((_, k) => k % 6 === 0 || k === pts.length - 1), false, 'centripetal', .5);
  };
  // Hardware: a rounded rectangular keeper/loop around the strap at frame f.
  const keeper = (f, w, h, depth, material, name, lift = 0) => {
    const outer = new THREE.Shape(), r = Math.min(h, w) * .48;
    outer.moveTo(-w + r, -h); outer.lineTo(w - r, -h); outer.quadraticCurveTo(w, -h, w, -h + r); outer.lineTo(w, h - r); outer.quadraticCurveTo(w, h, w - r, h);
    outer.lineTo(-w + r, h); outer.quadraticCurveTo(-w, h, -w, h - r); outer.lineTo(-w, -h + r); outer.quadraticCurveTo(-w, -h, -w + r, -h);
    const t = Math.min(w, h) * .38, inner = new THREE.Path(), wi = w - t, hi = h - t, ri = Math.max(.01, r - t);
    inner.moveTo(-wi + ri, -hi); inner.lineTo(-wi, -hi + ri); inner.lineTo(-wi, hi - ri); inner.quadraticCurveTo(-wi, hi, -wi + ri, hi); inner.lineTo(wi - ri, hi);
    inner.quadraticCurveTo(wi, hi, wi, hi - ri); inner.lineTo(wi, -hi + ri); inner.quadraticCurveTo(wi, -hi, wi - ri, -hi); inner.lineTo(-wi + ri, -hi);
    outer.holes.push(inner);
    const g = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelThickness: depth * .3, bevelSize: Math.min(t * .4, .02), bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    const m = new THREE.Mesh(g, material); m.name = name;
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), f.n.clone(), f.t.clone());
    m.quaternion.setFromRotationMatrix(basis); m.position.copy(f.p).addScaledVector(f.n, lift);
    return m;
  };
  // Milanese magnetic end: a flat rounded block on the strap face.
  const magnet = (f, material) => {
    const g = new THREE.BoxGeometry(BAND.body * 2 + .02, .09, .9, 1, 1, 1);
    const m = new THREE.Mesh(g, material); m.name = 'Magnetic clasp';
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), f.n.clone(), f.t.clone());
    m.quaternion.setFromRotationMatrix(basis); m.position.copy(f.p).addScaledVector(f.n, bodyT + .04);
    return m;
  };
  // Hole positions: every 6.2 mm, or in the Ocean Band's valleys between ribs.
  const holeAt = (n, s0) => Array.from({ length: n }, (_, k) => ridge ? 1.4 + .46 * (Math.round((s0 - 1.4) / .46) + k + .5) : s0 + k * .62);
  const thick = bodyT * 2;
  if (isLoop) {
    // One continuous loop from the top slot round the wrist to the bottom slot.
    const pts = []; for (let i = iT, n = 0; n < M2; n++, i++) { const k = (i + M2) % M2; pts.push(dense[k].clone()); if (k === iB) break; }
    const c = new THREE.CatmullRomCurve3(pts.filter((_, k) => k % 6 === 0 || k === pts.length - 1), false, 'centripetal', .5), L = c.getLength();
    const b = sweepBand(c, 1, L, loopHW(L), loopHT(L, bodyT), () => 0, mat, style === 'braided' ? 'Braided Solo Loop' : style === 'milanese' ? 'Milanese Loop' : 'Sport Loop', loopBend(L));
    loop.top.add(b.mesh);
    if (style === 'milanese') loop.top.add(magnet(b.frame(L * .5), mat));
  } else {
    {
      const c = path(iT, 1, -1.35, true), L = c.getLength();
      // Distance along the top strap where it starts to ride over the bottom one.
      const pts = c.getSpacedPoints(400); let sOver = L;
      for (let k = 0; k < pts.length; k++) if (pts[k].z > 3.2 && pts[k].y < 1.55) { sOver = L * k / 400; break; }
      const off = (s) => (thick + .004) * smooth(sOver - .7, sOver, s);
      const b = sweepBand(c, 1, L, bandHW(L), bandHT(L, bodyT, ridge), off, mat, 'Top strap (pin)', neckBend);
      loop.top.add(b.mesh);
      loop.top.add(pinStud(M, b.frame(L - 1.45), bodyT));
    }
    {
      const c = path(iB, -1, .95, false), L = c.getLength();
      const b = sweepBand(c, -1, L, bandHW(L), bandHT(L, bodyT, ridge), () => 0, mat, 'Bottom strap (holes)', neckBend);
      loop.bottom.add(b.mesh);
      for (const s of holeAt(6, 3.0)) loop.bottom.add(holeDisc(M, b.frame(s), bodyT));
      if (style === 'ocean') for (const s of [L - 2.25, L - .95]) loop.bottom.add(keeper(b.frame(s), BAND.body + .09, thick + .1, .26, hw, 'Titanium loop', thick / 2));
    }
  }

  // Laid open: both straps run away from the case and curl gently back,
  // as in Apple's straight-on front and back shots.
  const openPath = (sign, extra) => new THREE.CatmullRomCurve3(
    [[ROOT, ZB0], [2.7, ZB0 + .03], [3.6, .14], [4.6, .48], [5.55, 1.05], [6.35, 1.85], [6.85 + extra * .2, 2.75 + extra]].map(([y, z]) => V(sign * y, z)), false, 'centripetal', .5);
  {
    const c = openPath(1, 0), L = c.getLength();
    const b = sweepBand(c, 1, L, bandHW(L, !isLoop), bandHT(L, bodyT, ridge), () => 0, mat, 'Top strap', neckBend);
    open.top.add(b.mesh);
    if (!isLoop) open.top.add(pinStud(M, b.frame(L - 1.45), bodyT));
    if (style === 'sportLoop') open.top.add(keeper(b.frame(3.2), BAND.body + .07, bodyT + .07, .32, M.keeper, 'Sport Loop keeper'));
    if (style === 'milanese') open.top.add(magnet(b.frame(L - .6), mat));
  }
  {
    const c = openPath(-1, .9), L = c.getLength();
    const b = sweepBand(c, -1, L, bandHW(L, !isLoop), bandHT(L, bodyT, ridge), () => 0, mat, 'Bottom strap', neckBend);
    open.bottom.add(b.mesh);
    if (!isLoop) for (const s of holeAt(7, 2.6)) open.bottom.add(holeDisc(M, b.frame(s), bodyT));
    if (style === 'ocean') for (const s of [1.9, 3.0]) open.bottom.add(keeper(b.frame(s), BAND.body + .09, bodyT + .08, .26, hw, 'Titanium loop'));
  }
  return { top, bottom, loop, open };
}

// ── Body ─────────────────────────────────────────────────────────────
function buildBody(M, screenMaterial) {
  const g = { display: new THREE.Group(), case: new THREE.Group(), crown: new THREE.Group(), button: new THREE.Group(), back: new THREE.Group(), sensor: new THREE.Group() };
  g.display.name = 'Display stack'; g.case.name = 'Aluminium case'; g.crown.name = 'Digital Crown'; g.button.name = 'Side button';
  g.back.name = 'Back cover'; g.sensor.name = 'Sensor crystal';

  const ring = new THREE.Mesh(profileGeometry(W, H, RC, CASE_RING, true), M.case); ring.name = 'Case shell'; g.case.add(ring);

  // Display: domed cover glass rolling into the metal and the screen just
  // over its flat top. The border between is the glass's own black.
  const glass = new THREE.Mesh(profileGeometry(W, H, RC, GLASS), M.glass); glass.name = 'Cover glass'; g.display.add(glass);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display'); g.display.add(screen);
  {
    // Portrait, upright from the front: viewer's right is -X.
    const uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (ACTIVE.w / 2 - p.getX(i)) / ACTIVE.w, (p.getY(i) + ACTIVE.h / 2) / ACTIVE.h);
  }

  // Band slots: dark openings that follow the curved top and bottom edges.
  for (const sign of [1, -1]) {
    const geo = new THREE.ShapeGeometry(stadium(SLOT.w, SLOT.h), 16), p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = Z_AXIS + p.getY(i);
      p.setXYZ(i, x, sign * (edgeY(x, insetAt(z)) + .0015), z);
    }
    geo.computeVertexNormals();
    const slot = new THREE.Mesh(geo, M.slot); slot.name = sign > 0 ? 'Top band slot' : 'Bottom band slot'; g.case.add(slot);
  }

  // Side button (-X), microphone, speaker (+X).
  {
    const grp = new THREE.Group(); grp.name = 'Side button';
    const x = -(HW - insetAt(Z_AXIS));
    edgeBasis(grp, [0, 1, 0], [-1, 0, 0]); grp.position.set(x, BUTTON.y, Z_AXIS); g.button.add(grp);
    const gap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(BUTTON.len + .035, BUTTON.across + .035), 24), M.seam); gap.position.z = .001; gap.name = 'Side button gap'; grp.add(gap);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(stadium(BUTTON.len - .02, BUTTON.across - .02), { depth: .012, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 5, curveSegments: 24 }), M.crown);
    body.position.z = -.002; body.name = 'Side button'; grp.add(body);
  }
  {
    const grp = new THREE.Group(); edgeBasis(grp, [0, 1, 0], [-1, 0, 0]); grp.position.set(-(HW - insetAt(Z_AXIS)), MIC.y, Z_AXIS); g.case.add(grp);
    const m = new THREE.Mesh(new THREE.CircleGeometry(.03, 20), M.dark); m.position.z = .001; m.name = 'Microphone'; grp.add(m);
  }
  {
    const grp = new THREE.Group(); edgeBasis(grp, [0, 1, 0], [1, 0, 0]); grp.position.set(HW - insetAt(Z_AXIS), SPEAKER.y, Z_AXIS); g.case.add(grp);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(stadium(SPEAKER.len, .07), 12), M.dark); m.position.z = .001; m.name = 'Speaker slot'; grp.add(m);
    const m2 = new THREE.Mesh(new THREE.ShapeGeometry(stadium(SPEAKER.len * .55, .055), 12), M.dark); m2.position.set(0, .15, .001); m2.name = 'Speaker slot'; grp.add(m2);
  }

  // Digital Crown on -X.
  const crown = knurledCrown(M);
  crown.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0));
  crown.position.set(-(HW - insetAt(Z_AXIS)), CROWN.y, Z_AXIS); g.crown.add(crown);

  // Back cover with the crystal opening, release buttons; the crystal dome
  // and its optics are their own group.
  const back = new THREE.Mesh(profileGeometry(W, H, RC, BACK, false, [[0, 0, CRYSTAL.r]]), M.case); back.name = 'Back cover'; g.back.add(back);
  for (const sign of [1, -1]) {
    const grp = new THREE.Group(); grp.name = 'Band release button'; grp.position.set(0, sign * RELEASE.y, Z_BACK + .0005); g.back.add(grp);
    const gap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(RELEASE.len + .03, RELEASE.across + .03), 16), M.seam); gap.name = 'Release button gap'; grp.add(gap);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(stadium(RELEASE.len - .01, RELEASE.across - .01), { depth: .002, bevelEnabled: true, bevelThickness: .004, bevelSize: .006, bevelSegments: 3, curveSegments: 16 }), M.crown);
    body.position.z = -.004; body.name = 'Release button'; grp.add(body);
  }
  const dome = new THREE.Mesh(polarDome(CRYSTAL.r, domeZ, 40, 192), M.crystal); dome.name = 'Sensor crystal'; g.sensor.add(dome);
  // A short skirt so the crystal edge never shows a gap in the opening.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(CRYSTAL.r, CRYSTAL.r, .05, 128, 1, true), M.crystal); skirt.rotation.x = Math.PI / 2; skirt.position.z = Z_CRYSTAL_EDGE - .025; g.sensor.add(skirt);
  // Ring of lens windows, green LEDs and photodiodes at the optical centre.
  const onDome = (mesh, r, a, lift = .003) => { mesh.position.set(r * Math.cos(a), r * Math.sin(a), domeZ(r) + lift); g.sensor.add(mesh); return mesh; };
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + Math.PI / 8;
    onDome(new THREE.Mesh(new THREE.CircleGeometry(.085, 32), M.lens), .36, a).name = 'Lens window';
  }
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * Math.PI * 2 + Math.PI / 4;
    onDome(new THREE.Mesh(new THREE.CircleGeometry(.04, 24), M.led), .14, a).name = 'Green LED';
    onDome(new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), M.diode), .15, a + Math.PI / 4).name = 'Photodiode';
  }
  onDome(new THREE.Mesh(new THREE.CircleGeometry(.05, 24), M.diode), 0, 0).name = 'Infrared LED';
  return g;
}

function buildInternals(M) {
  const g = new THREE.Group(); g.name = 'Internals';
  const shape = new THREE.Shape(perimeter(3.1, 3.3, .7).map(([x, y]) => new THREE.Vector2(x, y)));
  const cell = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .26, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }), M.battery);
  cell.position.set(0, .2, -.12); cell.name = 'Battery'; g.add(cell);
  const sip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, .1), M.board); sip.position.set(.1, -1.0, -.25); sip.name = 'S-series SiP'; g.add(sip);
  const can = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .06), M.shield); can.position.set(.2, -1.0, -.32); can.name = 'SiP shield'; g.add(can);
  const taptic = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.5, .3), M.taptic); taptic.position.set(1.35, -.3, .1); taptic.name = 'Taptic Engine'; g.add(taptic);
  return g;
}

export function createWatch() {
  const root = new THREE.Group(); root.name = 'Apple Watch 46 mm';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  const body = buildBody(M, screenMaterial);
  const internals = buildInternals(M);
  // Straps live in fixed holders so the exploded view and parts list keep
  // working when the band style is swapped.
  const bandTop = new THREE.Group(), bandBottom = new THREE.Group(); bandTop.name = 'Top band'; bandBottom.name = 'Bottom band';
  let band = buildBands(M); bandTop.add(band.top); bandBottom.add(band.bottom);
  const bands = new THREE.Group(); bands.name = 'Band'; bands.add(bandTop, bandBottom);
  body.crown.add(body.button);
  root.add(body.display, internals, body.case, body.crown, body.back, body.sensor, bands);
  const groups = { display: body.display, internals, case: body.case, crown: body.crown, back: body.back, sensor: body.sensor, bands };

  // ── Anchors (keys shared with the phone modules so cinematic moves land) ──
  const XS = -(HW - insetAt(Z_AXIS));
  const anchors = {
    crown: anchor(body.crown, 'Digital Crown', XS - CROWN.len, CROWN.y, Z_AXIS, [-1, 0, 0]),
    button: anchor(body.crown, 'side button', XS - .02, BUTTON.y, Z_AXIS, [-1, 0, 0]),
    sensor: anchor(body.sensor, 'sensor crystal', 0, 0, HT, [0, 0, 1]),
    back: anchor(body.back, 'back', 0, 0, Z_BACK, [0, 0, 1]),
    slotTop: anchor(body.case, 'top band slot', 0, HH, Z_AXIS, [0, 1, 0]),
    slotBottom: anchor(body.case, 'bottom band slot', 0, -HH, Z_AXIS, [0, -1, 0]),
    speaker: anchor(body.case, 'speaker', HW, SPEAKER.y, Z_AXIS, [1, 0, 0]),
    array: anchor(body.sensor, 'sensor crystal', 0, 0, HT, [0, 0, 1]),
    main: anchor(body.sensor, 'optical centre', 0, 0, HT, [0, 0, 1]),
    ultra: anchor(body.sensor, 'lens ring', .36, 0, domeZ(.36), [0, 0, 1]),
    tele: anchor(body.sensor, 'lens ring', -.36, 0, domeZ(.36), [0, 0, 1]),
    flash: anchor(body.sensor, 'green LEDs', .1, .1, HT, [0, 0, 1]),
    temp: anchor(body.sensor, 'photodiodes', 0, .15, HT, [0, 0, 1]),
    logo: anchor(body.back, 'back', 0, 0, Z_BACK, [0, 0, 1]),
    // No camera on the front: the "island" is the top of the display.
    island: anchor(body.display, 'display top', 0, ACTIVE.h / 2 - .35, ZF - .001, [0, 0, -1]),
    usb: anchor(body.case, 'bottom band slot', 0, -HH, Z_AXIS, [0, -1, 0]),
    power: anchor(body.crown, 'side button', XS - .02, BUTTON.y, Z_AXIS, [-1, 0, 0]),
    side: anchor(body.crown, 'side button', XS - .02, BUTTON.y, Z_AXIS, [-1, 0, 0]),
    topButton: anchor(body.crown, 'Digital Crown', XS - CROWN.len, CROWN.y, Z_AXIS, [-1, 0, 0]),
    action: anchor(body.crown, 'side button', XS - .02, BUTTON.y, Z_AXIS, [-1, 0, 0]),
    control: anchor(body.crown, 'Digital Crown', XS - CROWN.len, CROWN.y, Z_AXIS, [-1, 0, 0]),
    volume: anchor(body.crown, 'Digital Crown', XS - CROWN.len, CROWN.y, Z_AXIS, [-1, 0, 0]),
    buttons: anchor(body.crown, 'crown and side button', XS - .1, (CROWN.y + BUTTON.y) / 2, Z_AXIS, [-1, 0, 0]),
    railLow: anchor(body.case, 'speaker side', HW, -HH + 1.0, Z_AXIS, [1, 0, 0]),
    center: anchor(root, 'center', 0, 0, 0, null),
  };
  const SCREEN = {
    scrTop: [0, .74], scrUpper: [0, .385], scrMid: [0, 0], scrLower: [0, -.385], scrBottom: [0, -.74],
    scrTL: [-.62, .74], scrTR: [.62, .74], scrBL: [-.62, -.74], scrBR: [.62, -.74], scrLeft: [-.6, .08], scrRight: [.6, -.08],
  };
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
    // Viewer's right on the display is -X, up is +Y.
    const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(root.matrixWorld);
    const nModel = new THREE.Vector3(0, 0, -1).applyQuaternion(root.getWorldQuaternion(q)).applyQuaternion(mq).normalize();
    for (const [key, [fr, fu]] of Object.entries(SCREEN)) {
      const p = new THREE.Vector3(-fr * ACTIVE.w / 2, fu * ACTIVE.h / 2, ZS + body.display.position.z);
      out[key] = { p: p.applyMatrix4(toModel), n: nModel.clone() };
    }
    return out;
  }

  // ── Exploded view along the wear axis: display stack forward, internals
  // between it and the case, back cover and sensor crystal behind, crown and
  // side button out to -X, straps apart along ±Y. ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    body.display.position.z = -3.0 * t;
    internals.position.z = -1.5 * t;
    body.back.position.z = 1.6 * t;
    body.sensor.position.z = 2.9 * t;
    body.crown.position.x = -1.3 * t;
    body.button.position.x = .45 * t;          // the button trails the crown (it rides in the crown group)
    bandTop.position.y = 2.2 * t;
    bandBottom.position.y = -2.2 * t;
  }

  // Band pose: 'loop' (worn, closed round a wrist) or 'open' (laid flat).
  let bandPose = 'loop';
  function setPose(pose) {
    bandPose = (pose && pose.band) || (typeof pose === 'string' ? pose : 'loop');
    if (bandPose !== 'open') bandPose = 'loop';
    for (const k of ['top', 'bottom']) { band.loop[k].visible = bandPose === 'loop'; band.open[k].visible = bandPose === 'open'; }
  }
  let finishHex = watchFinishes[0][1], bandHex = watchFinishes[0][2], bandId = bandOptions[0].id;
  function setBandColor(hex) { bandHex = hex; M.band.color.set(hex); M.band.sheenColor.set(hex).lerp(C(0xffffff), .5); }
  function setFinish(hex) { finishHex = hex; applyFinish(M, hex); if (bandOption(bandId).match) setBandColor(bandFor(hex)); }
  // Swap the band style/colourway: rebuild the strap meshes into the holders.
  function setBand(id) {
    const o = bandOption(id);
    if (o.id === bandId && band) return;
    bandId = o.id;
    const dispose = (g) => g.traverse(m => { if (m.isMesh) m.geometry.dispose(); });
    dispose(band.top); dispose(band.bottom); bandTop.remove(band.top); bandBottom.remove(band.bottom);
    if (o.style === 'sport' || o.style === 'ocean') setBandColor(o.match ? bandFor(finishHex) : o.hex);
    if (o.hardware) M.keeper.color.set(o.hardware);
    if (o.style === 'ocean') M.hardware.color.set(o.hardware);
    const mat = bandMaterialFor(o, M.band);
    if (mat !== M.band) for (const t of ['map', 'normalMap', 'roughnessMap']) mat[t]?.repeat.set(1, 1);
    band = buildBands(M, o, mat); bandTop.add(band.top); bandBottom.add(band.bottom);
    bands.name = o.name;
    setPose({ band: bandPose });
  }
  setFinish(finishHex);
  setPose();
  setProgress(0);
  return {
    root, groups, screenMaterial, screen: null, setFinish, setBandColor, setBand, get band() { return bandId; }, setProgress, setPose, points, anchors, materials: M, bandMaterial: M.band,
    // Portrait only; these keep the iPad-style state contract.
    setScreenOrientation() {},
    state: () => ({ screen: 'portrait', band: bandPose, bandColor: bandHex, bandStyle: bandId }),
    setState(s) { if (!s) return; if (s.bandStyle) setBand(s.bandStyle); if (s.band) setPose({ band: s.band }); if (s.bandColor && bandOption(bandId).style === 'sport') setBandColor(s.bandColor); },
    get screenOrientation() { return 'portrait'; }, get finish() { return finishHex; }, get progress() { return progress; }, get bandPose() { return bandPose; },
  };
}
