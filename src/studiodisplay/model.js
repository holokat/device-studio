import * as THREE from 'three';
import { profileGeometry, perimeter } from '../casework.js';
import { glassElement, opticalCoating, lathe } from '../optics.js';
import { makeLogo } from '../exterior.js';

// Studio Display XDR (apple.com/studio-display-xdr), procedural. 1 unit = 1 cm.
// Apple's figures: 27-inch 5K Retina XDR, 5120 × 2880 px at 218 ppi, mini-LED
// backlight with 2304 dimming zones. With the tilt- and height-adjustable stand:
// 62.3 cm wide, 47.8 cm tall (bottom position) to 58.3 cm (top), stand depth
// 21.4 cm, 8.5 kg; 105 mm of height travel and 30° of tilt (−5° to +25°).
// With the VESA mount adapter: 36.2 cm tall, 3.3 cm deep.
// Ports: one upstream Thunderbolt 5 (host, 140 W), one downstream Thunderbolt 5,
// two USB-C (10 Gb/s). 12MP Center Stage camera, six speakers, three mics.
//
// Model frame: the display stands upright, the screen faces −Z (towards the
// studio's front camera), the long axis runs along X, +Y is up. Seen from the
// front the viewer's right is −X, so seen from the back the ports (bottom-left
// of the back) sit at −X. The foot rests on the floor: y = 0 is the underside
// of the foot (no floor offset needed). The arm's height and tilt move the
// display; the stand never moves.
//
// Measurements, taken from Apple's photography against the known 62.3 cm width,
// 36.2 cm panel height and 21.4 cm stand depth (orthographic side and back
// views, so a single scale per image):
//   bezel (black glass, edge to active area)  1.33 cm  (front: 20 px of 908 px; matches the
//                                                       active area 59.65 × 33.56 cm from 5120 × 2880 @ 218 ppi)
//   aluminium lip round the cover glass        0.07 cm
//   corner radius, front and back (plan)       0.42 cm  (back: 7 px of 963 px; ports close-up: 15 px @ 0.021 cm/px)
//   display thickness                          2.20 cm  (side: 43 px of 711 px for 36.2 cm; three-pose: 33 of 547 px)
//   top speaker/vent grille                    59.5 × 1.7 cm on the top edge, staggered holes, 0.09 cm pitch
//   column (stand upright)                     15.2 wide × 0.92 deep, top 29.9 cm above the floor,
//                                              top corners r 1.08 cm (cable-hole close-up: 50 px @ 0.0216 cm/px)
//   column cable pass-through (pill)           4.7 × 9.1 cm, from 3.2 cm below to 5.9 cm above the
//                                              display's bottom edge at mid height
//   foot                                       15.2 wide × 21.3 deep (418 px @ 0.0509), plate 0.48 cm
//                                              on a 0.28 cm plinth inset 0.3 cm (0.76 cm total, side: 15 px)
//   column-to-foot fillet radius               1.5 cm front, 1.0 cm back (side: 30 px rise)
//   arm (pill)                                 8.5 cm between pivots, 3.26 cm tall (pill radius 1.63),
//                                              7.6 cm wide (fits between the mount plate's legs)
//   pivot caps                                 1.25 cm diameter, polished, on both sides of each pivot
//   arm swing                                  ±38.1° about the column pivot → 2 × 8.5 sin 38.1° = 10.5 cm travel;
//                                              three-pose image: column-to-display gap shrinks by 1.85 cm (cos 38.6°)
//   column pivot                               25.85 cm above the floor, 1.63 cm in front of the column
//   display pivot                              9.1 cm above the display's bottom edge, 1.78 cm behind its back
//   ports                                      USB-C 0.27 × 0.86 cm slots, 1.51 cm pitch, first slot 9.36 cm
//                                              from the left edge (seen from the back), centres 2.74 cm above the bottom
//   cable boss                                 3.0 cm diameter, centred, 2.74 cm above the bottom
//   VESA mount plate (H)                       11.95 × 19.6 cm, 2.0 cm legs, screws on a 10 × 10 cm square
//   Apple logo (black glass)                   6.9 cm wide × 8.2 cm tall, centre 5.1 cm above the panel centre
//   camera window                              0.30 cm diameter, centred in the top bezel
export const SDX = {
  W: 62.3, H: 36.2, T: 2.2, R: .42, BEZEL: 1.33, LIP: .07,
  ACTIVE: { w: 59.65, h: 33.56, r: .22 },
  column: { w: 15.2, d: .92, top: 29.9, r: 1.08, zFront: 12.93 },
  foot: { w: 15.2, d: 21.3, t: .76, plate: .48, z0: -4.58, z1: 16.72, r: 1.0 },
  arm: { L: 8.5, h: 3.26, w: 7.6, swing: 38.1 },
  pivot: { y: 25.85, z: 11.3, displayY: -9.0, displayZ: 2.88 },
  height: { min: 47.8, max: 58.3, travel: 10.5 }, tilt: { min: -5, max: 25 },
};
const { W, H, T, R, LIP, ACTIVE } = SDX;
const HW = W / 2, HH = H / 2, HT = T / 2;
export const SDX_ASPECT = 5120 / 2880;
const ZF = -HT;                                   // front face of the cover glass
const ZS = ZF - .0006;                            // display emission plane, just proud of the glass
const ZB = HT;                                    // back face
const CAM_Y = HH - SDX.BEZEL / 2;                 // camera, centred in the top bezel
const PORT_Y = -HH + 2.74, PORT_X0 = -HW + 9.36, PORT_STEP = 1.51;
const BOSS_Y = -HH + 2.74;
const LOGO_Y = 5.1;

