import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileGeometry, perimeter } from '../casework.js';
import { glassElement, opticalCoating, lathe } from '../optics.js';
import { makeLogo } from '../exterior.js';

// iPhone 17 (2025), procedural. 1 unit = 1 cm. Apple's figures: 149.6 × 71.5 ×
// 7.95 mm, 6.3-inch Super Retina XDR, 2622 × 1206 px at 460 ppi.
// Model frame (studio convention): long axis +Y, display faces -Z, back +Z.
// Seen from the front the viewer's right is -X, so:
//   -X long edge  side button, Camera Control      (right edge from the front)
//   +X long edge  Action button, volume up / down  (left edge from the front)
//   -Y short edge USB-C, speaker and microphone holes
//   back          vertical camera bump in the -X/+Y corner (top left from behind)
//
// Measurements from Apple's photography (px → mm against the known 71.5 mm
// width or 149.6 mm height; the images are near-orthographic):
//   front-straight-white.png   7.82 px/mm (width 416→975 px)
//     plan corner radius        45° inset 3.7 mm, tangent ≈12.5 mm → 13.8 mm on
//                               casework's superelliptic perimeter()
//     aluminium seen from front ≈1.0 mm, black border ≈1.7 mm (active 66.6 mm wide)
//     Dynamic Island            20.9 × 6.1 mm, centre 7.9 mm below the top edge
//     Action                    6.9 mm long, centre 34.3 mm from top (+X edge)
//     Volume up / down          11.3 mm long, centres 48.5 / 62.7 mm from top
//     Side button               17.6 mm long, centre 55.5 mm from top (-X edge)
//   side-profile-lavender.png  (right edge, 7.15 px/mm on height, 7.3 on depth)
//     edge profile              flat band ≈4.7 mm; front roll-over ≈1.8 mm deep
//                               (frame + glass edge), back roll-over ≈1.4 mm
//     side button               ≈18 mm, centre ≈57 mm from top (averaged w/ front)
//     Camera Control            ≈17 mm, centre ≈100 mm from top
//     buttons                   3.15 mm across, centred in the thickness
//     camera bump               plateau 1.85 mm above the back glass,
//                               lens rings 1.55 mm above the plateau (3.4 mm total)
//                               bump starts 3.5 mm below the top edge
//     antenna lines             16.5 mm from the top; bottom ones in the lower corner
//   cameras.png (10.96 px/mm)  lens centres 14.05 mm from the side edge,
//                               13.5 mm from the top; bump inset 4.6 mm
//   camera-bump-macro-lavender ring Ø : centre spacing : bump outer 1 : 1.15 : 1.25-1.33
//                               ring face ≈1.1 mm wide; flash Ø ≈5.8 mm, centre ≈1.0
//                               ring Ø right of the lens axis, level with the gap; mic
//                               0.41 Ø right of the axis on the bump's right edge
//   Taken together: ring Ø 14.6 mm, centre spacing 17.0 mm, bump 20.0 × 36.6 mm
//   (corner r 9.4 mm, near-stadium), plateau inset 1.4 mm by a soft rolled bevel.
//   bottom-edge-white-usbc.png (8.15 px/mm)
//     USB-C opening 8.8 × 2.7 mm in a 10.0 × 3.9 mm polished surround, centred
//     speaker/mic holes Ø1.35 mm at a 2.35 mm pitch: five at -21.5…-12.1 mm,
//     three at +12.1…+16.7 mm; screws at ±7.3 mm; antenna band 14.5 mm from +X.
export const I17 = { W: 7.15, H: 14.96, T: 0.795 };
const W = I17.W, H = I17.H, HW = W / 2, HH = H / 2, HT = I17.T / 2;
const RC = 1.38;                                      // plan-view corner radius
// Active area from 2622 × 1206 px at 460 ppi: 14.478 × 6.659 cm, uniform 2.4 mm border.
const ACTIVE = { w: 6.659, h: 14.478, r: RC - .25 };
export const I17_ASPECT = ACTIVE.w / ACTIVE.h;       // portrait artwork, width / height
const ZS = -HT - .0006;                               // display emission plane
const ISLAND = { w: 2.09, h: .61, y: HH - .79 };
// Camera bump (seen from behind: top left). Lens 0 = Fusion Main (top),
// lens 1 = Fusion Ultra Wide (bottom).
const LENS_X = -HW + 1.405, LENS_Y = [HH - 1.37, HH - 1.37 - 1.70];
const BUMP = { x: LENS_X, y: (LENS_Y[0] + LENS_Y[1]) / 2, w: 2.0, h: 3.66, r: .94, rise: .185 };
const ZB = HT;                                        // back glass surface
const ZP = ZB + BUMP.rise;                            // bump plateau
const RING = { r: .73, rise: .155 };                  // lens ring outer radius, height above plateau
const FLASH = { x: LENS_X + 1.6, y: BUMP.y, r: .29 };
const MIC = { x: LENS_X + .62, y: BUMP.y + .02 };
const BUTTONS = {
  side: { y: HH - 5.74, len: 1.79 }, control: { y: HH - 10.0, len: 1.70 },
  action: { y: HH - 3.43, len: .69 }, volUp: { y: HH - 4.85, len: 1.13 }, volDown: { y: HH - 6.27, len: 1.13 },
};

