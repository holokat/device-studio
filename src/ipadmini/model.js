import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileGeometry, perimeter } from '../casework.js';
import { glassElement, opticalCoating, lathe } from '../optics.js';
import { makeLogo } from '../exterior.js';

// iPad mini (A17 Pro), procedural. 1 unit = 1 cm. Apple's figures: 195.4 × 134.8 × 6.3 mm,
// 8.3-inch Liquid Retina display, 2266 × 1488 px at 326 ppi.
// Built from src/ipad/model.js with the mini's constants; same contract, same
// model frame (studio convention): long axis +Y (portrait), display faces -Z,
// back faces +Z. Seen from the front, the viewer's right is -X, so:
//   -X long edge  front camera in its bezel (landscape top), volume buttons near
//                 the top, Apple Pencil magnetic connector centred
//   +Y short edge top button with Touch ID (near the -X corner), speakers
//   -Y short edge USB-C, speakers
//   back          12MP Wide camera in the top corner behind the top button, with
//                 the microphone and True Tone flash in a row beside it
// Landscape (front camera on top) is the model rolled by -90° about Z.
export const IPAD_MINI = { W: 13.48, H: 19.54, T: 0.63 };
const W = IPAD_MINI.W, H = IPAD_MINI.H, HW = W / 2, HH = H / 2, HT = IPAD_MINI.T / 2;
const SZ = HT / .35;                              // depth scale from the 7.0 mm iPad sections
const RC = 1.3;                                   // plan-view corner radius
const LIP = 0.052;                                // aluminium lip around the cover glass
// Active area from 2266 × 1488 px at 326 ppi: 17.655 × 11.594 cm (8.3" diagonal),
// which leaves a uniform ~9.4 mm border (black mask plus lip) on all four sides.
const ACTIVE = { w: 11.594, h: 17.655, r: 0.36 };  // display corner concentric with the body (RC - bezel)
export const IPAD_MINI_ASPECT = ACTIVE.h / ACTIVE.w; // landscape artwork aspect (2266∶1488)
const ZS = -HT - 0.0006;                          // display emission plane, just proud of the glass
const ZE = -0.045 * SZ;                           // centre of the flat side band
const CAM = { x: -HW + 1.12, y: HH - 1.12 };      // rear camera centre
const FLASH = { x: CAM.x + 1.02, y: CAM.y };      // True Tone flash, beside the lens
const MIC = { x: CAM.x + .62, y: CAM.y };         // rear microphone, between the two
const FX = -(ACTIVE.w / 2 + (W - ACTIVE.w) / 4);  // front camera, centred in the -X bezel
const PENCIL = { y: -.6, len: 7.2 };              // Apple Pencil magnetic connector on the -X edge

// Finishes: [name, swatch hex, anodized body colour, swatch shadow, swatch highlight].
// Space Gray is the default.
export const ipadMiniFinishes = [
  ['Space Gray', '#6b6c70', '#696a6f', '#48494d', '#a0a1a6'],
  ['Blue', '#a8b8cb', '#a4b4c8', '#7c8ca1', '#d2dce9'],
  ['Purple', '#cbc2da', '#c8bed8', '#9f96b2', '#e6e0ee'],
  ['Starlight', '#e6e0d4', '#e3dccf', '#bcb4a5', '#f5f1e9'],
];

// Bead-blasted anodizing: a fine random micro-normal (sparkle under a raking
// light) and a slight roughness scatter. Same recipe as the iPad, tiled for the
// smaller panel so the grain stays the same physical size.
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
  for (const t of [normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4.4, 4.4); t.anisotropy = 8; }
  blastCache = { normalMap, roughnessMap };
  return blastCache;
}