// Silver is the only finish Apple offers (glass: standard or nano-texture).
export const sdxFinishes = [['Silver', '#e3e4e6']];

// ── Textures ──
let blastCache = null;
function blastMaps() {
  // Bead blast: a fine random micro-normal that sparkles under a raking light,
  // plus a gentle roughness scatter.
  if (blastCache) return blastCache;
  const size = 256, n = document.createElement('canvas'), r = document.createElement('canvas');
  n.width = n.height = r.width = r.height = size;
  const nc = n.getContext('2d'), rc = r.getContext('2d');
  const ni = nc.createImageData(size, size), ri = rc.createImageData(size, size);
  let seed = 51721;
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

// Perforated grille tile: staggered round holes, 16 × 16 per tile. Albedo
// (dark bores), a normal map for the drilled rims, and roughness.
function grilleMaps(tileCm, pitchCm) {
  const size = 512, N = Math.round(tileCm / pitchCm), p = size / N, rad = p * .3;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cm = mk(), cn = mk(), cr = mk();
  const m = cm.getContext('2d').createImageData(size, size), nn = cn.getContext('2d').createImageData(size, size), rr = cr.getContext('2d').createImageData(size, size);
  const height = new Float32Array(size * size), cover = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let best = 1e9;
    const row = Math.floor(y / p);
    for (let ry = row - 1; ry <= row + 1; ry++) {
      const off = (((ry % 2) + 2) % 2) * p / 2, cy = (ry + .5) * p;
      const col = Math.floor((x - off) / p);
      for (let cx0 = col - 1; cx0 <= col + 1; cx0++) {
        const cx = (cx0 + .5) * p + off;
        let dx = Math.abs(x + .5 - cx); dx = Math.min(dx, size - dx);
        let dy = Math.abs(y + .5 - cy); dy = Math.min(dy, size - dy);
        best = Math.min(best, Math.hypot(dx, dy));
      }
    }
    const inside = THREE.MathUtils.smoothstep(rad + .8, rad - .8, best);   // 1 inside the bore
    const rim = THREE.MathUtils.smoothstep(rad + 3.2, rad, best);          // chamfer ring
    cover[y * size + x] = inside;
    height[y * size + x] = 1 - rim * .6 - inside * .4;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, k = i * 4;
    const hx = height[y * size + (x + 1) % size] - height[y * size + (x - 1 + size) % size];
    const hy = height[((y + 1) % size) * size + x] - height[((y - 1 + size) % size) * size + x];
    const v = new THREE.Vector3(-hx * 2.2, hy * 2.2, 1).normalize();
    nn.data.set([(v.x * .5 + .5) * 255, (v.y * .5 + .5) * 255, (v.z * .5 + .5) * 255, 255], k);
    const a = 1 - cover[i];
    const c = 6 + a * 249;
    m.data.set([c, c, c, 255], k);
    const g = 150 + a * 90;
    rr.data.set([g, g, g, 255], k);
  }
  cm.getContext('2d').putImageData(m, 0, 0); cn.getContext('2d').putImageData(nn, 0, 0); cr.getContext('2d').putImageData(rr, 0, 0);
  const map = new THREE.CanvasTexture(cm), normalMap = new THREE.CanvasTexture(cn), roughnessMap = new THREE.CanvasTexture(cr);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; }
  return { map, normalMap, roughnessMap };
}

// Mini-LED backlight tile: staggered emitters on a deep blue board. The
// emissive map carries a hot white core and a blue halo, bright enough to
// bloom in a post pass.
function ledMaps(perTile) {
  const size = 256, p = size / perTile;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cb = mk(), ce = mk(), bctx = cb.getContext('2d'), ectx = ce.getContext('2d');
  bctx.fillStyle = '#121a86'; bctx.fillRect(0, 0, size, size);
  ectx.fillStyle = '#0b1050'; ectx.fillRect(0, 0, size, size);
  for (let r = 0; r < perTile; r++) for (let c = -1; c <= perTile; c++) {
    const x = (c + .5 + (r % 2) * .5) * p, y = (r + .5) * p;
    for (const [ctx, core] of [[bctx, '#5d6cff'], [ectx, '#ffffff']]) {
      const halo = ctx.createRadialGradient(x, y, 0, x, y, p * .48);
      halo.addColorStop(0, core); halo.addColorStop(.22, core);
      halo.addColorStop(.32, ctx === ectx ? 'rgba(90,110,255,.55)' : 'rgba(40,52,190,.9)');
      halo.addColorStop(1, ctx === ectx ? 'rgba(11,16,80,0)' : 'rgba(18,26,134,0)');
      ctx.fillStyle = halo; ctx.fillRect(x - p / 2, y - p / 2, p, p);
    }
  }
  const map = new THREE.CanvasTexture(cb), emissiveMap = new THREE.CanvasTexture(ce);
  for (const t of [map, emissiveMap]) { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; }
  return { map, emissiveMap };
}