// Finishes: [name, back glass, aluminium frame, camera bump]. Mist Blue is the default.
export const i17Finishes = [
  ['Mist Blue', '#98b2de', '#94acd2', '#6a8bcc'],
  ['Lavender', '#e2cdee', '#c4b2d8', '#c8abe4'],
  ['Sage', '#b4c88a', '#a0b482', '#7e9c4c'],
  ['White', '#f1efed', '#dddbd9', '#e2e1de'],
  ['Black', '#55595b', '#4a4f51', '#25272b'],
];

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
  // Bead-blast: isotropic micro-normal that sparkles under a raking light.
  // Frosted glass: a finer, softer etch.
  return mapCache ||= { blast: noiseMaps(90127, 256, .5, 236, 16, 7), frost: noiseMaps(5521, 256, .28, 240, 10, 3) };
}
function fresnelTexture() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'), im = ctx.createImageData(s, s);
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const x = (i - s / 2 + .5) / (s / 2), y = (j - s / 2 + .5) / (s / 2), r = Math.hypot(x, y), k = (j * s + i) * 4;
    // Concentric Fresnel steps, a clear rim, a warm LED core.
    const ring = .5 + .5 * Math.cos(r * 2 * Math.PI * 9.5);
    let v = 214 + 30 * ring * (r > .16 && r < .82 ? 1 : 0) - (r > .86 ? 14 : 0);
    const core = Math.exp(-((r / .13) ** 2));
    im.data.set([v + 22 * core, v + 6 * core, v - 36 * core, 255], k);
  }
  ctx.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function makeMaterials() {
  const { blast, frost } = surfaceMaps();
  const anodized = (name, roughness, metalness, env, scale = .1) => {
    const m = new THREE.MeshPhysicalMaterial({ name, color: 0x93a9c8, metalness, roughness, ...blast,
      normalScale: new THREE.Vector2(scale, scale), clearcoat: .06, clearcoatRoughness: .5 });
    m.envMapIntensity = env; return m;
  };
  const M = {
    frame: anodized('Bead-blasted anodised aluminium', .4, .66, 2.0),
    ring: anodized('Anodised lens ring', .34, .62, 2.1, .16),
    button: anodized('Anodised button', .36, .68, 2.0),
    // Thin bright diamond-cut chamfers on the rings and button edges.
    polish: new THREE.MeshPhysicalMaterial({ name: 'Polished aluminium chamfer', color: 0xc9d4e4, metalness: 1, roughness: .1, clearcoat: .5, clearcoatRoughness: .05, envMapIntensity: 2.6 }),
    // Colour-infused frosted Ceramic Shield: dielectric, matte etch.
    back: new THREE.MeshPhysicalMaterial({ name: 'Frosted colour back glass', color: 0xa9bcd8, metalness: 0, roughness: .64, ...frost,
      normalScale: new THREE.Vector2(.05, .05), specularIntensity: .9, sheen: .25, sheenRoughness: .7, sheenColor: 0xffffff, envMapIntensity: 1.25 }),
    // Bump glass: same hue, deeper and glossier.
    bump: new THREE.MeshPhysicalMaterial({ name: 'Camera bump glass', vertexColors: true, color: 0x7189bb, metalness: 0, roughness: .3, clearcoat: .9, clearcoatRoughness: .14, specularIntensity: 1, envMapIntensity: 1.4 }),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Polished insignia', color: 0x8ea3c8, metalness: .25, roughness: .12, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.6 }),
    band: new THREE.MeshPhysicalMaterial({ name: 'Antenna band', color: 0xa8b4c4, metalness: .1, roughness: .5 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x030304, metalness: .2, roughness: .16, clearcoat: 1, clearcoatRoughness: .03 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x040405, metalness: .1, roughness: .85 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Button gap', color: 0x141519, metalness: .5, roughness: .55 }),
    mesh: new THREE.MeshStandardMaterial({ name: 'Speaker mesh', color: 0x56575c, metalness: .6, roughness: .5 }),
    tongue: new THREE.MeshStandardMaterial({ name: 'USB-C tongue', color: 0x1d1e22, metalness: .3, roughness: .5 }),
    screw: new THREE.MeshPhysicalMaterial({ name: 'Pentalobe screw', color: 0x9a9ca0, metalness: 1, roughness: .3 }),
    sapphire: new THREE.MeshPhysicalMaterial({ name: 'Camera Control sapphire', color: 0x7c8aa2, metalness: .15, roughness: .1, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.8 }),
    flash: new THREE.MeshPhysicalMaterial({ name: 'Flash Fresnel lens', color: 0xffffff, map: fresnelTexture(), metalness: 0, roughness: .22,
      transparent: true, opacity: .5, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.2 }),
    lensBlack: new THREE.MeshPhysicalMaterial({ name: 'Lens bezel', color: 0x050506, metalness: .3, roughness: .32, clearcoat: .4, clearcoatRoughness: .1, envMapIntensity: .4, side: THREE.DoubleSide }),
    lensMatte: new THREE.MeshStandardMaterial({ name: 'Inner lens baffle', color: 0x08090b, metalness: .1, roughness: .7, envMapIntensity: .12, side: THREE.DoubleSide }),
    barrel: new THREE.MeshStandardMaterial({ name: 'Lens barrel', color: 0x0a0b0e, metalness: .3, roughness: .5, envMapIntensity: .15, side: THREE.DoubleSide }),
    cover: new THREE.MeshPhysicalMaterial({ name: 'Sapphire lens cover', color: 0x05060a, metalness: 0, roughness: .04, transparent: true, opacity: .42,
      depthWrite: false, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1, envMapIntensity: 1.1 }),
    frontCam: new THREE.MeshStandardMaterial({ name: 'Front camera well', color: 0x0b0c10, metalness: .3, roughness: .35 }),
    pill: new THREE.MeshBasicMaterial({ name: 'Dynamic Island', color: 0x010102 }),
  };
  return M;
}

const C = (h) => new THREE.Color(h);
function applyFinish(M, hex) {
  const known = i17Finishes.find(f => f[1].toLowerCase() === hex.toLowerCase());
  const back = C(known ? known[1] : hex);
  let frame, bump;
  if (known) { frame = C(known[2]); bump = C(known[3]); }
  else {
    // Custom colour: the frame is a little greyer and darker than the glass,
    // the bump deeper and more saturated.
    const hsl = {}; back.getHSL(hsl);
    frame = new THREE.Color().setHSL(hsl.h, hsl.s * .8, hsl.l * .88);
    bump = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.35), hsl.l * (hsl.l > .8 ? .95 : .72));
  }
  const fh = {}; frame.getHSL(fh);
  M.back.color.copy(back); M.bump.color.copy(bump);
  M.back.sheenColor.copy(back).lerp(C(0xffffff), .6);
  M.frame.color.copy(frame); M.button.color.copy(frame);
  M.ring.color.copy(frame).lerp(C(0xffffff), fh.l > .7 ? 0 : .05);
  M.polish.color.copy(frame).lerp(C(0xffffff), .3);
  M.logo.color.copy(back).lerp(bump, .5).multiplyScalar(.95);
  M.band.color.copy(frame).lerp(C(0xd8d8d6), .18).multiplyScalar(.9);
  M.sapphire.color.copy(frame).multiplyScalar(.85);
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
// Open (uncapped) loft between stadium/rounded-rect rings: rows of [inset, z].
// Used for recessed openings whose walls must stay see-through at the mouth.
function loft(w, h, r, rows) {
  const pos = [], idx = [], n = perimeter(w, h, r).length;
  for (const [inset, z] of rows) for (const [x, y] of perimeter(w - 2 * inset, h - 2 * inset, Math.max(.004, r - inset))) pos.push(x, y, z);
  for (let k = 1; k < rows.length; k++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = (k - 1) * n + i, b = (k - 1) * n + j, c = k * n + j, d = k * n + i;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Orient a local (along, across, outward) frame onto an edge of the body.
function edgeBasis(obj, along, outward) {
  const a = new THREE.Vector3(...along), o = new THREE.Vector3(...outward), c = new THREE.Vector3().crossVectors(o, a);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, c, o));
}
function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}

