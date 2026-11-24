import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileGeometry, perimeter } from '../casework.js';
import { glassElement, opticalCoating, lathe } from '../optics.js';
import { makeLogo } from '../exterior.js';

// iPad (A16), procedural. 1 unit = 1 cm. Apple's figures: 248.6 × 179.5 × 7.0 mm,
// 11-inch Liquid Retina display, 2360 × 1640 px at 264 ppi.
// Model frame (studio convention): long axis +Y (portrait), display faces -Z,
// back faces +Z. Seen from the front, the viewer's right is -X, so:
//   -X long edge  front camera (landscape top), volume buttons near the top
//   +X long edge  Smart Connector
//   +Y short edge top button with Touch ID (near the -X corner), speakers
//   -Y short edge USB-C, speakers
//   back          12MP camera in the top corner behind the top button, mic below
// Landscape (front camera on top) is the model rolled by -90° about Z.
export const IPAD = { W: 17.95, H: 24.86, T: 0.70 };
const W = IPAD.W, H = IPAD.H, HW = W / 2, HH = H / 2, HT = IPAD.T / 2;
const RC = 1.8;                                   // plan-view corner radius (~18 mm, measured from Apple photography)
const LIP = 0.058;                                // aluminium lip around the cover glass
// Active area from 2360 × 1640 px at 264 ppi: 22.705 × 15.779 cm.
const ACTIVE = { w: 15.779, h: 22.705, r: 0.71 };  // display corner concentric with the body (RC - bezel)
export const IPAD_ASPECT = ACTIVE.h / ACTIVE.w;   // landscape artwork aspect (2360∶1640)
const ZS = -HT - 0.0006;                          // display emission plane, just proud of the glass
const ZE = -0.045;                                // centre of the flat side band
const CAM = { x: -HW + 1.3, y: HH - 1.3 };        // rear camera centre

// Finishes: [name, swatch hex, anodized body colour, swatch shadow, swatch highlight].
// Base iPad colours first (Blue is the default), then the iPad Air colours.
export const ipadFinishes = [
  ['Blue', '#8fb3d9', '#8eb0d6', '#6f8fb5', '#c4d9ef'],
  ['Pink', '#f27a8e', '#ef7c8f', '#c95a6c', '#f9b1bc'],
  ['Yellow', '#f2dc5d', '#efd963', '#c4ad3c', '#f8ec9f'],
  ['Silver', '#e3e4e6', '#dfe0e2', '#b3b4b7', '#f5f5f6'],
  ['Space Gray', '#6e6e73', '#6c6c71', '#4b4b50', '#a2a2a7'],
  ['Starlight', '#e6e0d4', '#e3dccf', '#bcb4a5', '#f5f1e9'],
  ['Purple', '#d9d2e9', '#d6cee6', '#ada4c2', '#eee9f6'],
  ['Light Blue', '#cfe3e3', '#c9dfdf', '#9fb8b8', '#e6f2f2'],
];

// Bead-blasted anodizing: a fine random micro-normal (sparkle under a raking
// light) and a slight roughness scatter. Isotropic, unlike the brushed titanium.
let blastCache = null;
function blastMaps() {
  if (blastCache) return blastCache;
  const size = 256, n = document.createElement('canvas'), r = document.createElement('canvas');
  n.width = n.height = r.width = r.height = size;
  const nc = n.getContext('2d'), rc = r.getContext('2d');
  const ni = nc.createImageData(size, size), ri = rc.createImageData(size, size);
  let seed = 90127;
  const rand = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => (rand() + rand() + rand() - 1.5) * 0.9;
  for (let i = 0; i < size * size; i++) {
    const x = gauss() * .5, y = gauss() * .5, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    ni.data.set([(x * .5 + .5) * 255, (y * .5 + .5) * 255, (z * .5 + .5) * 255, 255], i * 4);
    const g = 236 + gauss() * 16;
    ri.data.set([g, g, g, 255], i * 4);
  }
  nc.putImageData(ni, 0, 0); rc.putImageData(ri, 0, 0);
  const normalMap = new THREE.CanvasTexture(n), roughnessMap = new THREE.CanvasTexture(r);
  for (const t of [normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5.6, 5.6); t.anisotropy = 8; }
  blastCache = { normalMap, roughnessMap };
  return blastCache;
}

