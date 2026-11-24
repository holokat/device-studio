import * as THREE from 'three';
import { profileGeometry, perimeter } from '../casework.js';
import { makeLens, glassElement, opticalCoating } from '../optics.js';
import { makeLogo } from '../exterior.js';

// iPhone Air, procedural. 1 unit = 1 cm. Apple's figures: 156.2 × 74.7 × 5.64 mm,
// 6.5-inch Super Retina XDR, 2736 × 1260 px at 460 ppi, Grade 5 titanium frame.
// Model frame (studio convention): long axis +Y, display faces -Z, back faces +Z.
// Seen from the front, the viewer's right is -X, so:
//   -X long edge  side button, Camera Control (flush)
//   +X long edge  Action button, volume up / down
//   -Y short edge USB-C
//   back          full-width camera plateau across the top; Fusion lens at -X
//                 (top left seen from behind), microphone and flash at +X
//
// Measurements from Apple's photography, scaled by the known 74.7 mm width
// (or 156.2 mm length / 5.64 mm thickness where the view is a profile):
//   apple.com plateau.jpg (straight-on back, 877 px = 74.7 mm, 11.74 px/mm):
//     plateau top face   765 × 268 px -> 65.0 × 22.8 mm, centred on the body,
//                        inset 56-58 px (4.8-4.9 mm) from the sides, 57 px
//                        (4.85 mm) from the top; centre 16.2 mm below the top
//     plateau corner     curve runs ~100 px into each edge -> squircle r ≈ 10 mm
//     lens ring          183 px outer -> 15.55 mm, black window ~150 px -> 12.6 mm;
//                        centre 191 px from the left edge, 189 px from the top
//                        -> (x -21.1 mm, 16.1-16.2 mm below the top)
//     flash              72 px -> 6.1 mm, centre x +21.0 mm (mirror of the lens)
//     microphone         22 px -> 1.9 mm, centre x +13.9 mm, level with the lens
//     side button        208 px -> 17.7 mm, centre 55.2 mm below the top (-X)
//     Action button      81 px -> 6.9 mm, centre 33.9 mm below the top (+X)
//     volume up / down   131 px -> 11.2 mm each, centres 48.1 / 62.3 mm (+X)
//     buttons stand 2-4 px (~0.25 mm) proud of the band
//     frame seen from the back: 13-18 px (1.1-1.5 mm) of rolled polish
//   press profile shot (3237 px = 156.2 mm, 20.72 px/mm; 117 px = 5.64 mm):
//     plateau rise       62 px -> 3.0 mm above the back glass
//     lens barrel + cap  56 px -> 2.7 mm above the plateau (2.65 mm in titanium.jpg)
//     plateau flanks     concave parabolic cove, ~3 mm wide on the top/side
//                        flanks, ~4.5 mm on the lower flank; steep (~60°) at
//                        the top edge, tangent to the back at the foot
//     Camera Control     361 px -> 17.4 mm, centre 104.9 mm below the top (-X)
//     side button        374 px -> 18.0 mm, centre 55.3 mm (agrees with the back)
//     button height      52 px -> 2.5 mm, centred on the band
//     band section       flat polished side, ~3.3 mm wide, rolled into front and
//                        back glass; silhouette fits a 1.4-1.5 mm radius roll
//     antenna breaks     ~16 mm from the top, ~14.5 mm from the bottom
//   press iOS Home Screen (straight-on front, 1633 px = 74.7 mm, 21.86 px/mm):
//     plan corner        squircle reaching 14.6 mm into each edge; with
//                        casework's perimeter() (superellipse ^.86) r = 14.6 mm
//     black border       56 px -> 2.56 mm all round = (74.7 - 69.57) / 2 from the
//                        2736 × 1260 px panel at 460 ppi (151.07 × 69.57 mm)
//     Dynamic Island     452 × 132 px -> 20.7 × 6.0 mm, top 5.86 mm below the top
//                        edge (centre 8.87 mm); front camera at its left end
//     frame seen from the front: ~23 px (1.05 mm) of rolled polish
export const AIR = { W: 7.47, H: 15.62, T: 0.564 };
const W = AIR.W, H = AIR.H, HW = W / 2, HH = H / 2, HT = AIR.T / 2;
const RC = 1.46;                                  // plan-view corner (perimeter() radius)
const ROLL = .14;                                 // band roll radius into front and back glass
const LIPF = .1;                                  // front cover glass inset (frame visible from front)
const LIPB = .146;                                // back glass inset (frame visible from back)
// Active area 2736 × 1260 px at 460 ppi: 15.107 × 6.957 cm, concentric corners.
const ACTIVE = { w: 6.957, h: 15.107, r: RC - .26 };
export const AIR_ASPECT = ACTIVE.w / ACTIVE.h;    // portrait artwork aspect (1260∶2736)
const ZS = -HT - .0005;                           // display emission plane, just proud of the glass
// Camera plateau: top face, rise, and the parabolic flare of its flanks.
const PLAT = { w: 6.5, h: 2.29, r: 1.0, y: 6.185, rise: .30, flare: .30, flareLow: .45 };
const ZP = HT + PLAT.rise;                        // plateau top face
const LENS = { x: -2.11, y: 6.19, r: .778 };
const FLASH = { x: 2.10, y: 6.18, r: .305 };
const MIC = { x: 1.39, y: 6.19, r: .095 };
const ISLAND = { w: 2.07, h: .604, y: HH - .887, cam: .735 };
// Edge hardware: [name, centre y, length]. -X: side button and Camera Control.
const SIDE = { y: HH - 5.52, len: 1.77 }, CONTROL = { y: HH - 10.49, len: 1.74 };
const ACTION = { y: HH - 3.39, len: .69 }, VOL_UP = { y: HH - 4.81, len: 1.12 }, VOL_DOWN = { y: HH - 6.23, len: 1.12 };
const BTN_ACROSS = .25;