// Edge profile, a closed [inset, z] loop: under the cover-glass lip, round the
// soft front roll-over, down the flat bead-blasted side, round the back
// roll-over to the back-glass seat and back along the inside wall.
const PROFILE_OUT = [
  [.064, -.372], [.054, -.372], [.042, -.364], [.029, -.350], [.018, -.331], [.0095, -.307], [.0038, -.278], [.0008, -.248], [0, -.22],
  [0, .25], [.0008, .276], [.0038, .303], [.0095, .328], [.018, .350], [.030, .367], [.045, .380], [.062, .3875], [.080, .391], [.094, .392],
];
const BAND = [[.072, -.30], [.066, -.30], [.0645, -.371], ...PROFILE_OUT, [.0955, .392], [.098, .34], [.30, .32], [.30, -.29]];

// Thin slice of the edge profile in a contrasting material (antenna break),
// centred on a perimeter point.
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
// Place an object on the body perimeter nearest (x, y): local X outward,
// local Y = +Z (towards the back), local Z along the edge.
function onPerimeter(obj, x, y) {
  let best = 0, bd = Infinity;
  OUTLINE.forEach(([px, py], i) => { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = i; } });
  const n = OUTLINE.length, p = OUTLINE[best], a = OUTLINE[(best + n - 1) % n], b = OUTLINE[(best + 1) % n];
  const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize(), out = new THREE.Vector3(t.y, -t.x, 0);
  const up = new THREE.Vector3(0, 0, 1), along = new THREE.Vector3().crossVectors(out, up);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(out, up, along));
  obj.position.set(p[0], p[1], 0); return obj;
}