function makeMaterials() {
  const blast = blastMaps();
  // Bead-blasted silver aluminium: bright, soft, a little anisotropic sheen.
  const alu = (name, roughness, env = 1.3, metalness = .9) => {
    const m = new THREE.MeshPhysicalMaterial({ name, color: 0xcbd0d6, metalness, roughness, ...blast,
      normalScale: new THREE.Vector2(.11, .11), anisotropy: .28, anisotropyRotation: 0, clearcoat: .06, clearcoatRoughness: .5 });
    m.envMapIntensity = env; return m;
  };
  const g = grilleMaps(1.44, .09);
  return {
    body: alu('Bead-blasted aluminium enclosure', .38, 1.3, .95),
    back: alu('Bead-blasted aluminium back', .42, 1.35, .95),
    stand: alu('Bead-blasted aluminium stand', .38, 1.3, .95),
    arm: alu('Bead-blasted aluminium arm', .3, 1.0, .97),
    plate: alu('Mount plate', .4, 1.5),
    plinth: alu('Foot plinth', .5, .9, .8),
    grille: new THREE.MeshPhysicalMaterial({ name: 'Perforated speaker grille', color: 0xdcdde0, metalness: .9, roughness: .42, map: g.map, normalMap: g.normalMap, normalScale: new THREE.Vector2(.9, .9), roughnessMap: g.roughnessMap, envMapIntensity: 1.5 }),
    polished: new THREE.MeshPhysicalMaterial({ name: 'Polished pivot cap', color: 0xe9eaec, metalness: 1, roughness: .1, clearcoat: .4, clearcoatRoughness: .05, envMapIntensity: 2.1 }),
    screw: new THREE.MeshPhysicalMaterial({ name: 'Polished screw', color: 0xd8d9dc, metalness: 1, roughness: .16, envMapIntensity: 1.9 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Black cover glass', color: 0x040405, metalness: .1, roughness: .07, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.1 }),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Black glass Apple logo', color: 0x060607, metalness: .15, roughness: .05, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.6 }),
    rubber: new THREE.MeshPhysicalMaterial({ name: 'Cable boss', color: 0x101012, metalness: 0, roughness: .55, clearcoat: .2, clearcoatRoughness: .4, envMapIntensity: .6 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x040405, metalness: .2, roughness: .85 }),
    tongue: new THREE.MeshStandardMaterial({ name: 'USB-C tongue', color: 0x1a1b1f, metalness: .4, roughness: .45 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Seam', color: 0x2a2b2f, metalness: .6, roughness: .5 }),
    glyph: new THREE.MeshStandardMaterial({ name: 'Etched glyph', color: 0x333438, metalness: .5, roughness: .5 }),
    chassis: new THREE.MeshStandardMaterial({ name: 'Black mid-frame', color: 0x060607, metalness: .3, roughness: .6 }),
    camWin: new THREE.MeshPhysicalMaterial({ name: 'Camera window', color: 0x0d0e12, metalness: .3, roughness: .2, clearcoat: 1 }),
    led: (() => { const t = ledMaps(4); const m = new THREE.MeshStandardMaterial({ name: 'Mini-LED backlight', color: 0xffffff, map: t.map, emissive: 0x3448ff, emissiveMap: t.emissiveMap, emissiveIntensity: 4.2, roughness: .5, metalness: .1 }); m.userData.maps = t; return m; })(),
    diffuser: new THREE.MeshPhysicalMaterial({ name: 'Diffuser sheet', color: 0xffffff, emissive: 0xf2f4ff, emissiveIntensity: .95, roughness: .7, transparent: true, opacity: .95, side: THREE.DoubleSide }),
    film: new THREE.MeshPhysicalMaterial({ name: 'Optical film', color: 0xdce4ff, emissive: 0xb4c2ff, emissiveIntensity: .8, roughness: .3, transparent: true, opacity: .62, side: THREE.DoubleSide, depthWrite: false }),
    filmBlue: new THREE.MeshPhysicalMaterial({ name: 'Optical film (blue)', color: 0xa9b8ff, emissive: 0x6f84ff, emissiveIntensity: .9, roughness: .3, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }),
  };
}

function applyFinish(M, hex) {
  const c = new THREE.Color(hex).multiplyScalar(.97);
  for (const k of ['body', 'back', 'stand', 'arm', 'plate', 'grille']) M[k].color.copy(c);
  M.plinth.color.copy(c).multiplyScalar(.82);
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
function pillShape(len, across, holeInset = 0) {
  // Horizontal stadium centred on the origin; optional concentric hole.
  const make = (l, a) => { const r = a / 2, s = new THREE.Shape(); s.absarc(l / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.absarc(-l / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false); return s; };
  const s = make(len, across);
  if (holeInset) { const h = make(len - 2 * holeInset, across - 2 * holeInset); s.holes.push(new THREE.Path(h.getPoints(24).reverse())); }
  return s;
}
// Polygon with rounded vertices (convex or concave), as a THREE.Shape.
function roundPoly(pts) {
  const s = new THREE.Shape(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x, y, r] = pts[i], [px, py] = pts[(i + n - 1) % n], [nx, ny] = pts[(i + 1) % n];
    const d0 = Math.hypot(px - x, py - y), d1 = Math.hypot(nx - x, ny - y);
    const a = [x + (px - x) / d0 * r, y + (py - y) / d0 * r], b = [x + (nx - x) / d1 * r, y + (ny - y) / d1 * r];
    if (i === 0) s.moveTo(...a); else s.lineTo(...a);
    // A circular arc (approximated by a cubic) between the tangent points.
    const k = .5523;
    s.bezierCurveTo(a[0] + (x - a[0]) * k, a[1] + (y - a[1]) * k, b[0] + (x - b[0]) * k, b[1] + (y - b[1]) * k, b[0], b[1]);
  }
  s.closePath(); return s;
}
// Blurred silhouette of a shape, multiplied onto the surface below it.
function contactShadow(shape, w, h, cx, cy, z, strength, name) {
  const px = 24, c = document.createElement('canvas'); c.width = Math.round(w * px); c.height = Math.round(h * px);
  const ctx = c.getContext('2d'); ctx.filter = 'blur(' + Math.round(px * .22) + 'px)'; ctx.fillStyle = '#fff';
  ctx.translate(c.width / 2 - cx * px, c.height / 2 + cy * px); ctx.scale(px, -px);
  ctx.beginPath(); shape.getPoints(16).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity: strength, depthWrite: false }));
  m.position.set(cx, cy, z); m.name = name; m.renderOrder = 1; return m;
}
// Orient a mesh whose local axes (x, y, z) should map onto world vectors.
function basis(mesh, x, y, z) { mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z))); return mesh; }
function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}
function boltShape(s) {
  const p = [[.16, .5], [-.22, -.04], [.02, -.04], [-.14, -.5], [.24, .06], [.0, .06]];
  return new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x * s, y * s)));
}

