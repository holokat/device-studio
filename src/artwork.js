import * as THREE from 'three';
import { onScreenImage } from './screen-images.js';
import { htmlScreenCanvas, isHTMLFile } from './html-screen.js';
import { farboundId, farboundName, farboundScreen, preloadFarbound } from './farbound.js';

const titles={presentation:'Presentation',contour:'Contour',mist:'Soft gradient',black:'Black glass'};

export function makeWallpaper(kind, hex, W=640, H=1360, label='iPhone 18 Pro', presentation=null){
  // A device can supply its own Presentation artwork (the iPad home screen).
  if(kind==='presentation'&&presentation)return presentation(W,H,hex);
  // Farbound wallpaper lock screens, drawn with a long edge of at least 2048 px.
  const fb=farboundId(kind);
  if(fb){const k=Math.max(1,2048/Math.max(W,H));return farboundScreen(fb,Math.round(W*k),Math.round(H*k));}
  const canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(kind==='black'){
    ctx.fillStyle='#040405';ctx.fillRect(0,0,W,H);
  }else{
    const pixels=ctx.createImageData(W,H);
    const color=new THREE.Color(hex).convertLinearToSRGB();
    const rgb=[color.r,color.g,color.b];
    let seed=8574;
    for(let j=0;j<H;j++){
      for(let i=0;i<W;i++){
        const x=i/W,y=j/H,k=(j*W+i)*4;
        seed=(Math.imul(1664525,seed)+1013904223)>>>0;
        const noise=(seed/4294967296-.5)*3;
        if(kind==='presentation'){
          const cloud=Math.exp(-(((x-.62)/.55)**2+((y-.47)/.37)**2)*.85);
          const rose=Math.exp(-(((x-.16)/.61)**2+((y-.30)/.26)**2));
          for(let c=0;c<3;c++)pixels.data[k+c]=[241,239,239][c]-cloud*[94,97,76][c]+rose*[9,-12,-8][c]+noise*.17;
        }else if(kind==='mist'){
          const bloom=Math.exp(-((x-.75)**2*2+(y-.65)**2*5));
          const rose=Math.exp(-((x-.18)**2*4+(y-.32)**2*12));
          for(let c=0;c<3;c++) pixels.data[k+c]=[225,224,226][c]+[-60,-65,-40][c]*bloom+[14,-8,-1][c]*rose+noise*.36;
        }else{
          const scallop=.66*Math.sin(x*3.7-1.1)+.15*Math.sin(x*7.1+y*2.0);
          const t=y*3.18+scallop+.11*Math.sin(y*6.1+x*1.7);
          const f=t-Math.floor(t);
          const satin=Math.pow(1-f,4)*.44+Math.pow(f,5)*.30;
          const edge=Math.exp(-f*85)*.68+Math.exp(-(1-f)*120)*.46;
          const side=.68+.22*Math.sin(x*5.1+y*6.2)+.18*y;
          for(let c=0;c<3;c++){
            const base=rgb[c]*255;
            pixels.data[k+c]=Math.min(255,base*(.38+satin)*side+(base*.52+77)*edge+noise);
          }
        }
        pixels.data[k+3]=255;
      }
    }
    ctx.putImageData(pixels,0,0);
    if(kind==='presentation'){
      // Status bar and caption scale with the short edge (1 for the 640 px handset).
      const s=Math.min(W,H)/640;
      ctx.fillStyle='#151619';ctx.font='500 '+23*s+'px -apple-system, Helvetica, Arial, sans-serif';
      ctx.fillText('9:41',54*s,64*s);
      for(let i=0;i<4;i++)ctx.fillRect(W-129*s+i*7*s,(61-i*4)*s,4*s,(4+i*4)*s);
      ctx.lineWidth=2.4*s;ctx.strokeStyle='#151619';ctx.strokeRect(W-87*s,45*s,28*s,14*s);ctx.fillRect(W-84*s,48*s,22*s,8*s);ctx.fillRect(W-58*s,49*s,2*s,6*s);
      ctx.font='500 '+46*s+'px -apple-system, Helvetica, Arial, sans-serif';ctx.fillText(label,31*s,H-119*s);ctx.fillText('Mockup',31*s,H-68*s);
    }
  }
  return canvas;
}