// ── Lens module ───────────────────────────────────────────────────────
// Thick flat-topped bead-blasted ring in the finish colour with bright
// diamond-cut chamfers, a black bezel, sapphire cover and a stepped barrel
// down to the coated front element. Local +Z is the optical axis; z = 0 is
// the bump plateau.
function makeLensModule(M, index) {
  const R = RING.r, top = RING.rise, root = new THREE.Group();
  root.name = ['48MP Fusion Main', '48MP Fusion Ultra Wide'][index] + ' camera';
  const layers = [];
  const add = (mesh, spread) => { root.add(mesh); layers.push({ mesh, z: mesh.position.z, spread }); return mesh; };
  const ri = .625;                                    // ring inner radius (ring face ≈ 1.2 mm wide)
  add(lathe('Lens ring', [[ri - .02, -.03], [R, -.03], [R, top - .022], [R - .006, top - .006], [R - .02, top], [ri + .016, top], [ri + .004, top - .006],
    [ri, top - .018], [ri, .05], [ri - .02, .05], [ri - .02, -.03]], M.ring), 0);
  // Chamfer highlights sit a hair proud of the ring so they never z-fight.
  add(lathe('Outer chamfer', [[R + .0006, top - .022], [R - .0054, top - .0055], [R - .0195, top + .0006]], M.polish), 0);
  add(lathe('Inner chamfer', [[ri + .0165, top + .0006], [ri + .0035, top - .0055], [ri - .0006, top - .018]], M.polish), 0);
  add(lathe('Lens bezel', [[.50, .07], [ri + .001, .07], [ri + .001, top - .02], [ri - .012, top - .024], [.60, top - .028], [.50, top - .03]], M.lensBlack), .25);
  // Under the cover: matte black baffle with an inner dark bezel ring, then a
  // stepped barrel towards the pupil.
  const pupil = index === 0 ? .135 : .25;
  add(lathe('Inner bezel ring', [[pupil + .2, .02], [.505, .06], [.505, top - .03], [.49, top - .034], [.44, top - .036], [pupil + .2, top - .04], [pupil + .19, .02]], M.lensMatte), .45);
  add(lathe('Barrel step', [[pupil + .005, -.02], [pupil + .03, .0], [pupil + .1, .03], [pupil + .2, top - .04], [pupil + .19, top - .044], [pupil + .09, .036], [pupil + .025, .012], [pupil, -.012]], M.barrel), .7);
  const coat = opticalCoating(index === 0 ? 1 : 0);
  const rear = glassElement('Rear element', pupil * 1.05, .01, coat); rear.position.z = .005; add(rear, .9);
  const front = glassElement('Front element', pupil, .028, coat); front.position.z = .03; add(front, 1.15);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(ri + .001, ri + .001, .006, 112), M.cover);
  cover.rotation.x = Math.PI / 2; cover.position.z = top - .021; cover.renderOrder = 3; cover.name = 'Sapphire lens cover'; add(cover, 1.5);
  return { root, layers };
}