// ── Display enclosure (moves with the arm) ──
function buildDisplay(M) {
  const display = new THREE.Group(); display.name = 'Display enclosure';
  // Side wall: a closed cross-section loop. Flat, sharply cut edges with
  // 0.1–0.2 mm breaks; a 0.07 cm lip round the glass; a 0.3 cm wall with a ledge
  // the glass sits on.
  const WALL = [
    [LIP, ZF + .08], [LIP, ZF], [.014, ZF], [.003, ZF + .006], [0, ZF + .018],
    [0, ZB - .07], [.004, ZB - .06], [.3, ZB - .06], [.3, ZF + .08],
  ];
  const wall = new THREE.Mesh(profileGeometry(W, H, R, WALL, true), M.body); wall.name = 'Aluminium side wall'; display.add(wall);
  // Back panel with the four port openings cut through it.
  const holes = [0, 1, 2, 3].map(i => ({ contour: pillContour(PORT_X0 + i * PORT_STEP, PORT_Y, .27, .86, 12) }));
  const back = new THREE.Mesh(profileGeometry(W - .008, H - .008, R - .004, [[0, ZB - .06], [0, ZB - .012], [.006, ZB - .003], [.016, ZB]], false, holes), M.back);
  back.name = 'Rear panel'; display.add(back);
  // Black mid-frame / chassis seen inside the frame when the layers separate.
  const tray = flatShape(W - .6, H - .6, Math.max(.05, R - .3), ZF + .55, -1, M.chassis, 'Black mid-frame'); display.add(tray);
  // Small locating notches in the glass ledge (visible once the panel lifts off).
  const notchGeo = new THREE.BoxGeometry(.7, .14, .02);
  for (const x of [-24, -12, 0, 12, 24]) for (const y of [HH - .19, -HH + .19]) {
    const n = new THREE.Mesh(notchGeo, M.dark); n.position.set(x, y, ZF + .079); n.name = 'Ledge notch'; display.add(n);
  }
  for (const y of [-9, 0, 9]) for (const x of [HW - .19, -HW + .19]) {
    const n = new THREE.Mesh(notchGeo, M.dark); n.rotation.z = Math.PI / 2; n.position.set(x, y, ZF + .079); n.name = 'Ledge notch'; display.add(n);
  }
  // Top-edge perforated grille (speakers and vents), 59.5 × 1.7 cm.
  const GL = 59.5, GD = 1.7;
  const grilleGeo = new THREE.PlaneGeometry(GL, GD); grilleGeo.rotateX(-Math.PI / 2);
  M.grille.map.repeat.set(GL / 1.44, GD / 1.44); M.grille.normalMap.repeat.copy(M.grille.map.repeat); M.grille.roughnessMap.repeat.copy(M.grille.map.repeat);
  const grille = new THREE.Mesh(grilleGeo, M.grille); grille.position.set(0, HH + .0008, -.02); grille.name = 'Top speaker grille'; display.add(grille);
  // Back: black glass Apple logo.
  const logo = makeLogo(M.logo); logo.scale.setScalar(6.9); logo.position.set(0, LOGO_Y, ZB + .0012); display.add(logo);
  // Mount plate (H): two 2 cm legs and a crossbar, screws on a 10 cm VESA square.
  const lx0 = 3.96, lx1 = 5.98, top = 5.76, bot = -13.82, c0 = -8.02, c1 = -10.18;
  const hShape = roundPoly([
    [-lx1, bot, 1.0], [-lx0, bot, 1.0], [-lx0, c1, .45], [lx0, c1, .45], [lx0, bot, 1.0], [lx1, bot, 1.0],
    [lx1, top, .35], [lx0, top, .35], [lx0, c0, .7], [-lx0, c0, .7], [-lx0, top, .35], [-lx1, top, .35],
  ]);
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(hShape, { depth: .05, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3, curveSegments: 12 }), M.plate);
  plate.position.z = ZB + .03; plate.name = 'Mount plate'; display.add(plate);
  // Soft contact shadow round the plate (the studio renders without shadow maps).
  display.add(contactShadow(hShape, 11.95 + 3, 19.6 + 3, 0, (top + bot) / 2 - .18, ZB + .0005, .2, 'Mount plate shadow'));
  const screwProfile = [[0, .085], [.1, .085], [.115, .1], [.2, .098], [.32, .088], [.4, .07], [.44, .045], [.46, .02], [.46, 0]];
  for (const x of [-4.97, 4.97]) for (const y of [5.04, -4.96]) {
    const s = lathe('Mount screw', [...screwProfile].reverse(), M.screw); s.position.set(x, y, ZB + .11); display.add(s);
    const hex = new THREE.Mesh(new THREE.CircleGeometry(.12, 6), M.dark); hex.position.set(x, y, ZB + .11 + .086); hex.name = 'Screw drive'; display.add(hex);
  }
  // Hinge tongue from the crossbar to the display pivot (inside the arm).
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(3, 1.3, SDX.pivot.displayZ - ZB), M.plate);
  tongue.position.set(0, SDX.pivot.displayY, (SDX.pivot.displayZ + ZB) / 2); tongue.name = 'Display hinge tongue'; display.add(tongue);
  // Power cable boss, black, below the mount plate.
  const boss = lathe('Power cable boss', [[0, .2], [.4, .2], [.46, .22], [.5, .26], [1.38, .26], [1.46, .24], [1.5, .19], [1.5, 0]].reverse(), M.rubber);
  boss.position.set(0, BOSS_Y, ZB); display.add(boss);
  return display;
}