function makeMaterials() {
  const blast = blastMaps();
  // Metalness below 1 lets the dyed oxide read as the soft pastel of Apple's
  // photography under the studio rig; at 1 the broad flat back mirrors the dark
  // room and turns slate.
  const anodized = (name, roughness, env, metalness = .65) => {
    const m = new THREE.MeshPhysicalMaterial({ name, color: 0x8eb0d6, metalness, roughness, ...blast,
      normalScale: new THREE.Vector2(.09, .09), clearcoat: .08, clearcoatRoughness: .5 });
    m.envMapIntensity = env; return m;
  };
  return {
    // Edges a touch smoother than the back so their highlights read brighter.
    band: anodized('Anodized aluminium edge', .36, 2.1, .8),
    back: anodized('Anodized aluminium back', .45, 2.2),
    ring: anodized('Camera ring', .3, 2.1, .8),
    button: anodized('Anodized button', .34, 2.1, .8),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Polished insignia', color: 0x8eb0d6, metalness: .85, roughness: .24, clearcoat: .4, clearcoatRoughness: .1, envMapIntensity: 2.4 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x030304, metalness: .2, roughness: .2, clearcoat: .8, clearcoatRoughness: .04 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x050506, metalness: .2, roughness: .8 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Button gap', color: 0x15161a, metalness: .5, roughness: .5 }),
    contact: new THREE.MeshStandardMaterial({ name: 'Smart Connector contact', color: 0x3c3d41, metalness: .9, roughness: .3 }),
    lensDark: new THREE.MeshPhysicalMaterial({ name: 'Lens window', color: 0x010102, metalness: 0, roughness: .22, specularIntensity: .4, clearcoat: .35, clearcoatRoughness: .05, envMapIntensity: .12 }),
    frontCam: new THREE.MeshStandardMaterial({ name: 'Front camera window', color: 0x0c0d11, metalness: .3, roughness: .3 }),
  };
}

function applyFinish(M, hex) {
  const known = ipadFinishes.find(f => f[1].toLowerCase() === hex.toLowerCase());
  const body = new THREE.Color(known ? known[2] : hex);
  const hsl = {}; body.getHSL(hsl);
  M.band.color.copy(body); M.back.color.copy(body); M.button.color.copy(body);
  M.ring.color.copy(body).multiplyScalar(.96);
  // Polished logo: same hue, a little deeper so it reads against the satin back.
  M.logo.color.copy(body).multiplyScalar(hsl.l > .7 ? .74 : .86);
  M.contact.color.copy(body).multiplyScalar(.45);
}

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
// Orient a local (along, across, outward) frame onto an edge of the body.
function edgeBasis(mesh, along, outward) {
  const a = new THREE.Vector3(...along), o = new THREE.Vector3(...outward), c = new THREE.Vector3().crossVectors(o, a);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, c, o));
}
function edgeButton(parent, M, name, len, center, along, outward) {
  const across = .26, proud = .032;
  const g = new THREE.ExtrudeGeometry(stadium(len, across), { depth: proud, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 18 });
  g.translate(0, 0, -.016);
  const button = new THREE.Mesh(g, M.button); button.name = name;
  edgeBasis(button, along, outward); button.position.set(...center); parent.add(button);
  const gap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(len + .05, across + .05), 18), M.seam); gap.name = name + ' gap';
  edgeBasis(gap, along, outward); gap.position.set(center[0] + outward[0] * .0012, center[1] + outward[1] * .0012, center[2]); parent.add(gap);
  return button;
}
// A row of acoustic holes merged into one mesh (cylinders along Y).
function grille(parent, M, name, x0, x1, y, step = .115, r = .029) {
  const geos = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) {
    const g = new THREE.CylinderGeometry(r, r, .04, 14); g.translate(x, y - Math.sign(y) * .0165, ZE); geos.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), M.dark); mesh.name = name; parent.add(mesh); return mesh;
}