// ── Body ─────────────────────────────────────────────────────────────
function buildBody(M, screenMaterial) {
  const g = { frame: new THREE.Group(), back: new THREE.Group(), display: new THREE.Group(), cameras: new THREE.Group() };
  g.frame.name = 'Aluminium frame'; g.back.name = 'Back glass'; g.display.name = 'Display stack'; g.cameras.name = 'Rear cameras';

  const band = new THREE.Mesh(profileGeometry(W, H, RC, BAND, true), M.frame); band.name = 'Aluminium frame band'; g.frame.add(band);

  // Back glass, its seat and the logo.
  const back = new THREE.Mesh(profileGeometry(W, H, RC, [[.0955, .384], [.0955, .392], [.099, .3955], [.108, .3972], [.118, ZB]]), M.back);
  back.name = 'Frosted back glass'; g.back.add(back);
  const logo = makeLogo(M.logo); logo.scale.setScalar(1.12); logo.position.set(0, .45, ZB + .0005); g.back.add(logo);

  // Camera bump: stadium plateau with a soft rolled bevel that melts into
  // the back (concave fillet at the foot, convex shoulder at the top).
  const bumpRows = [[-.016, ZB - .0012], [.008, ZB + .0012], [.03, ZB + .005], [.054, ZB + .013], [.076, ZB + .028], [.093, ZB + .05], [.106, ZB + .08],
    [.116, ZB + .11], [.126, ZB + .136], [.139, ZB + .156], [.155, ZB + .17], [.175, ZB + .179], [.2, ZP]];
  const bumpGeo = profileGeometry(BUMP.w, BUMP.h, BUMP.r, bumpRows);
  {
    // Light travelling through the thick rolled edge reads deeper and more
    // saturated than the plateau: shade the bevel through vertex colours.
    const pos = bumpGeo.getAttribute('position'), col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const h = (pos.getZ(i) - ZB) / BUMP.rise, k = h > .995 ? 1 : .66 + .34 * Math.pow(Math.max(0, h), 4);
      col.set([k, k, k], i * 3);
    }
    bumpGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const bump = new THREE.Mesh(bumpGeo, M.bump);
  bump.position.set(BUMP.x, BUMP.y, 0); bump.name = 'Camera bump glass'; g.back.add(bump);
  // Microphone on the bump's right edge, between the lenses.
  const micRim = lathe('Microphone rim', [[.026, ZP - .004], [.03, ZP + .006], [.04, ZP + .009], [.052, ZP + .006], [.058, ZP - .001]], M.ring); micRim.position.set(MIC.x, MIC.y, 0);
  const micHole = new THREE.Mesh(new THREE.CircleGeometry(.027, 28), M.dark); micHole.position.set(MIC.x, MIC.y, ZP + .002);
  micRim.name = 'Rear microphone'; micHole.name = 'Rear microphone port'; g.back.add(micRim, micHole);
  // True Tone flash: frosted Fresnel lens on the back glass, right of the bump.
  const flash = new THREE.Group(); flash.name = 'True Tone flash'; flash.position.set(FLASH.x, FLASH.y, ZB); g.back.add(flash);
  flash.add(lathe('Flash surround', [[FLASH.r - .03, .002], [FLASH.r, .0005], [FLASH.r + .012, -.002]], M.polish));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(FLASH.r, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.flash);
  { const uv = dome.geometry.getAttribute('uv'), p = dome.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, .5 + p.getX(i) / (2 * FLASH.r), .5 - p.getZ(i) / (2 * FLASH.r)); }
  dome.rotation.x = Math.PI / 2; dome.scale.set(1, .06, 1); dome.name = 'Flash lens'; flash.add(dome);

  // Cover glass flush with the frame lip; the screen and island just proud of it.
  const glass = new THREE.Mesh(profileGeometry(W, H, RC, [[.112, -HT], [.09, -.3966], [.0745, -.391], [.066, -.383], [.0625, -.373], [.064, -.355]]), M.glass);
  glass.name = 'Cover glass'; g.display.add(glass);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display'); g.display.add(screen);
  {
    // Portrait, upright from the front: viewer's right is -X.
    const uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (ACTIVE.w / 2 - p.getX(i)) / ACTIVE.w, (p.getY(i) + ACTIVE.h / 2) / ACTIVE.h);
  }
  const island = new THREE.Mesh(new THREE.ShapeGeometry(stadium(ISLAND.w, ISLAND.h), 32), M.pill);
  island.rotation.y = Math.PI; island.position.set(0, ISLAND.y, ZS - .0003); island.name = 'Dynamic Island'; island.renderOrder = 2; g.display.add(island);
  // TrueDepth front camera at the viewer's right end of the island.
  const fx = -(ISLAND.w / 2 - .3);
  const well = new THREE.Mesh(new THREE.CircleGeometry(.12, 40), M.frontCam); well.rotation.y = Math.PI;
  well.position.set(fx, ISLAND.y, ZS - .0006); well.name = 'Front camera'; g.display.add(well);
  const fl = glassElement('Front camera lens', .07, .008, opticalCoating(1)); fl.rotation.y = Math.PI;
  fl.position.set(fx, ISLAND.y, ZS - .0009); g.display.add(fl);
  // Earpiece slot at the top glass edge.
  const slot = new THREE.Mesh(new THREE.ShapeGeometry(stadium(1.2, .035), 12), M.seam);
  slot.rotation.y = Math.PI; slot.position.set(0, HH - .105, ZS - .0002); slot.name = 'Earpiece'; g.display.add(slot);

  // Antenna bands: one high on each long edge, one in each lower corner and
  // one on the bottom edge 14.5 mm from the +X corner.
  for (const [x, y] of [[HW, HH - 1.65], [-HW, HH - 1.65], [HW, -HH + 1.2], [-HW, -HH + 1.2], [HW - 1.45, -HH]]) {
    const s = onPerimeter(profileSlice(M.band, .052), x, y); s.name = 'Antenna band'; g.frame.add(s);
  }

  // ── Edge hardware ──
  const across = .315;
  function button(name, len, y, side) {
    const out = [side, 0, 0], grp = new THREE.Group(); grp.name = name;
    edgeBasis(grp, [0, 1, 0], out); grp.position.set(side * HW, y, 0); g.frame.add(grp);
    const gap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(len + .045, across + .045), 24), M.seam); gap.position.z = .0012; gap.name = name + ' gap'; grp.add(gap);
    const proud = .034;
    const bodyGeo = new THREE.ExtrudeGeometry(stadium(len - .02, across - .02), { depth: proud - .012, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 4, curveSegments: 24 });
    bodyGeo.translate(0, 0, -.004);
    const body = new THREE.Mesh(bodyGeo, M.polish); body.name = name; grp.add(body);
    const face = new THREE.Mesh(new THREE.ShapeGeometry(stadium(len - .05, across - .05), 24), M.button);
    face.position.z = proud - .004 + .0004; face.name = name + ' face'; grp.add(face);
    return grp;
  }
  button('Side button', BUTTONS.side.len, BUTTONS.side.y, -1);
  button('Action button', BUTTONS.action.len, BUTTONS.action.y, 1);
  button('Volume up', BUTTONS.volUp.len, BUTTONS.volUp.y, 1);
  button('Volume down', BUTTONS.volDown.len, BUTTONS.volDown.y, 1);
  {
    // Camera Control: polished rim almost flush with the band around a
    // recessed sapphire crystal.
    const { len, y } = BUTTONS.control, grp = new THREE.Group(); grp.name = 'Camera Control';
    edgeBasis(grp, [0, 1, 0], [-1, 0, 0]); grp.position.set(-HW, y, 0); g.frame.add(grp);
    const gap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(len + .04, across + .06), 24), M.seam); gap.position.z = .0012; grp.add(gap);
    const hole = stadium(len - .05, across - .03);
    const rimShape = stadium(len, across + .02); rimShape.holes.push(new THREE.Path(hole.getPoints(24).reverse()));
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape, { depth: .006, bevelEnabled: true, bevelThickness: .006, bevelSize: .005, bevelSegments: 3, curveSegments: 24 }), M.polish);
    rim.position.z = .002; rim.name = 'Camera Control rim'; grp.add(rim);
    const wall = new THREE.Mesh(loft(len - .05, across - .03, (across - .03) / 2, [[0, .014], [0, .004]]), M.seam); grp.add(wall);
    const crystal = new THREE.Mesh(new THREE.ShapeGeometry(stadium(len - .05, across - .03), 24), M.sapphire);
    crystal.position.z = .004; crystal.name = 'Camera Control sapphire'; grp.add(crystal);
  }

  // Bottom edge: USB-C in a polished surround, speaker / mic holes, screws.
  {
    const grp = new THREE.Group(); grp.name = 'Bottom edge'; edgeBasis(grp, [1, 0, 0], [0, -1, 0]); grp.position.set(0, -HH, 0); g.frame.add(grp);
    // The band is a solid loft, so openings are painted just proud of the
    // flat bottom face: a polished chamfer ring round a dark mouth, with the
    // port's tongue and inner wall suggested by a lighter inset.
    const surround = new THREE.Mesh(loft(1.0, .39, .195, [[0, .0009], [.02, .0011], [.05, .0011], [.058, .0009]]), M.polish);
    surround.name = 'USB-C surround'; grp.add(surround);
    const mouth = new THREE.Mesh(new THREE.ShapeGeometry(stadium(.884, .274), 24), M.dark); mouth.position.z = .001; mouth.name = 'USB-C port'; grp.add(mouth);
    const lip = new THREE.Mesh(loft(.884, .274, .137, [[0, .0012], [.022, .0012]]), M.seam); lip.name = 'USB-C inner wall'; grp.add(lip);
    const tongue = new THREE.Mesh(new THREE.ShapeGeometry(stadium(.64, .055), 12), M.tongue); tongue.position.z = .0013; tongue.name = 'USB-C tongue'; grp.add(tongue);
    const holes = [-2.15, -1.915, -1.68, -1.445, -1.21, 1.21, 1.445, 1.68];
    const rims = [], wells = [];
    for (const x of holes) {
      const rim = new THREE.RingGeometry(.052, .0675, 32); rim.translate(x, 0, .0009); rims.push(rim);
      const w = new THREE.CircleGeometry(.053, 32); w.translate(x, 0, .0011); wells.push(w);
    }
    const rimMesh = new THREE.Mesh(mergeGeometries(rims), M.polish); rimMesh.name = 'Speaker hole chamfers'; grp.add(rimMesh);
    const wellMesh = new THREE.Mesh(mergeGeometries(wells), M.mesh); wellMesh.name = 'Speaker holes'; grp.add(wellMesh);
    for (const x of [-.73, .73]) {
      const head = new THREE.Mesh(new THREE.CircleGeometry(.062, 32), M.screw); head.position.set(x, 0, .001); head.name = 'Pentalobe screw'; grp.add(head);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.062, .07, 32), M.seam); ring.position.set(x, 0, .001); grp.add(ring);
      const star = new THREE.Mesh(new THREE.CircleGeometry(.026, 5), M.seam); star.position.set(x, 0, .0013); grp.add(star);
    }
  }

  // Lenses on the bump plateau.
  const optics = LENS_Y.map((y, i) => {
    const lens = makeLensModule(M, i); lens.root.position.set(LENS_X, y, ZP); g.cameras.add(lens.root); return lens;
  });
  return { ...g, optics };
}