// ── Ports (back, bottom-left as seen from behind) ──
function buildPorts(M) {
  const ports = new THREE.Group(); ports.name = 'Thunderbolt 5 and USB-C ports';
  const socket = new THREE.ExtrudeGeometry(pillShape(.86, .27), { depth: .05, bevelEnabled: false, curveSegments: 12 });
  const tongueGeo = new THREE.BoxGeometry(.06, .66, .03);
  for (let i = 0; i < 4; i++) {
    const x = PORT_X0 + i * PORT_STEP;
    const s = new THREE.Mesh(socket, M.dark); s.rotation.z = Math.PI / 2; s.position.set(x, PORT_Y, ZB - .11); s.name = i < 2 ? 'USB-C port' : 'Thunderbolt 5 port'; ports.add(s);
    const t = new THREE.Mesh(tongueGeo, M.tongue); t.position.set(x, PORT_Y, ZB - .045); t.name = 'Port tongue'; ports.add(t);
    if (i >= 2) {
      const b = new THREE.Mesh(new THREE.ShapeGeometry(boltShape(.24)), M.glyph); b.position.set(x, PORT_Y + .73, ZB + .0006); b.name = 'Thunderbolt glyph'; ports.add(b);
    }
  }
  const led = new THREE.Mesh(new THREE.CircleGeometry(.045, 20), M.dark); led.position.set(PORT_X0 + 3 * PORT_STEP, PORT_Y - .62, ZB + .0006); led.name = 'Status LED'; ports.add(led);
  return ports;
}