function makeMaterials() {
  const blast = blastMaps();
  // Metalness below 1 keeps the dyed oxide soft under the studio rig (see the iPad).
  const anodized = (name, roughness, env, metalness = .65) => {
    const m = new THREE.MeshPhysicalMaterial({ name, color: 0x696a6f, metalness, roughness, ...blast,
      normalScale: new THREE.Vector2(.09, .09), clearcoat: .08, clearcoatRoughness: .5 });
    m.envMapIntensity = env; return m;
  };
  return {
    band: anodized('Anodized aluminium edge', .36, 2.1, .8),
    back: anodized('Anodized aluminium back', .45, 2.2),
    ring: anodized('Camera ring', .3, 2.1, .8),
    button: anodized('Anodized button', .34, 2.1, .8),
    // Pencil connector window: the same oxide, a shade lighter and smoother.
    pencil: anodized('Apple Pencil connector', .3, 2.2, .7),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Polished insignia', color: 0x696a6f, metalness: .85, roughness: .24, clearcoat: .4, clearcoatRoughness: .1, envMapIntensity: 2.4 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x030304, metalness: .2, roughness: .2, clearcoat: .8, clearcoatRoughness: .04 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x050506, metalness: .2, roughness: .8 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Button gap', color: 0x15161a, metalness: .5, roughness: .5 }),
    lensDark: new THREE.MeshPhysicalMaterial({ name: 'Lens window', color: 0x010102, metalness: 0, roughness: .22, specularIntensity: .4, clearcoat: .35, clearcoatRoughness: .05, envMapIntensity: .12 }),
    flash: new THREE.MeshPhysicalMaterial({ name: 'True Tone flash', color: 0xd9d4c4, metalness: 0, roughness: .38, clearcoat: .7, clearcoatRoughness: .08, envMapIntensity: .8 }),
    frontCam: new THREE.MeshStandardMaterial({ name: 'Front camera window', color: 0x0c0d11, metalness: .3, roughness: .3 }),
  };
}

