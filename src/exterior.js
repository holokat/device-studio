import * as THREE from 'three';
import { addFrontDetails, screenOpenings, bezelOpenings } from './front-details.js';
import { makeLens } from './optics.js';
import { profileGeometry, perimeter, titaniumMaps } from './casework.js';
import { makeBottomRail } from './bottom.js';

// Dimensions are in the studio's device units.  The origin is the center of the
// handset, +Y is up, +Z is the rear. 15 studio units represent the documented
// 150.0 mm height; width intentionally stays at the shared 7.2-unit contract
// (rather than perturbing every supplied internal coordinate by 0.01 unit).
const WIDTH = 7.2;
const HEIGHT = 15.0;
const DEPTH = 0.875;
const HALF_DEPTH = DEPTH * 0.5;

function roundedRectShape(width, height, radius) {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const r = Math.min(radius, hw, hh);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

function roundedBoxGeometry(width, height, depth, radius, segments = 6) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelSegments: segments,
    bevelSize: Math.min(radius * 0.34, depth * 0.26),
    bevelThickness: Math.min(depth * 0.18, radius * 0.28),
    curveSegments: segments,
  });
  geometry.translate(0, 0, -depth * 0.5);
  // ExtrudeGeometry grows past its nominal caps when beveling. Normalize it back
  // to the requested thickness so the chassis really occupies its requested Z range.
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const centerX = (bounds.min.x + bounds.max.x) * 0.5;
  const centerY = (bounds.min.y + bounds.max.y) * 0.5;
  const centerZ = (bounds.min.z + bounds.max.z) * 0.5;
  geometry.translate(-centerX, -centerY, -centerZ);
  geometry.scale(
    width / (bounds.max.x - bounds.min.x),
    height / (bounds.max.y - bounds.min.y),
    depth / (bounds.max.z - bounds.min.z),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function roundedBox(width, height, depth, radius, material, segments) {
  return new THREE.Mesh(roundedBoxGeometry(width, height, depth, radius, segments), material);
}

function normalizeScreenUV(geometry) {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  for (let i = 0; i < uv.count; i += 1) {
    // Viewed from -Z, the display's left/right axis is intentionally mirrored.
    uv.setXY(i, 1 - (position.getX(i) - bounds.min.x) / width, (position.getY(i) - bounds.min.y) / height);
  }
  uv.needsUpdate = true;
}

function disc(radius, depth, material, radialSegments = 64) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, radialSegments, 1, false),
    material,
  );
  mesh.rotation.x = Math.PI * 0.5;
  return mesh;
}

function torus(major, tube, material, radialSegments = 12) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(major, tube, radialSegments, 72),
    material,
  );
}

function makeFlash(materials) {
  const group=new THREE.Group();group.name='Flash diffuser and emitter';
  group.add(disc(.402,.071,materials.flashHousing,80));
  const cap=disc(.35,.019,materials.diffuser,80);cap.position.z=.048;group.add(cap);
  const grooves=new THREE.MeshStandardMaterial({color:0xb4b5ad,metalness:.37,roughness:.37});
  for(let i=0;i<17;i++){
    const ring=torus(.104+i*.0132,.0031,grooves,7);ring.position.z=.061;group.add(ring);
  }
  const core=disc(.098,.011,new THREE.MeshStandardMaterial({color:0xf1d8a6,roughness:.38,metalness:.12}),48);core.position.z=.064;group.add(core);
  return group;
}

