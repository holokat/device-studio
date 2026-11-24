import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileGeometry, perimeter } from '../casework.js';
import { glassElement, opticalCoating, lathe } from '../optics.js';

// Google Pixel 11 Pro, procedural. 1 unit = 1 cm. Body 152.8 × 72.0 × 8.6 mm
// (the 10 Pro / 11 Pro share the chassis), 6.3-inch flat display, 1280 × 2856 px.
// Model frame (studio convention): long axis +Y, display faces -Z, back +Z.
// Seen from the front the viewer's right is -X; from behind it is +X. So:
//   -X long edge  power button above the longer volume rocker (right edge from the front)
//   -Y short edge USB-C, speaker grille, microphone, SIM tray
//   back          full-width "visor" camera bar near the top, G mark centred
//
// Measurements from the supplied product photography (px → mm against the
// known 72.0 mm width or 152.8 mm height; near-orthographic views):
//   Obsidian back, straight (5.42 px/mm)
//     plan corner radius         ≈9.5 mm (straight edge starts ≈9.4 mm from the corner)
//     camera bar                 66 × 24.5 mm stadium, 3.0 mm in from each long edge,
//                                top 13.8 mm below the top edge (centre 26.1 mm)
//     metal surround seen flat   ≈1.4 mm
//     lens centres (from centre) ultra-wide -22.5, wide -6.8, telephoto +7.9 mm
//     dark lens surrounds        Ø 7.4 / 11.4 / 8.5 mm; flash Ø 6 mm at +21 mm
//     temperature sensor         +15 mm, ≈5 mm under the bar's top edge
//     G mark                     ≈13 mm, centred on the back
//     frame rim seen from behind ≈0.8 mm
//   Obsidian side profile (6.57 px/mm)
//     body 8.6 mm; flat band ≈6.6 mm with ≈1 mm rolls front and back
//     bar rises ≈3.6-4.2 mm above the glass (3.7 mm used), metal wall nearly vertical
//     power  ≈12 mm long, centre 48.5 mm from the top
//     volume ≈20.5 mm long, centre 72 mm from the top; both ≈3 mm across
//     antenna splits 25 mm from the top and 16 mm from the bottom on both long
//     edges, one on each short edge 9 mm toward -X
//   Front (6.62 px/mm)            uniform ≈3.3 mm border (frame included),
//                                hole-punch centre ≈7.2 mm below the top edge
export const PIXEL = { W: 7.20, H: 15.28, T: 0.86 };
const W = PIXEL.W, H = PIXEL.H, HW = W / 2, HH = H / 2, HT = PIXEL.T / 2;
const RC = .95;                                        // plan-view corner radius
// Active area: 1280 × 2856 px on a 6.3-inch diagonal → 65.4 × 145.9 mm.
const ACTIVE = { w: 6.54, h: 6.54 * 2856 / 1280, r: .78 };
export const PIXEL_ASPECT = ACTIVE.w / ACTIVE.h;      // portrait artwork, width / height
// Recommended screen artwork: half of the 1280 × 2856 panel.
export const PIXEL_ARTWORK = { width: 640, height: 1428 };
const ZS = -HT - .0006;                               // display emission plane
const HOLE = { r: .16, y: HH - .72 };                 // hole-punch selfie camera
const ZB = HT;                                         // back glass surface
const BAR = { y: HH - 2.61, w: W - .6, h: 2.45, rise: .42, wall: .14 };
const ZT = ZB + BAR.rise;                             // top of the bar surround
const ZG = ZT - .006;                                 // black glass top, a hair under the lip
// Lenses under the bar glass: [name, x, window radius, element radius].
const LENSES = [
  ['48MP ultra-wide', -2.25, .37, .19],
  ['50MP wide', -.68, .57, .29],
  ['48MP 5× telephoto', .79, .425, .22],
];
const FLASH = { x: 2.1, y: 0, r: .3 };                 // relative to the bar centre
const TEMP = { x: 1.5, y: .72, r: .055 };
const BUTTONS = { power: { y: HH - 4.85, len: 1.2 }, volume: { y: HH - 7.2, len: 2.05 } };

// Finishes: [name, back glass, frame, bar surround]. Obsidian is the default.
// Canyon, Olive and Fog have a polished frame; Obsidian a satin one.
export const pixelFinishes = [
  ['Obsidian', '#2a2e2d', '#3a3c3b', '#3a3c3b'],
  ['Canyon', '#f2a08e', '#e0b495', '#e0b495'],
  ['Olive', '#8d9278', '#c9c3ae', '#c9c3ae'],
  ['Fog', '#e6eeea', '#d7dad6', '#d7dad6'],
];
const SATIN = new Set(['#2a2e2d', '#2b2d2c']);

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
let mapCache = null;
function surfaceMaps() {
  return mapCache ||= { satin: noiseMaps(41213, 256, .42, 236, 14, 7), frost: noiseMaps(7717, 256, .26, 240, 10, 3) };
}