// Finishes: [name, satin back glass, mirror-polished frame, camera plateau].
// Sky Blue is the default. Colours are albedo, calibrated against Apple's
// colour photography under the studio rig (the photographs are exposed bright).
export const airFinishes = [
  ['Sky Blue', '#bcd7f2', '#a0bad8', '#b0cbe8'],
  ['Light Gold', '#efe5cf', '#d8bf92', '#e7dcc4'],
  ['Cloud White', '#f2f2f0', '#d2d4d7', '#e9eae8'],
  ['Space Black', '#2c2c2e', '#3a3b3f', '#19191b'],
];

// Frosted Ceramic Shield back: an isotropic micro-normal (fine sparkle under a
// raking light) and a slight roughness scatter.
let frostCache = null;
function frostMaps() {
  if (frostCache) return frostCache;
  const size = 256, n = document.createElement('canvas'), r = document.createElement('canvas');
  n.width = n.height = r.width = r.height = size;
  const nc = n.getContext('2d'), rc = r.getContext('2d');
  const ni = nc.createImageData(size, size), ri = rc.createImageData(size, size);
  let seed = 44021;
  const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => (rand() + rand() + rand() - 1.5) * .9;
  for (let i = 0; i < size * size; i++) {
    const x = gauss() * .5, y = gauss() * .5, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    ni.data.set([(x * .5 + .5) * 255, (y * .5 + .5) * 255, (z * .5 + .5) * 255, 255], i * 4);
    const g = 232 + gauss() * 18;
    ri.data.set([g, g, g, 255], i * 4);
  }
  nc.putImageData(ni, 0, 0); rc.putImageData(ri, 0, 0);
  const normalMap = new THREE.CanvasTexture(n), roughnessMap = new THREE.CanvasTexture(r);
  for (const t of [normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); t.anisotropy = 8; }
  frostCache = { normalMap, roughnessMap };
  return frostCache;
}

