import * as THREE from 'three';

// A lathed cross section can describe a concave lens seat and a soft rolled lip
// without the swollen outline of a torus. The optical axis is local +Z.
export function lathe(name, profile, material) {
  const points=profile.map(([r,z])=>new THREE.Vector2(r,z));
  const mesh=new THREE.Mesh(new THREE.LatheGeometry(points,112),material);
  mesh.rotation.x=Math.PI/2;mesh.name=name;return mesh;
}

export function opticalCoating(index) {
  const surface=document.createElement('canvas');surface.width=surface.height=256;
  const ctx=surface.getContext('2d'),im=ctx.createImageData(256,256);
  // Thin-film highlights follow a bent arc near each curved element's perimeter.
  const offsets=[-.82,-.64,-.68],tints=[[64,91,166],[100,69,123],[88,69,111]];
  for(let j=0;j<256;j++)for(let i=0;i<256;i++){
    const x=(i-127.5)/128,y=(j-127.5)/128,r=Math.hypot(x,y),a=Math.atan2(y,x),k=(j*256+i)*4;
    const arc=(center,width)=>Math.exp(-((Math.cos(a-center)-1)**2)/width);
    const line=Math.exp(-(((r-.82)/.075)**2));
    const reflection=line*(arc(-2.23,.012)*.28+arc(.82,.017)*.16);
    const glow=Math.exp(-(((r-.69)/.29)**2))*(.08+.18*arc(-2.30,.17));
    const spot=Math.exp(-(((x+.36)/.20)**2+((y-offsets[index]*.52)/.13)**2));
    // Keep the coating below photographic black. It only tips blue-violet in a
    // grazing highlight and never becomes a painted bright disc.
    for(let c=0;c<3;c++)im.data[k+c]=[3,4,7][c]+[5,6,10][c]*glow+tints[index][c]*reflection*2.9+[38,46,71][c]*spot;
    im.data[k+3]=255;
  }
  ctx.putImageData(im,0,0);
  const tex=new THREE.CanvasTexture(surface);tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

export function glassElement(name,r,depth,map) {
  const g=new THREE.SphereGeometry(r,64,22);
  const pos=g.getAttribute('position'),uv=g.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setXY(i,.5+pos.getX(i)/(2*r),.5+pos.getY(i)/(2*r));
  const mat=new THREE.MeshPhysicalMaterial({map,color:0xffffff,emissive:0xffffff,emissiveMap:map,emissiveIntensity:.7,roughness:.115,metalness:.03,specularIntensity:.14,clearcoat:.12,clearcoatRoughness:.12,envMapIntensity:.14,ior:1.46});
  mat.name='Coated optical glass';const mesh=new THREE.Mesh(g,mat);mesh.scale.z=depth/r;mesh.name=name;return mesh;
}

function diaphragm(radius,hole) {
  const iris=new THREE.Group();iris.name='Seven-leaf diaphragm';
  for(let i=0;i<7;i++){
    const a=.898,shape=new THREE.Shape();
    shape.moveTo(hole,0);
    shape.quadraticCurveTo(hole*1.05,hole*.49,hole*Math.cos(a),hole*Math.sin(a));
    shape.quadraticCurveTo(radius*.81,radius*.45,radius*Math.cos(a+.32),radius*Math.sin(a+.32));
    shape.absarc(0,0,radius,a+.32,.20,true);
    shape.quadraticCurveTo(radius*.75,-radius*.12,hole,0);
    const mat=new THREE.MeshStandardMaterial({color:[0x07080a,0x08090b,0x060708][i%3],roughness:.72,metalness:.10,envMapIntensity:.16,side:THREE.DoubleSide});
    const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape,14),mat);leaf.name='Iris leaf '+(i+1);leaf.rotation.z=i*Math.PI*2/7;leaf.position.z=i*.00065;iris.add(leaf);
  }
  return iris;
}
// The Duo has one turned metal ferrule. Both bevels are part of the wall
// profile. Only the inset black gasket can be seen between metal and glass.
function duoHousing(r,finish,black,add){
  const profile=[
    [r*.91,-.012],[r*.986,-.012],[r*.998,-.004],[r,.004],
    [r,.178],[r*.999,.185],[r*.994,.192],[r*.986,.196],
    [r*.894,.196],[r*.888,.193],[r*.885,.187],[r*.885,.155],
    [r*.86,.151],[r*.86,-.012]
  ];
  add(lathe('Polished lens ferrule',profile,finish),0,0);
  add(lathe('Window gasket',[
    [r*.80,.14],[r*.886,.14],[r*.886,.184],[r*.879,.190],
    [r*.870,.190],[r*.866,.183],[r*.866,.16],[r*.80,.153],[r*.80,.14]
  ],black),0,.10);
}

function proHousing(r,finish,black,add){
  // iPhone 18 Pro (apple.com product imagery): each lens is one raised ring in
  // the body finish with a soft rounded top, a thin black gasket inside it, then
  // the cover glass. `r` is the .829 scene-unit outer radius.
  const ring=lathe('Lens ring',[[r*.84,-.026],[r*.97,-.026],[r,-.006],[r,.128],[r*.994,.149],[r*.978,.164],[r*.955,.173],[r*.93,.176],
    [r*.888,.172],[r*.876,.162],[r*.872,.14],[r*.872,-.012],[r*.84,-.012],[r*.84,-.026]],finish);
  add(ring,0,0);
  const gasket=lathe('Window gasket',[[r*.78,.12],[r*.874,.12],[r*.874,.162],[r*.868,.167],[r*.846,.167],[r*.838,.162],[r*.78,.15],[r*.78,.12]],black);
  add(gasket,0,.10);
}