function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}

// One complete exterior. Used for the studio device and, with its own
// materials, for the colour line-up clones.
function buildBody(M, screenMaterial) {
  const g = { frame: new THREE.Group(), back: new THREE.Group(), display: new THREE.Group(), cameras: new THREE.Group() };
  g.frame.name = 'Aluminium enclosure'; g.back.name = 'Rear panel'; g.display.name = 'Display stack'; g.cameras.name = 'Rear camera';

  // Side band: a closed cross-section loop from the lip under the cover glass,
  // over the flat side, round the soft back edge to the rear panel seam, and
  // back along the inside wall. Tiny offsets keep the creases hard.
  const BAND = [
    [.0585, -.300], [.0585, -.3455], [.050, -.350], [.030, -.350], [.014, -.3465], [.005, -.3365], [.001, -.319], [0, -.29],
    [0, .20], [.004, .245], [.014, .285], [.032, .318], [.058, .340], [.092, .349], [.13, .35], [.1301, .35],
    [.134, .29], [.40, .27], [.40, -.29],
  ];
  const band = new THREE.Mesh(profileGeometry(W, H, RC, BAND, true), M.band); band.name = 'Aluminium side band'; g.frame.add(band);

  const backPlate = new THREE.Mesh(profileGeometry(W, H, RC, [[.13, .28], [.13, .35]]), M.back); backPlate.name = 'Rear panel'; g.back.add(backPlate);
  const logo = makeLogo(M.logo); logo.scale.setScalar(2.0); logo.position.set(0, 0, .3504); g.back.add(logo);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(.048, .048, .03, 24), M.dark); mic.rotation.x = Math.PI / 2;
  mic.position.set(CAM.x, CAM.y - 1.05, .3445); mic.name = 'Rear microphone'; g.back.add(mic);

  // Cover glass flush with the lip, display on its inner face.
  const glass = new THREE.Mesh(profileGeometry(W - 2 * LIP, H - 2 * LIP, RC - LIP, [[0, -.27], [0, -.343], [.004, -.3485], [.010, -.35]]), M.glass);
  glass.name = 'Cover glass'; g.display.add(glass);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display'); g.display.add(screen);
  // Landscape front camera, centred in the -X bezel, with the ambient light sensor.
  const fx = -(ACTIVE.w / 2 + (W - ACTIVE.w) / 4);
  const camWin = new THREE.Mesh(new THREE.CircleGeometry(.12, 40), M.frontCam); camWin.rotation.y = Math.PI;
  camWin.position.set(fx, 0, ZS - .0002); camWin.name = 'Front camera'; g.display.add(camWin);
  const camLens = glassElement('Front camera lens', .065, .006, opticalCoating(1)); camLens.rotation.y = Math.PI;
  camLens.position.set(fx, 0, ZS - .0006); g.display.add(camLens);
  const als = new THREE.Mesh(new THREE.CircleGeometry(.04, 24), M.frontCam); als.rotation.y = Math.PI;
  als.position.set(fx, -.62, ZS - .0002); als.name = 'Ambient light sensor'; g.display.add(als);

  // Rear camera: raised, colour-matched ring with a black lens window.
  const ringProfile = [[.385, .30], [.47, .30], [.47, .352], [.474, .362], [.472, .395], [.463, .425], [.447, .441], [.425, .448], [.405, .448], [.39, .444], [.385, .436], [.385, .30]];
  const ring = lathe('Camera ring', ringProfile, M.ring); ring.position.set(CAM.x, CAM.y, 0); g.cameras.add(ring);
  const win = new THREE.Mesh(new THREE.CylinderGeometry(.386, .386, .01, 64), M.lensDark); win.rotation.x = Math.PI / 2;
  win.position.set(CAM.x, CAM.y, .436); win.name = 'Lens window'; g.cameras.add(win);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(.24, .012, 8, 64), M.seam); inner.position.set(CAM.x, CAM.y, .442); inner.name = 'Lens retainer'; g.cameras.add(inner);
  const lens = glassElement('12MP Wide lens', .2, .012, opticalCoating(1)); lens.position.set(CAM.x, CAM.y, .441); g.cameras.add(lens);

  // Edge hardware.
  edgeButton(g.frame, M, 'Top button (Touch ID)', 1.9, [-HW + 2.35, HH, ZE], [1, 0, 0], [0, 1, 0]);
  edgeButton(g.frame, M, 'Volume up', 1.0, [-HW, HH - 2.73, ZE], [0, 1, 0], [-1, 0, 0]);
  edgeButton(g.frame, M, 'Volume down', 1.0, [-HW, HH - 3.93, ZE], [0, 1, 0], [-1, 0, 0]);
  const port = new THREE.Mesh(profileGeometry(.89, .30, .145, [[0, -.035], [0, .004]]), M.dark);
  port.rotation.x = Math.PI / 2; port.position.set(0, -HH, ZE); port.name = 'USB-C port'; g.frame.add(port);
  grille(g.frame, M, 'Bottom speaker grille', -6.6, -1.4, -HH); grille(g.frame, M, 'Bottom speaker grille', 1.4, 6.6, -HH);
  grille(g.frame, M, 'Top speaker grille', -4.9, -1.12, HH); grille(g.frame, M, 'Top speaker grille', 1.4, 6.6, HH);
  grille(g.frame, M, 'Top microphone', .14, .14, HH, .14, .026);
  for (const y of [-.25, 0, .25]) {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .03, 20), M.contact); dot.rotation.z = Math.PI / 2;
    dot.position.set(HW - .0125, y, ZE); dot.name = 'Smart Connector contact'; g.frame.add(dot);
  }
  return g;
}