function buildInternals() {
  const battery = new THREE.Group(); battery.name = 'Battery';
  const board = new THREE.Group(); board.name = 'Logic board';
  const coil = new THREE.Group(); coil.name = 'MagSafe coil';
  const foil = new THREE.MeshPhysicalMaterial({ name: 'Battery foil', color: 0xb8bbc1, metalness: .65, roughness: .42 });
  const label = new THREE.MeshStandardMaterial({ name: 'Battery label', color: 0x1a1b1e, roughness: .7 });
  const pcb = new THREE.MeshStandardMaterial({ name: 'Circuit board', color: 0x16201b, roughness: .62, metalness: .2 });
  const shield = new THREE.MeshPhysicalMaterial({ name: 'Shield can', color: 0xa9abb0, metalness: .9, roughness: .32 });
  const chip = new THREE.MeshStandardMaterial({ name: 'Silicon package', color: 0x0d0e10, roughness: .45, metalness: .3 });
  const copper = new THREE.MeshPhysicalMaterial({ name: 'Copper coil', color: 0xb87333, metalness: 1, roughness: .35 });
  const ferrite = new THREE.MeshStandardMaterial({ name: 'Ferrite shield', color: 0x202024, roughness: .8 });
  const box = (w, h, d, mat, x, y, z, parent, name) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.name = name; parent.add(m); return m; };
  box(6.3, 8.6, .48, foil, .1, -1.6, .02, battery, 'Battery cell');
  box(3.6, 2.6, .002, label, .1, -.6, -.221, battery, 'Cell label');
  box(5.4, 3.9, .08, pcb, .55, 4.7, .05, board, 'Logic board');
  box(1.6, 1.6, .12, shield, 1.0, 4.9, -.03, board, 'A19 shield');
  box(1.3, 1.1, .12, shield, 2.4, 4.0, -.03, board, 'Modem shield');
  box(.8, .7, .06, chip, -.6, 3.6, -.02, board, 'Power management IC');
  box(1.75, 3.6, .55, chip, LENS_X, 5.24, .1, board, 'Camera modules');
  box(2.1, .9, .38, chip, -1.9, -6.65, 0, board, 'Taptic Engine');
  box(1.7, .8, .38, chip, 2.2, -6.65, 0, board, 'Loudspeaker');
  box(1.3, .45, .26, shield, 0, -7.05, 0, board, 'USB-C module');
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 2.75, 96), copper); ring.position.set(0, .45, .3); ring.name = 'Charging coil'; coil.add(ring);
  const mag = new THREE.Mesh(new THREE.RingGeometry(2.78, 2.95, 96), ferrite); mag.position.set(0, .45, .3); mag.name = 'Magnet array'; coil.add(mag);
  for (const m of [ring, mag]) m.material.side = THREE.DoubleSide;
  return { battery, board, coil };
}

