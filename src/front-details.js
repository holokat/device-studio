import * as THREE from 'three';
import { lathe, opticalCoating, glassElement } from './optics.js';

// The front cover surface is now the documented body plane at -0.4375.
// Keep the opaque mask there, while the receiver remains recessed behind it.
const island = { width: 1.56, height: .609, y: 6.742, z: -.4375 };
const cameraX = .474;
const seatRadius = .279;
const receiverY = 7.327;

// Clockwise contours also give the machined opening its inward-facing walls.
function capsule(width, height, y = 0) {
  const radius = height / 2, offset = width / 2 - radius, points = [];
  for (const side of [1, -1]) {
    const start = side === 1 ? Math.PI / 2 : -Math.PI / 2;
    for (let i = 0; i <= 48; i++) {
      const a = start - Math.PI * i / 48;
      points.push([side * offset + radius * Math.cos(a), y + radius * Math.sin(a)]);
    }
  }
  return points;
}

// The shallow shoulders flare into the top glass, as seen in the front reference.
function receiverContour() {
  const p = new THREE.Path();
  p.moveTo(-1.453,.023);
  p.bezierCurveTo(-1.39,.023,-1.33,-.023,-1.24,-.023);
  p.lineTo(1.24,-.023);
  p.bezierCurveTo(1.33,-.023,1.39,.023,1.453,.023);
  p.quadraticCurveTo(1.46,.026,1.445,.026);
  p.lineTo(-1.445,.026);
  p.quadraticCurveTo(-1.46,.026,-1.453,.023);
  return p.getPoints(16).slice(0,-1).reverse().map(v=>[v.x,v.y]);
}
const receiver = receiverContour();
const islandOutline = capsule(island.width, island.height);
export const screenOpenings = [{ contour: islandOutline.map(([x,y])=>[x,y+island.y]) }];
export const bezelOpenings = [
  ...screenOpenings,
  { contour: receiver.map(([x,y])=>[x,y+receiverY]) }
];

function face(name, outline, material, holes = []) {
  const vectors = contour => contour.map(([x,y])=>new THREE.Vector2(x,y));
  const shape = new THREE.Shape(vectors(outline));
  shape.closePath();
  shape.holes = holes.map(contour=>new THREE.Path(vectors(contour)));
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape,20),material);
  mesh.name = name;
  return mesh;
}

function dark(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({color,roughness,metalness,envMapIntensity:.24,side:THREE.DoubleSide});
}

function receiverMesh() {
  const assembly = new THREE.Group();
  assembly.name = 'Top receiver';
  assembly.position.set(0,receiverY,-.4335);
  assembly.rotation.y = Math.PI;
  const backing = face('Receiver acoustic cloth',receiver,dark(0x0b0b0d,.86,.10));
  backing.position.z = -.034;
  assembly.add(backing);

  const pitch = .021, strand = .0032;
  const points = [], indices = [];
  for (let i=-61; i<=61; i++) {
    for (const sign of [-1,1]) {
      const x=i*pitch, dx=.016*sign, z=-.030+sign*.0006, n=points.length/3;
      points.push(x-dx-strand,-.016,z,x-dx+strand,-.016,z,x+dx+strand,.016,z,x+dx-strand,.016,z);
      indices.push(n,n+1,n+2,n,n+2,n+3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const weave = new THREE.Mesh(geometry,dark(0x222327,.68,.36));
  weave.name='Receiver grille weave';assembly.add(weave);
  return assembly;
}

export function addFrontDetails(display) {
  const islandGroup = new THREE.Group();
  islandGroup.name='Front sensor island';
  // The local positive Z axis points out of the display. Positive local X is the
  // viewer's right when looking at the screen, opposite the handset's world X.
  islandGroup.rotation.y=Math.PI;
  islandGroup.position.set(0,island.y,island.z);
  const roundHole=Array.from({length:112},(_,i)=>{
    const a=2*Math.PI*i/112;
    return [cameraX+Math.cos(a)*seatRadius,Math.sin(a)*seatRadius];
  });
  const mask=face('Flush opaque sensor mask',islandOutline,dark(0x151517,.88,.03),[roundHole]);
  islandGroup.add(mask);
  const camera=new THREE.Group();
  camera.name='Front camera optical assembly';camera.position.x=cameraX;islandGroup.add(camera);

  // Low-contrast annular surfaces reduce in radius and descend toward the pupil.
  const addSeat=(name,profile,material)=>camera.add(lathe(name,profile,material));
  addSeat('Outer camera well',[[.169,-.035],[.184,-.028],[.212,-.017],[.254,-.006],[.274,-.001],[seatRadius,0]],dark(0x1b1b1e,.78,.11));
  addSeat('Inner barrel shoulder',[[.079,-.057],[.089,-.053],[.112,-.047],[.155,-.038],[.162,-.034],[.166,-.031],[.169,-.033],[.170,-.035]],dark(0x202024,.66,.16));
  addSeat('Front element retainer',[[.071,-.064],[.073,-.056],[.076,-.054],[.081,-.056]],dark(0x0f1015,.48,.26));
  const lens=glassElement('Recessed front camera lens',.071,.022,opticalCoating(1));
  lens.position.z=-.069;
  lens.material.name='Front camera violet optical coating';
  camera.add(lens);
  display.add(islandGroup,receiverMesh());
}