// ── Display stack: panel (cover glass + LCD), optical films, diffuser and
// mini-LED backlight. Assembled they sit inside the frame; setProgress lifts
// them forward and steps each one inward. ──
function buildLayers(M, screenMaterial) {
  const layers = new THREE.Group(); layers.name = 'Display stack (mini-LED layers)';
  const sheet = (name, inset, z0, z1, material, r) => {
    const g = new THREE.Group(); g.name = name;
    const m = new THREE.Mesh(profileGeometry(W - 2 * inset, H - 2 * inset, r ?? Math.max(.06, R - inset), [[0, z0], [0, z1]]), material); m.name = name; g.add(m);
    layers.add(g); return g;
  };
  const led = sheet('Mini-LED backlight', .62, ZF + .3, ZF + .34, M.led, .1);
  // UV unit of the profile caps is 1.4 cm; 4 emitters per tile at 0.3 cm pitch.
  M.led.userData.maps.map.repeat.set(1.4 / 1.2, 1.4 / 1.2); M.led.userData.maps.emissiveMap.repeat.copy(M.led.userData.maps.map.repeat);
  const diffuser = sheet('Diffuser', .5, ZF + .24, ZF + .28, M.diffuser, .12);
  const film1 = sheet('Optical film', .45, ZF + .19, ZF + .21, M.film, .12);
  const film2 = sheet('Brightness enhancement film', .4, ZF + .14, ZF + .16, M.filmBlue, .12);
  const panel = new THREE.Group(); panel.name = 'LCD panel and cover glass'; layers.add(panel);
  const glass = new THREE.Mesh(profileGeometry(W - 2 * LIP - .004, H - 2 * LIP - .004, R - LIP, [[.01, ZF], [.004, ZF + .0012], [0, ZF + .006], [0, ZF + .08]]), M.glass);
  glass.name = 'Cover glass'; panel.add(glass);
  const lcd = new THREE.Mesh(profileGeometry(ACTIVE.w + .6, ACTIVE.h + .6, .3, [[0, ZF + .08], [0, ZF + .13]]), M.chassis); lcd.name = 'LCD cell'; panel.add(lcd);
  const screen = flatShape(ACTIVE.w, ACTIVE.h, ACTIVE.r, ZS, -1, screenMaterial, 'Active display'); panel.add(screen);
  // Screen UVs: 0..1 across the active area, upright seen from the front
  // (the viewer's right is −X).
  const uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (ACTIVE.w / 2 - p.getX(i)) / ACTIVE.w, (p.getY(i) + ACTIVE.h / 2) / ACTIVE.h);
  uv.needsUpdate = true;
  // 12MP Center Stage camera in the top bezel.
  const win = new THREE.Mesh(new THREE.CircleGeometry(.15, 40), M.camWin); win.rotation.y = Math.PI; win.position.set(0, CAM_Y, ZS - .0002); win.name = 'Camera window'; panel.add(win);
  const lens = glassElement('Center Stage camera lens', .075, .008, opticalCoating(1)); lens.rotation.y = Math.PI; lens.position.set(0, CAM_Y, ZS - .0006); panel.add(lens);
  const als = new THREE.Mesh(new THREE.CircleGeometry(.05, 24), M.camWin); als.rotation.y = Math.PI; als.position.set(-.9, CAM_Y, ZS - .0002); als.name = 'Ambient light sensor'; panel.add(als);
  // Explode order, back to front: z travel (forward = −Z) and inward scale.
  const stack = [[led, 1.4, .008], [diffuser, 3.8, .02], [film1, 5.8, .03], [film2, 7.6, .04], [panel, 10.5, .055]];
  return { layers, stack, panel };
}