function makeMaterials() {
  const { satin, frost } = surfaceMaps();
  const M = {
    // The frame, bar surround and buttons share one metal; applyFinish switches
    // it between mirror polish and satin.
    frame: new THREE.MeshPhysicalMaterial({ name: 'Frame metal', color: 0xe0b495, metalness: 1, roughness: .1, clearcoat: .4, clearcoatRoughness: .06, envMapIntensity: 2.1 }),
    button: new THREE.MeshPhysicalMaterial({ name: 'Button metal', color: 0xe0b495, metalness: 1, roughness: .14, clearcoat: .3, clearcoatRoughness: .08, envMapIntensity: 2 }),
    ring: new THREE.MeshPhysicalMaterial({ name: 'Camera bar surround', vertexColors: true, color: 0xe0b495, metalness: 1, roughness: .1, clearcoat: .4, clearcoatRoughness: .06, envMapIntensity: 2.2 }),
    // Matte frosted back glass.
    back: new THREE.MeshPhysicalMaterial({ name: 'Matte back glass', color: 0xf2a08e, metalness: 0, roughness: .6, ...frost,
      normalScale: new THREE.Vector2(.05, .05), specularIntensity: .45, sheen: .08, sheenRoughness: .8, sheenColor: 0xffffff, envMapIntensity: .6 }),
    logo: new THREE.MeshPhysicalMaterial({ name: 'G mark', color: 0xe0b495, metalness: .7, roughness: .3, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: 1.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    band: new THREE.MeshPhysicalMaterial({ name: 'Antenna split', color: 0xc8b39e, metalness: .1, roughness: .45 }),
    barGlass: new THREE.MeshPhysicalMaterial({ name: 'Camera bar glass', color: 0x010102, metalness: 0, roughness: .05, clearcoat: .2, clearcoatRoughness: .02, specularIntensity: .4, envMapIntensity: .1 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x030304, metalness: .2, roughness: .16, clearcoat: 1, clearcoatRoughness: .03 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x040405, metalness: .1, roughness: .85 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Button gap', color: 0x141519, metalness: .5, roughness: .55 }),
    tongue: new THREE.MeshStandardMaterial({ name: 'USB-C tongue', color: 0x1d1e22, metalness: .3, roughness: .5 }),
    trim: new THREE.MeshPhysicalMaterial({ name: 'Lens trim', color: 0x2a2b2e, metalness: .9, roughness: .3, envMapIntensity: 1.2 }),
    flash: new THREE.MeshPhysicalMaterial({ name: 'Flash diffuser', color: 0xf3f2ee, emissive: 0x3a3936, metalness: 0, roughness: .35, clearcoat: 1, clearcoatRoughness: .05 }),
    lensBlack: new THREE.MeshPhysicalMaterial({ name: 'Lens bezel', color: 0x050506, metalness: .3, roughness: .32, clearcoat: .4, clearcoatRoughness: .1, envMapIntensity: .4, side: THREE.DoubleSide }),
    lensMatte: new THREE.MeshStandardMaterial({ name: 'Inner lens baffle', color: 0x08090b, metalness: .1, roughness: .7, envMapIntensity: .12, side: THREE.DoubleSide }),
    cover: new THREE.MeshPhysicalMaterial({ name: 'Lens cover glass', color: 0x05060a, metalness: 0, roughness: .04, transparent: true, opacity: .38,
      depthWrite: false, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1, envMapIntensity: 1.1 }),
    module: new THREE.MeshStandardMaterial({ name: 'Camera module housing', color: 0x2b2d31, metalness: .6, roughness: .45 }),
    frontCam: new THREE.MeshStandardMaterial({ name: 'Front camera well', color: 0x0b0c10, metalness: .3, roughness: .35 }),
    hole: new THREE.MeshBasicMaterial({ name: 'Hole punch', color: 0x010102 }),
  };
  M.satinMaps = satin;
  return M;
}

const C = (h) => new THREE.Color(h);
function applyFinish(M, hex) {
  const known = pixelFinishes.find(f => f[1].toLowerCase() === hex.toLowerCase());
  const back = C(known ? known[1] : hex);
  let frame, ring;
  if (known) { frame = C(known[2]); ring = C(known[3]); }
  else {
    // Custom colour: a pale polished metal tinted by the glass.
    const hsl = {}; back.getHSL(hsl);
    frame = new THREE.Color().setHSL(hsl.h, hsl.s * .45, Math.min(.85, .55 + hsl.l * .3));
    ring = frame.clone();
  }
  const satin = SATIN.has('#' + back.getHexString());
  for (const m of [M.frame, M.ring, M.button]) {
    m.color.copy(m === M.ring ? ring : frame);
    if (satin) {
      // Satin bead-blast: darker base, broad soft highlight.
      m.metalness = .8; m.roughness = .36; m.clearcoat = .05; m.envMapIntensity = 2.4;
      m.normalMap = M.satinMaps.normalMap; m.roughnessMap = M.satinMaps.roughnessMap; m.normalScale = new THREE.Vector2(.08, .08);
    } else {
      m.metalness = 1; m.roughness = m === M.button ? .14 : .1; m.clearcoat = .4; m.envMapIntensity = 2.1;
      m.normalMap = null; m.roughnessMap = null;
    }
    m.needsUpdate = true;
  }
  // The polished surround mirrors the coloured glass it stands on: tint the
  // lower outer wall toward the back colour (as in Google's photography).
  if (M.ringMesh) {
    const g = M.ringMesh.geometry, pos = g.getAttribute('position'), col = g.getAttribute('color');
    const tint = new THREE.Color(back.r / Math.max(.05, frame.r), back.g / Math.max(.05, frame.g), back.b / Math.max(.05, frame.b));
    const w = satin ? 0 : .7, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = (pos.getZ(i) - ZB) / BAR.rise, outer = M.ringOuter[i];
      const k = outer ? w * Math.max(0, Math.min(1, (.72 - h) / .5)) : 0;
      c.setRGB(1, 1, 1).lerp(tint, k); col.setXYZ(i, Math.min(1.4, c.r), Math.min(1.4, c.g), Math.min(1.4, c.b));
    }
    col.needsUpdate = true;
  }
  const bh = {}; back.getHSL(bh);
  // Matte glass under the studio's soft-box lighting and ACES reads paler
  // than the swatch: deepen and saturate the albedo to land on the swatch.
  { const h = {}; back.getHSL(h); M.back.color.setHSL((h.h + .985) % 1, Math.min(1, h.s * 1.08), h.l * (h.l > .5 ? .86 : 1)); }
  M.back.roughness = satin ? .66 : .58;
  M.back.sheenColor.copy(back).lerp(C(0xffffff), .6);
  // The G is a tone of the frame metal: lighter than a dark back, a warmer,
  // deeper metal on a pale one.
  M.logo.color.copy(frame).lerp(C(0xffffff), satin ? .18 : .22).multiplyScalar(satin ? 1.1 : (bh.l > .75 ? .8 : 1));
  M.logo.metalness = satin ? .3 : .45; M.logo.roughness = satin ? .5 : .3;
  if (satin) M.band.color.copy(frame).multiplyScalar(.55);
  else M.band.color.copy(frame).lerp(back, .35).lerp(C(0xffffff), .15);
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
function loft(w, h, r, rows) {
  const pos = [], idx = [], n = perimeter(w, h, r).length;
  for (const [inset, z] of rows) for (const [x, y] of perimeter(w - 2 * inset, h - 2 * inset, Math.max(.004, r - inset))) pos.push(x, y, z);
  for (let k = 1; k < rows.length; k++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = (k - 1) * n + i, b = (k - 1) * n + j, c = k * n + j, d = k * n + i;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function edgeBasis(obj, along, outward) {
  const a = new THREE.Vector3(...along), o = new THREE.Vector3(...outward), c = new THREE.Vector3().crossVectors(o, a);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, c, o));
}
function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}
// Quarter roll [inset, z] from a face (inset `r`, z = zc ± r) to the flat side.
function roll(zc, r, sign, steps = 9) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const phi = i / steps * Math.PI / 2;
    // Slightly squarer than a circle: flat sides that turn quickly.
    const s = Math.pow(Math.sin(phi), .8), c = Math.pow(Math.cos(phi), .8);
    out.push([r - r * s, zc + sign * r * c]);
  }
  return out;
}

// Edge profile: flat side, ≈0.8 mm rolls into front and back, the back
// rolling to a thin rim round the glass.
const ROLL = .085, ZR = HT - ROLL - .005;
const PROFILE_OUT = [...roll(-ZR, ROLL, -1), ...roll(ZR, ROLL, 1).reverse()];
const BAND = [[.32, -.39], [.092, -.39], [.087, -.405], ...PROFILE_OUT, [.087, .405], [.092, .39], [.32, .39]];

function profileSlice(material, width) {
  const s = new THREE.Shape();
  const outer = PROFILE_OUT.map(([i, z]) => [-i + .0012, z]);
  s.moveTo(...outer[0]); for (const p of outer.slice(1)) s.lineTo(...p);
  for (const [i, z] of PROFILE_OUT.slice().reverse()) s.lineTo(-i - .03, z);
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -width / 2);
  return new THREE.Mesh(g, material);
}
const OUTLINE = perimeter(W, H, RC);
function onPerimeter(obj, x, y) {
  let best = 0, bd = Infinity;
  OUTLINE.forEach(([px, py], i) => { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = i; } });
  const n = OUTLINE.length, p = OUTLINE[best], a = OUTLINE[(best + n - 1) % n], b = OUTLINE[(best + 1) % n];
  const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize(), out = new THREE.Vector3(t.y, -t.x, 0);
  const up = new THREE.Vector3(0, 0, 1), along = new THREE.Vector3().crossVectors(out, up);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(out, up, along));
  obj.position.set(p[0], p[1], 0); return obj;
}