function makeMaterials() {
  const frost = frostMaps();
  const M = {
    // Grade 5 titanium, mirror polished, finish tinted.
    frame: new THREE.MeshPhysicalMaterial({ name: 'Polished titanium frame', color: 0xaec3d8, metalness: 1, roughness: .065, clearcoat: .5, clearcoatRoughness: .04 }),
    // Lens barrel: the same polish, a little broader so the crown reads as one
    // bright silver ring from straight on (as in Apple's plateau photograph).
    lensRing: new THREE.MeshPhysicalMaterial({ name: 'Polished lens barrel', color: 0xc9d6e2, metalness: 1, roughness: .17, clearcoat: .6, clearcoatRoughness: .05 }),
    button: new THREE.MeshPhysicalMaterial({ name: 'Polished titanium button', color: 0xaec3d8, metalness: 1, roughness: .08, clearcoat: .4, clearcoatRoughness: .05 }),
    // Satin frosted back glass: broad soft sheen, no sharp gloss.
    back: new THREE.MeshPhysicalMaterial({ name: 'Frosted back glass', color: 0xcddcea, metalness: 0, roughness: .5, ...frost,
      normalScale: new THREE.Vector2(.05, .05), sheen: .3, sheenRoughness: .65, sheenColor: 0xffffff, clearcoat: .1, clearcoatRoughness: .45 }),
    // Plateau: same glass, polished, so it reads glossier and deeper.
    plateau: new THREE.MeshPhysicalMaterial({ name: 'Camera plateau', color: 0xc2d4e4, metalness: 0, roughness: .2, sheen: .25, sheenRoughness: .4, sheenColor: 0xffffff, clearcoat: 1, clearcoatRoughness: .06 }),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Polished insignia', color: 0xe9eef3, metalness: .6, roughness: .16, clearcoat: .8, clearcoatRoughness: .05 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x030304, metalness: .2, roughness: .16, clearcoat: .9, clearcoatRoughness: .03 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Seam', color: 0x16181b, metalness: .5, roughness: .5 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x050506, metalness: .2, roughness: .8 }),
    antenna: new THREE.MeshPhysicalMaterial({ name: 'Antenna band', color: 0xb9c3cc, metalness: .3, roughness: .3, clearcoat: .6, clearcoatRoughness: .1, side: THREE.DoubleSide }),
    sapphire: new THREE.MeshPhysicalMaterial({ name: 'Camera Control sapphire', color: 0x6d7c8a, metalness: .5, roughness: .1, clearcoat: 1, clearcoatRoughness: .03 }),
    flashRing: new THREE.MeshPhysicalMaterial({ name: 'Flash bezel', color: 0xc9ccd0, metalness: .9, roughness: .2 }),
    diffuser: new THREE.MeshPhysicalMaterial({ name: 'Flash diffuser', color: 0xdcdedd, metalness: 0, roughness: .42, clearcoat: .8, clearcoatRoughness: .1 }),
    fresnel: new THREE.MeshStandardMaterial({ name: 'Fresnel rings', color: 0xdedbd2, metalness: .25, roughness: .3 }),
    led: new THREE.MeshStandardMaterial({ name: 'Flash emitter', color: 0xd9ccaa, metalness: .1, roughness: .4 }),
    pill: new THREE.MeshBasicMaterial({ name: 'Dynamic Island', color: 0x020203 }),
    frontCam: new THREE.MeshStandardMaterial({ name: 'Front camera window', color: 0x0c0d11, metalness: .3, roughness: .3 }),
    micMesh: new THREE.MeshStandardMaterial({ name: 'Microphone mesh', color: 0x6a6e74, metalness: .6, roughness: .5 }),
  };
  M.frame.envMapIntensity = 2.4; M.lensRing.envMapIntensity = 2.6; M.button.envMapIntensity = 2.3;
  M.back.envMapIntensity = 1.3; M.plateau.envMapIntensity = 1.5; M.logo.envMapIntensity = 2;
  return M;
}

const tmpColor = new THREE.Color(), white = new THREE.Color(1, 1, 1), black = new THREE.Color(0, 0, 0);
function applyFinish(M, hex) {
  const known = airFinishes.find(f => f[1].toLowerCase() === hex.toLowerCase());
  const back = new THREE.Color(known ? known[1] : hex);
  const hsl = {}; back.getHSL(hsl);
  let frame, plateau;
  if (known) { frame = new THREE.Color(known[2]); plateau = new THREE.Color(known[3]); }
  else {
    // Custom colour: light backs pair with a pale tinted polish, dark ones with
    // a darker PVD-like polish; the plateau is a touch deeper than the back.
    frame = hsl.l > .5 ? new THREE.Color().setHSL(hsl.h, Math.min(.35, hsl.s), Math.min(.82, hsl.l * .92)) : new THREE.Color().setHSL(hsl.h, Math.min(.3, hsl.s), Math.max(.2, hsl.l * 1.25));
    plateau = back.clone().multiplyScalar(hsl.l > .5 ? .95 : .62);
  }
  const dark = hsl.l < .3;
  M.back.color.copy(back); M.plateau.color.copy(plateau);
  M.back.sheenColor.copy(back).lerp(white, dark ? .15 : .3);
  M.plateau.sheenColor.copy(plateau).lerp(white, dark ? .1 : .35);
  M.frame.color.copy(frame); M.button.color.copy(frame);
  M.flashRing.color.copy(frame).lerp(white, .25);
  M.lensRing.color.copy(frame).lerp(white, dark ? .1 : .45);
  // Light finishes carry a bright pearly logo, Space Black a glossy black one.
  M.logo.color.copy(dark ? tmpColor.copy(back).multiplyScalar(.35) : tmpColor.copy(back).lerp(white, .8));
  M.logo.metalness = dark ? .2 : .15;
  // Antenna breaks: a translucent grey resin, close to the frame tone.
  M.antenna.color.copy(frame).lerp(tmpColor.set(dark ? 0x2a2b2e : 0x9aa3ac), .55);
  M.sapphire.color.copy(frame).multiplyScalar(.55);
}