function buildInternals() {
  const battery = new THREE.Group(); battery.name = 'Battery';
  const board = new THREE.Group(); board.name = 'Logic board';
  const foil = new THREE.MeshPhysicalMaterial({ name: 'Battery foil', color: 0xb8bbc1, metalness: .65, roughness: .42 });
  const label = new THREE.MeshStandardMaterial({ name: 'Battery label', color: 0x1a1b1e, roughness: .7 });
  const pcb = new THREE.MeshStandardMaterial({ name: 'Circuit board', color: 0x16201b, roughness: .62, metalness: .2 });
  const shield = new THREE.MeshPhysicalMaterial({ name: 'Shield can', color: 0xa9abb0, metalness: .9, roughness: .32 });
  const chip = new THREE.MeshStandardMaterial({ name: 'Silicon package', color: 0x0d0e10, roughness: .45, metalness: .3 });
  const spk = new THREE.MeshStandardMaterial({ name: 'Speaker module', color: 0x1b1c1f, roughness: .7 });
  const box = (w, h, d, mat, x, y, z, parent, name) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.name = name; parent.add(m); return m; };
  for (const [i, x] of [[1, -2.35], [2, 4.25]]) {
    box(6.4, 17.2, .4, foil, x, .2, .03, battery, 'Battery cell ' + i);
    box(4.2, 3.2, .002, label, x, 1.6, -.171, battery, 'Cell label');
  }
  box(1.9, 19.5, .1, pcb, -7.15, 1.3, .1, board, 'Main board');
  box(1.5, 3.1, .12, shield, -7.15, 6.2, -.01, board, 'SoC shield');
  box(1.4, 2.0, .12, shield, -7.15, 2.6, -.01, board, 'Memory shield');
  box(1.3, 1.6, .1, shield, -7.15, -.4, 0, board, 'Wireless shield');
  box(.8, .8, .06, chip, -7.0, -3.1, .02, board, 'Power management IC');
  box(1.0, .9, .1, chip, -7.4, 9.6, .02, board, 'Camera module');
  for (const [x, y] of [[-6.2, 11.3], [6.2, 11.3], [-6.2, -11.3], [6.2, -11.3]]) box(2.6, .9, .42, spk, x, y, .02, board, 'Speaker module');
  box(1.4, .5, .25, shield, 0, -11.55, 0, board, 'USB-C module');
  return { battery, board };
}