export function createI17() {
  const root = new THREE.Group(); root.name = 'iPhone 17';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  const body = buildBody(M, screenMaterial);
  const internals = buildInternals();
  root.add(body.frame, body.back, body.display, body.cameras, internals.coil, internals.battery, internals.board);
  const groups = { display: body.display, frame: body.frame, back: body.back, cameras: body.cameras, coil: internals.coil, battery: internals.battery, board: internals.board };

  // ── Anchors (meanings as on the Pro / iPad) ──
  const zRing = ZP + RING.rise;
  const anchors = {
    array: anchor(body.cameras, 'array', BUMP.x, BUMP.y, zRing, [0, 0, 1]),
    main: anchor(body.cameras, 'main', LENS_X, LENS_Y[0], zRing, [0, 0, 1]),
    ultra: anchor(body.cameras, 'ultra', LENS_X, LENS_Y[1], zRing, [0, 0, 1]),
    flash: anchor(body.back, 'flash', FLASH.x, FLASH.y, ZB + .02, [0, 0, 1]),
    mic: anchor(body.back, 'rear microphone', MIC.x, MIC.y, ZP, [0, 0, 1]),
    island: anchor(body.display, 'island', 0, ISLAND.y, -HT - .001, [0, 0, -1]),
    usb: anchor(body.frame, 'usb', 0, -HH, 0, [0, -1, 0]),
    control: anchor(body.frame, 'camera control', -HW - .01, BUTTONS.control.y, 0, [-1, 0, 0]),
    side: anchor(body.frame, 'side button', -HW - .03, BUTTONS.side.y, 0, [-1, 0, 0]),
    // The phone's top button is its side (power) button.
    topButton: anchor(body.frame, 'side button', -HW - .03, BUTTONS.side.y, 0, [-1, 0, 0]),
    action: anchor(body.frame, 'action button', HW + .03, BUTTONS.action.y, 0, [1, 0, 0]),
    volume: anchor(body.frame, 'volume buttons', HW + .03, (BUTTONS.volUp.y + BUTTONS.volDown.y) / 2, 0, [1, 0, 0]),
    railLow: anchor(body.frame, 'edge low', HW, -HH + 4.0, 0, [1, 0, 0]),
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
    const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(root.matrixWorld);
    const nModel = new THREE.Vector3(0, 0, -1).applyQuaternion(root.getWorldQuaternion(q)).applyQuaternion(mq).normalize();
    for (const [key, [fr, fu]] of Object.entries(SCREEN)) {
      const p = new THREE.Vector3(-fr * ACTIVE.w / 2, fu * ACTIVE.h / 2, -HT - .001 + body.display.position.z);
      out[key] = { p: p.applyMatrix4(toModel), n: nModel.clone() };
    }
    return out;
  }

  // ── Exploded view: display stack forward, board and cell between, coil,
  // back glass and the lens modules out the back. ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    body.display.position.z = -6.4 * t;
    internals.board.position.z = -4.0 * t;
    internals.battery.position.z = -1.8 * t;
    internals.coil.position.z = 1.4 * t;
    body.back.position.z = 3.2 * t;
    body.cameras.position.z = 5.4 * t;
    for (const lens of body.optics) for (const { mesh, z, spread } of lens.layers) mesh.position.z = z + spread * t;
  }

  let finishHex = i17Finishes[0][1];
  function setFinish(hex) { finishHex = hex; applyFinish(M, hex); }
  setFinish(finishHex);
  setProgress(0);
  return {
    root, groups, screenMaterial, setFinish, setProgress, points, anchors,
    get finish() { return finishHex; }, get progress() { return progress; },
  };
}