// Loft through rounded-rectangle rings that may each have their own size,
// corner and centre (used for the plateau's asymmetric flare). Rings run from
// the foot to the top; the last one is capped facing +Z.
function loft(rings, capZ) {
  const pos = [], idx = [];
  const loops = rings.map(({ w, h, r, cx = 0, cy = 0, z }) => perimeter(w, h, r).map(([x, y]) => [x + cx, y + cy, z]));
  const n = loops[0].length;
  for (const loop of loops) for (const p of loop) pos.push(...p);
  for (let j = 1; j < loops.length; j++) for (let i = 0; i < n; i++) {
    const k = (i + 1) % n, A = (j - 1) * n + i, B = (j - 1) * n + k, C = j * n + k, D = j * n + i;
    idx.push(A, B, C, A, C, D);
  }
  const top = loops[loops.length - 1], start = pos.length / 3;
  for (const p of top) pos.push(p[0], p[1], capZ);
  const center = pos.length / 3; pos.push(rings[rings.length - 1].cx || 0, rings[rings.length - 1].cy || 0, capZ);
  for (let i = 0; i < n; i++) idx.push(center, start + i, start + (i + 1) % n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // Planar UVs (1.4 cm tile, as casework.js) so the frost maps keep their scale.
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((v, i) => i % 3 === 2 ? [] : [v / 1.4 + .5]), 2));
  g.setIndex(idx); g.computeVertexNormals();
  // The cap shares nothing with the walls: keep it exactly flat.
  const nrm = g.getAttribute('normal');
  for (let i = start; i <= center; i++) nrm.setXYZ(i, 0, 0, 1);
  return g;
}

function flatShape(w, h, r, z, facing, material, name, cx = 0, cy = 0) {
  const pts = perimeter(w, h, r).map(([x, y]) => new THREE.Vector2(x + cx, y + cy));
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
function stadiumRing(len, across, width) {
  const s = stadium(len, across), hole = stadium(len - 2 * width, across - 2 * width);
  s.holes.push(new THREE.Path(hole.getPoints(24).reverse()));
  return s;
}
// Orient a local (along, across, outward) frame onto an edge of the body.
function edgeBasis(mesh, along, outward) {
  const a = new THREE.Vector3(...along), o = new THREE.Vector3(...outward), c = new THREE.Vector3().crossVectors(o, a);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, c, o));
}
function onEdge(parent, mesh, name, center, along, outward, lift = 0) {
  edgeBasis(mesh, along, outward);
  mesh.position.set(center[0] + outward[0] * lift, center[1] + outward[1] * lift, center[2]);
  mesh.name = name; parent.add(mesh); return mesh;
}
// Polished pill button standing ~0.25 mm proud, in a dark hairline gap.
function edgeButton(parent, M, name, len, center, along, outward) {
  const proud = .022;
  const g = new THREE.ExtrudeGeometry(stadium(len, BTN_ACROSS), { depth: proud, bevelEnabled: true, bevelThickness: .008, bevelSize: .01, bevelSegments: 4, curveSegments: 20 });
  g.translate(0, 0, -.012);
  const button = onEdge(parent, new THREE.Mesh(g, M.button), name, center, along, outward);
  onEdge(parent, new THREE.Mesh(new THREE.ShapeGeometry(stadium(len + .03, BTN_ACROSS + .03), 20), M.seam), name + ' gap', center, along, outward, .0008);
  return button;
}
// Camera Control: flush sapphire crystal in a thin polished surround.
function cameraControl(parent, M, center, along, outward) {
  const len = CONTROL.len, across = BTN_ACROSS;
  onEdge(parent, new THREE.Mesh(new THREE.ShapeGeometry(stadium(len + .03, across + .03), 20), M.seam), 'Camera Control gap', center, along, outward, .0006);
  const rim = new THREE.ExtrudeGeometry(stadiumRing(len, across, .022), { depth: .002, bevelEnabled: true, bevelThickness: .002, bevelSize: .003, bevelSegments: 2, curveSegments: 20 });
  onEdge(parent, new THREE.Mesh(rim, M.button), 'Camera Control surround', center, along, outward, .0006);
  const face = new THREE.ExtrudeGeometry(stadium(len - .044, across - .044), { depth: .001, bevelEnabled: true, bevelThickness: .0015, bevelSize: .002, bevelSegments: 2, curveSegments: 20 });
  return onEdge(parent, new THREE.Mesh(face, M.sapphire), 'Camera Control', center, along, outward, .0008);
}

function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}

function disc(radius, depth, material, segments = 64) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
  mesh.rotation.x = Math.PI / 2; return mesh;
}

