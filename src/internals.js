import * as THREE from 'three';

// Internal assembly for the iPhone 18 Pro study. Coordinates are in the same
// 7.2 × 15 handset space as the surrounding chassis (Y up, rear +Z).
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function roundedPlate(width, height, depth, radius, material) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(-x - r, y);
  shape.quadraticCurveTo(-x, y, -x, y + r);
  shape.lineTo(-x, -y - r);
  shape.quadraticCurveTo(-x, -y, -x - r, -y);
  shape.lineTo(x + r, -y);
  shape.quadraticCurveTo(x, -y, x, -y - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.035, depth * 0.28),
    bevelThickness: Math.min(0.035, depth * 0.28),
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  if(material.map){
    const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)/width+.5,position.getY(i)/height+.5);
  }
  return new THREE.Mesh(geometry, material);
}

function meshBox(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function brushedFoilMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext('2d');
  context.fillStyle = '#9ca3a2';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  let seed = 92137;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = Math.floor((seed / 4294967296 - 0.5) * 11);
    pixels.data[i] = 156 + grain;
    pixels.data[i + 1] = 162 + grain;
    pixels.data[i + 2] = 161 + grain;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  for (let y = 0; y < canvas.height; y += 5) {
    context.fillStyle = y % 20 === 0 ? 'rgba(255,255,255,.025)' : 'rgba(25,34,35,.018)';
    context.fillRect(0, y, canvas.width, 1);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ color: 0xaab0af, map, metalness: 0.86, roughness: 0.34 });
}

function makeTypeDecal(lines, width, height, color = '#d8ded8') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.font = '600 92px Arial, sans-serif';
  const lineHeight = lines.length > 1 ? 82 : 96;
  const origin = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => context.fillText(line, canvas.width / 2, origin + index * lineHeight));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
  );
  decal.renderOrder = 2;
  return decal;
}

function addInstancedParts(parent, material, count, options) {
  const geometry = new THREE.BoxGeometry(options.w, options.h, options.d);
  const instances = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const column = i % options.columns;
    const row = Math.floor(i / options.columns);
    dummy.position.set(
      options.x + column * options.stepX,
      options.y + row * options.stepY,
      options.z + ((i % 3) - 1) * 0.002,
    );
    dummy.rotation.z = options.rotation || 0;
    dummy.updateMatrix();
    instances.setMatrixAt(i, dummy.matrix);
  }
  instances.instanceMatrix.needsUpdate = true;
  parent.add(instances);
  return instances;
}

function addScrew(parent, x, y, z, material) {
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.052, 16), material);
  screw.rotation.x = Math.PI / 2;
  screw.position.set(x, y, z);
  parent.add(screw);
  const slot = meshBox(0.12, 0.018, 0.012, new THREE.MeshStandardMaterial({ color: 0x1a2025, roughness: 0.45 }), x, y, z + 0.03);
  parent.add(slot);
}

