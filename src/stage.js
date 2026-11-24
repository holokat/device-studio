import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExterior } from './exterior.js';
import { createCompositions, compositions } from './compositions.js';
import { createInternals } from './internals.js';
import { createDuo } from './duo/model.js';
import { duoShots, duoParts } from './duo/views.js';
import { createIpad } from './ipad/model.js';
import { ipadShots, ipadParts } from './ipad/views.js';
import { createIpadMini } from './ipadmini/model.js';
import { ipadMiniShots, ipadMiniParts } from './ipadmini/views.js';
import { createAir } from './air/model.js';
import { airShots, airParts } from './air/views.js';
import { createI17 } from './i17/model.js';
import { i17Shots, i17Parts } from './i17/views.js';
import { createPixel } from './pixel/model.js';
import { pixelShots, pixelParts } from './pixel/views.js';
import { createMacbook } from './macbook/model.js';
import { mbpShots, mbpParts } from './macbook/views.js';
import { createStudioDisplay } from './studiodisplay/model.js';
import { sdxShots, sdxParts } from './studiodisplay/views.js';
import { createImac } from './imac/model.js';
import { imacShots, imacParts } from './imac/views.js';
// Devices built like the iPad: a create() module plus a shots table using
// rot / dir / at / height. Each is created on first use.
const GENERIC={ipad:{create:createIpad,shots:ipadShots,spread:[[1.05,.42,-.78],30,44]},ipadmini:{create:createIpadMini,shots:ipadMiniShots,spread:[[1.05,.42,-.78],24,35]},air:{create:createAir,shots:null,compositions:true},i17:{create:createI17,shots:null,compositions:true},pixel:{create:createPixel,shots:null,compositions:true},mbp:{create:createMacbook,shots:mbpShots,spread:[[-.62,.42,-1],31,46]},sdx:{create:createStudioDisplay,shots:sdxShots,spread:[[-.62,.16,-1],60,74]},imac:{create:createImac,shots:imacShots,spread:[[-.62,.2,-1],60,76]}};

export const shots={
  hero:{shelf:'compositions',title:'Free orbit',label:'Free orbit',target:[0,.03,0],dir:[-.53,.24,1],height:18.8,roll:-.245},
  front:{shelf:'compositions',title:'Display',label:'Front three-quarter',target:[0,0,0],dir:[.33,.10,-1],height:19.5,roll:.11},
  ...compositions,
  optics:{title:'Camera detail',label:'Optical assembly',target:[-.16,5.04,.52],dir:[-.16,.12,1],height:5.9,roll:-.075},
  island:{title:'Front sensor',label:'Front sensor and receiver',target:[0,6.92,-.44],dir:[0,.009,-1],height:1.67,minWidth:5.05,roll:0},
  bottom:{title:'Bottom edge',label:'USB-C and acoustic grilles',target:[0,-7.22,-.03],dir:[.003,-1,-.19],height:2.38,minWidth:7.9,roll:0},
  profile:{title:'Side profile',label:'Camera protrusion',target:[0,4.04,.18],dir:[1,0,0],height:7.95,minWidth:3.1,roll:0,fov:4},
  inside:{title:'Internals',label:'Internal architecture',target:[0,.05,0],dir:[-.17,.10,1],height:18.2,roll:-.11}
};
export const parts={display:'Display stack',frame:'Titanium frame',back:'Rear enclosure',cameras:'Camera optics',sensors:'Image sensors',coil:'Charging coil',battery:'Battery pack',board:'Logic board',modules:'Lower modules'};
// Copies: the UI refills its exported `shots`/`parts` objects with the active device's.
const {hero:airHero,front:airFront,...airRest}=airShots;
GENERIC.air.shots={hero:airHero,front:airFront,...compositions,...airRest};
const {hero:i17Hero,front:i17Front,...i17Rest}=i17Shots;
GENERIC.i17.shots={hero:i17Hero,front:i17Front,...compositions,...i17Rest};
const {hero:pxHero,front:pxFront,...pxRest}=pixelShots;
GENERIC.pixel.shots={hero:pxHero,front:pxFront,...compositions,...pxRest};
export const deviceShots={pro:{...shots},duo:duoShots,ipad:ipadShots,ipadmini:ipadMiniShots,air:GENERIC.air.shots,i17:GENERIC.i17.shots,pixel:GENERIC.pixel.shots,mbp:mbpShots,sdx:sdxShots,imac:imacShots};
export const deviceParts={pro:{...parts},duo:duoParts,ipad:ipadParts,ipadmini:ipadMiniParts,air:airParts,i17:i17Parts,pixel:pixelParts,mbp:mbpParts,sdx:sdxParts,imac:imacParts};
const PRO_FAMILY=new Set(['pro']);
const palettes={noir:['#26272b','#0e0e10','#060607'],studio:['#aaa','#aaa','#aaa'],stone:['#eae7e1','#c7c2bb','#b5afa7'],graphite:['#494847','#272727','#1e1e1e'],white:['#ececf0','#e5e5ea','#d9d9df']};