// Simple geometric G drawn in code: a thick ring open at the upper right, with
// a crossbar from the centre to the right edge.
function makeG(material, size) {
  const R = size / 2, r = R * .64, b = (R - r) / 2, a0 = Math.PI * .27;
  const s = new THREE.Shape();
  s.absarc(0, 0, R, a0, Math.PI * 2 + Math.asin(b / R) - .0001, false);
  s.lineTo(R * .02, b);
  s.lineTo(R * .02, -b);
  s.lineTo(Math.sqrt(r * r - b * b), -b);
  s.absarc(0, 0, r, Math.PI * 2 - Math.asin(b / r), a0, true);
  s.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s, 48), material); mesh.name = 'G mark'; return mesh;
}

// ── Lens module ───────────────────────────────────────────────────────
// Sits in a window cut through the bar glass. Local +Z is the optical axis;
// z = 0 is the glass top. A thin dark-metal trim at the window lip, black
// bezel, matte baffle stepping down to the coated element, cover glass.
function makeLensModule(M, [name, x, rw, re], index) {
  const root = new THREE.Group(); root.name = name + ' camera';
  const layers = [];
  const add = (mesh, spread) => { root.add(mesh); layers.push({ mesh, z: mesh.position.z, spread }); return mesh; };
  add(lathe('Lens trim', [[rw - .035, -.006], [rw - .006, -.002], [rw + .004, -.0005], [rw + .02, .0004]], M.trim), 0);
  add(lathe('Lens bezel', [[rw - .034, -.006], [rw - .05, -.03], [re + .14, -.06], [re + .07, -.09], [re + .03, -.11]], M.lensBlack), .15);
  add(lathe('Inner baffle', [[re + .07, -.088], [re + .1, -.075], [re + .1, -.1], [re + .02, -.16]], M.lensMatte), .35);
  const coat = opticalCoating(index === 1 ? 1 : index === 0 ? 0 : 2);
  const rear = glassElement('Rear element', re * 1.05, .012, coat); rear.position.z = -.16; add(rear, .6);
  const front = glassElement('Front element', re, .035, coat); front.position.z = -.13; add(front, .85);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(rw - .03, rw - .03, .004, 96), M.cover);
  cover.rotation.x = Math.PI / 2; cover.position.z = -.012; cover.renderOrder = 3; cover.name = 'Lens cover glass'; add(cover, 1.1);
  // Module housing below the back glass (hidden when assembled).
  const housing = new THREE.Mesh(new THREE.BoxGeometry(rw * 2.1, rw * 2.1, .5), M.module);
  housing.position.z = -(ZT - ZB) - .25; housing.name = name + ' module'; add(housing, -.3);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(re + .09, re + .11, ZT - ZB, 48, 1, true), M.lensMatte);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = -(ZT - ZB) / 2 - .05; barrel.name = name + ' barrel'; add(barrel, -.15);
  root.position.set(x, BAR.y, ZG);
  return { root, layers };
}