function applyFinish(M, hex) {
  const known = ipadMiniFinishes.find(f => f[1].toLowerCase() === hex.toLowerCase());
  const body = new THREE.Color(known ? known[2] : hex);
  const hsl = {}; body.getHSL(hsl);
  M.band.color.copy(body); M.back.color.copy(body); M.button.color.copy(body);
  M.ring.color.copy(body).multiplyScalar(.96);
  M.pencil.color.copy(body).lerp(new THREE.Color(0xffffff), hsl.l > .7 ? .12 : .1);
  M.logo.color.copy(body).multiplyScalar(hsl.l > .7 ? .74 : .86);
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
function edgeBasis(mesh, along, outward) {
  const a = new THREE.Vector3(...along), o = new THREE.Vector3(...outward), c = new THREE.Vector3().crossVectors(o, a);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, c, o));
}
function edgeButton(parent, M, name, len, center, along, outward) {
  const across = .24, proud = .03;
  const g = new THREE.ExtrudeGeometry(stadium(len, across), { depth: proud, bevelEnabled: true, bevelThickness: .011, bevelSize: .011, bevelSegments: 3, curveSegments: 18 });
  g.translate(0, 0, -.016);
  const button = new THREE.Mesh(g, M.button); button.name = name;
  edgeBasis(button, along, outward); button.position.set(...center); parent.add(button);
  const gap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(len + .045, across + .045), 18), M.seam); gap.name = name + ' gap';
  edgeBasis(gap, along, outward); gap.position.set(center[0] + outward[0] * .0012, center[1] + outward[1] * .0012, center[2]); parent.add(gap);
  return button;
}
// A row of acoustic holes merged into one mesh (cylinders along Y).
function grille(parent, M, name, x0, x1, y, step = .11, r = .027) {
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
  const z = v => v * SZ;

  // Side band: the iPad's closed cross-section, its depths scaled to 6.3 mm.
  const BAND = [
    [.0525, -.300], [.0525, -.3455], [.046, -.350], [.028, -.350], [.013, -.3465], [.005, -.3365], [.001, -.319], [0, -.29],
    [0, .20], [.004, .245], [.013, .285], [.029, .318], [.053, .340], [.084, .349], [.12, .35], [.1201, .35],
    [.124, .29], [.36, .27], [.36, -.29],
  ].map(([i, d]) => [i, z(d)]);
  const band = new THREE.Mesh(profileGeometry(W, H, RC, BAND, true), M.band); band.name = 'Aluminium side band'; g.frame.add(band);

  const backPlate = new THREE.Mesh(profileGeometry(W, H, RC, [[.12, z(.28)], [.12, HT]]), M.back); backPlate.name = 'Rear panel'; g.back.add(backPlate);
  const logo = makeLogo(M.logo); logo.scale.setScalar(1.6); logo.position.set(0, 0, HT + .0004); g.back.add(logo);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .03, 24), M.dark); mic.rotation.x = Math.PI / 2;
  mic.position.set(MIC.x, MIC.y, HT - .0055); mic.name = 'Rear microphone'; g.back.add(mic);

  // Cover glass flush with the lip, display on its inner face.
  const glass = new THREE.Mesh(profileGeometry(W - 2 * LIP, H - 2 * LIP, RC - LIP, [[0, z(-.27)], [0, z(-.343)], [.004, z(-.3485)], [.009, -HT]]), M.glass);
  glass.name = 'Cover glass'; g.display.add(glass);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display'); g.display.add(screen);
  // Front camera centred in the -X bezel (landscape top), ambient light sensor beside it.
  const camWin = new THREE.Mesh(new THREE.CircleGeometry(.11, 40), M.frontCam); camWin.rotation.y = Math.PI;
  camWin.position.set(FX, 0, ZS - .0002); camWin.name = 'Front camera'; g.display.add(camWin);
  const camLens = glassElement('Front camera lens', .06, .006, opticalCoating(1)); camLens.rotation.y = Math.PI;
  camLens.position.set(FX, 0, ZS - .0006); g.display.add(camLens);
  const als = new THREE.Mesh(new THREE.CircleGeometry(.036, 24), M.frontCam); als.rotation.y = Math.PI;
  als.position.set(FX, -.52, ZS - .0002); als.name = 'Ambient light sensor'; g.display.add(als);

  // Rear camera: raised, colour-matched ring with a black lens window (the
  // iPad's ring at ~90 % size, seated on the thinner back).
  const dz = HT - .35, k = .9;
  const ringProfile = [[.385, .30], [.47, .30], [.47, .352], [.474, .362], [.472, .395], [.463, .425], [.447, .441], [.425, .448], [.405, .448], [.39, .444], [.385, .436], [.385, .30]]
    .map(([r, d]) => [r * k, d + dz]);
  const ring = lathe('Camera ring', ringProfile, M.ring); ring.position.set(CAM.x, CAM.y, 0); g.cameras.add(ring);
  const top = .436 + dz;
  const win = new THREE.Mesh(new THREE.CylinderGeometry(.386 * k, .386 * k, .01, 64), M.lensDark); win.rotation.x = Math.PI / 2;
  win.position.set(CAM.x, CAM.y, top); win.name = 'Lens window'; g.cameras.add(win);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(.24 * k, .011, 8, 64), M.seam); inner.position.set(CAM.x, CAM.y, top + .006); inner.name = 'Lens retainer'; g.cameras.add(inner);
  const lens = glassElement('12MP Wide lens', .2 * k, .011, opticalCoating(1)); lens.position.set(CAM.x, CAM.y, top + .005); g.cameras.add(lens);
  // True Tone flash: a flush, frosted window in the rear panel beside the lens.
  const flashRim = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .012, 40), M.seam); flashRim.rotation.x = Math.PI / 2;
  flashRim.position.set(FLASH.x, FLASH.y, HT - .004); flashRim.name = 'Flash surround'; g.back.add(flashRim);
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(.145, .145, .012, 40), M.flash); flash.rotation.x = Math.PI / 2;
  flash.position.set(FLASH.x, FLASH.y, HT - .003); flash.name = 'True Tone flash'; g.back.add(flash);

  // Edge hardware.
  edgeButton(g.frame, M, 'Top button (Touch ID)', 1.9, [-HW + 2.2, HH, ZE], [1, 0, 0], [0, 1, 0]);
  edgeButton(g.frame, M, 'Volume up', .9, [-HW, HH - 2.25, ZE], [0, 1, 0], [-1, 0, 0]);
  edgeButton(g.frame, M, 'Volume down', .9, [-HW, HH - 3.3, ZE], [0, 1, 0], [-1, 0, 0]);
  // Apple Pencil magnetic connector: a long, slightly recessed pill on the flat band.
  const pencil = new THREE.Mesh(new THREE.ShapeGeometry(stadium(PENCIL.len, .2), 24), M.pencil);
  edgeBasis(pencil, [0, 1, 0], [-1, 0, 0]); pencil.position.set(-HW - .0006, PENCIL.y, ZE); pencil.name = 'Apple Pencil magnetic connector'; g.frame.add(pencil);
  const pencilGap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(PENCIL.len + .02, .22), 24), M.seam);
  edgeBasis(pencilGap, [0, 1, 0], [-1, 0, 0]); pencilGap.position.set(-HW - .0003, PENCIL.y, ZE); pencilGap.name = 'Apple Pencil connector seam'; g.frame.add(pencilGap);

  const port = new THREE.Mesh(profileGeometry(.89, .30, .145, [[0, -.035], [0, .004]]), M.dark);
  port.rotation.x = Math.PI / 2; port.position.set(0, -HH, ZE); port.name = 'USB-C port'; g.frame.add(port);
  grille(g.frame, M, 'Bottom speaker grille', -4.6, -1.2, -HH); grille(g.frame, M, 'Bottom speaker grille', 1.2, 4.6, -HH);
  grille(g.frame, M, 'Top speaker grille', -2.9, -.6, HH); grille(g.frame, M, 'Top speaker grille', 1.2, 4.6, HH);
  grille(g.frame, M, 'Top microphone', .3, .3, HH, .14, .024);
  return g;
}