export function makeLogo(material) {
  // Two engraved contours taken from the Apple mark in the local system font.
  const outline = [
    [0,0.0115,0.2772],
    [2,-0.0115,0.2772,-0.0874,0.2987],
    [2,-0.1619,0.3202,-0.2149,0.3202],
    [2,-0.3381,0.3202,-0.4198,0.217],
    [2,-0.5,0.1125,-0.5,-0.0509],
    [2,-0.5,-0.2285,-0.394,-0.4119],
    [2,-0.288,-0.5967,-0.1791,-0.5967],
    [2,-0.1447,-0.5967,-0.0845,-0.5723],
    [2,-0.0287,-0.5494,0.0186,-0.5494],
    [2,0.0645,-0.5494,0.1261,-0.5709],
    [2,0.1891,-0.5938,0.2278,-0.5938],
    [2,0.3209,-0.5938,0.4126,-0.4549],
    [2,0.4427,-0.409,0.4642,-0.3639],
    [2,0.4857,-0.3188,0.5,-0.2758],
    [2,0.4355,-0.2557,0.3868,-0.1855],
    [2,0.3367,-0.1139,0.3367,-0.0251],
    [2,0.3367,0.0566,0.384,0.1225],
    [2,0.4097,0.1597,0.4656,0.2085],
    [2,0.447,0.2314,0.4284,0.2486],
    [2,0.4097,0.2658,0.3911,0.2801],
    [2,0.3238,0.3259,0.2378,0.3259],
    [2,0.1862,0.3259,0.1132,0.3016],
    [2,0.0401,0.2772,0.0115,0.2772],
    [4],
    [0,0.2307,0.5666],
    [2,0.2307,0.5723,0.2299,0.5795],
    [2,0.2292,0.5867,0.2264,0.5967],
    [2,0.1003,0.5681,0.0466,0.49],
    [2,-0.0072,0.4119,-0.0086,0.3059],
    [2,0.0372,0.3102,0.0645,0.3173],
    [2,0.1017,0.3302,0.1433,0.3689],
    [2,0.1877,0.4148,0.2092,0.4678],
    [2,0.2307,0.5208,0.2307,0.5666],
    [4]
  ];
  const shapes=[];
  let path;
  for(const [cmd,...v] of outline){
    if(cmd===0){path=new THREE.Shape();shapes.push(path);path.moveTo(...v);}
    else if(cmd===1)path.lineTo(...v);
    else if(cmd===2)path.quadraticCurveTo(...v);
    else if(cmd===3)path.bezierCurveTo(...v);
    else path.closePath();
  }
  const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shapes,14),material);
  mesh.scale.setScalar(1.18);mesh.name='Rear insignia';return mesh;
}

