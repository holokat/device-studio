import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { encodeClip } from './video.js';
import { moveById } from './cinematic.js';
import { devices } from './devices.js';
const byId=id=>document.getElementById(id);
const tick=()=>new Promise(r=>requestAnimationFrame(r));
function save(blob,filename){
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function exportGLB(stage,motion){
  const saved=stage.snapshot(),model=stage.model,scale=model.scale.clone();
  const changed=new Map(),nodes=[];let oldMap=null,stillMap=null;
  model.traverse(node=>nodes.push(node));
  const duration=motion.duration,intervals=Math.ceil(duration*30);
  const times=Array.from({length:intervals+1},(_,i)=>duration*i/intervals);
  try{
    model.scale.setScalar(.01);model.rotation.set(0,0,0);
    if(stage.exterior.screenMaterial.map?.isVideoTexture){
      oldMap=stage.exterior.screenMaterial.map;
      const c=document.createElement('canvas'),video=oldMap.image;c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);
      stillMap=new THREE.CanvasTexture(c);stillMap.colorSpace=THREE.SRGBColorSpace;stillMap.offset.copy(oldMap.offset);stillMap.repeat.copy(oldMap.repeat);stage.exterior.screenMaterial.map=stillMap;
    }
    const visibleNodes=nodes.filter(n=>{for(let p=n;p;p=p.parent)if(!p.visible)return false;return true;});
    stage.setProgress(0);
    const poses=new Map(visibleNodes.map(n=>[n,[n.position.clone(),n.quaternion.clone(),n.scale.clone()]]));
    for(const time of times){
      stage.setProgress(motion.sample(time/duration));
      for(const n of visibleNodes){const [p,q,sc]=poses.get(n);if(!n.position.equals(p)||!n.quaternion.equals(q))changed.set(n,true);if(!n.scale.equals(sc))changed.set(n,'scale');}
    }
    const buffers=new Map([...changed.keys()].map(n=>[n,{p:[],q:[],s:changed.get(n)==='scale'?[]:null}]));
    for(const time of times){stage.setProgress(motion.sample(time/duration));for(const [n,b] of buffers){b.p.push(...n.position.toArray());b.q.push(...n.quaternion.toArray());b.s?.push(...n.scale.toArray());}}
    const tracks=[];for(const [n,b] of buffers){tracks.push(new THREE.VectorKeyframeTrack(n.uuid+'.position',times,b.p),new THREE.QuaternionKeyframeTrack(n.uuid+'.quaternion',times,b.q));if(b.s)tracks.push(new THREE.VectorKeyframeTrack(n.uuid+'.scale',times,b.s));}
    stage.setProgress(saved.p);
    const animations=tracks.length?[new THREE.AnimationClip(devices[stage.device].assembly.clipTo,duration,tracks)]:[];
    const data=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true,animations,trs:true,maxTextureSize:3072});
    return new Blob([data],{type:'model/gltf-binary'});
  }finally{if(oldMap){stage.exterior.screenMaterial.map=oldMap;stillMap.dispose();}model.scale.copy(scale);stage.restore(saved);}
}
export function bindExport(stage,art,ui){
  const dialog=byId('export-dialog'),format=byId('format'),status=byId('export-status'),button=byId('download');let controller=null;
  const sync=()=>{
    const value=format.value;byId('render-fields').hidden=value==='model';byId('motion-fields').hidden=value!=='video';
    byId('alpha-row').hidden=value!=='image';
    byId('download-text').textContent={image:'Save image',video:'Render clip',model:'Save model'}[value];
    byId('export-info').textContent={image:'Renders the current camera view without studio controls.',video:'Renders a 30 fps WebM, one frame at a time. Keep this tab open.',model:'Exports visible parts, finish, screen artwork and the current assembly timing. Video screens export as a still.'}[value];status.textContent='';
  };
  const movement=byId('clip-mode'),duration=byId('duration'),studioDuration=byId('studio-duration');
  function syncTiming(){
    const move=moveById[movement.value.replace('cine:','')],assembly=movement.value!=='orbit';
    studioDuration.hidden=!assembly;
    studioDuration.textContent=move?'Move length · '+move.dur+' s':'Studio speed · '+Number(ui.motion.duration.toFixed(2))+' s';
    duration.value=assembly?'studio':'6';
  }
  movement.onchange=syncTiming;
  format.onchange=sync;sync();byId('export-open').onclick=()=>{syncTiming();status.textContent='';byId('ratio').value=stage.composition?'gallery':'wide';byId('export-alpha').checked=stage.backdrop==='clear';dialog.showModal();};
  function close(){if(controller){controller.abort();return;}dialog.close();}
  byId('export-close').onclick=close;dialog.addEventListener('cancel',e=>{if(controller){e.preventDefault();controller.abort();}});
  button.onclick=async()=>{
    if(controller)return;controller=new AbortController();const signal=controller.signal,kind=format.value;
    ui.pause();ui.busy(true);button.disabled=true;dialog.querySelectorAll('select').forEach(s=>s.disabled=true);status.textContent='Preparing export…';
    const move=format.value==='video'?moveById[movement.value.replace('cine:','')]:null;
    if(move)stage.director.reset();
    const snapshot=stage.snapshot(),backdrop=stage.backdrop;let end=null;
    // Transparent stills; clips always render on an opaque backdrop.
    if(kind==='image'&&byId('export-alpha').checked)stage.setBackdrop('clear');
    else if(kind==='video'&&backdrop==='clear')stage.setBackdrop('auto');
    try{
      await tick();
      let blob,ext;
      if(kind==='model'){blob=await exportGLB(stage,ui.motion);ext='glb';}
      else{
        const ratio=({gallery:4/3,wide:16/9,portrait:9/16,square:1,view:stage.camera.aspect})[byId('ratio').value],edge=Number(byId('quality').value);
        const even=n=>Math.max(2,2*Math.round(n/2)),w=ratio>=1?edge:even(edge*ratio),h=ratio>=1?even(edge/ratio):edge;
        if(kind==='video'&&(move?move.tracks.explode:movement.value!=='orbit')){
          ui.prepareAssembly();
        }
        end=stage.beginOutput(w,h);
        if(move)stage.director.begin();
        if(kind==='image'){stage.render(true);blob=await new Promise(r=>stage.canvas.toBlob(r,'image/png'));if(!blob)throw Error('The image could not be encoded.');ext='png';}
        else{const seconds=duration.value==='studio'?(move?move.dur:ui.motion.duration):Number(duration.value);
          blob=await encodeClip(stage,art,movement.value,seconds,move?ui.moveEase():ui.motion.sample,n=>status.textContent='Rendering frames · '+n+'%',signal,move);ext='webm';}
      }
      if(!signal.aborted){save(blob,devices[stage.device].file+'-'+(kind==='video'?byId('clip-mode').value.replace('cine:',''):snapshot.shot||'assembly')+'.'+ext);status.textContent='Export saved.';}
      else status.textContent='Export cancelled.';
    }catch(e){status.textContent=e.message||'Export failed.';}
    finally{end?.();stage.director.reset();stage.setBackdrop(backdrop);stage.restore(snapshot);ui.busy(false);button.disabled=false;dialog.querySelectorAll('select').forEach(s=>s.disabled=false);controller=null;ui.refresh();}
  };
}

// One-click still of the viewport (or the 4∶3 composition frame), long edge
// 3840 px, with the current backdrop; the Transparent backdrop keeps alpha.
export async function saveScreenshot(stage,ui){
  const ratio=stage.composition?4/3:stage.camera.aspect,edge=3840;
  const even=n=>Math.max(2,2*Math.round(n/2)),w=ratio>=1?edge:even(edge*ratio),h=ratio>=1?even(edge/ratio):edge;
  const snapshot=stage.snapshot(),end=stage.beginOutput(w,h);
  try{
    stage.render(true);
    const blob=await new Promise(r=>stage.canvas.toBlob(r,'image/png'));
    if(!blob)throw Error('The screenshot could not be encoded.');
    const stamp=new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
    save(blob,devices[stage.device].file+'-'+(snapshot.shot||'view')+'-'+stamp+'.png');
    ui?.notify?.('Screenshot saved · '+w+' × '+h+(stage.backdrop==='clear'?' · transparent':''));
  }finally{end();stage.restore(snapshot);}
}