// Band cross-section, [inset from the plan outline, z]: flat polished side
// rolled with a ROLL radius into both glasses, then the hidden inner wall.
function bandProfile() {
  const pts = [], n = 10;
  const fz = -HT + ROLL, bz = HT - ROLL;
  // Front roll starts where it meets the cover glass edge (inset LIPF).
  const t0 = Math.asin((ROLL - LIPF - .005) / ROLL);
  for (let i = 0; i <= n; i++) { const t = t0 + (Math.PI / 2 - t0) * i / n; pts.push([ROLL - ROLL * Math.sin(t), fz - ROLL * Math.cos(t)]); }
  for (let i = 0; i <= n; i++) { const t = Math.PI / 2 * i / n; pts.push([ROLL - ROLL * Math.cos(t), bz + ROLL * Math.sin(t)]); }
  const outer = pts.slice();
  pts.push([ROLL + .0005, HT], [LIPB + .004, HT - .02], [.36, HT - .02], [.36, -HT + .03], [LIPF + .005, -HT + .03]);
  return { loop: pts, outer };
}

// A conformal strip over the outer band (antenna breaks), in world coordinates.
function bandStrip(outer, edge, at, len, material, name) {
  const prof = outer.filter(([i]) => i < .12), pos = [], idx = [];
  const sign = edge === '+x' || edge === '+y' ? 1 : -1, half = edge[1] === 'x' ? HW : HH;
  prof.forEach(([inset, z]) => {
    for (const s of [-1, 1]) {
      const along = at + s * len / 2, out = sign * (half - inset + .0012);
      if (edge[1] === 'x') pos.push(out, along, z); else pos.push(along, out, z);
    }
  });
  for (let k = 0; k < prof.length - 1; k++) { const a = 2 * k; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material); mesh.name = name; return mesh;
}