// iPhone Air 48MP Fusion (apple.com plateau and profile photography): one
// mirror-polished barrel in the frame finish, its crown fully rounded, rises 1.93 mm off the plateau, a
// black cap carries the cover glass 0.7 mm higher (2.65 mm in all), and a thin
// dark bronze chamfer rings the window. `r` is the .778 barrel radius (15.55 mm ring).
function airHousing(r,finish,black,add){
  add(lathe('Polished lens barrel',[
    [r*.84,-.012],[r*.985,-.012],[r,.002],[r,.13],[r*0.9975,0.1463],[r*0.9903,0.1615],[r*0.9788,0.1745],[r*0.9637,0.1846],[r*0.9463,0.1909],[r*0.9275,0.1930],[r*0.9087,0.1909],[r*0.8912,0.1846],[r*0.8762,0.1745],[r*0.8647,0.1615],[r*0.8575,0.1463],[r*.855,.13],[r*.855,-.012],[r*.84,-.012]
  ],finish),0,0);
  add(lathe('Black lens cap',[
    [r*.70,.12],[r*.856,.12],[r*.856,.236],[r*.852,.25],[r*.842,.259],[r*.826,.2635],[r*.806,.2645],
    [r*.80,.258],[r*.795,.248],[r*.70,.24],[r*.70,.12]
  ],black),0,.09);
  // The chamfer is dark bronze in Apple's macro, not the barrel polish.
  const bronze=new THREE.MeshPhysicalMaterial({color:0x4a3a2c,metalness:1,roughness:.22,envMapIntensity:.9});
  add(lathe('Window chamfer',[[r*.784,.244],[r*.799,.244],[r*.803,.257],[r*.801,.2638],[r*.795,.2645],[r*.787,.26],[r*.784,.252]],bronze),0,.1);
}

export function makeLens(materials,r,index=0,device='pro') {
  const names=['Ultra wide','Main','Telephoto'];
  const root=new THREE.Group();root.name=names[index]+' camera';
  const layers=[];
  function add(mesh,baseZ,spread){mesh.position.z=baseZ;root.add(mesh);layers.push({mesh,baseZ,spread});return mesh;}
  const dark=new THREE.MeshStandardMaterial({color:0x090a0d,roughness:.62,metalness:.08,envMapIntensity:.16,side:THREE.DoubleSide});
  const black=new THREE.MeshPhysicalMaterial({color:0x030405,roughness:.24,metalness:.48,clearcoat:.22,clearcoatRoughness:.16,envMapIntensity:.18,side:THREE.DoubleSide});
  const isDuo=device==='duo',isAir=device==='air';
  if(isDuo)duoHousing(r,materials.rail,black,add);
  else if(isAir)airHousing(r,materials.rail,black,add);
  else proHousing(r,materials.rail,black,add);
  // The Air's window sits on a taller cap: lift the optical stack with it.
  const lift=isAir?.095:0;
  // The supplied macro reference resolves a deliberately restrained Ultra Wide
  // pupil and a much larger Telephoto entrance pupil. Their absolute diameters
  // are not published, so this is reference-proportion calibration only.
  const pupilRadius=r*[.10,.245,.45][index];
  const bowl=lathe('Blackened lens well',[[pupilRadius*.8,-.072],[pupilRadius*1.14,-.070],[pupilRadius*1.30,-.058],[r*.50,-.028],[r*.64,.004],[r*.68,.011],[r*.66,.016],[r*.55,.009],[pupilRadius*1.22,-.050],[pupilRadius,-.061]],dark);
  add(bowl,.118+lift,.17);
  // A stepped, light-absorbing mask under the window seals the annulus to
  // the sleeve. Its circular stop leaves the curved entrance pupil exposed.
  const stop=pupilRadius*(index===1?1.40:1.14);
  const mask=new THREE.MeshStandardMaterial({color:0x0b0b0f,roughness:.78,metalness:0,envMapIntensity:.12,side:THREE.DoubleSide});
  const maskRadius=r*(isDuo ? .877 : isAir ? .80 : .83);
  const baffle=lathe('Entrance baffle',[[stop,.127],[stop,.136],[stop*1.08,.139],[r*.64,.147],[r*.81,.151],[maskRadius,.148],[maskRadius,.135],[r*.64,.135],[stop,.127]],mask);
  add(baffle,lift,.265);
  const iris=diaphragm(r*.53,pupilRadius*1.08);
  add(iris,.116+lift,.24);
  const tex=opticalCoating(index);
  // Spherical glass extends its full supplied depth on either side of its origin.
  // Keep every powered element below the metal retainer rather than allowing it
  // to pierce the front cover.
  add(glassElement('Rear corrective element',pupilRadius*1.04,.008,tex),.101+lift,.29);
  add(glassElement('Focusing element',pupilRadius*1.05,.011,tex),.121+lift,.39);
  add(glassElement('Coated front element',pupilRadius,.014,tex),.142+lift,.48);
  // This is tinted flat cover glass, not an opaque cap. With depth writes off
  // it is blended after the dark wells, leaving the three coated pupils visible
  // without introducing a costly physical transmission pass.
  const cover=new THREE.MeshPhysicalMaterial({color:0x0b101b,metalness:.02,roughness:.10,transparent:true,opacity:.24,depthWrite:false,specularIntensity:.09,clearcoat:.55,clearcoatRoughness:.06,envMapIntensity:.08,side:THREE.FrontSide});
  const windowRadius=r*(isDuo ? .868 : isAir ? .80 : .84);
  const windowMesh=new THREE.Mesh(new THREE.CylinderGeometry(windowRadius,windowRadius,.008,112),cover);
  windowMesh.rotation.x=Math.PI/2;windowMesh.name='Protective lens window';windowMesh.renderOrder=3;add(windowMesh,isDuo?.187:.162+lift,.59);
  return {root,iris,layers};
}