function studioLightMap(renderer){
  const room=new THREE.Scene();room.background=new THREE.Color(.19,.19,.19);
  function card(x,y,z,w,h,power,tint){
    const color=new THREE.Color(tint).multiplyScalar(power);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    panel.position.set(x,y,z);panel.lookAt(0,0,0);room.add(panel);
  }
  card(-11,4,5,4,28,4.4,'#fff4ed');card(10,4,-2,4.5,25,4.4,'#e3ecff');
  card(1,13,3,14,7,3.2,'#ffffff');card(-2,-6,-9,10,3,1.8,'#f4ecdf');card(5,1,14,6,16,1.65,'#fff8ef');
  card(-5,-1,12,2.2,22,.025,'#ffffff');card(2,-7,10,8,4,.045,'#ffffff');
  const generator=new THREE.PMREMGenerator(renderer),map=generator.fromScene(room,.025,.1,100,{size:256});
  generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return map;
}
function noirTexture(){
  // Dark studio sweep: lifted centre, a soft floor pool under the handset,
  // a cool top spill and fine grain so the deep gradient never bands.
  const W=1600,H=1200,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  const base=ctx.createRadialGradient(W*.5,H*.42,0,W*.5,H*.46,W*.78);
  base.addColorStop(0,'#232428');base.addColorStop(.45,'#141416');base.addColorStop(1,'#050506');
  ctx.fillStyle=base;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(W*.5,H*.86);ctx.scale(1,.2);
  const pool=ctx.createRadialGradient(0,0,0,0,0,W*.42);
  pool.addColorStop(0,'rgba(255,240,228,.10)');pool.addColorStop(.5,'rgba(255,240,228,.035)');pool.addColorStop(1,'rgba(255,240,228,0)');
  ctx.fillStyle=pool;ctx.fillRect(-W,-H*3,W*2,H*6);ctx.restore();
  const spill=ctx.createRadialGradient(W*.5,-H*.2,0,W*.5,-H*.2,H*.9);
  spill.addColorStop(0,'rgba(190,205,235,.07)');spill.addColorStop(1,'rgba(190,205,235,0)');
  ctx.fillStyle=spill;ctx.fillRect(0,0,W,H);
  const img=ctx.getImageData(0,0,W,H),d=img.data;
  for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*5;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}
  ctx.putImageData(img,0,0);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function backdropTexture(name){
  if(name==='noir')return noirTexture();
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=640;
  const ctx=canvas.getContext('2d'),colors=palettes[name],g=ctx.createRadialGradient(410,239,0,394,270,630);
  g.addColorStop(0,colors[0]);g.addColorStop(.79,colors[1]);g.addColorStop(1,colors[2]);ctx.fillStyle=g;ctx.fillRect(0,0,768,640);
  if(name==='studio'){
    const wash=ctx.createLinearGradient(0,0,0,640);wash.addColorStop(0,'#787878');wash.addColorStop(1,'#e4e4e4');ctx.fillStyle=wash;ctx.fillRect(0,0,768,640);
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
export function createStage(canvas,invalidate){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.environment=studioLightMap(renderer).texture;scene.environmentIntensity=.95;
  const key=new THREE.DirectionalLight('#ffefe6',2.05),fill=new THREE.DirectionalLight('#e6edf7',.9);
  key.position.set(-4,9,8);fill.position.set(7,3,-6);
  // Cool rim from behind traces the titanium edges against dark backdrops.
  const rimLight=new THREE.DirectionalLight('#dfe8ff',1.35);rimLight.position.set(5,6,-9);scene.add(rimLight);
  scene.add(key,fill,new THREE.HemisphereLight('#fff9f3','#b3acaa',.58));
  let exterior=createExterior(),model=new THREE.Group();const internal=createInternals();model.name='iPhone 18 Pro reference mockup';
  model.add(exterior.root,internal.root);scene.add(model);
  // Slimmer handset: the 18 Pro body is drawn at 8.75 mm; scale its depth to ~7.7 mm.
  const PRO_DEPTH=.88;exterior.root.scale.z=internal.root.scale.z=PRO_DEPTH;
  if(internal.root.interiorTray)exterior.groups.frame.add(internal.root.interiorTray);
  let groups={...exterior.groups,...internal.groups};
  // Device registry. The iPhone 18 Pro stays the default; the Duo is built on first use.
  const pro={model,groups,exterior};let device='pro',duo=null;const built={};
  const proLayouts=createCompositions(scene,model,groups),genLayouts={};let layouts=proLayouts;
  const camera=new THREE.PerspectiveCamera(26,1,.05,350),control=new OrbitControls(camera,canvas);
  control.enableDamping=false;control.enablePan=true;control.minDistance=.65;control.maxDistance=310;control.rotateSpeed=.64;control.zoomSpeed=.78;
  const backgrounds=Object.fromEntries(Object.keys(palettes).map(k=>[k,backdropTexture(k)]));scene.background=backgrounds.noir;
  let outputDepth=0;
  let progress=0,currentShot='hero',lensFocus='array',backdrop='auto',rig='softbox',dirty=true;
  const mark=()=>{dirty=true;invalidate?.();};control.addEventListener('change',mark);
  const dummySize=new THREE.Vector2();
  const savedPos=new THREE.Vector3(),savedTarget=new THREE.Vector3(),dummy=new THREE.Vector3();
  const snapshot=()=>({pos:camera.position.clone(),target:control.target.clone(),roll:model.rotation.z,quat:model.quaternion.clone(),fov:camera.fov,layout:layouts.current,zoom:camera.zoom,vis:Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,g.visible])),optics:(groups.cameras?.children||[]).map(g=>g.visible),focus:lensFocus,p:progress,shot:currentShot,gen:built[device]?.state?.()||null});
  function restore(s){model.rotation.set(0,0,0);if(s.gen&&built[device]?.setState)built[device].setState(s.gen);if(s.layout)layouts.apply(s.layout);else layouts.clear();setBackdrop(backdrop);camera.fov=s.fov;camera.position.copy(s.pos);control.target.copy(s.target);model.quaternion.copy(s.quat);camera.zoom=s.zoom;camera.updateProjectionMatrix();setProgress(s.p);for(const [k,v] of Object.entries(s.vis))groups[k].visible=v;(groups.cameras?.children||[]).forEach((g,i)=>g.visible=s.optics[i]);lensFocus=s.focus;currentShot=s.shot;control.update();mark();}
  function setProgress(t){progress=THREE.MathUtils.clamp(t,0,1);if(device==='duo')duo.setProgress(progress);else if(built[device])built[device].setProgress(progress);else{exterior.setProgress(progress);internal.setProgress(progress);}mark();}
  function configureShot(id,aspect){
    if(aspect===undefined){const size=renderer.getSize(dummySize);aspect=size.x/size.y;}
    if(device==='duo')return configureDuoShot(id,aspect);
    if(GENERIC[device])return configureGenericShot(id,aspect);
    const shot=deviceShots.pro[id];currentShot=id;lensFocus='array';groups.cameras.children.forEach(g=>g.visible=true);model.rotation.z=shot.roll||0;
    for(const [k,g] of Object.entries(groups))g.visible=id!=='inside'||!['back','cameras','coil'].includes(k);
    setProgress(0);
    if(shot.composition){
      layouts.apply(shot.composition);setBackdrop(backdrop);
      camera.fov=5.8;setCamera(new THREE.Vector3(),[0,0,1],15,outputDepth?aspect:4/3,20);return;
    }
    layouts.clear();setBackdrop(backdrop);camera.fov=shot.fov||26;
    const point=new THREE.Vector3(...shot.target).applyAxisAngle(new THREE.Vector3(0,0,1),shot.roll);
    setCamera(point,shot.dir,shot.height,aspect,shot.minWidth||(id==='optics'?7.9:9.2));
  }
  function configureDuoShot(id,aspect){
    const shot=duoShots[id]||duoShots.hero;currentShot=duoShots[id]?id:'hero';lensFocus='array';
    layouts.clear();setBackdrop(backdrop);camera.fov=shot.fov||26;
    for(const g of Object.values(groups))g.visible=true;
    duo.setPose('book');duo.setScreenFx();
    setProgress(shot.fold??0);
    model.quaternion.copy(duo.orient(shot));model.updateMatrixWorld(true);
    const point=shot.at?points()[shot.at].p.clone().applyQuaternion(model.quaternion).add(model.position):new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    setCamera(point,shot.dir,shot.height,aspect,shot.minWidth||9.2);
  }
  // Bounds of the visible meshes only (Box3.setFromObject also counts hidden
  // children, such as the iPad's colour line-up).
  function visibleBox(obj){const box=new THREE.Box3(),b=new THREE.Box3();obj.updateMatrixWorld(true);obj.traverseVisible(o=>{if(o.isMesh){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));}});return box;}
  function configureGenericShot(id,aspect){
    const table=GENERIC[device].shots,dev=built[device];
    const shot=table[id]||table.hero;currentShot=table[id]?id:'hero';lensFocus='array';
    for(const g of Object.values(groups))g.visible=true;
    if(shot.composition){
      setProgress(0);model.position.set(0,0,0);model.quaternion.identity();
      layouts.apply(shot.composition);setBackdrop(backdrop);
      camera.fov=5.8;setCamera(new THREE.Vector3(),[0,0,1],15,outputDepth?aspect:4/3,20);return;
    }
    layouts.clear();setBackdrop(backdrop);camera.fov=shot.fov||26;
    setProgress(shot.progress??shot.fold??0);if(dev.setTilt)dev.setState({height:shot.pose?.height??.5,tilt:shot.pose?.tilt??0});dev.setScreenOrientation?.(shot.screen||'landscape');dev.setLineup?.(!!shot.lineup);dev.setPose?.(shot.pose);
    model.position.set(0,0,0);model.quaternion.setFromEuler(new THREE.Euler(...(shot.rot||[0,0,0])));model.updateMatrixWorld(true);
    const point=shot.at?points()[shot.at].p.clone().applyQuaternion(model.quaternion).add(model.position):visibleBox(model).getCenter(new THREE.Vector3());
    setCamera(point,shot.dir,shot.height,aspect,shot.minWidth||9.2);
  }
  // Hardware anchors in model space with outward normals (null for the 18 Pro,
  // whose points are static in src/cinematic.js).
  function points(){return device==='duo'?duo.points(model):built[device]?built[device].points(model):null;}
  function setDevice(id){
    id=id==='duo'||GENERIC[id]||PRO_FAMILY.has(id)?id:'pro';
    if(id==='duo'&&!duo){duo=createDuo();duo.root.visible=false;scene.add(duo.root);}
    if(GENERIC[id]&&!built[id]){const d=built[id]=GENERIC[id].create();d.root.visible=false;scene.add(d.root);if(GENERIC[id].compositions)genLayouts[id]=createCompositions(scene,d.root,d.groups);}
    layouts.clear();device=id;layouts=genLayouts[id]||proLayouts;layouts.clear();
    pro.model.visible=PRO_FAMILY.has(id);if(duo)duo.root.visible=id==='duo';for(const [k,d] of Object.entries(built))d.root.visible=id===k;
    const next=id==='duo'?{model:duo.root,groups:duo.groups,exterior:duo}:built[id]?{model:built[id].root,groups:built[id].groups,exterior:built[id]}:pro;
    model=next.model;groups=next.groups;exterior=next.exterior;
    model.position.set(0,0,0);model.quaternion.identity();
    lensFocus='array';configureShot('hero');return device;
  }
  // Small live render of a view for the Views list; restores the working state.
  function thumbnail(id,w=160,h=120){
    const saved=snapshot();configureShot(id,w/h);const end=beginOutput(w,h);
    try{render(true);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(canvas,0,0,w,h);return c.toDataURL('image/webp',.86);}
    finally{end();restore(saved);}
  }
  function setCamera(point,dir,height,aspect,minWidth){
    camera.zoom=1;const fit=Math.max(height,minWidth/aspect);
    camera.position.copy(point).addScaledVector(dummy.fromArray(dir).normalize(),fit/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))));
    control.target.copy(point);camera.updateProjectionMatrix();control.update();mark();
  }
  function focusOptic(value){
    if(!PRO_FAMILY.has(device))return;
    configureShot('optics');lensFocus=value;
    if(value==='array')return;
    const stack=value==='stack',idx=stack?2:Number(value),optic=groups.cameras.children[idx];
    if(stack){
      setProgress(1);
      for(const [key,g] of Object.entries(groups))g.visible=key==='cameras';
      groups.cameras.children.forEach(g=>g.visible=g===optic);
    }
    model.updateMatrixWorld(true);const center=optic.getWorldPosition(new THREE.Vector3());
    center.z+=stack?.77:.16;
    setCamera(center,stack?[-1.55,.36,.54]:[-.16,.14,1],stack?3.65:3.15,camera.aspect,stack?3.6:2.65);
  }
  function revealAssembly(){
    for(const group of Object.values(groups))group.visible=true;
    groups.cameras?.children.forEach(lens=>lens.visible=true);
    lensFocus='array';mark();
  }
  function spreadView(){if(GENERIC[device]){layouts.clear();setBackdrop(backdrop);camera.fov=26;const c=visibleBox(model).getCenter(new THREE.Vector3());const sz=visibleBox(model).getSize(new THREE.Vector3()).length();const [dir,h,w]=GENERIC[device].spread||[[.9,.4,-.8],sz*1.15,sz*1.6];setCamera(c,dir,h,camera.aspect,w);currentShot='';return;}if(device==='duo'){layouts.clear();setBackdrop(backdrop);camera.fov=26;model.updateMatrixWorld(true);const c=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());setCamera(c,[.55,.3,1],15,camera.aspect,21);currentShot='';return;}layouts.clear();setBackdrop(backdrop);camera.fov=26;lensFocus='array';groups.cameras.children.forEach(g=>g.visible=true);model.rotation.z=-.13;setCamera(new THREE.Vector3(0,.2,2.85),[-1.47,.42,.64],20.4,camera.aspect,24.2);currentShot='';}
  function resize(w=canvas.clientWidth,h=canvas.clientHeight){
    if(!w||!h)return;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();mark();
  }
  // 'clear' renders with a transparent background (stills and screenshots keep the alpha).
  function setBackdrop(value){backdrop=value;scene.background=value==='clear'?null:backgrounds[value==='auto'?'noir':value];renderer.setClearColor(0x000000,0);mark();}
  function setLighting(value){
    rig=value;const rim=value==='rim',day=value==='daylight';scene.environmentRotation.y=rim?1.8:day?-.58:0;
    scene.environmentIntensity=rim?.68:day?1.13:.95;key.intensity=rim?1.1:day?2.4:2.05;fill.intensity=rim?2.6:.9;
    key.position.set(rim?-6:-4,day?14:9,rim?-7:8);renderer.toneMappingExposure=rim?.93:1.05;mark();
  }
  function render(force=false){
    if(!dirty&&!force)return;
    // All interior parts remain in the assembly and its export. Skip their draw
    // calls only when both outer covers fully enclose the assembled handset.
    internal.root.visible=!PRO_FAMILY.has(device)||!(progress===0&&groups.back.visible&&groups.display.visible&&groups.frame.visible);
    // Macro hardware and grazing-angle phone screens have coplanar clearances
    // measured in microns. Tight depth limits keep those layers stable.
    const distance=camera.position.distanceTo(control.target);
    camera.near=Math.max(.025,distance*.12);camera.far=Math.max(90,distance+130);camera.updateProjectionMatrix();
    const size=renderer.getSize(dummySize);let left=0,bottom=0,w=size.x,h=size.y;
    // Compositions are framed for 4:3. The viewport renders full-bleed (no
    // letterbox bars): wider windows just show more backdrop at the sides,
    // narrower ones widen the lens so the whole 4:3 frame stays in view.
    const framed=!!layouts.current&&outputDepth===0;let lensFov=null;
    renderer.setViewport(0,0,w,h);renderer.setScissorTest(false);
    if(framed&&w/h<4/3){lensFov=camera.fov;camera.fov=2*THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(lensFov/2))*(4/3)/(w/h)));}
    camera.aspect=w/h;camera.updateProjectionMatrix();
    layouts.sync();renderer.render(scene,camera);internal.root.visible=true;
    if(lensFov!==null){camera.fov=lensFov;camera.updateProjectionMatrix();}
    dirty=false;
  }
  function beginOutput(w,h){
    outputDepth++;
    const pixelRatio=renderer.getPixelRatio(),size=renderer.getSize(new THREE.Vector2()),aspect=camera.aspect;
    // Preserve both dimensions of the current composition when output is narrower.
    const originalZoom=camera.zoom;
    if(layouts.current&&currentShot){camera.zoom*=Math.max(15,20/aspect)/Math.max(15,20/(w/h));}
    else if(w/h<aspect)camera.zoom*=Math.max(.25,Math.min(1,(w/h)/Math.min(aspect,1.05)));
    renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    return ()=>{outputDepth--;renderer.setPixelRatio(pixelRatio);renderer.setSize(size.x,size.y,false);camera.aspect=aspect;camera.zoom=originalZoom;camera.updateProjectionMatrix();mark();};
  }
  function orbit(angle){const offset=savedPos.copy(camera.position).sub(control.target).applyAxisAngle(dummy.set(0,1,0),angle);camera.position.copy(control.target).add(offset);control.update();mark();}
  function zoom(factor){const offset=savedTarget.copy(camera.position).sub(control.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,control.minDistance,control.maxDistance));camera.position.copy(control.target).add(offset);control.update();mark();}
  resize();configureShot('hero');
  return {customView(){currentShot='';},renderer,canvas,scene,camera,get model(){return model;},get groups(){return groups;},get exterior(){return exterior;},get device(){return device;},get duo(){return duo;},get ipad(){return built.ipad;},get tablet(){return device==='ipad'||device==='ipadmini'?built[device]:null;},get built(){return built;},get shots(){return deviceShots[device];},get parts(){return deviceParts[device];},setDevice,points,thumbnail,control,render,mark,resize,setProgress,configureShot,revealAssembly,spreadView,setBackdrop,setLighting,beginOutput,snapshot,restore,orbit,zoom,get progress(){return progress;},get shot(){return currentShot;},get composition(){return layouts.current;},get backdrop(){return backdrop;},get rig(){return rig;},focusOptic,get lensFocus(){return lensFocus;}};
}