// ── Stand: foot, plinth, fillet and column with the cable pass-through ──
function buildStand(M) {
  const stand = new THREE.Group(); stand.name = 'Stand';
  const C = SDX.column, F = SDX.foot;
  const zc = C.zFront + C.d / 2, colH = C.top - F.t, yc = F.t + colH / 2;
  const holeY = (13.65 + 22.75) / 2 - yc;
  const half = C.d / 2;
  const colProfile = [[.07, -half], [.02, -half + .006], [.004, -half + .03], [0, -half + .07], [0, half - .07], [.004, half - .03], [.02, half - .006], [.07, half]];
  const column = new THREE.Mesh(profileGeometry(C.w, colH, [C.r, C.r, .02, .02], colProfile, false, [{ contour: pillContour(0, holeY, 4.7, 9.1, 28) }]), M.stand);
  column.position.set(0, yc, zc); column.name = 'Column'; stand.add(column);
  // Polished chamfer round the cable pass-through on both faces.
  const ring = new THREE.ExtrudeGeometry(pillShape(9.1 + .16, 4.7 + .16, .1), { depth: .004, bevelEnabled: true, bevelThickness: .02, bevelSize: .03, bevelSegments: 3, curveSegments: 24 });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(ring, M.polished); m.rotation.z = Math.PI / 2; m.position.set(0, yc + holeY, zc + s * (half - .012)); m.name = 'Cable pass-through chamfer'; stand.add(m);
  }
  // Hinge tongue reaching from the column to the arm's rear pivot (hidden inside the arm).
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(3, 1.3, C.zFront - SDX.pivot.z), M.stand);
  tongue.position.set(0, SDX.pivot.y, (C.zFront + SDX.pivot.z) / 2); tongue.name = 'Column hinge tongue'; stand.add(tongue);
  // Fillet: concave arcs from the column faces into the foot (side profile in Z–Y).
  const RF = 1.5, RB = 1.0, y0 = F.t - .02, zf = C.zFront, zb = C.zFront + C.d;
  const fs = new THREE.Shape();
  fs.moveTo(zf - RF, y0); fs.absarc(zf - RF, y0 + RF, RF, -Math.PI / 2, 0, false);
  fs.lineTo(zf, y0 + RF + .2); fs.lineTo(zb, y0 + RF + .2); fs.lineTo(zb, y0 + RB);
  fs.absarc(zb + RB, y0 + RB, RB, Math.PI, Math.PI * 1.5, false); fs.lineTo(zb + RB, y0 - .05); fs.lineTo(zf - RF, y0 - .05); fs.closePath();
  const fillet = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: C.w - .1, bevelEnabled: false, curveSegments: 24 }), M.stand);
  basis(fillet, [0, 0, 1], [0, 1, 0], [-1, 0, 0]); fillet.position.x = (C.w - .1) / 2; fillet.name = 'Column fillet'; stand.add(fillet);
  // Foot plate (plan in X–Z) and the slim inset plinth under it.
  const footProfile = [[.18, F.t - F.plate], [.05, F.t - F.plate], [.012, F.t - F.plate + .012], [0, F.t - F.plate + .05], [0, F.t - .06], [.014, F.t - .015], [.05, F.t - .002], [.1, F.t]];
  const foot = new THREE.Mesh(profileGeometry(F.w, F.d, F.r, footProfile), M.stand);
  foot.rotation.x = -Math.PI / 2; foot.position.z = (F.z0 + F.z1) / 2; foot.name = 'Foot'; stand.add(foot);
  const plinth = new THREE.Mesh(profileGeometry(F.w - .6, F.d - .6, F.r - .3, [[0, 0], [0, F.t - F.plate + .01]]), M.plinth);
  plinth.rotation.x = -Math.PI / 2; plinth.position.z = (F.z0 + F.z1) / 2; plinth.name = 'Foot plinth'; stand.add(plinth);
  return stand;
}

// ── Arm: pill-shaped link with polished pivot caps on both sides ──
function buildArm(M) {
  const arm = new THREE.Group(); arm.name = 'Counterbalanced arm';
  const A = SDX.arm, bev = .2;
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(pillShape(A.L + A.h - 2 * bev, A.h - 2 * bev), { depth: A.w - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 8, curveSegments: 48 }), M.arm);
  body.geometry.translate(0, 0, -(A.w - 2 * bev) / 2);
  // Shape x runs along the arm (local −Z), extrusion across it (X).
  basis(body, [0, 0, -1], [0, 1, 0], [1, 0, 0]); body.position.z = -A.L / 2; body.name = 'Arm link'; arm.add(body);
  // Polished pivot caps on both side faces.
  const capProfile = [[0, .05], [.09, .05], [.12, .035], [.15, .045], [.2, .055], [.52, .07], [.58, .062], [.615, .04], [.625, .015], [.625, 0]];
  for (const s of [-1, 1]) {
    for (const z of [0, -A.L]) {
      const cap = lathe('Polished pivot cap', [...capProfile].reverse(), M.polished);
      const holder = new THREE.Group(); holder.rotation.y = s * Math.PI / 2; holder.position.set(s * A.w / 2, 0, z); holder.add(cap); arm.add(holder);
      const well = new THREE.Mesh(new THREE.RingGeometry(.625, .66, 48), M.seam); well.rotation.y = s * Math.PI / 2; well.position.set(s * (A.w / 2 + .0012), 0, z); well.name = 'Pivot cap gap'; arm.add(well);
    }
  }
  return arm;
}