export function createIpad() {
  const root = new THREE.Group(); root.name = 'iPad (A16)';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  const body = buildBody(M, screenMaterial);
  const internals = buildInternals();
  root.add(body.frame, body.back, body.display, body.cameras, internals.battery, internals.board);
  const groups = { display: body.display, frame: body.frame, back: body.back, cameras: body.cameras, battery: internals.battery, board: internals.board };
  const screen = body.display.getObjectByName('Active display');

  // ── Screen UVs: landscape (front camera on top) or portrait upright ──
  // Artwork is always landscape 2360∶1640. Portrait shows its centre, uncropped
  // vertically and unstretched.
  // Pass { artwork: 'portrait' } when the loaded artwork itself is portrait
  // (1640∶2360); portrait then maps it 1:1 instead of centre-cropping.
  let screenMode = 'landscape', artworkMode = 'landscape';
  // Optional portrait artwork for the upright display (a texture made by the
  // studio from the current preset). While the display is portrait it replaces
  // the landscape artwork, whose map is kept in `artMap` and restored after.
  let portraitTex = null, artMap = null;
  function captureArt() { if (screenMaterial.map && screenMaterial.map !== portraitTex) artMap = screenMaterial.map; }
  function setPortraitArt(canvas) {
    captureArt();
    portraitTex?.dispose();
    portraitTex = canvas ? new THREE.CanvasTexture(canvas) : null;
    if (portraitTex) { portraitTex.colorSpace = THREE.SRGBColorSpace; portraitTex.anisotropy = 8; }
    setScreenOrientation(screenMode);
  }
  function setScreenOrientation(mode = 'landscape', { artwork = artworkMode } = {}) {
    screenMode = mode === 'portrait' ? 'portrait' : 'landscape';
    artworkMode = artwork === 'portrait' ? 'portrait' : 'landscape';
    captureArt();
    const upright = screenMode === 'portrait' && !!portraitTex;
    const map = upright ? portraitTex : artMap;
    if (map && screenMaterial.map !== map) { screenMaterial.map = map; screenMaterial.needsUpdate = true; }
    const art = upright ? 'portrait' : artworkMode;
    const uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
    const s = art === 'portrait' ? 1 : (ACTIVE.w / ACTIVE.h) / IPAD_ASPECT;
    for (let i = 0; i < uv.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      if (screenMode === 'landscape' && art === 'portrait') uv.setXY(i, (ACTIVE.w / 2 - x) / ACTIVE.w, (y + ACTIVE.h / 2) / ACTIVE.h);
      else if (screenMode === 'landscape') uv.setXY(i, (ACTIVE.h / 2 - y) / ACTIVE.h, (ACTIVE.w / 2 - x) / ACTIVE.w);
      else uv.setXY(i, .5 + ((ACTIVE.w / 2 - x) / ACTIVE.w - .5) * s, (y + ACTIVE.h / 2) / ACTIVE.h);
    }
    uv.needsUpdate = true;
  }
  setScreenOrientation('landscape');

  // ── Anchors ──
  const anchors = {
    array: anchor(body.cameras, 'array', CAM.x, CAM.y, .45, [0, 0, 1]),
    main: anchor(body.cameras, 'main', CAM.x, CAM.y, .45, [0, 0, 1]),
    flash: anchor(body.back, 'rear microphone', CAM.x, CAM.y - 1.05, .36, [0, 0, 1]),
    island: anchor(body.display, 'front camera', -(ACTIVE.w / 2 + (W - ACTIVE.w) / 4), 0, -.351, [0, 0, -1]),
    usb: anchor(body.frame, 'usb', 0, -HH, ZE, [0, -1, 0]),
    // `control` (the 18 Pro's Camera Control moves) maps to the volume buttons:
    // those moves are authored for a side-edge button seen from the side.
    control: anchor(body.frame, 'volume buttons', -HW - .03, HH - 3.33, ZE, [-1, 0, 0]),
    volume: anchor(body.frame, 'volume buttons', -HW - .03, HH - 3.33, ZE, [-1, 0, 0]),
    topButton: anchor(body.frame, 'top button', -HW + 2.35, HH + .03, ZE, [0, 1, 0]),
    action: anchor(body.frame, 'edge high', -HW, HH - 3.33, ZE, [-1, 0, 0]),
    railLow: anchor(body.frame, 'edge low', -HW, -HH + 4.5, ZE, [-1, 0, 0]),
    connector: anchor(body.frame, 'smart connector', HW, 0, ZE, [1, 0, 0]),
    center: anchor(root, 'center', 0, 0, 0, null),
  };
  // Screen anchors in the display's reading frame (fractions of half extents).
  const SCREEN = {
    scrTop: [0, .74], scrUpper: [0, .385], scrMid: [0, 0], scrLower: [0, -.385], scrBottom: [0, -.74],
    scrTL: [-.65, .715], scrTR: [.65, .715], scrBL: [-.65, -.715], scrBR: [.65, -.715], scrLeft: [-.62, .08], scrRight: [.62, -.08],
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
    // Viewer's right and up on the display, in the model frame.
    const land = screenMode === 'landscape';
    const right = land ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(-1, 0, 0);
    const up = land ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const hr = (land ? ACTIVE.h : ACTIVE.w) / 2, hu = (land ? ACTIVE.w : ACTIVE.h) / 2;
    const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(root.matrixWorld);
    const nModel = new THREE.Vector3(0, 0, -1).applyQuaternion(root.getWorldQuaternion(q)).applyQuaternion(mq).normalize();
    for (const [key, [fr, fu]] of Object.entries(SCREEN)) {
      const p = new THREE.Vector3().addScaledVector(right, fr * hr).addScaledVector(up, fu * hu);
      p.z = -.351 + body.display.position.z;
      out[key] = { p: p.applyMatrix4(toModel), n: nModel.clone() };
    }
    return out;
  }

  // ── Exploded view: display stack forward, board and cells out between,
  // rear panel and camera ring back. ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    body.display.position.z = -7.2 * t;
    internals.board.position.z = -4.5 * t;
    internals.battery.position.z = -2.2 * t;
    body.back.position.z = 3.4 * t;
    body.cameras.position.z = 5.6 * t;
  }

  // ── Colour line-up (Fanned colours view): three more iPads behind the
  // studio device, fanned about the lower corner, backs to the camera. ──
  const lineup = new THREE.Group(); lineup.name = 'Colour line-up'; lineup.visible = false; root.add(lineup);
  const clones = [];
  function ensureLineup() {
    if (clones.length) return;
    const pivot = new THREE.Vector3(HW - 1.6, -HH + 1.6, 0);
    for (let i = 1; i <= 3; i++) {
      const m = makeMaterials(), b = buildBody(m, screenMaterial), dev = new THREE.Group(), turn = new THREE.Group();
      dev.name = 'Line-up iPad ' + i; dev.add(b.frame, b.back, b.display, b.cameras);
      dev.position.set(-pivot.x, -pivot.y, 0); turn.add(dev);
      turn.position.set(pivot.x, pivot.y, -1.05 * i); turn.rotation.z = .3 * i;
      lineup.add(turn); clones.push(m);
    }
  }
  let finishHex = ipadFinishes[0][1];
  function colourLineup() {
    const base = ipadFinishes.slice(0, 4).map(f => f[1]).filter(h => h.toLowerCase() !== finishHex.toLowerCase());
    clones.forEach((m, i) => applyFinish(m, base[i % base.length]));
  }
  function setLineup(on) { if (on) { ensureLineup(); colourLineup(); } lineup.visible = !!on; }

  function setFinish(hex) { finishHex = hex; applyFinish(M, hex); if (clones.length) colourLineup(); }

  setFinish(ipadFinishes[0][1]);
  setProgress(0);
  return {
    root, groups, screenMaterial, setFinish, setProgress, points, setScreenOrientation, setLineup, setPortraitArt,
    state: () => ({ screen: screenMode, artwork: artworkMode, lineup: lineup.visible }),
    setState(s) { setScreenOrientation(s.screen, { artwork: s.artwork }); setLineup(s.lineup); },
    get screenOrientation() { return screenMode; }, get progress() { return progress; },
  };
}