export function createExterior() {
  const root = new THREE.Group();
  root.name = 'iPhone 18 Pro exterior';
  // Preserve the internal-coordinate contract while applying the engineering
  // drawing's 71.85 × 150.01 mm outer body dimensions at 10 mm per unit.
  root.scale.set(71.85 / 72, 150.01 / 150, 1);

  const frame = new THREE.Group();
  const back = new THREE.Group();
  const display = new THREE.Group();
  const cameras = new THREE.Group();
  frame.name = 'frame';
  back.name = 'back';
  display.name = 'display';
  cameras.name = 'cameras';
  root.add(frame, back, display, cameras);

  const finish = new THREE.Color(0x54262e);
  const grain = titaniumMaps();
  const materials = {
    // Polished titanium band: fully metallic, low roughness, a thin clear layer
    // for the crisp mirror streak along the flat sides.
    rail: new THREE.MeshPhysicalMaterial({ color: finish, metalness: 1, roughness: 0.17, ...grain, clearcoat: 0.5, clearcoatRoughness: 0.06, envMapIntensity: 1.85 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x1c1012, metalness: 0.8, roughness: 0.42 }),
    back: new THREE.MeshPhysicalMaterial({ color: finish.clone().multiplyScalar(0.9), metalness: 0.54, roughness: 0.60, clearcoat: 0.15, clearcoatRoughness: 0.35 }),
    inset: new THREE.MeshPhysicalMaterial({ color: 0x32191e, metalness: 0.58, roughness: 0.39 }),
    logo: new THREE.MeshStandardMaterial({ color: 0x2a1519, metalness: 0.35, roughness: 0.5 }),
    plateau: new THREE.MeshPhysicalMaterial({ color: 0x4a222a, metalness: 0.86, roughness: 0.435, ...grain, clearcoat: 0.12, clearcoatRoughness: 0.36 }),
    optical: new THREE.MeshPhysicalMaterial({ color: 0x091328, metalness: 0.2, roughness: 0.065,  ior: 1.48, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.7, iridescenceIOR: 1.33, iridescenceThicknessRange: [140, 380] }),
    flashHousing: new THREE.MeshPhysicalMaterial({ color: 0x81757b, metalness: 0.84, roughness: 0.25 }),
    diffuser: new THREE.MeshPhysicalMaterial({ color: 0xe7e0d1, metalness: 0.05, roughness: 0.29 }),
    sensor: new THREE.MeshPhysicalMaterial({ color: 0x090a0d, metalness: 0.12, roughness: 0.46, clearcoat: 0.08, envMapIntensity:.25 }),
    screenRim: new THREE.MeshPhysicalMaterial({ color: 0x08090c, metalness: 0.56, roughness: 0.18 }),
    pill: new THREE.MeshBasicMaterial({ color: 0x030407 }),
  };

  // The rail has a recessed bearing surface under the display glass. A flat
  // lip at the OLED plane would paint metal into the edge of the screen.
  const railProfile=[[.29,-.405],[.15,-.405],[.09,-.398],[.049,-.378],[.019,-.332],[.003,-.269],[0,-.17],[0,.145],[.008,.22],[.029,.29],[.065,.35],[.12,.396],[.19,.42],[.29,.42]].map(([inset,z])=>[inset,z*(HALF_DEPTH/.42)]);
  const bottomRail=makeBottomRail(materials,railProfile);
  frame.add(bottomRail);
  const openings=[[-2.14,6.13,.670],[-2.14,4.32,.670],[-.45,5.22,.670],[2.16,6.22,.222],[2.16,5.25,.029],[2.16,4.30,.25]];
  function deck(name,w,h,r,sections,material,y,drill=false){
    const obj=new THREE.Mesh(profileGeometry(w,h,r,sections,false,drill?openings.map(([x,cy,rad])=>[x,cy-y,rad]):[]),material);obj.position.y=y;obj.name=name;back.add(obj);return obj;
  }
  deck('Rear shell',6.94,14.74,1.38,[[.03,.410],[0,.423],[.010,.429],[.04,.430],[.085,.431],[.12,.4315]],materials.rail,0,true);
  deck('Glass panel gasket',6.62,10.32,.79,[[.008,.420],[0,.429],[.003,.433]],materials.inset,-2.07);
  deck('Satin glass inlay',6.595,10.295,.775,[[.025,.426],[.005,.433],[0,.436],[.013,.4375]],materials.back,-2.07);
  const logo=makeLogo(materials.logo);logo.position.set(0,-.70,.441);back.add(logo);
  // Drawing sheet 2 specifies 2.78 mm from back plate to plateau and 2.11 mm
  // from plateau to rear camera glass: 4.89 mm total rear-camera projection.
  deck('Raised camera platform',6.68,3.95,1.04,[[0,.4375],[.012,.4415],[.041,.4545],[.079,.4845],[.111,.5365],[.13,.6145],[.14,.6705],[.15,.6855],[.167,.6955],[.203,.7015],[.25,.7055]],materials.rail,5.30,true);
  deck('Camera island face',6.27,3.54,.835,[[.009,.6995],[0,.7075],[.016,.7155]],materials.plateau,5.30,true);
  const screenMaterial=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  screenMaterial.name='Editable screen artwork';
  const activeOutline=perimeter(6.774,14.554,1.292);
  const aperture={contour:activeOutline.slice().reverse()};
  const borderGeometry=profileGeometry(6.98,14.78,1.40,[[.033,-.4375],[.016,-.4355],[0,-.431],[.01,-.415],[.026,-.395]],false,[aperture,...bezelOpenings.slice(1)]);
  const frontRim=new THREE.Mesh(borderGeometry,materials.screenRim);
  frontRim.name='Cover glass and black border';display.add(frontRim);

  // The emission surface and bezel terminate on the exact same polygon. Only
  // the bezel owns a vertical edge. Artwork therefore cannot wrap up its side.
  const frontContour=loop=>loop.map(([x,y])=>new THREE.Vector2(-x,y));
  const activeShape=new THREE.Shape(frontContour(activeOutline));
  activeShape.holes=screenOpenings.map(h=>new THREE.Path(frontContour(h.contour)));
  const surface=new THREE.ShapeGeometry(activeShape);
  surface.rotateY(Math.PI);surface.translate(0,0,-.4375);normalizeScreenUV(surface);
  const screen=new THREE.Mesh(surface,screenMaterial);
  screen.name='Active display';display.add(screen);
  const substrate=new THREE.Mesh(profileGeometry(6.79,14.57,1.30,[[.002,-.429],[0,-.402]],false,screenOpenings),materials.screenRim);
  substrate.name='OLED carrier';display.add(substrate);
  addFrontDetails(display);

  function sideButton(name,sign,y,length){
    const button=roundedBox(.34,length,.06,.16,materials.rail,10);
    const socket=roundedBox(.37,length+.035,.033,.18,materials.seam,10);
    for(const [obj,x] of [[socket,3.599],[button,3.625]]){
      obj.rotation.y=sign*Math.PI/2;obj.position.set(sign*x,y,0);obj.name=name;frame.add(obj);
    }
  }
  sideButton('Side button',-1,1.63,1.73);sideButton('Camera control',-1,-2.72,1.47);
  sideButton('Action button',1,4.07,.67);sideButton('Volume up',1,2.67,1.05);sideButton('Volume down',1,1.25,1.05);
  for(const sign of [-1,1])for(const y of [-5.98,5.96]){
    const band=new THREE.Mesh(new THREE.BoxGeometry(.012,.095,.53),materials.inset);
    band.position.set(sign*3.60,y,-.022);band.name='Antenna break';frame.add(band);
  }
  const lensPositions = [
    [-2.14, 6.13, 0.7355],
    [-2.14, 4.32, 0.7355],
    [-0.45, 5.22, 0.7355],
  ];
  const animatedOptics = [];
  lensPositions.forEach(([x, y, z], index) => {
    const lens = makeLens(materials, .829, index);
    lens.root.position.set(x, y, z);
    cameras.add(lens.root);
    animatedOptics.push({ ...lens, phase: index * 1.9, initialZ: z });
  });
  const flash = makeFlash(materials);
  flash.scale.setScalar(.83);flash.position.set(2.16, 6.22, .693);
  cameras.add(flash);
  const microphone = disc(0.085, 0.06, materials.seam, 24);
  microphone.scale.setScalar(.48);microphone.position.set(2.16, 5.25, .708);
  cameras.add(microphone);
  const lidar=disc(.32,.023,materials.sensor,64);lidar.position.set(2.16,4.30,.7095);lidar.name='Depth sensor window';cameras.add(lidar);

  const tmpFinish = new THREE.Color();
  function setFinish(hex) {
    tmpFinish.set(hex);
    materials.rail.color.copy(tmpFinish);
    materials.back.color.copy(tmpFinish).multiplyScalar(0.66);
    materials.logo.color.copy(tmpFinish).multiplyScalar(.50);
    materials.logo.metalness=.85;materials.logo.roughness=.26;
    materials.inset.color.copy(tmpFinish).multiplyScalar(.43);
    materials.plateau.color.copy(tmpFinish).multiplyScalar(0.87);
  }

  function setProgress(value) {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    // Stored panel offsets put their outer faces near the requested target planes.
    display.position.z = -6.3 * t;
    back.position.z = 8.4 * t;
    cameras.position.z = 11.35 * t;
    cameras.rotation.z = 0.025 * t;

    animatedOptics.forEach((lens, index) => {
      const pulse = Math.sin(t * Math.PI + lens.phase);
      lens.iris.rotation.z = t * (0.16 + index * 0.045);
      lens.root.rotation.z = pulse * 0.015 * t;
      lens.root.position.z = lens.initialZ + pulse * 0.03 * t;
      lens.layers.forEach(({ mesh, baseZ, spread }) => {
        mesh.position.z = baseZ + spread * t * 2.05;
      });
    });
    flash.rotation.z = -0.04 * t;
  }

  setFinish(finish);
  setProgress(0);
  return { root, groups: { frame, back, display, cameras }, screenMaterial, setFinish, setProgress };
}