export function screenArtwork(material,onChange){
  // Target display: size of the generated wallpaper, crop aspect and caption.
  let target={width:640,height:1360,aspect:7.05/14.85,label:'iPhone 18 Pro'};
  let mode='contour',finish='#773c49',asset=null,texture=null,fileURL=null,uploadVersion=0,layer=null;
  // Bitmap part of the SVG presentation layer, drawn over still artwork.
  const layered=(source)=>{if(!layer)return source;const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);ctx.imageSmoothingQuality='high';ctx.drawImage(layer,0,0,c.width,c.height);return c;};
  const thumb=document.querySelector('#art-thumb'),name=document.querySelector('#art-name'),type=document.querySelector('#art-type');
  const select=document.querySelector('#art-preset');
  preloadFarbound();
  // Redraw a preset whose bitmap was still loading when it was chosen.
  let pending=false;
  onScreenImage(()=>{if(pending)preset(mode);});
  // CSS width an HTML page is laid out at on this display (points).
  const layoutWidth=()=>target.layout||(target.width<target.height?402:Math.max(1024,target.width));
  const replace=(source,isVideo=false)=>{
    const next=isVideo?new THREE.VideoTexture(source):new THREE.CanvasTexture(source);
    next.colorSpace=THREE.SRGBColorSpace;next.anisotropy=8;
    material.map=next;material.color.set(0xffffff);material.needsUpdate=true;
    texture?.dispose();texture=next;onChange();
  };
  function preset(value){
    mode=value;select.value=value;
    if(asset?.video)asset.video.pause();
    if(value==='custom'&&asset?.html){
      const canvas=htmlScreenCanvas({text:asset.html,key:asset.key},target.width,target.height,layoutWidth());pending=!!canvas.pending;
      const shown=layered(canvas);replace(shown);thumb.src=preview(shown);name.textContent=asset.name;type.textContent='HTML page';return;
    }
    if(value==='custom'&&asset){
      if(asset.video)asset.video.play().catch(()=>{});
      replace(asset.video?asset.source:layered(asset.source),!!asset.video);thumb.src=asset.video?asset.thumb:preview(layered(asset.source));name.textContent=asset.name;type.textContent=asset.video?'Video texture':'Image texture';return;
    }
    const canvas=makeWallpaper(value,finish,target.width,target.height,target.label,target.presentation);
    pending=!!canvas.pending;
    const fb=farboundId(value);
    const shown=layered(canvas);shown.pending=canvas.pending;
    replace(shown);name.textContent=fb?farboundName(fb):titles[value];type.textContent=fb?'Farbound wallpaper':'Studio wallpaper';
    if(value==='presentation'&&target.presentationLabel)[name.textContent,type.textContent]=target.presentationLabel;
    thumb.src=preview(shown);
  }
  function preview(source){
    const c=document.createElement('canvas');c.width=80;c.height=170;const ctx=c.getContext('2d');
    const sw=source.width||source.videoWidth,sh=source.height||source.videoHeight;
    // Landscape displays: show the centre of the artwork in the portrait card.
    if(sw>sh){const cw=sh*80/170;ctx.drawImage(source,(sw-cw)/2,0,cw,sh,0,0,80,170);}else ctx.drawImage(source,0,0,80,170);
    return c.toDataURL('image/jpeg',.85);
  }
  async function upload(file){
    if(isHTMLFile(file)){
      const version=++uploadVersion,text=await file.text();
      if(asset?.video){asset.video.pause();asset.video.removeAttribute('src');asset.video.load();}
      if(fileURL){URL.revokeObjectURL(fileURL);fileURL=null;}
      asset={html:text,key:'upload-'+version,name:file.name};
      let option=select.querySelector('[value=custom]');if(!option){option=new Option('Imported artwork','custom');select.add(option);}
      preset('custom');return true;
    }
    const version=++uploadVersion,url=URL.createObjectURL(file),video=file.type.startsWith('video/');
    const content=video?document.createElement('video'):new Image();
    if(video){content.muted=true;content.loop=true;content.playsInline=true;}
    try{
      await new Promise((resolve,reject)=>{content[video?'onloadeddata':'onload']=resolve;content.onerror=()=>reject(Error('This artwork could not be decoded.'));content.src=url;});
      if(version!==uploadVersion){URL.revokeObjectURL(url);return;}
      const w=video?content.videoWidth:content.naturalWidth,h=video?content.videoHeight:content.naturalHeight;
      const source=video?content:crop(content,w,h);
      if(asset?.video){asset.video.pause();asset.video.removeAttribute('src');asset.video.load();}
      if(fileURL)URL.revokeObjectURL(fileURL);
      fileURL=url;asset={source,content,video:video?content:null,name:file.name,thumb:preview(source),ratio:w/h,size:{w,h}};
      let option=select.querySelector('[value=custom]');if(!option){option=new Option('Imported artwork','custom');select.add(option);}
      preset('custom');
      return true;
    }catch(err){URL.revokeObjectURL(url);throw err;}
  }
  function crop(content,w,h){
    const ar=target.aspect,cw=Math.min(w,h*ar),ch=cw/ar,source=document.createElement('canvas');
    // Long edge capped at 3072 px, as before for the portrait handset.
    if(ar<1){source.height=Math.min(3072,Math.round(ch));source.width=Math.max(1,Math.round(source.height*ar));}
    else{source.width=Math.min(3072,Math.round(cw));source.height=Math.max(1,Math.round(source.width/ar));}
    source.getContext('2d').drawImage(content,(w-cw)/2,(h-ch)/2,cw,ch,0,0,source.width,source.height);
    return source;
  }
  // Point the artwork at another display (device switch). Presets are redrawn at
  // the new size; an imported image is re-cropped from the original file.
  function setTarget(nextMaterial,next){
    material=nextMaterial;target={...target,...next};
    if(asset&&!asset.video&&!asset.html){asset.source=crop(asset.content,asset.content.naturalWidth,asset.content.naturalHeight);asset.thumb=preview(asset.source);}
    preset(mode);applyUV();
  }
  function applyUV(){
    if(mode==='custom'&&asset?.video){
      const ratio=asset.ratio/target.aspect;
      texture.repeat.set(Math.min(1,1/ratio),Math.min(1,ratio));
      texture.offset.set((1-texture.repeat.x)/2,(1-texture.repeat.y)/2);
    }
  }
  return {get uploadSize(){return asset&&!asset.html?{w:Math.round(asset.ratio*1000),h:1000,...(asset.size||{})}:null;},get mode(){return mode;},get pending(){return pending;},setLayer(img){if(img===layer)return;layer=img;preset(mode);applyUV();},setTarget,preset(value){preset(value);applyUV();},async upload(file){const ok=await upload(file);applyUV();return ok;},finish(hex){finish=hex;if(mode==='contour'||(mode==='presentation'&&target.finishArt)){preset(mode);applyUV();}},get playing(){return mode==='custom'&&!!asset?.video&&!asset.video.paused;},get media(){return this.playing?asset.video:null;}};
}