// ── Body ─────────────────────────────────────────────────────────────
function buildBody(M, screenMaterial) {
  const g = { frame: new THREE.Group(), back: new THREE.Group(), display: new THREE.Group(), cameras: new THREE.Group() };
  g.frame.name = 'Metal frame'; g.back.name = 'Back glass'; g.display.name = 'Display stack'; g.cameras.name = 'Rear cameras';

  const band = new THREE.Mesh(profileGeometry(W, H, RC, BAND, true), M.frame); band.name = 'Frame perimeter band'; g.frame.add(band);

  // Back glass flush inside the rim, with the G mark.
  const back = new THREE.Mesh(profileGeometry(W, H, RC, [[.087, .395], [.088, .41], [.094, .421], [.104, .428], [.118, ZB]]), M.back);
  back.name = 'Matte back glass'; g.back.add(back);
  // Same-colour backing just under the cap: hides hairline cracks between the
  // cap's long fan triangles so internals never show through.
  const backing = flatShape(W - .2, H - .2, RC - .1, .392, 1, M.back, 'Back glass backing'); g.back.add(backing);
  const logo = makeG(M.logo, 1.28); logo.position.set(0, 0, ZB + .0015); g.back.add(logo);

  // Camera bar: polished surround with a soft foot, black glass top with
  // lens windows, flash and temperature sensor. The surround and glass are
  // separate groups so the exploded view can lift them apart.
  const bar = new THREE.Group(); bar.name = 'Camera bar'; bar.position.set(0, BAR.y, 0); g.back.add(bar);
  const surround = new THREE.Group(); surround.name = 'Camera bar surround'; bar.add(surround);
  const top = new THREE.Group(); top.name = 'Camera bar glass'; bar.add(top);
  const R = BAR.h / 2;
  const ringRows = [[-.03, ZB - .003], [-.012, ZB + .004], [-.004, ZB + .014], [0, ZB + .035], [0, ZT - .045], [.006, ZT - .018], [.018, ZT - .005], [.035, ZT],
    [BAR.wall - .03, ZT], [BAR.wall - .012, ZT - .004], [BAR.wall - .004, ZT - .014], [BAR.wall, ZT - .03], [BAR.wall, ZB + .02], [.05, ZB - .003]];
  // Closed loop (outer wall, lip, inner wall) so nothing caps the inside.
  const ring = new THREE.Mesh(profileGeometry(BAR.w, BAR.h, R, ringRows, true), M.ring); ring.name = 'Camera bar surround ring'; surround.add(ring);
  {
    // Per-vertex tint slot (filled by applyFinish) and an outer-wall mask.
    const n = ring.geometry.getAttribute('position').count, per = n / ringRows.length;
    ring.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    M.ringMesh = ring; M.ringOuter = Array.from({ length: n }, (_, i) => ringRows[Math.floor(i / per)][0] < .02);
  }
  const holes = LENSES.map(([, x, rw]) => [x, 0, rw]);
  const gw = BAR.w - 2 * BAR.wall, gh = BAR.h - 2 * BAR.wall;
  const glassTop = new THREE.Mesh(profileGeometry(gw, gh, gh / 2, [[.0005, ZG - .06], [.0005, ZG - .008], [.004, ZG - .002], [.01, ZG]], false, holes), M.barGlass);
  glassTop.name = 'Camera bar glass'; top.add(glassTop);
  // Light-tight floor under the glass: the lens windows read black.
  const floor = flatShape(gw, gh, gh / 2, ZB + .015, 1, M.dark, 'Camera bar floor'); surround.add(floor);
  // Flash: frosted white diffuser in a thin bright ring, just under the glass top.
  const flash = new THREE.Group(); flash.name = 'Flash'; flash.position.set(FLASH.x, FLASH.y, ZG + .0005); top.add(flash);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(FLASH.r, 64), M.flash); disc.name = 'Flash diffuser'; flash.add(disc);
  const fr = new THREE.Mesh(new THREE.RingGeometry(FLASH.r, FLASH.r + .025, 64), M.trim); fr.position.z = .0002; fr.name = 'Flash trim'; flash.add(fr);
  const temp = new THREE.Mesh(new THREE.CircleGeometry(TEMP.r, 32), M.trim); temp.position.set(TEMP.x, TEMP.y, ZG + .0005); temp.name = 'Temperature sensor'; top.add(temp);
  const tempIn = new THREE.Mesh(new THREE.CircleGeometry(TEMP.r * .55, 32), M.dark); tempIn.position.set(TEMP.x, TEMP.y, ZG + .0008); top.add(tempIn);
  const mic = new THREE.Mesh(new THREE.CircleGeometry(.03, 24), M.trim); mic.position.set(-(BAR.w / 2 - .5), .55, ZG + .0005); mic.name = 'Rear microphone'; top.add(mic);

  // Display: flat cover glass flush with the frame, the screen, a hole punch.
  const glass = new THREE.Mesh(profileGeometry(W, H, RC, [[.118, -HT], [.104, -.428], [.094, -.421], [.088, -.41], [.087, -.395]]), M.glass);
  glass.name = 'Cover glass'; g.display.add(glass);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display'); g.display.add(screen);
  {
    // Portrait, upright from the front: viewer's right is -X.
    const uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (ACTIVE.w / 2 - p.getX(i)) / ACTIVE.w, (p.getY(i) + ACTIVE.h / 2) / ACTIVE.h);
  }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(HOLE.r, 48), M.hole); hole.rotation.y = Math.PI;
  hole.position.set(0, HOLE.y, ZS - .0003); hole.name = 'Hole-punch camera'; hole.renderOrder = 2; g.display.add(hole);
  const well = new THREE.Mesh(new THREE.RingGeometry(HOLE.r * .55, HOLE.r * .8, 40), M.frontCam); well.rotation.y = Math.PI;
  well.position.set(0, HOLE.y, ZS - .0006); well.name = 'Front camera barrel'; well.renderOrder = 2; g.display.add(well);
  const fl = glassElement('Front camera lens', HOLE.r * .5, .008, opticalCoating(1)); fl.rotation.y = Math.PI;
  fl.position.set(0, HOLE.y, ZS - .0009); g.display.add(fl);
  const slot = new THREE.Mesh(new THREE.ShapeGeometry(stadium(1.1, .03), 12), M.seam);
  slot.rotation.y = Math.PI; slot.position.set(0, HH - .11, -HT - .0002); slot.name = 'Earpiece'; g.display.add(slot);

  // Antenna splits.
  for (const [x, y] of [[HW, HH - 2.5], [-HW, HH - 2.5], [HW, -HH + 1.6], [-HW, -HH + 1.6], [-.9, HH], [-.9, -HH]]) {
    const s = onPerimeter(profileSlice(M.band, .05), x, y); s.name = 'Antenna split'; g.frame.add(s);
  }

  // ── Power and volume on the -X edge ──
  const across = .29;
  function button(name, len, y, side) {
    const grp = new THREE.Group(); grp.name = name;
    edgeBasis(grp, [0, 1, 0], [side, 0, 0]); grp.position.set(side * HW, y, 0); g.frame.add(grp);
    const gap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(len + .04, across + .04), 24), M.seam); gap.position.z = .0012; gap.name = name + ' gap'; grp.add(gap);
    const proud = .05;
    const bodyGeo = new THREE.ExtrudeGeometry(stadium(len - .02, across - .02), { depth: proud - .014, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 5, curveSegments: 24 });
    bodyGeo.translate(0, 0, -.004);
    const body = new THREE.Mesh(bodyGeo, M.button); body.name = name; grp.add(body);
    return grp;
  }
  button('Power button', BUTTONS.power.len, BUTTONS.power.y, -1);
  button('Volume rocker', BUTTONS.volume.len, BUTTONS.volume.y, -1);

  // Bottom edge: USB-C centred, speaker grille toward -X, microphone and
  // SIM tray toward +X.
  {
    const grp = new THREE.Group(); grp.name = 'Bottom edge'; edgeBasis(grp, [1, 0, 0], [0, -1, 0]); grp.position.set(0, -HH, 0); g.frame.add(grp);
    const surround = new THREE.Mesh(loft(.95, .36, .18, [[0, .0009], [.018, .0011], [.04, .0011]]), M.seam);
    surround.name = 'USB-C chamfer'; grp.add(surround);
    const mouth = new THREE.Mesh(new THREE.ShapeGeometry(stadium(.87, .28), 24), M.dark); mouth.position.z = .001; mouth.name = 'USB-C port'; grp.add(mouth);
    const tongue = new THREE.Mesh(new THREE.ShapeGeometry(stadium(.64, .06), 12), M.tongue); tongue.position.z = .0013; tongue.name = 'USB-C tongue'; grp.add(tongue);
    // Local +X here is model +X.
    const holes = [], rims = [];
    for (let i = 0; i < 6; i++) {
      const x = -1.25 - i * .22;
      const w = new THREE.CircleGeometry(.055, 28); w.translate(x, 0, .0011); holes.push(w);
      const r = new THREE.RingGeometry(.055, .068, 28); r.translate(x, 0, .0009); rims.push(r);
    }
    { const w = new THREE.CircleGeometry(.045, 24); w.translate(.85, 0, .0011); holes.push(w); const r = new THREE.RingGeometry(.045, .056, 24); r.translate(.85, 0, .0009); rims.push(r); }
    const wells = new THREE.Mesh(mergeGeometries(holes), M.dark); wells.name = 'Speaker and microphone holes'; grp.add(wells);
    const rimMesh = new THREE.Mesh(mergeGeometries(rims), M.seam); rimMesh.name = 'Hole chamfers'; grp.add(rimMesh);
    const trayOutline = new THREE.Mesh(loft(1.1, .25, .125, [[0, .0009], [.012, .0009]]), M.seam); trayOutline.position.x = 1.8; trayOutline.name = 'SIM tray'; grp.add(trayOutline);
    const pin = new THREE.Mesh(new THREE.CircleGeometry(.025, 16), M.dark); pin.position.set(2.2, 0, .0011); pin.name = 'SIM eject'; grp.add(pin);
  }
  // Top edge microphone.
  {
    const grp = new THREE.Group(); edgeBasis(grp, [1, 0, 0], [0, 1, 0]); grp.position.set(0, HH, 0); g.frame.add(grp);
    const m = new THREE.Mesh(new THREE.CircleGeometry(.04, 20), M.dark); m.position.set(-.6, 0, .0011); m.name = 'Top microphone'; grp.add(m);
  }

  const optics = LENSES.map((L, i) => { const lens = makeLensModule(M, L, i); g.cameras.add(lens.root); return lens; });
  return { ...g, optics, bar, surround, top };
}

