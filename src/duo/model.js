import * as THREE from 'three';
import { profileGeometry, perimeter } from '../casework.js';
import { makeLens, glassElement, opticalCoating } from '../optics.js';
import { makeLogo } from '../exterior.js';
import { outerLockScreen, outerStandBy } from './screens.js';

// iPhone Duo, procedural. 1 unit = 1 cm. Apple's figures: closed 84.1 × 117.8 ×
// 11.3 mm, open 164.6 × 117.8 × 5.2 mm. The hinge runs along the 117.8 mm height
// (+Y). In the open pose the inner display faces -Z and both outer faces +Z.
//
// Two rigid halves share one hinge axis that lies just in front of the inner
// display plane, so the screen halves meet at the crease in every pose and the
// rear corners swing on a circle around it. The camera half (B, x < 0 when open)
// keeps its orientation; the display half (A) turns about the axis by
//   alpha = PI * (1 - progress)   (progress 0 = closed, 1 = flat open).
// A flat polished spine bar bridges the rear hinge corners. Every moving
// part is a node transform, so the fold also bakes into the GLB animation.
export const DUO = { W: 8.23, H: 11.78, T: 0.52, GAP: 0.09 };
const W = DUO.W, H = DUO.H, HW = W / 2, HH = H / 2, HT = DUO.T / 2;
const ZH = -HT - DUO.GAP / 2;               // hinge axis, in the open frame
const CORNER_R = HT - ZH;                   // rear hinge corners sit on this circle
// Spine bar thickness: 84.1 mm closed width - 82.3 mm half width.
const SPINE_T = 0.18;
const RF = 1.1, RH = 0.12;                  // free-edge and hinge-edge corner radii
// Inner display 7.6" at 2670 × 1878 px -> 15.79 × 11.10 cm active area.
const INNER = { w: 15.79, h: 11.1, r: RF - 0.335 };   // uniform bezel around the corner
// Outer display 5.4" at 1398 × 2034 px -> 7.77 × 11.30 cm active area.
const OUTER = { w: 7.77, h: 11.3, rFree: RF - 0.24, rHinge: 0.3, hingeBorder: 0.2 };
export const INNER_ASPECT = INNER.w / INNER.h;

// Mirror-polished flat band: near-vertical sides with a ~0.4 mm fillet where
// the band meets the front and back glass (flat-sided, not pillowed).
const RAIL = [[.04,-.26],[.022,-.2585],[.01,-.2545],[.003,-.248],[0,-.238],[0,.238],[.003,.248],[.01,.2545],[.022,.2585],[.04,.26]];

export const duoFinishes = [
  // name, satin back glass, mirror-polished frame, camera plateau.
  // Index 1 is the Duo's default (the studio's first-load finish slot).
  ['Cloud white', '#e7e5e0', '#d9d9d6', '#dedcd6'],
  ['Graphite', '#222224', '#3c3d41', '#1a1a1c'],
  ['Night Sky', '#394555', '#3a4b61', '#1d2734'],
  ['Black', '#19191b', '#4a4b50', '#151517'],
  ['Slate', '#5b6168', '#6c737b', '#474c52'],
  ['Sage', '#8e9c88', '#9aa894', '#7a8775'],
  ['Sand', '#cbbfa8', '#c9bda6', '#b8ad97'],
  ['Mist blue', '#9fb3c8', '#a5b8cc', '#8c9fb3'],
  ['Lavender', '#b3a9c9', '#b7aecb', '#9e95b4'],
  ['Burgundy', '#5a2a33', '#6b3a43', '#46212a'],
];

function cornerRadii(hingeSign, free, hinge) {
  // Order: top-right, top-left, bottom-left, bottom-right.
  return hingeSign > 0 ? [hinge, free, free, hinge] : [free, hinge, hinge, free];
}

function flatShape(w, h, radii, cx, cy, z, facing, material, name) {
  const pts = perimeter(w, h, radii).map(([x, y]) => new THREE.Vector2(x + cx, y + cy));
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(pts), 24);
  orientFlat(geometry, z, facing);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

// ShapeGeometry faces +Z. Facing -Z reverses the winding and normals in place.
function orientFlat(geometry, z, facing) {
  const pos = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  for (let i = 0; i < pos.count; i++) { pos.setZ(i, z); normal.setXYZ(i, 0, 0, facing); }
  if (facing < 0) {
    const index = geometry.index.array;
    for (let i = 0; i < index.length; i += 3) { const t = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = t; }
  }
}