// One complete exterior.
function buildBody(M, screenMaterial) {
  const g = { frame: new THREE.Group(), back: new THREE.Group(), display: new THREE.Group(), cameras: new THREE.Group() };
  g.frame.name = 'Titanium frame'; g.back.name = 'Back glass and plateau'; g.display.name = 'Display stack'; g.cameras.name = 'Fusion camera';

  const { loop, outer } = bandProfile();
  const band = new THREE.Mesh(profileGeometry(W, H, RC, loop, true), M.frame); band.name = 'Polished titanium band'; g.frame.add(band);
  // Hairline seams where the band meets each glass.
  const seamBack = new THREE.Mesh(profileGeometry(W, H, RC, [[ROLL - .002, HT - .006], [LIPB + .006, HT - .006]]), M.seam); seamBack.name = 'Back glass seam'; g.frame.add(seamBack);

  // Antenna breaks: across both long edges near each end.
  for (const edge of ['+x', '-x']) for (const y of [HH - 1.6, -HH + 1.45]) g.frame.add(bandStrip(outer, edge, y, .055, M.antenna, 'Antenna break'));

  // ── Back: frosted glass with the polished plateau ──
  const backGlass = new THREE.Mesh(profileGeometry(W, H, RC, [[LIPB, HT - .04], [LIPB, HT - .006], [LIPB + .003, HT - .001], [LIPB + .01, HT]]), M.back);
  backGlass.name = 'Frosted back glass'; g.back.add(backGlass);
  const logo = makeLogo(M.logo); logo.scale.setScalar(1.49); logo.position.set(0, .08, HT + .0004); g.back.add(logo);

  // Plateau loft: foot -> flank -> rolled top edge -> flat top. The flank is
  // the measured parabola: drop = rise · (1 - (1 - s)²), s = outset / flare.
  const rings = [];
  const ring = (s, z) => {
    const os = PLAT.flare * s, ot = PLAT.flare * s, ob = PLAT.flareLow * s;
    return { w: PLAT.w + 2 * os, h: PLAT.h + ot + ob, r: PLAT.r + os * .9, cx: 0, cy: PLAT.y + (ot - ob) / 2, z };
  };
  for (const s of [1, .9, .8, .7, .6, .5, .4, .32, .25, .19, .14, .1, .07, .045, .025, .01, 0]) rings.push(ring(s, ZP - .006 - (PLAT.rise - .006) * (1 - (1 - s) * (1 - s))));
  // Small roll (~0.4 mm) from the steep flank onto the flat top.
  for (const [d, dz] of [[.006, .0035], [.014, .0016], [.025, .0005], [.04, 0]]) rings.push({ w: PLAT.w - 2 * d, h: PLAT.h - 2 * d, r: PLAT.r - d, cx: 0, cy: PLAT.y, z: ZP - dz });
  rings[0].z = HT - .003;
  const plateau = new THREE.Mesh(loft(rings, ZP), M.plateau); plateau.name = 'Camera plateau'; g.back.add(plateau);

  // ── Cameras: lens, flash and microphone on the plateau ──
  const lens = makeLens({ rail: M.lensRing }, LENS.r, 1, 'air');
  lens.root.name = '48MP Fusion camera'; lens.root.position.set(LENS.x, LENS.y, ZP); g.cameras.add(lens.root); g.lensLayers = lens.layers;
  // Shadow gap where the barrel stands on the plateau.
  const foot = new THREE.Mesh(new THREE.RingGeometry(LENS.r - .01, LENS.r + .006, 96), M.seam);
  foot.position.set(LENS.x, LENS.y, ZP + .0006); foot.name = 'Lens barrel seat'; g.cameras.add(foot);

  const flash = new THREE.Group(); flash.name = 'True Tone flash'; flash.position.set(FLASH.x, FLASH.y, ZP); g.cameras.add(flash);
  { const bezel = new THREE.Mesh(new THREE.RingGeometry(FLASH.r - .03, FLASH.r, 80), M.flashRing); bezel.position.z = .0008; flash.add(bezel);
    const gap = new THREE.Mesh(new THREE.RingGeometry(FLASH.r - .036, FLASH.r - .028, 80), M.seam); gap.position.z = .0009; flash.add(gap);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(FLASH.r - .034, 80), M.diffuser); cap.position.z = .0007; flash.add(cap);
    for (let i = 0; i < 9; i++) { const ringMesh = new THREE.Mesh(new THREE.RingGeometry(.05 + i * .022, .053 + i * .022, 64), M.fresnel); ringMesh.position.z = .0011; flash.add(ringMesh); }
    const core = new THREE.Mesh(new THREE.CircleGeometry(.05, 40), M.led); core.position.z = .0012; flash.add(core); }

  const mic = new THREE.Group(); mic.name = 'Rear microphone'; mic.position.set(MIC.x, MIC.y, ZP); g.cameras.add(mic);
  { const hole = new THREE.Mesh(new THREE.CircleGeometry(MIC.r, 40), M.dark); hole.position.z = .0008; mic.add(hole);
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(MIC.r * .78, 40), M.micMesh); mesh.position.z = .0009; mic.add(mesh);
    const rim = new THREE.Mesh(new THREE.RingGeometry(MIC.r - .006, MIC.r + .006, 40), M.seam); rim.position.z = .001; mic.add(rim); }

  // ── Display: cover glass flush with the front roll, OLED on its face ──
  const glass = new THREE.Mesh(profileGeometry(W - 2 * LIPF, H - 2 * LIPF, RC - LIPF, [[.026, -HT], [.012, -HT + .0012], [.004, -HT + .005], [0, -HT + .012], [0, -HT + .06]]), M.glass);
  glass.name = 'Ceramic Shield cover glass'; g.display.add(glass);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display');
  // Portrait, upright from the front: the viewer's right is -X.
  { const uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (ACTIVE.w / 2 - p.getX(i)) / ACTIVE.w, (p.getY(i) + ACTIVE.h / 2) / ACTIVE.h);
    uv.needsUpdate = true; }
  g.display.add(screen);
  // Dynamic Island with the front camera at its left end (viewer's left = +X).
  const isle = new THREE.Mesh(new THREE.ShapeGeometry(stadium(ISLAND.w, ISLAND.h), 32), M.pill);
  isle.rotation.y = Math.PI; isle.position.set(0, ISLAND.y, ZS - .0003); isle.name = 'Dynamic Island'; isle.renderOrder = 1; g.display.add(isle);
  const camWin = new THREE.Mesh(new THREE.CircleGeometry(.15, 40), M.frontCam); camWin.rotation.y = Math.PI;
  camWin.position.set(ISLAND.cam, ISLAND.y, ZS - .0005); camWin.name = 'Front camera'; camWin.renderOrder = 2; g.display.add(camWin);
  const camLens = glassElement('Front camera lens', .085, .006, opticalCoating(1)); camLens.rotation.y = Math.PI;
  camLens.position.set(ISLAND.cam, ISLAND.y, ZS - .0009); g.display.add(camLens);
  // Earpiece slot between the glass edge and the band, centred on top.
  const ear = new THREE.Mesh(new THREE.ShapeGeometry(stadium(1.05, .032), 12), M.dark);
  ear.rotation.y = Math.PI; ear.position.set(0, HH - LIPF - .05, -HT - .0004); ear.name = 'Earpiece'; g.display.add(ear);

  // ── Edge hardware ──
  edgeButton(g.frame, M, 'Side button', SIDE.len, [-HW, SIDE.y, 0], [0, 1, 0], [-1, 0, 0]);
  cameraControl(g.frame, M, [-HW, CONTROL.y, 0], [0, 1, 0], [-1, 0, 0]);
  edgeButton(g.frame, M, 'Action button', ACTION.len, [HW, ACTION.y, 0], [0, 1, 0], [1, 0, 0]);
  edgeButton(g.frame, M, 'Volume up', VOL_UP.len, [HW, VOL_UP.y, 0], [0, 1, 0], [1, 0, 0]);
  edgeButton(g.frame, M, 'Volume down', VOL_DOWN.len, [HW, VOL_DOWN.y, 0], [0, 1, 0], [1, 0, 0]);
  // USB-C: chamfered polished mouth, dark well and the centre tongue.
  { const port = new THREE.Group(); port.name = 'USB-C port'; port.position.set(0, -HH, 0); port.rotation.x = Math.PI / 2; g.frame.add(port);
    const mouth = new THREE.Mesh(new THREE.ShapeGeometry(stadiumRing(.92, .34, .025), 20), M.button); mouth.position.z = .0009; port.add(mouth);
    // The band is one closed shell, so the receptacle's depth is painted:
    // lit lower wall, shadowed upper wall, the tongue and its contact row.
    const well = new THREE.Mesh(new THREE.ShapeGeometry(stadium(.875, .295), 20), new THREE.MeshStandardMaterial({ name: 'USB-C receptacle', map: portTexture(), roughness: .55, metalness: .35 }));
    const uv = well.geometry.getAttribute('uv'), pp = well.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / .875 + .5, pp.getY(i) / .295 + .5);
    well.position.z = .0007; well.name = 'USB-C receptacle'; port.add(well); }
  return g;
}