// Illustrative interior, the iPad's layout scaled to the mini.
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
  for (const [i, x] of [[1, -1.75], [2, 3.1]]) {
    box(4.6, 13.6, .36, foil, x, .15, .03, battery, 'Battery cell ' + i);
    box(3.0, 2.4, .002, label, x, 1.3, -.151, battery, 'Cell label');
  }
  box(1.5, 14.8, .09, pcb, -5.55, .6, .09, board, 'Main board');
  box(1.2, 2.4, .11, shield, -5.55, 5.0, -.01, board, 'SoC shield');
  box(1.1, 1.6, .11, shield, -5.55, 2.2, -.01, board, 'Memory shield');
  box(1.0, 1.3, .09, shield, -5.55, -.3, 0, board, 'Wireless shield');
  box(.65, .65, .05, chip, -5.45, -2.5, .02, board, 'Power management IC');
  box(.7, .8, .09, chip, -5.65, 8.4, .02, board, 'Camera module');
  for (const [x, y] of [[-4.2, 8.85], [4.2, 8.85], [-4.2, -8.85], [4.2, -8.85]]) box(2.0, .75, .38, spk, x, y, .02, board, 'Speaker module');
  box(1.3, .45, .23, shield, 0, -9.05, 0, board, 'USB-C module');
  return { battery, board };
}