function buildInternals() {
  const battery = new THREE.Group(); battery.name = 'Battery';
  const board = new THREE.Group(); board.name = 'Logic board';
  const chamber = new THREE.Group(); chamber.name = 'Vapour chamber';
  const cell = new THREE.MeshPhysicalMaterial({ name: 'Battery pouch', color: 0x2a2120, metalness: .35, roughness: .5 });
  const label = new THREE.MeshStandardMaterial({ name: 'Battery label', color: 0x16171a, roughness: .7 });
  const pcb = new THREE.MeshStandardMaterial({ name: 'Circuit board', color: 0x1a1d1b, roughness: .62, metalness: .2 });
  const shield = new THREE.MeshPhysicalMaterial({ name: 'Shield can', color: 0xa9abb0, metalness: .9, roughness: .32 });
  const chip = new THREE.MeshStandardMaterial({ name: 'Silicon package', color: 0x0d0e10, roughness: .45, metalness: .3 });
  const copper = new THREE.MeshPhysicalMaterial({ name: 'Copper vapour chamber', color: 0xc8875a, metalness: 1, roughness: .3, envMapIntensity: 1.6, side: THREE.DoubleSide });
  const flex = new THREE.MeshStandardMaterial({ name: 'Flex cable', color: 0x060607, roughness: .55, metalness: .1 });
  const box = (w, h, d, mat, x, y, z, parent, name) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.name = name; parent.add(m); return m; };
  // Battery fills the middle; the flex runs down its +X side (left from the front).
  const pack = new THREE.Mesh(new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(perimeter(5.9, 8.6, .25).map(([x, y]) => new THREE.Vector2(x, y))); return s; })(), { depth: .44, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }), cell);
  pack.position.set(-.35, -1.15, -.2); pack.name = 'Battery cell'; battery.add(pack);
  box(3.2, 2.2, .002, label, -.6, -2.2, -.222, battery, 'Cell label');
  // Copper vapour chamber: L-shaped plate over the SoC and down the battery.
  {
    const s = new THREE.Shape(); const r = .25;
    const pts = [[-1.75, 6.25], [1.0, 6.25], [1.0, 1.0], [.2, .4], [.2, -2.9], [-1.75, -2.9]];
    s.moveTo(pts[0][0] + r, pts[0][1]);
    for (let i = 1; i <= pts.length; i++) { const p = pts[i % pts.length]; s.lineTo(p[0], p[1]); }
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelThickness: .01, bevelSize: .03, bevelSegments: 2 }), copper);
    plate.position.z = -.33; plate.name = 'Vapour chamber plate'; chamber.add(plate);
  }
  const flexShape = new THREE.Shape(); flexShape.moveTo(2.2, 3.7); flexShape.lineTo(1.25, 3.7); flexShape.lineTo(1.0, 1.0); flexShape.lineTo(.9, -4.4); flexShape.lineTo(2.3, -5.4); flexShape.lineTo(2.3, -4.4); flexShape.lineTo(2.2, 1.0); flexShape.closePath();
  const fl = new THREE.Mesh(new THREE.ShapeGeometry(flexShape), flex); fl.material.side = THREE.DoubleSide; fl.position.z = -.235; fl.name = 'Main flex'; battery.add(fl);
  box(6.4, 3.6, .08, pcb, 0, 5.15, .05, board, 'Main logic board');
  box(1.9, 1.6, .14, shield, .7, 5.0, -.06, board, 'Tensor SoC shield');
  box(1.6, 1.6, .14, chip, -1.9, 4.9, -.06, board, 'Modem');
  box(1.0, .9, .1, shield, 1.95, 6.2, -.04, board, 'Power management IC');
  box(.6, .6, .3, chip, 0, 6.35, .2, board, 'Front camera module');
  box(6.2, 1.45, .08, pcb, 0, -6.55, .05, board, 'USB-C sub-board');
  box(.95, .45, .28, shield, 0, -7.2, 0, board, 'USB-C receptacle');
  box(1.6, .9, .38, chip, -2.0, -6.55, 0, board, 'Loudspeaker');
  box(1.3, .8, .3, chip, 1.9, -6.55, 0, board, 'Haptics');
  return { battery, board, chamber };
}