let portCache = null;
function portTexture() {
  if (portCache) return portCache;
  const c = document.createElement('canvas'); c.width = 512; c.height = 172;
  const x = c.getContext('2d'), w = c.width, h = c.height, r = h / 2;
  const pill = (x0, y0, ww, hh) => { const rr = hh / 2; x.beginPath(); x.moveTo(x0 + rr, y0); x.lineTo(x0 + ww - rr, y0); x.arc(x0 + ww - rr, y0 + rr, rr, -Math.PI / 2, Math.PI / 2); x.lineTo(x0 + rr, y0 + hh); x.arc(x0 + rr, y0 + rr, rr, Math.PI / 2, Math.PI * 1.5); x.closePath(); };
  x.fillStyle = '#030304'; x.fillRect(0, 0, w, h);
  // Inner wall: the shell's machined bore catches light along its far side.
  const wall = x.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, '#0a0b0d'); wall.addColorStop(.18, '#050506'); wall.addColorStop(.8, '#0b0c0e'); wall.addColorStop(1, '#4a4d53');
  pill(0, 0, w, h); x.fillStyle = wall; x.fill();
  pill(14, 14, w - 28, h - 28); x.fillStyle = '#020203'; x.fill();
  // Tongue with its contact row.
  pill(70, r - 16, w - 140, 32); x.fillStyle = '#17181b'; x.fill();
  x.fillStyle = '#3c3a35'; for (let i = 0; i < 12; i++) x.fillRect(96 + i * 27, r - 11, 13, 6);
  x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(80, r + 12, w - 160, 2);
  portCache = new THREE.CanvasTexture(c); portCache.colorSpace = THREE.SRGBColorSpace; portCache.anisotropy = 8;
  return portCache;
}

function buildInternals() {
  const battery = new THREE.Group(); battery.name = 'Battery';
  const board = new THREE.Group(); board.name = 'Logic board';
  const foil = new THREE.MeshPhysicalMaterial({ name: 'Battery foil', color: 0xb8bbc1, metalness: .65, roughness: .42 });
  const label = new THREE.MeshStandardMaterial({ name: 'Battery label', color: 0x1a1b1e, roughness: .7 });
  const pcb = new THREE.MeshStandardMaterial({ name: 'Circuit board', color: 0x16201b, roughness: .62, metalness: .2 });
  const shield = new THREE.MeshPhysicalMaterial({ name: 'Shield can', color: 0xa9abb0, metalness: .9, roughness: .32 });
  const chip = new THREE.MeshStandardMaterial({ name: 'Silicon package', color: 0x0d0e10, roughness: .45, metalness: .3 });
  const box = (w, h, d, mat, x, y, z, parent, name) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.name = name; parent.add(m); return m; };
  // The Air keeps its logic board up in the plateau; the cell fills the body.
  box(6.6, 9.6, .3, foil, 0, -1.9, -.02, battery, 'Battery cell');
  box(3.4, 2.4, .002, label, 0, -.9, .132, battery, 'Cell label');
  box(6.1, 2.0, .06, pcb, 0, PLAT.y, .33, board, 'Logic board');
  box(1.6, 1.3, .1, shield, -.2, PLAT.y + .1, .41, board, 'A19 Pro shield');
  box(1.0, .9, .08, shield, 1.1, PLAT.y - .25, .40, board, 'N1 wireless shield');
  box(.9, .8, .08, shield, 1.1, PLAT.y + .55, .40, board, 'C1X modem shield');
  box(1.35, 1.35, .24, chip, LENS.x, LENS.y, .44, board, '48MP Fusion camera module');
  box(1.1, .5, .2, chip, 0, HH - .55, 0, board, 'Earpiece speaker');
  box(1.2, .42, .2, shield, 0, -HH + .45, 0, board, 'USB-C module');
  return { battery, board };
}