export function createStudioDisplay() {
  const root = new THREE.Group(); root.name = 'Studio Display XDR';
  const M = makeMaterials();
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';

  const stand = buildStand(M); root.add(stand);
  const armPivot = new THREE.Object3D(); armPivot.name = 'Column pivot'; armPivot.position.set(0, SDX.pivot.y, SDX.pivot.z); root.add(armPivot);
  const arm = buildArm(M); armPivot.add(arm);
  const headPivot = new THREE.Object3D(); headPivot.name = 'Display pivot'; headPivot.position.set(0, 0, -SDX.arm.L); armPivot.add(headPivot);
  const head = new THREE.Group(); head.name = 'Display head'; head.position.set(0, -SDX.pivot.displayY, -SDX.pivot.displayZ); headPivot.add(head);
  const display = buildDisplay(M); head.add(display);
  const ports = buildPorts(M); head.add(ports);
  const { layers, stack, panel } = buildLayers(M, screenMaterial); head.add(layers);
  const groups = { display, layers, internals: layers, ports, stand, arm };

  // ── Anchors ──
  const C = SDX.column;
  const anchors = {
    camera: anchor(panel, 'camera', 0, CAM_Y, ZF - .01, [0, 0, -1]),
    ports: anchor(ports, 'ports', PORT_X0 + 1.5 * PORT_STEP, PORT_Y, ZB + .01, [0, 0, 1]),
    stand: anchor(stand, 'foot', 0, SDX.foot.t, (SDX.foot.z0 + C.zFront) / 2, [0, 1, 0]),
    arm: anchor(arm, 'arm', SDX.arm.w / 2, 0, -SDX.arm.L / 2, [1, 0, 0]),
    hinge: anchor(arm, 'column pivot', SDX.arm.w / 2 + .07, 0, 0, [1, 0, 0]),
    displayHinge: anchor(arm, 'display pivot', SDX.arm.w / 2 + .07, 0, -SDX.arm.L, [1, 0, 0]),
    logo: anchor(display, 'logo', 0, LOGO_Y, ZB + .01, [0, 0, 1]),
    cable: anchor(stand, 'cable pass-through', 0, 18.2, C.zFront + C.d + .01, [0, 0, 1]),
    boss: anchor(display, 'cable boss', 0, BOSS_Y, ZB + .5, [0, 0, 1]),
    speakers: anchor(display, 'top grille', 0, HH + .01, 0, [0, 1, 0]),
    corner: anchor(display, 'top-left corner (front)', HW - 3.2, HH - 2.8, ZF, [0, 0, -1]),
    // Phone-oriented moves: camera aliases and side/back features.
    control: anchor(arm, 'pivot cap', SDX.arm.w / 2 + .07, 0, -SDX.arm.L, [1, 0, 0]),
    volume: anchor(display, 'side edge', HW + .01, 0, 0, [1, 0, 0]),
    action: anchor(display, 'mount plate', 0, -9.1, ZB + .11, [0, 0, 1]),
    topButton: anchor(display, 'top edge', -HW + 8, HH + .01, 0, [0, 1, 0]),
    center: anchor(root, 'center', 0, 0, 0, null),
  };
  anchors.island = anchors.main = anchors.array = anchors.camera;
  anchors.usb = anchors.ports;
  // Screen anchors in the display's reading frame (fractions of half extents).
  const SCREEN = {
    scrTop: [0, .74], scrUpper: [0, .385], scrMid: [0, 0], scrLower: [0, -.385], scrBottom: [0, -.74],
    scrTL: [-.7, .7], scrTR: [.7, .7], scrBL: [-.7, -.7], scrBR: [.7, -.7], scrLeft: [-.62, .08], scrRight: [.62, -.08],
  };
  for (const [k, [fr, fu]] of Object.entries(SCREEN)) anchors[k] = anchor(panel, k, -fr * ACTIVE.w / 2, fu * ACTIVE.h / 2, ZF - .001, [0, 0, -1]);

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

  // ── Articulation: height 0 = bottom (47.8 cm overall), 1 = top (58.3 cm);
  // tilt in degrees, −5 (forward) to +25 (back). The arm swings about the
  // column pivot; the display pivot counter-rotates so tilt is independent. ──
  let heightT = .5, tiltDeg = 0;
  function pose() {
    const a = THREE.MathUtils.degToRad((heightT * 2 - 1) * SDX.arm.swing);
    armPivot.rotation.x = a;
    headPivot.rotation.x = -a + THREE.MathUtils.degToRad(tiltDeg);
    root.updateMatrixWorld(true);
  }
  function setHeight(t) { heightT = THREE.MathUtils.clamp(t, 0, 1); pose(); }
  function setTilt(deg) { tiltDeg = THREE.MathUtils.clamp(deg, SDX.tilt.min, SDX.tilt.max); pose(); }

  // ── Exploded view: the display stack lifts forward out of the frame, each
  // layer stepping inward (the photographic peel of Apple's corner shot). ──
  let progress = 0;
  function setProgress(value) {
    const t = progress = THREE.MathUtils.clamp(value, 0, 1);
    const e = t * t * (3 - 2 * t);
    for (const [g, dz, shrink] of stack) {
      g.position.z = -dz * e;
      const s = 1 - shrink * e; g.scale.set(s, s, 1);
    }
  }

  function setFinish(hex) { applyFinish(M, hex); }
  // Standard or nano-texture glass.
  function setGlass(kind) {
    const nano = kind === 'nano';
    M.glass.roughness = nano ? .32 : .07; M.glass.clearcoat = nano ? 0 : 1;
    screenMaterial.color.setScalar(nano ? .97 : 1);
  }

  setFinish(sdxFinishes[0][1]);
  setProgress(0); pose();
  return {
    root, groups, screenMaterial, setFinish, setProgress, setHeight, setTilt, setGlass, points, materials: M,
    state: () => ({ height: heightT, tilt: tiltDeg }),
    setState(s) { if (s) { if (s.height !== undefined) heightT = THREE.MathUtils.clamp(s.height, 0, 1); if (s.tilt !== undefined) tiltDeg = THREE.MathUtils.clamp(s.tilt, SDX.tilt.min, SDX.tilt.max); pose(); } },
    get progress() { return progress; }, get height() { return heightT; }, get tilt() { return tiltDeg; },
  };
}