function disc(radius, depth, material, segments = 48) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function creaseTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 4;
  const ctx = c.getContext('2d'), g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.75, 'rgba(0,0,0,.025)');
  g.addColorStop(.95, 'rgba(0,0,0,.06)'); g.addColorStop(1, 'rgba(0,0,0,.11)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function anchor(parent, name, x, y, z, normal) {
  const o = new THREE.Object3D(); o.name = 'Anchor ' + name; o.position.set(x, y, z);
  o.userData.normal = normal ? new THREE.Vector3(...normal) : null; parent.add(o); return o;
}

export function createDuo() {
  const root = new THREE.Group(); root.name = 'iPhone Duo';
  // Pose group: whole-device orientation used by the Duo moves (book,
  // portrait, seated, standing...). Shots orient the root instead.
  const pose = new THREE.Group(); pose.name = 'Pose'; root.add(pose);
  const rig = new THREE.Group(); rig.name = 'Fold rig'; pose.add(rig);

  const M = {
    // Liquid-metal polish: mirror stainless with a clear lacquer layer.
    rail: new THREE.MeshPhysicalMaterial({ name: 'Polished frame', color: 0xd9d9d6, metalness: 1, roughness: .06, clearcoat: 1, clearcoatRoughness: .03 }),
    spine: new THREE.MeshPhysicalMaterial({ name: 'Satin hinge spine', color: 0xcfcfcc, metalness: 1, roughness: .24, clearcoat: .55, clearcoatRoughness: .18 }),
    band: new THREE.MeshStandardMaterial({ name: 'Antenna band', color: 0xbfbfbb, metalness: .15, roughness: .55 }),
    // Satin frosted glass: soft broad sheen, no sharp gloss.
    back: new THREE.MeshPhysicalMaterial({ name: 'Satin back glass', color: 0xe7e5e0, metalness: 0, roughness: .58, sheen: .18, sheenRoughness: .8, sheenColor: 0xffffff, clearcoat: .12, clearcoatRoughness: .6 }),
    // Smoked glass plateau: darker than the back and glossy, as on the device.
    plateau: new THREE.MeshPhysicalMaterial({ name: 'Camera plateau', color: 0xe7e5e0, metalness: 0, roughness: .3, clearcoat: 1, clearcoatRoughness: .1 }),
    logo: new THREE.MeshPhysicalMaterial({ name: 'Polished insignia', color: 0xd9d8d4, metalness: .7, roughness: .2 }),
    glass: new THREE.MeshPhysicalMaterial({ name: 'Display cover glass', color: 0x07080a, metalness: .5, roughness: .16, clearcoat: .6, clearcoatRoughness: .05 }),
    dark: new THREE.MeshStandardMaterial({ name: 'Port shadow', color: 0x050506, metalness: .2, roughness: .8 }),
    seam: new THREE.MeshStandardMaterial({ name: 'Button gap', color: 0x111214, metalness: .6, roughness: .45 }),
    flashHousing: new THREE.MeshPhysicalMaterial({ color: 0x8d8d8a, metalness: .85, roughness: .26 }),
    diffuser: new THREE.MeshPhysicalMaterial({ color: 0xece6d6, metalness: .05, roughness: .3 }),
    pill: new THREE.MeshBasicMaterial({ name: 'Camera cutout', color: 0x020203 }),
    led: new THREE.MeshBasicMaterial({ name: 'Camera indicator', color: 0x37d35f, toneMapped: false }),
  };
  M.rail.envMapIntensity = 2.4; M.spine.envMapIntensity = 2.2;
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  screenMaterial.name = 'Editable screen artwork';
  // Per-half screen effects for the moves. The inner artwork's u runs 0…0.5 on
  // the display half (A, viewer's left when open) and 0.5…1 on the camera half.
  //   blur: lens-like defocus (UV radius), with a darkening that grows toward
  //         the outer edge, as on a half turning away from the camera
  //   dim:  fade to black (0 = on, 1 = off)
  const fx = { duoBlur: { value: new THREE.Vector2() }, duoDim: { value: new THREE.Vector2() } };
  screenMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fx);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vDuoU;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvDuoU = uv.x;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vDuoU;
uniform vec2 duoBlur, duoDim;
vec4 duoTap(sampler2D tex, vec2 uv, float bias) {
  vec4 c = texture2D(tex, uv, bias);
  #ifdef DECODE_VIDEO_TEXTURE
  c = sRGBTransferEOTF(c);
  #endif
  return c;
}`)
      .replace('#include <map_fragment>', `