export function createAir() {
  const root = new THREE.Group(); root.name = 'iPhone Air';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  const body = buildBody(M, screenMaterial);
  const internals = buildInternals();
  root.add(body.frame, body.back, body.display, body.cameras, internals.battery, internals.board);
  const groups = { display: body.display, frame: body.frame, back: body.back, cameras: body.cameras, battery: internals.battery, board: internals.board };
  const lensLayers = body.lensLayers;

  // ── Anchors (same meanings as the Pro / iPad sets) ──
  const lensTop = ZP + .265;
  const anchors = {
    array: anchor(body.back, 'plateau', 0, PLAT.y, ZP + .02, [0, 0, 1]),
    main: anchor(body.cameras, 'main', LENS.x, LENS.y, lensTop, [0, 0, 1]),
    flash: anchor(body.cameras, 'flash', (FLASH.x + MIC.x) / 2, FLASH.y, ZP + .01, [0, 0, 1]),
    mic: anchor(body.cameras, 'rear microphone', MIC.x, MIC.y, ZP + .01, [0, 0, 1]),
    island: anchor(body.display, 'dynamic island', 0, ISLAND.y, -HT - .001, [0, 0, -1]),
    usb: anchor(body.frame, 'usb', 0, -HH, 0, [0, -1, 0]),
    control: anchor(body.frame, 'camera control', -HW - .002, CONTROL.y, 0, [-1, 0, 0]),
    side: anchor(body.frame, 'side button', -HW - .025, SIDE.y, 0, [-1, 0, 0]),
    // The iPad's `topButton` is its power button: here, the side button.
    topButton: anchor(body.frame, 'side button', -HW - .025, SIDE.y, 0, [-1, 0, 0]),
    action: anchor(body.frame, 'action button', HW + .025, ACTION.y, 0, [1, 0, 0]),
    volume: anchor(body.frame, 'volume buttons', HW + .025, (VOL_UP.y + VOL_DOWN.y) / 2, 0, [1, 0, 0]),
    railLow: anchor(body.frame, 'edge low', HW, -HH + 4.5, 0, [1, 0, 0]),
    center: anchor(root, 'center', 0, 0, 0, null),
  };
  // Screen anchors in the display's reading frame (fractions of half extents).
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
    const right = new THREE.Vector3(-1, 0, 0), up = new THREE.Vector3(0, 1, 0);
    const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(root.matrixWorld);
    const nModel = new THREE.Vector3(0, 0, -1).applyQuaternion(root.getWorldQuaternion(q)).applyQuaternion(mq).normalize();
    for (const [key, [fr, fu]] of Object.entries(SCREEN)) {
      const p = new THREE.Vector3().addScaledVector(right, fr * ACTIVE.w / 2).addScaledVector(up, fu * ACTIVE.h / 2);
      p.z = ZS + body.display.position.z;
      out[key] = { p: p.applyMatrix4(toModel), n: nModel.clone() };
    }
    return out;
  }

  // ── Exploded view: display forward, battery behind it; the plateau board,
  // back glass and camera move out the back, the lens stack opening up. ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    body.display.position.z = -6 * t;
    internals.battery.position.z = -3 * t;
    internals.board.position.z = 2 * t;
    body.back.position.z = 3.6 * t;
    body.cameras.position.z = 5.4 * t;
    for (const { mesh, baseZ, spread } of lensLayers) mesh.position.z = baseZ + spread * t * 1.6;
  }

  let finishHex = airFinishes[0][1];
  function setFinish(hex) { finishHex = hex; applyFinish(M, hex); }

  setFinish(finishHex);
  setProgress(0);
  return {
    root, groups, screenMaterial, setFinish, setProgress, points,
    // The Air is portrait only; these keep the iPad-style state contract.
    setScreenOrientation() {}, state: () => ({ screen: 'portrait' }), setState() {},
    get screenOrientation() { return 'portrait'; }, get progress() { return progress; }, get finish() { return finishHex; },
  };
}