export function createIpadMini() {
  const root = new THREE.Group(); root.name = 'iPad mini (A17 Pro)';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  const body = buildBody(M, screenMaterial);
  const internals = buildInternals();
  root.add(body.frame, body.back, body.display, body.cameras, internals.battery, internals.board);
  const groups = { display: body.display, frame: body.frame, back: body.back, cameras: body.cameras, battery: internals.battery, board: internals.board };
  const screen = body.display.getObjectByName('Active display');

  // ── Screen UVs: landscape (front camera on top) or portrait upright ──
  // Identical convention to the iPad: artwork is landscape 2266∶1488, mapped
  // 0..1 upright in landscape. Portrait shows its centre, uncropped vertically
  // and unstretched, or maps portrait artwork 1:1 ({ artwork: 'portrait' } or
  // setPortraitArt()).
  let screenMode = 'landscape', artworkMode = 'landscape';
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
    const s = art === 'portrait' ? 1 : (ACTIVE.w / ACTIVE.h) / IPAD_MINI_ASPECT;
    for (let i = 0; i < uv.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      if (screenMode === 'landscape' && art === 'portrait') uv.setXY(i, (ACTIVE.w / 2 - x) / ACTIVE.w, (y + ACTIVE.h / 2) / ACTIVE.h);
      else if (screenMode === 'landscape') uv.setXY(i, (ACTIVE.h / 2 - y) / ACTIVE.h, (ACTIVE.w / 2 - x) / ACTIVE.w);
      else uv.setXY(i, .5 + ((ACTIVE.w / 2 - x) / ACTIVE.w - .5) * s, (y + ACTIVE.h / 2) / ACTIVE.h);
    }
    uv.needsUpdate = true;
  }
  setScreenOrientation('landscape');

  // ── Anchors (same keys as the iPad) ──
  const ZB = HT + .1;                               // just above the camera ring
  const anchors = {
    array: anchor(body.cameras, 'array', CAM.x, CAM.y, ZB, [0, 0, 1]),
    main: anchor(body.cameras, 'main', CAM.x, CAM.y, ZB, [0, 0, 1]),
    flash: anchor(body.back, 'flash', FLASH.x, FLASH.y, HT + .01, [0, 0, 1]),
    island: anchor(body.display, 'front camera', FX, 0, -HT - .001, [0, 0, -1]),
    usb: anchor(body.frame, 'usb', 0, -HH, ZE, [0, -1, 0]),
    // `control` (the 18 Pro's Camera Control moves) maps to the volume buttons.
    control: anchor(body.frame, 'volume buttons', -HW - .03, HH - 2.78, ZE, [-1, 0, 0]),
    volume: anchor(body.frame, 'volume buttons', -HW - .03, HH - 2.78, ZE, [-1, 0, 0]),
    topButton: anchor(body.frame, 'top button', -HW + 2.2, HH + .03, ZE, [0, 1, 0]),
    action: anchor(body.frame, 'edge high', -HW, HH - 2.78, ZE, [-1, 0, 0]),
    railLow: anchor(body.frame, 'edge low', -HW, -HH + 3.5, ZE, [-1, 0, 0]),
    connector: anchor(body.frame, 'pencil connector', -HW, PENCIL.y, ZE, [-1, 0, 0]),
    center: anchor(root, 'center', 0, 0, 0, null),
  };
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
    const land = screenMode === 'landscape';
    const right = land ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(-1, 0, 0);
    const up = land ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const hr = (land ? ACTIVE.h : ACTIVE.w) / 2, hu = (land ? ACTIVE.w : ACTIVE.h) / 2;
    const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(root.matrixWorld);
    const nModel = new THREE.Vector3(0, 0, -1).applyQuaternion(root.getWorldQuaternion(q)).applyQuaternion(mq).normalize();
    for (const [key, [fr, fu]] of Object.entries(SCREEN)) {
      const p = new THREE.Vector3().addScaledVector(right, fr * hr).addScaledVector(up, fu * hu);
      p.z = -HT - .001 + body.display.position.z;
      out[key] = { p: p.applyMatrix4(toModel), n: nModel.clone() };
    }
    return out;
  }

  // ── Exploded view: display stack forward, board and cells out between,
  // rear panel and camera back. ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    body.display.position.z = -5.8 * t;
    internals.board.position.z = -3.6 * t;
    internals.battery.position.z = -1.8 * t;
    body.back.position.z = 2.7 * t;
    body.cameras.position.z = 4.5 * t;
  }

  // ── Colour line-up: the other three finishes fanned behind the studio device. ──
  const lineup = new THREE.Group(); lineup.name = 'Colour line-up'; lineup.visible = false; root.add(lineup);
  const clones = [];
  function ensureLineup() {
    if (clones.length) return;
    const pivot = new THREE.Vector3(HW - 1.2, -HH + 1.2, 0);
    for (let i = 1; i <= 3; i++) {
      const m = makeMaterials(), b = buildBody(m, screenMaterial), dev = new THREE.Group(), turn = new THREE.Group();
      dev.name = 'Line-up iPad mini ' + i; dev.add(b.frame, b.back, b.display, b.cameras);
      dev.position.set(-pivot.x, -pivot.y, 0); turn.add(dev);
      turn.position.set(pivot.x, pivot.y, -.95 * i); turn.rotation.z = .3 * i;
      lineup.add(turn); clones.push(m);
    }
  }
  let finishHex = ipadMiniFinishes[0][1];
  function colourLineup() {
    const base = ipadMiniFinishes.map(f => f[1]).filter(h => h.toLowerCase() !== finishHex.toLowerCase());
    clones.forEach((m, i) => applyFinish(m, base[i % base.length]));
  }
  function setLineup(on) { if (on) { ensureLineup(); colourLineup(); } lineup.visible = !!on; }

  function setFinish(hex) { finishHex = hex; applyFinish(M, hex); if (clones.length) colourLineup(); }

  setFinish(ipadMiniFinishes[0][1]);
  setProgress(0);
  return {
    root, groups, screenMaterial, setFinish, setProgress, points, setScreenOrientation, setLineup, setPortraitArt,
    state: () => ({ screen: screenMode, artwork: artworkMode, lineup: lineup.visible }),
    setState(s) { setScreenOrientation(s.screen, { artwork: s.artwork }); setLineup(s.lineup); },
    get screenOrientation() { return screenMode; }, get progress() { return progress; },
  };
}
