import * as THREE from 'three';
import { drillRail } from './drilled-rail.js';
import { profileGeometry } from './casework.js';

const WIDTH = 7.2;
const HEIGHT = 15;
const CORNER_RADIUS = 1.51;
const PORT_RADIUS = 0.075;
const PORT_PITCH = 0.245;
const SCREW_OFFSET = 0.74;
const TAU = Math.PI * 2;

function roundedPath(cx, cy, width, height, radius) {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const r = Math.min(radius, hw, hh);
  const path = new THREE.Path();
  path.moveTo(cx - hw + r, cy - hh);
  path.lineTo(cx + hw - r, cy - hh);
  path.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + r);
  path.lineTo(cx + hw, cy + hh - r);
  path.quadraticCurveTo(cx + hw, cy + hh, cx + hw - r, cy + hh);
  path.lineTo(cx - hw + r, cy + hh);
  path.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - r);
  path.lineTo(cx - hw, cy - hh + r);
  path.quadraticCurveTo(cx - hw, cy - hh, cx - hw + r, cy - hh);
  return path;
}

function circlePath(cx, cy, radius) {
  const path = new THREE.Path();
  path.absarc(cx, cy, radius, 0, TAU, true);
  return path;
}

function starPath(cx, cy, outerRadius, innerRadius, lobes = 5) {
  const path = new THREE.Path();
  for (let i = 0; i < lobes * 2; i += 1) {
    const angle = -Math.PI * 0.5 + (i / (lobes * 2)) * TAU;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function interpolateProfile(profile, z) {
  const sorted = [...profile].sort((a, b) => a[1] - b[1]);
  if (z <= sorted[0][1]) return sorted[0][0];
  if (z >= sorted.at(-1)[1]) return sorted.at(-1)[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const [nextInset, nextZ] = sorted[i];
    const [previousInset, previousZ] = sorted[i - 1];
    if (z <= nextZ) {
      const t = (z - previousZ) / (nextZ - previousZ);
      return THREE.MathUtils.lerp(previousInset, nextInset, t);
    }
  }
  return 0;
}

function lowerPerimeterY(x, inset) {
  const width = WIDTH - inset * 2;
  const height = HEIGHT - inset * 2;
  const radius = Math.max(0.02, CORNER_RADIUS - inset);
  const straightExtent = width * 0.5 - radius;
  const absX = Math.abs(x);
  if (absX <= straightExtent) return -height * 0.5;
  const normalizedX = THREE.MathUtils.clamp((absX - straightExtent) / radius, 0, 1);
  // This mirrors the superellipse-like corner curve used by casework.js.
  return -(height * 0.5 - radius) - radius * Math.pow(Math.sqrt(1 - normalizedX * normalizedX), 0.86);
}

function contouredSolid(shape, profile, depth, insetY, material, name) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 18,
  });
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getY(i);
    const inward = position.getZ(i);
    const inset = interpolateProfile(profile, z);
    position.setXYZ(i, x, lowerPerimeterY(x, inset) + insetY + inward, z);
  }
  position.needsUpdate = true;
  // The local-to-world map swaps the extrusion and profile axes, changing
  // handedness. Reverse triangles after the map so outer faces point down.
  const sourceIndex = geometry.getIndex();
  if (sourceIndex) {
    const correctedIndex = [];
    for (let i = 0; i < sourceIndex.count; i += 3) {
      correctedIndex.push(sourceIndex.getX(i), sourceIndex.getX(i + 2), sourceIndex.getX(i + 1));
    }
    geometry.setIndex(correctedIndex);
  } else {
    // ExtrudeGeometry may be unindexed. Its attributes are arranged as complete
    // triangle triplets, so exchange vertices one and two for every attribute.
    for (const attribute of Object.values(geometry.attributes)) {
      for (let i = 0; i < attribute.count; i += 3) {
        for (let component = 0; component < attribute.itemSize; component += 1) {
          const a = (i + 1) * attribute.itemSize + component;
          const b = (i + 2) * attribute.itemSize + component;
          const value = attribute.array[a];
          attribute.array[a] = attribute.array[b];
          attribute.array[b] = value;
        }
      }
      attribute.needsUpdate = true;
    }
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

function meshMaterial(source, color, roughness, metalness) {
  const material = source?.clone?.() || new THREE.MeshPhysicalMaterial();
  material.color.set(color);
  material.roughness = roughness;
  material.metalness = metalness;
  material.clearcoat = 0.16;
  material.clearcoatRoughness = 0.24;
  return material;
}

function connectorSleeve(profile,material){
  // An extruded section with a small bright entry bevel and a deep inner wall.
  const sections=[
    [.962,.373,.179,.002],[.945,.358,.172,.008],[.884,.311,.15,.011],
    [.852,.293,.143,.027],[.824,.276,.134,.068],[.791,.251,.119,.173]
  ];
  const pos=[],uv=[],indices=[];
  let width=0;
  for(const [w,h,r,depth] of sections){
    const points=roundedPath(0,0,w,h,r).getPoints(18);points.pop();width=points.length;
    for(const pt of points){
      pos.push(pt.x,lowerPerimeterY(0,interpolateProfile(profile,pt.y))+depth,pt.y);
      uv.push(pt.x+.5,pt.y+.5);
    }
  }
  for(let row=1;row<sections.length;row++)for(let i=0;i<width;i++){
    const a=(row-1)*width+i,b=(row-1)*width+(i+1)%width;
    indices.push(a,a+width,b,b,a+width,b+width);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  material.side=THREE.DoubleSide;
  const sleeve=new THREE.Mesh(g,material);sleeve.name='Bevelled USB-C receptacle sleeve';return sleeve;
}

function addWireMesh(parent, x, profile, darkMaterial) {
  const mesh = new THREE.Group();
  mesh.name = `recessed acoustic mesh ${x > 0 ? 'right' : 'left'} ${Math.abs(x).toFixed(2)}`;
  const z = 0;
  const y = lowerPerimeterY(x, interpolateProfile(profile, z)) + 0.028;
  const backing = new THREE.Mesh(new THREE.CylinderGeometry(PORT_RADIUS * 0.86, PORT_RADIUS * 0.86, 0.018, 28), darkMaterial);
  backing.name = 'acoustic cavity backing';
  backing.position.set(x, y, z);
  mesh.add(backing);
  const wireMaterial = meshMaterial(darkMaterial, 0x111217, 0.3, 0.72);
  const wireLength = PORT_RADIUS * 1.6;
  for (let i = -2; i <= 2; i += 1) {
    const offset = i * PORT_RADIUS * 0.28;
    const horizontal = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, wireLength, 7), wireMaterial);
    horizontal.name = 'woven mesh wire';
    horizontal.rotation.z = Math.PI * 0.5;
    horizontal.position.set(x, y - 0.012, z + offset);
    mesh.add(horizontal);
    const vertical = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, wireLength, 7), wireMaterial);
    vertical.name = 'woven mesh wire';
    vertical.rotation.x = Math.PI * 0.5;
    vertical.position.set(x + offset, y - 0.015, z);
    mesh.add(vertical);
  }
  parent.add(mesh);
}