float duoSide = smoothstep(.488, .512, vDuoU);
float duoB = mix(duoBlur.x, duoBlur.y, duoSide);
#ifdef USE_MAP
  vec4 sampledDiffuseColor = duoTap(map, vMapUv, 0.);
  if (duoB > .0004) {
    // Golden-angle disc of taps on a mip-biased lookup: smooth wide defocus.
    float bias = clamp(log2(duoB * 1456.) - 2., 0., 7.);
    vec4 acc = vec4(0.);
    for (int i = 0; i < 20; i++) {
      float a = float(i) * 2.39996, r = sqrt((float(i) + .5) / 20.);
      acc += duoTap(map, vMapUv + vec2(cos(a), sin(a) * 1.42) * r * duoB, bias);
    }
    sampledDiffuseColor = mix(sampledDiffuseColor, acc / 20., clamp(duoB / .004, 0., 1.));
  }
  diffuseColor *= sampledDiffuseColor;
#endif
float duoEdge = duoSide > .5 ? (vDuoU - .5) * 2. : (.5 - vDuoU) * 2.;
diffuseColor.rgb *= 1. - clamp(duoB / .05, 0., 1.) * (.18 + .6 * smoothstep(.0, 1., duoEdge));
diffuseColor.rgb *= 1. - mix(duoDim.x, duoDim.y, duoSide);`);
  };
  screenMaterial.customProgramCacheKey = () => 'duo-inner-screen-fx';
  const defaultLock = outerLockScreen(); let lockScreen = defaultLock, standBy = null;
  const outerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, map: lockScreen });
  outerMaterial.name = 'Outer display lock screen';
  // Cover display defocus for the fold handoff (UV radius, 0 = sharp).
  fx.duoCover = { value: 0 };
  outerMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.duoCover = fx.duoCover;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float duoCover;')
      .replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D(map, vMapUv);
  if (duoCover > .0004) {
    float bias = clamp(log2(duoCover * 1456.) - 2., 0., 7.);
    vec4 acc = vec4(0.);
    for (int i = 0; i < 20; i++) {
      float a = float(i) * 2.39996, r = sqrt((float(i) + .5) / 20.);
      acc += texture2D(map, vMapUv + vec2(cos(a), sin(a) * .69) * r * duoCover, bias);
    }
    sampledDiffuseColor = mix(sampledDiffuseColor, acc / 20., clamp(duoCover / .004, 0., 1.));
  }
  diffuseColor *= sampledDiffuseColor;
#endif`);
  };
  outerMaterial.customProgramCacheKey = () => 'duo-cover-screen-fx';
  const creaseMaterial = new THREE.MeshBasicMaterial({ map: creaseTexture(), transparent: true, depthWrite: false, toneMapped: false });

  const groups = {};
  const parts = { frame: [], display: [], outer: [], back: [], cameras: [] };
  const sub = (half, key) => { const g = new THREE.Group(); g.name = half.name + ' · ' + key; half.add(g); parts[key].push(g); return g; };

  // ── Shared half shell ──────────────────────────────────────────────
  function buildHalf(name, hingeSign) {
    const half = new THREE.Group(); half.name = name;
    const frame = sub(half, 'frame'), display = sub(half, 'display');
    const radii = cornerRadii(hingeSign, RF, RH);
    const rail = new THREE.Mesh(profileGeometry(W, H, radii, RAIL, false), M.rail);
    rail.name = 'Polished rail'; frame.add(rail);

    // Inner display: black cover glass runs to the hinge edge so the two halves
    // read as one sheet with only a hairline crease.
    const plateW = W - .035;
    const plate = new THREE.Mesh(profileGeometry(plateW, H - .07, cornerRadii(hingeSign, RF - .035, .02), [[0,-.2625],[0,-.257],[.008,-.25]], false), M.glass);
    plate.position.x = hingeSign * .0175; plate.name = 'Inner cover glass'; display.add(plate);
    const activeW = INNER.w / 2, x0 = hingeSign > 0 ? HW - activeW : -HW;
    const screen = flatShape(activeW, INNER.h, cornerRadii(hingeSign, INNER.r, .01), x0 + activeW / 2, 0, -.2635, -1, screenMaterial, 'Inner display');
    // Artwork spans both halves. Seen from -Z the open +X half is the viewer's left.
    const halfCenter = -hingeSign * HW, uv = screen.geometry.getAttribute('uv'), p = screen.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (INNER.w / 2 - (p.getX(i) + halfCenter)) / INNER.w, (p.getY(i) + INNER.h / 2) / INNER.h);
    display.add(screen);
    const crease = new THREE.Mesh(new THREE.PlaneGeometry(.34, INNER.h), creaseMaterial);
    crease.rotation.y = Math.PI; crease.position.set(hingeSign * (HW - .17), 0, -.264);
    if (hingeSign > 0) crease.scale.x = -1;
    crease.name = 'Fold crease'; crease.renderOrder = 2; display.add(crease);

    // Lighter antenna breaks across the rail (positions from Apple's edge drawing).
    const bandsTop = hingeSign > 0 ? [2.595, -2.595] : [2.615, -2.595];
    const bandsBottom = hingeSign > 0 ? [1.275, -1.265] : [1.285, -1.265];
    for (const [list, y] of [[bandsTop, HH], [bandsBottom, -HH]]) for (const x of list) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(.05, .006, .46), M.band);
      band.position.set(x, y + Math.sign(y) * .0015, 0); band.name = 'Antenna break'; frame.add(band);
    }
    for (const y of [4.4, -4.4]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(.006, .05, .46), M.band);
      band.position.set(-hingeSign * (HW + .0015), y, 0); band.name = 'Antenna break'; frame.add(band);
    }
    return { half, frame, display };
  }

  function edgeButton(parent, length, along, x, y, outward) {
    const geo = new THREE.CapsuleGeometry(.085, length - .17, 6, 20);
    for (const [mat, grow, push, name] of [[M.seam, .018, -.012, 'Button recess'], [M.rail, 0, .008, 'Button']]) {
      const b = new THREE.Mesh(geo, mat);
      b.scale.set(.55 + grow * 3, 1 + grow, 1 + grow * 2.4);
      if (along === 'x') b.rotation.z = Math.PI / 2;
      b.position.set(x + outward[0] * push, y + outward[1] * push, 0);
      b.name = name; parent.add(b);
    }
  }
  function edgeHoles(parent, xs, y, r = .042) {
    for (const x of xs) {
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .04, 20), M.dark);
      hole.position.set(x, y - Math.sign(y) * .0155, 0); hole.name = 'Acoustic hole'; parent.add(hole);
    }
  }

  // ── Half B: camera half (fixed) ───────────────────────────────────
  const B = buildHalf('Camera half', +1);
  B.half.position.x = -HW; rig.add(B.half);
  const back = sub(B.half, 'back'), cameras = sub(B.half, 'cameras');
  const backGlass = new THREE.Mesh(profileGeometry(W, H, cornerRadii(1, RF, RH), [[.045,.25],[.036,.257],[.038,.2625]], false), M.back);
  backGlass.name = 'Matte back glass'; back.add(backGlass);
  const logo = makeLogo(M.logo); logo.scale.setScalar(1.5); logo.position.set(0, -.35, .2626); back.add(logo);

  // Stadium camera plateau (top-left seen from behind = toward the free edge).
  // Lenses take about 70% of the plateau height (Apple product imagery).
  const pill = { x: -1.09, y: 4.36, w: 5.29, h: 2.28 };
  const plateau = new THREE.Mesh(profileGeometry(pill.w, pill.h, pill.h / 2 - .002, [[0,.25],[0,.285],[.028,.32],[.075,.341],[.14,.35]], false), M.plateau);
  plateau.position.set(pill.x, pill.y, 0); plateau.name = 'Camera plateau'; back.add(plateau);
  const lensY = 4.36, lensZ = .35;
  const optics = [];
  [[-2.605, 0, 'Fusion Ultra Wide'], [-1.055, 1, 'Fusion Main']].forEach(([x, index, label]) => {
    const unit = new THREE.Group(); unit.name = label + ' camera'; unit.position.set(x, lensY, lensZ); cameras.add(unit);
    const lens = makeLens(M, .785, index, 'duo');
    lens.root.name = label + ' optics'; unit.add(lens.root);
    optics.push(lens);
  });
  const flash = new THREE.Group(); flash.name = 'True Tone flash'; flash.position.set(.55, 3.93, lensZ); cameras.add(flash);
  { const housing = disc(.205, .04, M.flashHousing); housing.position.z = .012; flash.add(housing);
    const cap = disc(.165, .012, M.diffuser); cap.position.z = .033; flash.add(cap);
    const grooves = new THREE.MeshStandardMaterial({ color: 0xbab9b1, metalness: .35, roughness: .4 });
    for (let i = 0; i < 8; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.045 + i * .015, .0026, 6, 48), grooves); ring.position.z = .04; flash.add(ring); } }
  const slot = new THREE.Mesh(profileGeometry(.36, .1, .049, [[0,.0],[0,.006]], false), M.dark);
  slot.position.set(.55, 4.8, lensZ - .002); slot.name = 'Microphone slot'; cameras.add(slot);

  edgeButton(B.frame, 1.1, 'x', -1.435, HH, [0, 1]);
  edgeButton(B.frame, 1.1, 'x', -.11, HH, [0, 1]);
  edgeButton(B.frame, 1.8, 'y', -HW, 1.62, [-1, 0]);
  edgeHoles(B.frame, [1.765, 1.965, 2.165, 2.365, -2.485, -2.285, -2.085, -1.885], -HH);

  // ── Half A: display half (turns about the hinge) ───────────────────
  const pivot = new THREE.Group(); pivot.name = 'Hinge pivot'; pivot.position.z = ZH; rig.add(pivot);
  const A = buildHalf('Display half', -1);
  A.half.position.set(HW, 0, -ZH); pivot.add(A.half);
  const outer = sub(A.half, 'outer');
  const outerGlass = new THREE.Mesh(profileGeometry(W, H, cornerRadii(-1, RF, RH), [[.045,.25],[.036,.257],[.038,.2625]], false), M.glass);
  outerGlass.name = 'Outer cover glass'; outer.add(outerGlass);
  const ox0 = -HW + OUTER.hingeBorder, ocx = ox0 + OUTER.w / 2;
  const outerScreen = flatShape(OUTER.w, OUTER.h, cornerRadii(-1, OUTER.rFree, OUTER.rHinge), ocx, 0, .2635, 1, outerMaterial, 'Outer display');
  { const uv = outerScreen.geometry.getAttribute('uv'), p = outerScreen.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - ox0) / OUTER.w, (p.getY(i) + OUTER.h / 2) / OUTER.h); }
  outer.add(outerScreen);
  // Vertical pill-shaped front camera in the top corner by the free edge.
  const cam = { x: 3.065, y: 4.69 };
  const cutout = flatShape(.5, .95, .249, cam.x, cam.y, .2641, 1, M.pill, 'Front camera cutout'); cutout.renderOrder = 1; outer.add(cutout);
  const frontLens = glassElement('Front camera lens', .13, .01, opticalCoating(1)); frontLens.position.set(cam.x, cam.y + .16, .2645); outer.add(frontLens);
  const ledDot = disc(.034, .002, M.led, 20); ledDot.position.set(cam.x, cam.y - .25, .2645); ledDot.name = 'Camera-in-use indicator'; outer.add(ledDot);
  // Faint under-display FaceTime camera on the inner screen.
  // Round punch-hole FaceTime camera, top right of the inner display as seen open.
  { const hole = new THREE.Mesh(new THREE.CircleGeometry(.15, 48), M.pill);
    hole.rotation.y = Math.PI; hole.position.set(-HW + .335 + .62, HH - .34 - .62, -.2641); hole.name = 'Inner camera punch-hole'; hole.renderOrder = 3; B.display.add(hole);
    const lens = glassElement('Inner camera lens', .085, .008, opticalCoating(1)); lens.rotation.y = Math.PI; lens.position.copy(hole.position).setZ(-.2643); B.display.add(lens); }

  edgeHoles(A.frame, [-.3, -.1, .1, .3, .5, .7], HH);
  // USB-C on the lower edge, flanked by microphones.
  const port = new THREE.Mesh(profileGeometry(.86, .28, .139, [[0,-.035],[0,.004]], false), M.dark);
  port.rotation.x = Math.PI / 2; port.position.set(0, -HH, 0); port.name = 'USB-C port'; A.frame.add(port);
  edgeHoles(A.frame, [-.73, .73], -HH, .036);

  // ── Hinge spine ──────────────────────────────────────────────────
  const spine = new THREE.Group(); spine.name = 'Hinge spine'; spine.position.z = ZH; rig.add(spine);
  // The bar lies on the chord between the two rear hinge corners and is scaled
  // across that chord, so it closes to nothing when open and spans the full
  // closed thickness when folded.
  const bisector = new THREE.Group(); bisector.name = 'Fold bisector'; spine.add(bisector);
  // Closed, the spine reads as a satin island: about 70% of the folded
  // thickness, inset from both ends, softly rounded, with each half's polished
  // rail showing either side of it. Built at its closed width and scaled with
  // the fold chord.
  const CHORD = 2 * CORNER_R, ISLE_W = CHORD * .7, ISLE_H = H - .62, ISLE_R = .26, BEV = .035;
  const isle = new THREE.Shape();
  { const w = ISLE_W / 2 - BEV, h = ISLE_H / 2 - BEV, r = Math.min(ISLE_R, w - .001);
    isle.moveTo(-w + r, -h); isle.lineTo(w - r, -h); isle.quadraticCurveTo(w, -h, w, -h + r);
    isle.lineTo(w, h - r); isle.quadraticCurveTo(w, h, w - r, h); isle.lineTo(-w + r, h);
    isle.quadraticCurveTo(-w, h, -w, h - r); isle.lineTo(-w, -h + r); isle.quadraticCurveTo(-w, -h, -w + r, -h); }
  const isleGeo = new THREE.ExtrudeGeometry(isle, { depth: SPINE_T - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 4, curveSegments: 18 });
  isleGeo.translate(0, 0, -(SPINE_T - 2 * BEV) / 2); isleGeo.scale(1 / CHORD, 1, 1);
  const bar = new THREE.Mesh(isleGeo, M.spine);
  bar.name = 'Spine bar'; bisector.add(bar);
  parts.frame.push(spine);

  // ── Anchors for camera moves and shots ────────────────────────────
  const anchors = {
    array: anchor(cameras, 'array', pill.x, pill.y, .55, [0, 0, 1]),
    ultra: anchor(cameras, 'ultra', -2.605, lensY, lensZ + .191, [0, 0, 1]),
    main: anchor(cameras, 'main', -1.055, lensY, lensZ + .191, [0, 0, 1]),
    flash: anchor(cameras, 'flash', .55, 4.3, .4, [0, 0, 1]),
    side: anchor(B.frame, 'side button', -HW, 1.62, 0, [-1, 0, 0]),
    buttons: anchor(B.frame, 'top buttons', -.77, HH, 0, [0, 1, 0]),
    outerCam: anchor(outer, 'outer camera', cam.x, cam.y, .27, [0, 0, 1]),
    usb: anchor(A.frame, 'usb', 0, -HH, 0, [0, -1, 0]),
    freeTop: anchor(A.frame, 'free edge top', HW, 3.2, 0, [1, 0, 0]),
    freeLow: anchor(A.frame, 'free edge low', HW, -3.4, 0, [1, 0, 0]),
    hinge: anchor(bar, 'hinge', 0, 0, SPINE_T / 2, [0, 0, 1]),
    hingeTop: anchor(bar, 'hinge top', 0, 3.2, SPINE_T / 2, [0, 0, 1]),
    hingeLow: anchor(bar, 'hinge low', 0, -3.4, SPINE_T / 2, [0, 0, 1]),
    // No normal: moves aimed here keep their authored view.
    hingeEnd: anchor(bar, 'hinge end', 0, HH - .02, 0, null),
    center: anchor(root, 'center', 0, 0, 0, null),
  };
  // Screen anchors for the shared Screen macro moves. Open, they sit on the
  // inner display (the camera half B is the viewer's right, the display half A
  // the left, the vertical centre line is the hinge). Closed, they move to the
  // cover display. points() picks the set from the fold angle.
  const zi = -.264, zo = .27, ni = [0, 0, -1], no = [0, 0, 1], oy = 4.0;
  const screenAnchors = {
    inner: {
      scrTop: [A.display, -HW + .02, 3.6], scrUpper: [A.display, -HW + .02, 1.9], scrMid: [A.display, -HW + .02, 0],
      scrLower: [A.display, -HW + .02, -1.9], scrBottom: [A.display, -HW + .02, -3.6],
      scrTL: [A.display, HW - 2.2, 3.6], scrBL: [A.display, HW - 2.2, -3.6], scrTR: [B.display, -HW + 2.2, 3.6], scrBR: [B.display, -HW + 2.2, -3.6],
      scrLeft: [A.display, 1.6, .5], scrRight: [B.display, -1.6, -.5],
    },
    outer: {
      scrTop: [ocx, oy], scrUpper: [ocx, 2.1], scrMid: [ocx, 0], scrLower: [ocx, -2.1], scrBottom: [ocx, -oy],
      scrTL: [ocx - 2.2, oy], scrTR: [ocx + 2.2, oy], scrBL: [ocx - 2.2, -oy], scrBR: [ocx + 2.2, -oy],
      scrLeft: [ocx - 2.1, .6], scrRight: [ocx + 2.1, -.6],
    },
  };
  for (const [k, [g, x, y]] of Object.entries(screenAnchors.inner)) screenAnchors.inner[k] = anchor(g, 'inner ' + k, x, y, zi, ni);
  for (const [k, [x, y]] of Object.entries(screenAnchors.outer)) screenAnchors.outer[k] = anchor(outer, 'cover ' + k, x, y, zo, no);

  const multi = list => ({
    get visible() { return list[0].visible; },
    set visible(v) { list.forEach(o => { o.visible = v; }); },
    children: [],
  });
  groups.display = multi(parts.display);
  groups.outer = parts.outer[0];
  groups.frame = multi(parts.frame);
  groups.back = parts.back[0];
  groups.cameras = parts.cameras[0];

  let alpha = Math.PI;
  function setProgress(value) {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    alpha = Math.PI * (1 - t);
    pivot.rotation.y = alpha;
    bisector.rotation.y = alpha / 2;
    bar.position.z = CORNER_R * Math.cos(alpha / 2) + SPINE_T / 2 - .004;
    bar.scale.x = Math.max(.001, 2 * CORNER_R * Math.sin(alpha / 2));
    // Keep the pair centred: midpoint of the two half centres.
    const ax = HW * Math.cos(alpha) - ZH * Math.sin(alpha), az = ZH - HW * Math.sin(alpha) - ZH * Math.cos(alpha);
    rig.position.set(-(ax - HW) / 2, 0, -az / 2);
    updatePose(); applyScreenFx();
  }

  // ── Poses (orientation of the whole device inside the root) ──────────
  // Each pose keeps a screen facing the -Z camera side of the root:
  //   book      hinge vertical, open = landscape inner display ("Landscape")
  //   portrait  hinge horizontal, camera half on top ("Portrait")
  //   sym       hinge vertical, both halves turn equally (the V faces -Z)
  //   seated    display half flat on a table, camera half raised ("Seated")
  //   standing  inverted V on its edges, outer display toward -Z ("Standing")
  const AX = { y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const poseA = new THREE.Quaternion(), poseB = new THREE.Quaternion(), basis = new THREE.Matrix4();
  const yawHalf = new THREE.Quaternion().setFromAxisAngle(AX.y, Math.PI);
  const hingeAxis = new THREE.Vector3(), upAxis = new THREE.Vector3(), thirdAxis = new THREE.Vector3();
  let poseFrom = 'book', poseTo = 'book', poseMix = 0;
  function poseQuat(mode, out) {
    out.identity();
    if (mode === 'portrait') return out.setFromAxisAngle(AX.z, -Math.PI / 2);
    if (mode === 'sym') return out.setFromAxisAngle(AX.y, -alpha / 2);
    if (mode === 'seated' || mode === 'standing') {
      hingeAxis.set(0, 1, 0);
      if (mode === 'seated') upAxis.set(-Math.sin(alpha), 0, -Math.cos(alpha));
      else upAxis.set(Math.sin(alpha / 2), 0, Math.cos(alpha / 2));
      thirdAxis.crossVectors(hingeAxis, upAxis);
      out.setFromRotationMatrix(basis.makeBasis(hingeAxis, upAxis, thirdAxis).transpose());
      if (mode === 'standing') out.premultiply(yawHalf);
    }
    return out;
  }
  function updatePose() {
    poseQuat(poseFrom, poseA); const a = poseA.clone();
    poseQuat(poseTo, poseB);
    pose.quaternion.slerpQuaternions(a, poseB, THREE.MathUtils.clamp(poseMix, 0, 1));
    // Standing shows StandBy (landscape) on the outer display.
    const standing = (poseMix < .5 ? poseFrom : poseTo) === 'standing';
    const map = standing ? (standBy ||= outerStandBy()) : lockScreen;
    if (outerMaterial.map !== map) outerMaterial.map = map;
  }
  // Cover display artwork: a canvas (e.g. a Farbound lock screen) or null for
  // the default gradient lock screen.
  function setCoverArt(canvas) {
    if (lockScreen !== defaultLock) lockScreen.dispose();
    if (canvas) { lockScreen = new THREE.CanvasTexture(canvas); lockScreen.colorSpace = THREE.SRGBColorSpace; lockScreen.anisotropy = 8; }
    else lockScreen = defaultLock;
    updatePose();
  }
  function setPose(from = 'book', to = from, mix = 0) { poseFrom = from; poseTo = to; poseMix = mix; updatePose(); }

  // Screen effects; see the shader above. `outer` is the outer display brightness.
  // Fold handoff, as on the device: while the hinge is moving, the content
  // travels between the cover display and the inner display through a defocus.
  // Opening, the cover blurs and sleeps, the display half (A, which carries the
  // cover's content on) wakes and sharpens first, and the newly revealed camera
  // half (B) stays defocused and dim until the device is almost flat. Closing
  // runs the same curves backwards, ending on a sharp cover screen. At rest the
  // screens are sharp, so `foldMotion` (0…1) scales the whole effect.
  let moveFx = { blurL: 0, blurR: 0, dimL: 0, dimR: 0, outer: 1 }, foldMotion = 0;
  const ss = THREE.MathUtils.smoothstep;
  function applyScreenFx() {
    const o = 1 - alpha / Math.PI, m = foldMotion;
    const coverBlur = ss(o, 0, .22) * .03 * m, coverDim = ss(o, .04, .3) * m;
    const blurA = (1 - ss(o, .12, .5)) * .022 * m, dimA = (1 - ss(o, .02, .3)) * m;
    const blurB = (1 - ss(o, .45, .96)) * .04 * m, dimB = Math.min(1, (1 - ss(o, .05, .85)) * .55 + (1 - ss(o, .02, .22)) * .45) * m;
    fx.duoBlur.value.set(Math.max(moveFx.blurL, blurA), Math.max(moveFx.blurR, blurB));
    fx.duoDim.value.set(Math.max(moveFx.dimL, dimA), Math.max(moveFx.dimR, dimB));
    fx.duoCover.value = coverBlur;
    outerMaterial.color.setScalar(THREE.MathUtils.clamp(Math.min(moveFx.outer, 1 - coverDim), 0, 1));
  }
  function setScreenFx({ blurL = 0, blurR = 0, dimL = 0, dimR = 0, outer = 1 } = {}) {
    moveFx = { blurL, blurR, dimL, dimR, outer }; applyScreenFx();
  }
  function setFoldMotion(m) { foldMotion = THREE.MathUtils.clamp(m, 0, 1); applyScreenFx(); }

  const tmp = new THREE.Color();
  function setFinish(hex) {
    const known = duoFinishes.find(f => f[1].toLowerCase() === hex.toLowerCase());
    tmp.set(hex);
    const backColor = tmp.clone();
    let frameColor, plateauColor = backColor.clone().multiplyScalar(.95);
    if (known) { frameColor = new THREE.Color(known[2]); plateauColor = new THREE.Color(known[3]); }
    else {
      // Custom: light backs pair with a silver frame, darker ones with a tinted polish.
      const hsl = {}; tmp.getHSL(hsl);
      frameColor = hsl.l > .55 ? new THREE.Color('#d4d6d9') : new THREE.Color().setHSL(hsl.h, Math.min(.5, hsl.s), Math.min(.55, hsl.l * 1.35 + .1));
    }
    M.back.color.copy(backColor); M.plateau.color.copy(plateauColor);
    // Light finishes take a white satin sheen; dark ones a faint cool one.
    M.back.sheenColor.copy(backColor).lerp(new THREE.Color(1, 1, 1), .5);
    M.logo.color.copy(backColor).lerp(frameColor, .5);
    M.rail.color.copy(frameColor);
    M.spine.color.copy(frameColor).multiplyScalar(.74);
    M.band.color.copy(frameColor).lerp(new THREE.Color('#c9c8c3'), .55).multiplyScalar(.9);
  }

  // Positions and outward normals of the anchors in `model` space.
  const q = new THREE.Quaternion(), mq = new THREE.Quaternion();
  function points(model) {
    model.updateMatrixWorld(true);
    model.getWorldQuaternion(mq).invert();
    const out = {};
    for (const [key, o] of Object.entries(anchors)) {
      const p = model.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
      const n = o.userData.normal ? o.userData.normal.clone().applyQuaternion(o.getWorldQuaternion(q)).applyQuaternion(mq).normalize() : null;
      out[key] = { p, n };
    }
    const open = alpha < Math.PI / 2;
    for (const [key, o] of Object.entries(screenAnchors[open ? 'inner' : 'outer'])) {
      const p = model.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
      out[key] = { p, n: o.userData.normal.clone().applyQuaternion(o.getWorldQuaternion(q)).applyQuaternion(mq).normalize() };
    }
    // Map the shared move vocabulary onto Duo hardware.
    Object.assign(out, {
      island: out.outerCam, control: out.side,
      action: open ? out.freeTop : out.hingeTop, railLow: open ? out.freeLow : out.hingeLow,
    });
    return out;
  }

  // Orientation presets that depend on the current fold angle.
  function orient(shot) {
    const quat = new THREE.Quaternion();
    if (shot.orient === 'tent' || shot.orient === 'laptop') {
      const hinge = new THREE.Vector3(0, 1, 0);
      const up = shot.orient === 'tent'
        ? new THREE.Vector3(Math.sin(alpha / 2), 0, Math.cos(alpha / 2))
        : new THREE.Vector3(-Math.sin(alpha), 0, -Math.cos(alpha));
      const third = new THREE.Vector3().crossVectors(hinge, up);
      quat.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hinge, up, third).transpose());
      if (shot.yaw) quat.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), shot.yaw));
    } else if (shot.rot) quat.setFromEuler(new THREE.Euler(...shot.rot));
    return quat;
  }

  setFinish(duoFinishes[1][1]);   // Graphite
  setProgress(0);
  return { root, groups, screenMaterial, outerMaterial, setCoverArt, setFinish, setProgress, points, orient, optics, setPose, setScreenFx, setFoldMotion,
    get pose() { return { from: poseFrom, to: poseTo, mix: poseMix }; }, get alpha() { return alpha; } };
}