function addFlex(parent, points, width, material, z) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, z)));
  const samples = curve.getPoints(28);
  const vertices = [];
  const indices = [];
  samples.forEach((point, index) => {
    const prev = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const tangent = next.clone().sub(prev).normalize();
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).multiplyScalar(width / 2);
    vertices.push(point.x + normal.x, point.y + normal.y, z, point.x - normal.x, point.y - normal.y, z);
    if (index > 0) {
      const base = index * 2;
      indices.push(base - 2, base, base - 1, base, base + 1, base - 1);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ribbon = new THREE.Mesh(geometry, material);
  parent.add(ribbon);
  return ribbon;
}

export function createInternals() {
  const root = new THREE.Group();
  root.name = 'iPhone 18 Pro internals';

  const groups = {
    battery: new THREE.Group(),
    board: new THREE.Group(),
    coil: new THREE.Group(),
    modules: new THREE.Group(),
    sensors: new THREE.Group(),
  };
  Object.entries(groups).forEach(([key, group]) => {
    group.name = key;
    root.add(group);
  });

  const graphite = new THREE.MeshStandardMaterial({ color: 0x111417, metalness: 0.58, roughness: 0.29 });
  const pcb = new THREE.MeshStandardMaterial({ color: 0x102128, metalness: 0.36, roughness: 0.45 });
  const pcbEdge = new THREE.MeshStandardMaterial({ color: 0x244149, metalness: 0.32, roughness: 0.38 });
  const shield = new THREE.MeshStandardMaterial({ color: 0x525b5e, metalness: 0.91, roughness: 0.26 });
  const shieldDark = new THREE.MeshStandardMaterial({ color: 0x22292d, metalness: 0.88, roughness: 0.3 });
  const solder = new THREE.MeshStandardMaterial({ color: 0xc4c8c2, metalness: 0.92, roughness: 0.19 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xa8522e, metalness: 0.94, roughness: 0.24 });
  const copperLight = new THREE.MeshStandardMaterial({ color: 0xd8895d, metalness: 0.88, roughness: 0.2 });
  const flex = new THREE.MeshStandardMaterial({ color: 0x5a351c, metalness: 0.58, roughness: 0.5, side: THREE.DoubleSide });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xb7aea2, metalness: 0.46, roughness: 0.36 });
  const black = new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.45, roughness: 0.31 });
  const silicon = new THREE.MeshPhysicalMaterial({ color: 0x4c7c97, emissive: 0x102b3b, emissiveIntensity: 0.28, metalness: 0.65, roughness: 0.2, iridescence: 1, iridescenceIOR: 1.28, iridescenceThicknessRange: [150, 480] });
  const foil = brushedFoilMaterial();
  const foilShade = new THREE.MeshStandardMaterial({ color: 0x3d4648, metalness: 0.85, roughness: 0.3 });

  // Fixed tray rides with the chassis rather than separating with a component group.
  // It is surfaced for the exterior assembly to attach, hide, or restyle if needed.
  const tray = new THREE.Group();
  tray.name = 'interior tray';
  const trayFloor = roundedPlate(6.58, 14.25, 0.055, 0.48, graphite);
  trayFloor.position.set(0, 0, -0.33);
  tray.add(trayFloor);
  const trayInset = roundedPlate(6.3, 13.95, 0.018, 0.42, black);
  trayInset.position.set(0, 0, -0.293);
  tray.add(trayInset);
  root.add(tray);
  root.interiorTray = tray;

  // A narrower pouch occupies the central/lower bay, leaving a true service corridor for the long board.
  const batteryCarrier = roundedPlate(4.78, 7.94, 0.09, 0.28, graphite);
  batteryCarrier.position.set(0.54, -1.15, -0.075);
  groups.battery.add(batteryCarrier);
  const pouch = roundedPlate(4.48, 7.64, 0.15, 0.29, foil);
  pouch.position.set(0.54, -1.15, 0.01);
  groups.battery.add(pouch);
  const pouchInset = roundedPlate(4.24, 7.4, 0.021, 0.24, foilShade);
  pouchInset.position.set(0.54, -1.15, 0.104);
  groups.battery.add(pouchInset);
  const pouchFace = roundedPlate(4.12, 7.28, 0.016, 0.21, foil);
  pouchFace.position.set(0.54, -1.15, 0.124);
  groups.battery.add(pouchFace);
  // Fine folded seams keep the foil legible under broad studio highlights.
  [-4.67, 2.37].forEach((y) => groups.battery.add(meshBox(3.82, 0.026, 0.01, foilShade, 0.54, y, 0.137)));
  [-1.46, 2.54].forEach((x) => groups.battery.add(meshBox(0.026, 6.94, 0.01, foilShade, x, -1.15, 0.137)));
  [-1.32, 2.38].forEach((x, index) => {
    const tab = meshBox(0.32, 0.7, 0.03, index ? copper : solder, x, 2.97, 0.145);
    groups.battery.add(tab);
  });
  for (let i = 0; i < 4; i += 1) addScrew(groups.battery, i < 2 ? -1.62 : 2.7, i % 2 ? -4.94 : 2.67, 0.17, solder);

  // Eighteen closely spaced turns rise from a ferrite backing, rather than reading as four floating rings.
  const coilCenter = new THREE.Vector3(0.54, -1.15, 0.254);
  const ferrite = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.88, 0.048, 72), graphite);
  ferrite.rotation.x = Math.PI / 2;
  ferrite.position.copy(coilCenter);
  ferrite.position.z -= 0.05;
  groups.coil.add(ferrite);
  for (let index = 0; index < 18; index += 1) {
    const radius = 1.72 - index * 0.047;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.016, 6, 72), index % 5 === 0 ? copperLight : copper);
    ring.position.copy(coilCenter);
    ring.position.z += (index % 2) * 0.004;
    groups.coil.add(ring);
  }
  const coilHub = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.032, 48), foilShade);
  coilHub.rotation.x = Math.PI / 2;
  coilHub.position.set(0.54, -1.15, 0.255);
  groups.coil.add(coilHub);
  addFlex(groups.coil, [[-1.15, -0.2], [-1.62, 0.18], [-1.79, 0.82], [-2.05, 1.22]], 0.065, flex, 0.269);
  const coilConnector = roundedPlate(0.55, 0.35, 0.12, 0.06, shieldDark);
  coilConnector.position.set(-1.94, 1.24, 0.277);
  groups.coil.add(coilConnector);

  // Service-strip board at left and a shielded camera-side bay prevent the pouch from colliding with either.
  const boardSections = [
    [-2.62, -0.52, 0.98, 6.45],
    [-2.6, 2.57, 1.3, 0.72],
    [2.25, 4.55, 1.55, 2.75],
  ];
  boardSections.forEach(([x, y, w, h]) => {
    const slab = roundedPlate(w, h, 0.1, 0.16, pcb);
    slab.position.set(x, y, 0.115);
    groups.board.add(slab);
    const edge = roundedPlate(w - 0.16, h - 0.16, 0.022, 0.12, pcbEdge);
    edge.position.set(x, y, 0.174);
    groups.board.add(edge);
  });
  const processor = roundedPlate(0.74, 1.08, 0.16, 0.1, shieldDark);
  processor.position.set(-2.62, -0.24, 0.255);
  groups.board.add(processor);
  const processorDecal = makeTypeDecal(['A20', 'PRO'], 0.61, 0.77);
  processorDecal.position.set(-2.62, -0.24, 0.341);
  groups.board.add(processorDecal);
  const shieldSpecs = [
    [-2.62, 1.35, 0.72, 1.14], [-2.62, -1.62, 0.75, 1.25], [-2.62, -3.34, 0.7, 1.44],
    [2.25, 5.72, 1.25, 0.62], [2.25, 4.72, 1.3, 1.18], [2.25, 3.53, 1.22, 0.7],
    [2.9, 4.68, 0.22, 1.58],
  ];
  shieldSpecs.forEach(([x, y, w, h], index) => {
    const can = roundedPlate(w, h, 0.14, 0.09, index === 3 ? shieldDark : shield);
    can.position.set(x, y, 0.247);
    groups.board.add(can);
  });
  addInstancedParts(groups.board, ceramic, 76, { w: 0.12, h: 0.09, d: 0.06, x: -2.94, y: -3.1, z: 0.25, columns: 2, stepX: 0.63, stepY: 0.15 });
  addInstancedParts(groups.board, ceramic, 84, { w: 0.1, h: 0.09, d: 0.055, x: 1.58, y: 3.27, z: 0.25, columns: 7, stepX: 0.19, stepY: 0.13, rotation: 0.24 });
  addInstancedParts(groups.board, solder, 116, { w: 0.035, h: 0.035, d: 0.025, x: -2.95, y: -3.14, z: 0.31, columns: 2, stepX: 0.65, stepY: 0.065 });
  addInstancedParts(groups.board, solder, 64, { w: 0.032, h: 0.042, d: 0.025, x: 1.58, y: 5.86, z: 0.31, columns: 16, stepX: 0.085, stepY: 0.075 });
  [[-3.0, 2.55], [-2.22, 2.55], [-3.0, -3.54], [-2.22, -3.54], [1.57, 5.84], [2.93, 3.2]].forEach(([x, y]) => addScrew(groups.board, x, y, 0.3, solder));
  const bayConnector = roundedPlate(1.32, 0.22, 0.08, 0.035, shieldDark);
  bayConnector.position.set(2.25, 6.08, 0.25);
  groups.board.add(bayConnector);
  addInstancedParts(groups.board, solder, 18, { w: 0.042, h: 0.075, d: 0.03, x: 1.62, y: 6.08, z: 0.31, columns: 18, stepX: 0.074, stepY: 0 });
  [[2.26, 3.35, 0.53, 0.36], [2.66, 3.78, 0.42, 0.28], [-2.62, 2.18, 0.55, 0.36], [-2.62, 0.36, 0.52, 0.4], [-2.62, -0.66, 0.5, 0.26], [-2.62, -2.6, 0.48, 0.3]].forEach(([x, y, w, h]) => {
    const packageBody = roundedPlate(w, h, 0.09, 0.05, black);
    packageBody.position.set(x, y, 0.245);
    groups.board.add(packageBody);
  });
  [
    [[-2.42, 2.35], [-2.15, 2.75], [-1.85, 2.94], [-1.55, 2.96]],
    [[-2.3, 2.36], [-1.6, 2.62], [-0.2, 2.96], [1.74, 3.16]],
    [[1.88, 5.16], [1.64, 5.55], [1.46, 5.87], [1.32, 6.02]],
  ].forEach((points) => addFlex(groups.board, points, 0.028, copper, 0.282));

  // A single carrier gives the three sensor packages a credible shared mounting datum under the optical cluster.
  const cameraCarrier = roundedPlate(3.15, 3.52, 0.07, 0.28, shieldDark);
  cameraCarrier.position.set(-1.34, 5.23, 0.045);
  groups.sensors.add(cameraCarrier);
  const carrierRim = roundedPlate(3.23, 3.6, 0.016, 0.31, pcbEdge);
  carrierRim.position.set(-1.34, 5.23, 0.087);
  groups.sensors.add(carrierRim);
  const carrierInset = roundedPlate(2.95, 3.32, 0.018, 0.22, black);
  carrierInset.position.set(-1.34, 5.23, 0.089);
  groups.sensors.add(carrierInset);

  // Sensor bases register exactly under the exterior optics. Square housings and silicon windows sit inside machined bosses.
  const sensorPositions = [
    [-2.14, 6.13, 0.62], [-2.14, 4.32, 0.62], [-0.45, 5.22, 0.56],
  ];
  sensorPositions.forEach(([x, y, radius], index) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, 0.12, 48), shieldDark);
    base.rotation.x = Math.PI / 2;
    base.position.set(x, y, 0.16);
    groups.sensors.add(base);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.71, 0.06, 8, 48), shield);
    collar.position.set(x, y, 0.245);
    groups.sensors.add(collar);
    const housingSize = radius * 1.68;
    const housing = roundedPlate(housingSize, housingSize, 0.065, 0.1, black);
    housing.position.set(x, y, 0.235);
    housing.rotation.z = index === 2 ? 0.3 : 0;
    groups.sensors.add(housing);
    const window = roundedPlate(housingSize * 0.73, housingSize * 0.73, 0.032, 0.075, silicon);
    window.position.set(x, y, 0.284);
    window.rotation.z = housing.rotation.z;
    groups.sensors.add(window);
    [-1, 1].forEach((dx) => [-1, 1].forEach((dy) => {
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.035, 16), shield);
      boss.rotation.x = Math.PI / 2;
      boss.position.set(x + dx * housingSize * 0.37, y + dy * housingSize * 0.37, 0.286);
      groups.sensors.add(boss);
    }));
    const contact = roundedPlate(radius * 0.72, 0.2, 0.05, 0.03, flex);
    contact.position.set(x + radius * 0.92, y - radius * 0.18, 0.22);
    groups.sensors.add(contact);
  });
  addFlex(groups.sensors, [[-1.74, 6.13], [-1.26, 5.94], [-1.38, 5.3], [-1.85, 4.85]], 0.07, flex, 0.205);
  addFlex(groups.sensors, [[-1.74, 4.32], [-1.24, 4.2], [-1.17, 3.94], [-1.35, 3.68]], 0.07, flex, 0.205);
  addFlex(groups.sensors, [[0.07, 5.22], [0.44, 4.94], [0.21, 4.39], [-0.6, 4.1]], 0.07, flex, 0.205);
  const lidar = roundedPlate(0.68, 0.68, 0.15, 0.1, shieldDark);
  lidar.position.set(0.84, 6.13, 0.2);
  groups.sensors.add(lidar);
  const lidarLens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), black);
  lidarLens.rotation.x = Math.PI / 2;
  lidarLens.position.set(0.84, 6.13, 0.29);
  groups.sensors.add(lidarLens);

  // The lower assembly contains the Taptic module, speaker labyrinth, USB-C fitting and the antenna flexes joining them.
  const speaker = roundedPlate(2.05, 1.18, 0.24, 0.16, shieldDark);
  speaker.position.set(1.87, -6.11, 0.11);
  groups.modules.add(speaker);
  const speakerGrille = roundedPlate(1.7, 0.76, 0.024, 0.1, graphite);
  speakerGrille.position.set(1.87, -6.11, 0.245);
  groups.modules.add(speakerGrille);
  addInstancedParts(groups.modules, black, 27, { w: 0.055, h: 0.32, d: 0.03, x: 1.26, y: -6.27, z: 0.275, columns: 9, stepX: 0.15, stepY: 0.16 });
  const haptic = roundedPlate(2.0, 0.78, 0.22, 0.13, shieldDark);
  haptic.position.set(-1.18, -5.74, 0.12);
  groups.modules.add(haptic);
  const hapticInset = roundedPlate(1.57, 0.37, 0.025, 0.06, shield);
  hapticInset.position.set(-1.18, -5.74, 0.247);
  groups.modules.add(hapticInset);
  const hapticDecal = makeTypeDecal(['TAPTIC'], 1.36, 0.25, '#e0e2dd');
  hapticDecal.position.set(-1.18, -5.74, 0.274);
  groups.modules.add(hapticDecal);
  const portHousing = roundedPlate(1.15, 0.38, 0.25, 0.1, shield);
  portHousing.position.set(0.08, -6.84, 0.1);
  groups.modules.add(portHousing);
  const portCore = roundedPlate(0.74, 0.18, 0.15, 0.05, black);
  portCore.position.set(0.08, -6.84, 0.24);
  groups.modules.add(portCore);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 24), black);
  mic.rotation.x = Math.PI / 2;
  mic.position.set(-0.82, -6.83, 0.17);
  groups.modules.add(mic);
  addFlex(groups.modules, [[-2.2, -5.52], [-2.67, -5.9], [-2.58, -6.53], [-1.2, -6.72]], 0.08, flex, 0.205);
  addFlex(groups.modules, [[0.65, -6.67], [1.18, -6.44], [1.02, -5.87], [0.54, -5.63]], 0.06, flex, 0.205);
  [[-2.35, -6.53], [3.0, -6.54], [-2.25, -5.19], [2.83, -5.63]].forEach(([x, y]) => addScrew(groups.modules, x, y, 0.29, solder));

  const rest = new THREE.Vector3();
  const targets = {
    coil: { start: 0.03, position: new THREE.Vector3(0.22, 0.08, 5.4), rotation: new THREE.Vector3(0.035, -0.09, -0.03) },
    battery: { start: 0.12, position: new THREE.Vector3(0, -0.1, 2.4), rotation: new THREE.Vector3(-0.035, 0.055, 0) },
    modules: { start: 0.25, position: new THREE.Vector3(0.38, -0.18, 2.95), rotation: new THREE.Vector3(0.055, 0.05, 0.025) },
    board: { start: 0.39, position: new THREE.Vector3(-0.62, 0.2, 1.2), rotation: new THREE.Vector3(-0.025, -0.1, -0.04) },
    sensors: { start: 0.54, position: new THREE.Vector3(-0.32, 0.25, 5.9), rotation: new THREE.Vector3(0.04, -0.075, 0.035) },
  };

  function setProgress(progress) {
    const t = clamp01(progress);
    Object.entries(groups).forEach(([key, group]) => {
      const target = targets[key];
      const local = smooth((t - target.start) / (1 - target.start));
      group.position.lerpVectors(rest, target.position, local);
      group.rotation.set(
        target.rotation.x * local,
        target.rotation.y * local,
        target.rotation.z * local,
      );
    });
  }

  setProgress(0);
  return { root, groups, setProgress };
}