function addBevelledPort(parent, x, profile, material) {
  const z = 0;
  const y = lowerPerimeterY(x, interpolateProfile(profile, z)) + 0.009;
  const bevel = new THREE.Mesh(new THREE.TorusGeometry(PORT_RADIUS * 0.885, 0.012, 8, 28), material);
  bevel.name = 'bevelled acoustic port rim';
  bevel.rotation.x = Math.PI * 0.5;
  bevel.position.set(x, y, z);
  parent.add(bevel);
}

/**
 * Complete lower perimeter replacement. The host supplies the same materials and
 * rail profile it used for the original `profileGeometry(7.2, 15, 1.51, ...)` rail.
 */
export function makeBottomRail(materials, railProfile) {
  const root = new THREE.Group();
  root.name = 'cut titanium lower perimeter and USB-C hardware';

  const titanium = materials.rail;
  const dark = meshMaterial(materials.seam || materials.screenRim, 0x111216, 0.31, 0.62);
  const black = meshMaterial(materials.screenRim || materials.seam, 0x050609, 0.23, 0.36);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xad9977, metalness: 0.66, roughness: 0.40, clearcoat: 0.2 });

  const usbOuterWidth = 0.96;
  const usbOuterHeight = 0.372;
  const drilledHoles = [roundedPath(0, 0, usbOuterWidth, usbOuterHeight, 0.19)];
  for (const sign of [-1, 1]) {
    drilledHoles.push(circlePath(sign * SCREW_OFFSET, 0, 0.083));
    for (let i = 0; i < 5; i += 1) {
      drilledHoles.push(circlePath(sign * (1.22 + i * PORT_PITCH), 0, PORT_RADIUS));
    }
  }
  const shell=profileGeometry(WIDTH,HEIGHT,CORNER_RADIUS,railProfile,true);
  const cutBand=new THREE.Mesh(drillRail(shell,railProfile,drilledHoles),titanium);
  cutBand.name='lower titanium strip with cutouts';
  const rail=new THREE.Mesh(shell,titanium);
  rail.name='titanium perimeter';
  root.add(rail,cutBand);

  const socketMetal=new THREE.MeshStandardMaterial({color:0x55565a,roughness:.38,metalness:.72});
  root.add(connectorSleeve(railProfile,socketMetal));
  const rearWall=new THREE.Shape(roundedPath(0,0,.80,.26,.116).getPoints(20));
  root.add(contouredSolid(rearWall,railProfile,.016,.171,black,'USB-C socket interior'));
  const tongueShape=new THREE.Shape(roundedPath(0,-.013,.663,.064,.026).getPoints(18));
  root.add(contouredSolid(tongueShape,railProfile,.113,.056,dark,'USB-C contact tongue'));
  const baseline=lowerPerimeterY(0,0);
  for(const side of [-1,1])for(let i=0;i<12;i++){
    const pin=new THREE.Mesh(new THREE.BoxGeometry(.011,.092,.004),gold);
    pin.name='USB-C contact';pin.position.set((i-5.5)*.044,baseline+.110,side*.032-.013);root.add(pin);
  }

  for (const sign of [-1, 1]) {
    const screwX = sign * SCREW_OFFSET;
    const screwHead = new THREE.Shape(circlePath(screwX, 0, 0.078).getPoints(36));
    screwHead.holes.push(starPath(screwX, 0, 0.037, 0.022));
    root.add(contouredSolid(screwHead, railProfile, 0.012, 0.016, dark, 'pentalobe screw head with cutout'));
    const starRecess = new THREE.Shape(starPath(screwX, 0, 0.037, 0.022).getPoints());
    root.add(contouredSolid(starRecess, railProfile, 0.008, 0.045, black, 'dark recessed pentalobe interior'));
    for (let i = 0; i < 5; i += 1) {
      const portX = sign * (1.22 + i * PORT_PITCH);
      addBevelledPort(root, portX, railProfile, titanium);
      addWireMesh(root, portX, railProfile, black);
    }
  }

  return root;
}