export function createPixel() {
  const root = new THREE.Group(); root.name = 'Pixel 11 Pro';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  const body = buildBody(M, screenMaterial);
  const internals = buildInternals();
  root.add(body.frame, body.back, body.display, body.cameras, internals.chamber, internals.board, internals.battery);
  const groups = { display: body.display, frame: body.frame, back: body.back, cameras: body.cameras, chamber: internals.chamber, board: internals.board, battery: internals.battery };

  // ── Anchors (meanings as on the iPhone modules) ──
  const lensAnchor = (i, key) => anchor(body.cameras, key, LENSES[i][1], BAR.y, ZT, [0, 0, 1]);
  const anchors = {
    array: anchor(body.back, 'camera bar', 0, BAR.y, ZT, [0, 0, 1]),
    main: lensAnchor(1, 'wide'),
    ultra: lensAnchor(0, 'ultra-wide'),
    tele: lensAnchor(2, 'telephoto'),
    flash: anchor(body.back, 'flash', FLASH.x, BAR.y + FLASH.y, ZT, [0, 0, 1]),
    temp: anchor(body.back, 'temperature sensor', TEMP.x, BAR.y + TEMP.y, ZT, [0, 0, 1]),
    logo: anchor(body.back, 'G mark', 0, 0, ZB, [0, 0, 1]),
    // Hole-punch camera: the status bar centres on it.
    island: anchor(body.display, 'hole punch', 0, HOLE.y, -HT - .001, [0, 0, -1]),
    usb: anchor(body.frame, 'usb', 0, -HH, 0, [0, -1, 0]),
    power: anchor(body.frame, 'power button', -HW - .03, BUTTONS.power.y, 0, [-1, 0, 0]),
    side: anchor(body.frame, 'power button', -HW - .03, BUTTONS.power.y, 0, [-1, 0, 0]),
    topButton: anchor(body.frame, 'power button', -HW - .03, BUTTONS.power.y, 0, [-1, 0, 0]),
    // No Action button or Camera Control: moves that target them land on the
    // power button / volume rocker.
    action: anchor(body.frame, 'power button', -HW - .03, BUTTONS.power.y, 0, [-1, 0, 0]),
    control: anchor(body.frame, 'volume rocker', -HW - .03, BUTTONS.volume.y, 0, [-1, 0, 0]),
    volume: anchor(body.frame, 'volume rocker', -HW - .03, BUTTONS.volume.y, 0, [-1, 0, 0]),
    buttons: anchor(body.frame, 'power and volume', -HW - .03, (BUTTONS.power.y + BUTTONS.volume.y) / 2, 0, [-1, 0, 0]),
    railLow: anchor(body.frame, 'edge low', HW, -HH + 4.0, 0, [1, 0, 0]),
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

  // ── Exploded view, as in Google's camera-bar breakdown: display stack
  // forward, then vapour chamber, board and battery; the back glass lifts
  // off, the bar surround rises above it and the bar glass above that, the
  // camera modules and lens stacks opening up in between. ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    body.display.position.z = -6.6 * t;
    internals.chamber.position.z = -4.4 * t;
    internals.board.position.z = -2.6 * t;
    internals.battery.position.z = -1.0 * t;
    body.back.position.z = 2.4 * t;
    body.bar.position.z = 2.6 * t;           // surround above the back glass
    body.top.position.z = 1.8 * t;           // glass above the surround
    body.cameras.position.z = 3.4 * t;       // modules rise between the back and the bar
    for (const lens of body.optics) for (const { mesh, z, spread } of lens.layers) mesh.position.z = z + spread * t;
  }

  let finishHex = pixelFinishes[0][1];
  function setFinish(hex) { finishHex = hex; applyFinish(M, hex); }
  setFinish(finishHex);
  setProgress(0);
  return {
    root, groups, screenMaterial, setFinish, setProgress, points, anchors,
    // Portrait only; these keep the iPad-style state contract.
    setScreenOrientation() {}, state: () => ({ screen: 'portrait' }), setState() {},
    get screenOrientation() { return 'portrait'; }, get finish() { return finishHex; }, get progress() { return progress; },
  };
}
