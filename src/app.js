import {bindMotionControls} from './motion.js';
import {createDirector,moves as proMoves,moveById} from './cinematic.js';
import {duoMoves} from './duo/moves.js';
const moves=[...duoMoves,...proMoves];
import {icons} from './icons.js';
import {createStage,shots,parts} from './stage.js';
import {screenArtwork,makeWallpaper} from './artwork.js';
import {farboundId,farboundScreen} from './farbound.js';
import {onScreenImage} from './screen-images.js';
import {wallpaperCanvas,preloadWallpapers,presentationWallpapers} from './wallpapers.js';
import {createScreenOverlay} from './screen-overlay.js';
import {isSVGFile,readSVG,fitSVG,splitSVG,rasterImage} from './svg-layer.js';
import {devicePoints} from './cinematic.js';

import {bindExport,exportGLB,saveScreenshot} from './export.js';
import {devices,deviceFromQuery} from './devices.js';

const $=id=>document.getElementById(id), finishes=[
  ['Burgundy','#67323d','#542530','#ae7784'],['Graphite','#373739','#242528','#8b8b8c'],
  ['Pearl','#d4d1c8','#9a9791','#f7f4ea'],['Glacier','#91aac8','#627790','#c3d4e9'],['Copper','#c97642','#a2582f','#efb081']
];
const liveMessage=(msg)=>{const n=$('notice');n.textContent=msg;clearTimeout(n.timer);n.timer=setTimeout(()=>n.textContent='',4500);};
function icon(el,name){el.innerHTML=icons[name]||'';}
document.querySelectorAll('[data-icon]').forEach(el=>icon(el,el.dataset.icon));
document.documentElement.style.setProperty('--chevron','url("data:image/svg+xml,'+encodeURIComponent(icons.ChevronDownSmall.replaceAll('currentColor','#c6c6c4'))+'")');

async function boot(){
  const stage=createStage($('viewport')),art=screenArtwork(stage.exterior.screenMaterial,stage.mark);
  const director=stage.director=createDirector(stage);
  const shotButtons={},partButtons={},swatches=[];
  const inspector=$('inspector-panel'),toggle=$('toggle-inspector');
  function showInspector(open){inspector.hidden=!open;toggle.setAttribute('aria-expanded',open);requestAnimationFrame(()=>{stage.resize();stage.mark();});}
  toggle.onclick=()=>showInspector(inspector.hidden);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('export-dialog').open&&!inspector.hidden&&window.innerWidth<980){showInspector(false);toggle.focus();}});
  showInspector(window.innerWidth>=980);
  let lastSelected='hero',activeShot='hero',busy=false,playing=false,playTarget=1,turning=false,last=performance.now(),phase=0,preferReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion=bindMotionControls($('motion-controls'),()=>{
    if(playing)phase=motion.timeAt(playTarget?stage.progress:1-stage.progress);
  });
  const shelfFor=id=>shots[id].shelf||(shots[id].composition?'compositions':'details');
  // Library sidebar: Moves | Views tabs
  function libraryTab(id){
    for(const key of ['moves','views']){const on=key===id;$('lib-'+key).hidden=!on;$('lib-tab-'+key).setAttribute('aria-selected',String(on));}
  }
  $('lib-tab-moves').onclick=()=>libraryTab('moves');$('lib-tab-views').onclick=()=>libraryTab('views');
  function showViewGroup(){}
  function setShot(id){
    if(busy)return;
    pause();stopMove();director.reset();stage.configureShot(id);syncOverlay?.();activeShot=id;lastSelected=id;showViewGroup(shelfFor(id));refresh();
    if(!$('lib-views').hidden)shotButtons[id]?.scrollIntoView({block:"nearest"});
  }
  for(const [id,s] of Object.entries(shots)){
    const button=document.createElement('button');
    button.className='shot';button.title=s.label;button.dataset.shot=id;
    const image=new Image();
    image.alt='';image.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';image.width=120;image.height=90;image.loading='lazy';
    const label=document.createElement('span');label.textContent=s.title;
    button.append(image,label);
    button.onclick=()=>setShot(id);
    $('views-'+shelfFor(id)).append(button);shotButtons[id]=button;
  }
  $('views-count').textContent=Object.keys(shots).length;
  function finish(hex){
    stage.exterior.setFinish(hex);art.finish(hex);$('custom-color').value=hex;
    const index=finishes.findIndex(f=>f[1].toLowerCase()===hex.toLowerCase());
    $('finish-name').textContent=index<0?'Custom · '+hex.toUpperCase():finishes[index][0];
    swatches.forEach((b,i)=>{const selected=i===index;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);b.innerHTML=selected?icons.Checkmark1:'';});
    stage.mark();thumbsStale();
  }
  for(const [name,hex,low,high] of finishes){
    const b=document.createElement('button');b.className='swatch';b.title=name;b.setAttribute('aria-label',name+' titanium');
    b.style.background='linear-gradient(132deg,'+low+' 0%,'+hex+' 35%,'+high+' 69%,'+hex+' 100%)';b.onclick=()=>finish(hex);swatches.push(b);$('finishes').append(b);
  }
  $('custom-color').oninput=e=>finish(e.target.value);
  for(const [key,name] of Object.entries(parts)){
    const b=document.createElement('button');b.className='part';const label=document.createElement('span');label.textContent=name;
    b.append(label,document.createElement('span'));b.onclick=()=>{stage.groups[key].visible=!stage.groups[key].visible;stage.mark();refresh();};partButtons[key]=b;$('part-list').append(b);
  }
  $('show-all').onclick=()=>{for(const g of Object.values(stage.groups))g.visible=true;stage.groups.cameras?.children.forEach(g=>g.visible=true);stage.mark();refresh();};
  $('lens-focus').onchange=e=>{pause();stage.focusOptic(e.target.value);activeShot='optics';refresh();};
  const anyHidden=()=>Object.values(stage.groups).some(g=>!g.visible);
  function toggleTarget(){
    if(playing)return 1-playTarget;
    return stage.progress>0?0:1;
  }
  function updateTime(){
    const p=stage.progress;const amount=Math.round(100*p)+'%';$('progress-out').textContent=amount;
    $('spread').value=Math.round(p*1000);$('spread').style.setProperty('--progress',amount);
    const action=toggleTarget()?'Explode':'Assemble',label=$('assembly-action');
    if(label.textContent!==action)label.textContent=action;
    $('visibility-state').textContent=p>=1?'Exploded':p>0?(playing?(playTarget?'Exploding':'Assembling')+' · ':'')+amount:anyHidden()?'Cutaway':'Assembled';
    $('visibility-state').previousElementSibling.classList.toggle('open',p>0||anyHidden());
  }
  function refresh(){
    $('lens-focus').hidden=activeShot!=='optics';$('lens-focus').value=stage.lensFocus;
    for(const [id,b] of Object.entries(shotButtons)){b.classList.toggle('active',activeShot===id);b.setAttribute('aria-pressed',id===activeShot);}
    $('shot-label').textContent=shots[activeShot]?.label||(stage.progress>0?'Assembly view':'Custom view');
    for(const [key,b] of Object.entries(partButtons)){const on=stage.groups[key].visible;b.classList.toggle('off',!on);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',(on?'Hide ':'Show ')+parts[key]);icon(b.lastChild,on?'EyeOpen':'EyeClosed');}
    updateTime();
  }
  function playIcon(){
    const b=$('play'),action=playing?'Pause animation':playTarget===0?'Play reassembly':'Play disassembly';icon(b,playing?'Pause':'Play');b.setAttribute('aria-label',action);b.title=action;
  }
  // Cinematic moves: sidebar library + timeline transport
  const MOVE_CATS={Hero:['hero-reveal','hero-loop','light-sweep','float'],Spins:['quick-spin','double-spin','spin-settle','flip-display','edge-reveal','backflip'],
    Camera:['turntable','push-in','pull-reveal','whip-pan','orbit-rise','crane-down','dutch-spin'],
    Macro:['main-lens-glide','lens-rack','macro-sweep','flash-glint','island-macro','usb-c-reveal','camera-control','edge-skim'],
    Screen:['screen-glide','screen-rise','screen-diagonal','screen-rack','screen-cross','screen-arc','glass-glint','corner-macro','low-tilt-up','push-to-app'],
    Combos:['slide-flip','spin-to-lens','lens-to-screen','rise-and-turn','drop-flip','whip-to-macro','tumble-drop','slide-in'],
    Exploded:['explode-orbit','layer-push','exploded-macro']};
  MOVE_CATS.Screen.push(...moves.filter(m=>m.showcase).map(m=>m.id));
  MOVE_CATS.Duo=duoMoves.map(m=>m.id);
  const catOf=id=>Object.keys(MOVE_CATS).find(c=>MOVE_CATS[c].includes(id))||'Combos';
  // Duo moves need the Duo; Pro moves aimed at Pro hardware need those anchors.
  function movable(m){
    // Variants (iPhone 17 Pro) take their base device's moves.
    const family=devices[stage.device]?.base||stage.device;
    if(m.device)return m.device===family;
    if(family==='pro')return true;
    const pts=stage.points?.()||{},names=[m.at,...(m.pts||[])].filter(Boolean);
    if(!names.length&&m.tracks.focus)names.push('array');
    return names.every(n=>n in pts);
  }
  const MOVE_THUMBS=new Set(['main-lens-glide','lens-rack','macro-sweep','flash-glint','island-macro','usb-c-reveal','camera-control','explode-orbit','layer-push','exploded-macro']);
  const GLYPH={expoInOut:'M3 22C14 22 14 4 22 4S30 4 41 4',expoOut:'M3 22C8 6 16 4 41 4',quint:'M3 22C8 6 16 4 41 4',quintInOut:'M3 22C14 22 14 4 22 4S30 4 41 4',sine:'M3 22C14 22 30 4 41 4',back:'M3 22C12 22 18 -1 28 2S36 4 41 4',softBack:'M3 22C12 22 18 1 28 3S36 4 41 4',lin:'M3 22L41 4',cubic:'M3 22C16 22 28 4 41 4',in:'M3 22C30 22 36 12 41 4'};
  function glyphFor(m){if(m.loop)return 'M3 13C9 5 15 5 22 13S35 21 41 13';const ch=Object.values(m.tracks)[0],last=ch[ch.length-1];return GLYPH[last[2]||'cubic']||GLYPH.cubic;}
  let move=moves[0],moveT=0,movePlaying=false,moveLoop=false,moveTiming='preset',moveCat='All',moveQuery='';
  const moveButtons={};
  const moveEase=()=>moveTiming==='curve'?motion.sampleRaw:t=>t;
  const fmtT=s=>(s<10?'0':'')+s.toFixed(2);
  function keyTimes(m){const set=new Set();for(const ch of Object.values(m.tracks))for(const k of ch)set.add(Math.round(k[0]*1000)/1000);return [...set].sort((a,b)=>a-b);}
  function syncTimeline(){
    $('tl-keys').replaceChildren(...keyTimes(move).map(t=>{const k=document.createElement('span');k.className='tl-key';k.style.left=(t*100)+'%';return k;}));
    $('tl-ticks').replaceChildren(...Array.from({length:6},(_,i)=>{const s=document.createElement('span');s.textContent=(move.dur*i/5).toFixed(1)+'s';return s;}));
  }
  function syncMoves(){
    $('move-name').textContent=move.name;$('move-time').textContent=fmtT(move.dur*moveT)+' / '+fmtT(move.dur);
    icon($('move-play'),movePlaying?'Pause':'Play');$('move-play').setAttribute('aria-label',movePlaying?'Pause move':'Play '+move.name);
    $('move-loop').setAttribute('aria-pressed',String(moveLoop||!!move.loop));
    for(const [id,b] of Object.entries(moveButtons)){b.classList.toggle('active',id===move.id);b.classList.toggle('playing',id===move.id&&movePlaying);}
    $('move-progress').style.transform='scaleX('+moveT+')';$('tl-head').style.left=(moveT*100)+'%';
    $('moves').classList.toggle('is-playing',movePlaying);
  }
  function stopMove(){if(!movePlaying)return;movePlaying=false;syncMoves();}
  function startMove(id){
    move=moveById[id]||move;playing=false;turning=false;$('turntable').setAttribute('aria-pressed','false');playIcon();
    director.reset();
    if(move.tracks.explode&&(stage.progress===0||anyHidden()))prepareAssembly();
    director.begin();moveT=0;syncTimeline();
  }
  function playMove(id){
    if(busy)return;
    startMove(id);movePlaying=!preferReduced;
    if(preferReduced){moveT=1;director.apply(move,moveEase()(1));}
    activeShot='';refresh();syncMoves();
  }
  function filterMoves(){
    let shown=0;
    const avail=moves.filter(movable),cats=new Set(avail.map(m=>catOf(m.id)));
    for(const b of $('move-cats').children)b.hidden=b.textContent!=='All'&&!cats.has(b.textContent);
    if(moveCat!=='All'&&!cats.has(moveCat))moveCat='All';
    for(const m of moves){const on=movable(m)&&(moveCat==='All'||catOf(m.id)===moveCat)&&(!moveQuery||(m.name+' '+m.note).toLowerCase().includes(moveQuery));moveButtons[m.id].hidden=!on;if(on)shown++;}
    $('moves-empty').hidden=shown>0;$('moves-count').textContent=avail.length;
    if(!movable(move)&&!movePlaying){move=avail[0];syncTimeline();syncMoves();}
    for(const b of $('move-cats').children)b.setAttribute('aria-pressed',String(b.textContent===moveCat));
  }
  for(const c of ['All','Duo',...Object.keys(MOVE_CATS).filter(c=>c!=='Duo')]){const b=document.createElement('button');b.type='button';b.textContent=c;b.onclick=()=>{moveCat=c;filterMoves();};$('move-cats').append(b);}
  for(const m of moves){
    const b=document.createElement('button');b.className='move';b.type='button';b.title=m.note;
    const thumb=document.createElement('span');thumb.className='move__thumb';
    if(MOVE_THUMBS.has(m.id)){const img=new Image();img.alt='';img.loading='lazy';img.src='previews/moves/'+m.id+'.jpg';thumb.append(img);}
    else thumb.innerHTML='<svg width="38" height="24" viewBox="0 0 44 26" fill="none" aria-hidden="true"><path d="M3 22H41" stroke="#26262d"/><path class="c" d="'+glyphFor(m)+'" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const text=document.createElement('span');text.className='move__text';
    const name=document.createElement('span');name.className='move__name';name.textContent=m.name;
    const note=document.createElement('span');note.className='move__note';note.textContent=m.note;text.append(name,note);
    const dur=document.createElement('span');dur.className='move__dur';dur.textContent=m.dur.toFixed(1)+'s';
    b.append(thumb,text,dur);b.onclick=()=>playMove(m.id);moveButtons[m.id]=b;$('moves-grid').append(b);
    const o=document.createElement('option');o.value='cine:'+m.id;o.textContent=m.name;$('clip-moves').append(o);
  }
  {const e=document.createElement('p');e.id='moves-empty';e.className='empty';e.textContent='No moves match.';e.hidden=true;$('moves-grid').append(e);}
  $('moves-count').textContent=moves.length;
  $('move-search').oninput=e=>{moveQuery=e.target.value.trim().toLowerCase();filterMoves();};
  $('move-play').onclick=()=>{if(movePlaying){movePlaying=false;syncMoves();}else if(director.active&&moveT>0&&moveT<1){movePlaying=true;syncMoves();}else playMove(move.id);};
  $('move-loop').onclick=()=>{moveLoop=!moveLoop;syncMoves();};
  for(const mode of ['preset','curve'])$('timing-'+mode).onclick=()=>{moveTiming=mode;for(const m of ['preset','curve'])$('timing-'+m).setAttribute('aria-pressed',String(m===mode));};
  // Scrub the timeline to preview any frame of the selected move.
  {const tl=$('timeline');let scrubbing=false;
    const scrub=e=>{const r=tl.getBoundingClientRect();moveT=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));if(!director.active)startMove(move.id);director.apply(move,moveEase()(moveT));if(move.tracks.explode)updateTime();syncMoves();};
    tl.addEventListener('pointerdown',e=>{if(busy)return;scrubbing=true;movePlaying=false;tl.setPointerCapture(e.pointerId);activeShot='';scrub(e);});
    tl.addEventListener('pointermove',e=>{if(scrubbing)scrub(e);});
    tl.addEventListener('pointerup',()=>{scrubbing=false;});tl.addEventListener('pointercancel',()=>{scrubbing=false;});}
  $('move-render').onclick=()=>{$('export-open').click();const f=$('format');f.value='video';f.dispatchEvent(new Event('change'));const c=$('clip-mode');c.value='cine:'+move.id;c.dispatchEvent(new Event('change'));};
  syncTimeline();filterMoves();syncMoves();
  function pause(){playing=false;turning=false;$('turntable').setAttribute('aria-pressed','false');playIcon();}
  function prepareAssembly(){
    stage.revealAssembly();refresh();
  }
  function start(target){
    if(busy)return;
    if(!playing&&(stage.progress===0||anyHidden()||stage.lensFocus==='stack'))prepareAssembly();
    playTarget=target;
    phase=motion.timeAt(target?stage.progress:1-stage.progress);
    playing=stage.progress!==target;
    last=performance.now();
    if(preferReduced||!playing){stage.setProgress(target);playing=false;playTarget=1-target;}
    playIcon();refresh();
  }
  $('assembly-toggle').onclick=()=>start(toggleTarget());
  $('play').onclick=()=>{if(playing){playing=false;playIcon();updateTime();}else start(stage.progress<=0?1:stage.progress>=1?0:playTarget);};
  $('assembled').onclick=()=>{start(0);};
  $('exploded').onclick=()=>start(1);
  $('spread').onchange=()=>{stage.duo?.setFoldMotion(0);stage.mark();};
  $('spread').oninput=e=>{playing=false;if(stage.device==='duo')stage.duo?.setFoldMotion(1);const next=Number(e.target.value)/1000;
    if(next>0&&stage.progress===0)prepareAssembly();
    playTarget=next>=stage.progress?1:0;stage.setProgress(next);if(next===1)playTarget=0;if(next===0)playTarget=1;refresh();playIcon();};
  $('turntable').onclick=()=>{if(busy)return;stopMove();turning=!turning;$('turntable').setAttribute('aria-pressed',turning);};
  stage.control.addEventListener('start',()=>{if(busy)return;stopMove();director.release();activeShot='';stage.customView();refresh();turning=false;$('turntable').setAttribute('aria-pressed','false');});
  $('zoom-in').onclick=()=>stage.zoom(.82);$('zoom-out').onclick=()=>stage.zoom(1.22);
  $('fit').onclick=()=>{stopMove();director.reset();if(!activeShot){if(stage.progress>0)stage.spreadView();else setShot(stage.composition?'scene'+stage.composition:lastSelected);return;}const state=stage.snapshot();if(activeShot==='optics'&&state.focus!=='array')stage.focusOptic(state.focus);else stage.configureShot(activeShot);stage.setProgress(state.p);for(const [k,v] of Object.entries(state.vis))stage.groups[k].visible=v;refresh();};
  $('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{liveMessage('Fullscreen is unavailable in this browser.');}};
  const LOOK={rig:{softbox:'Softbox',rim:'Rim',daylight:'Daylight'},backdrop:{auto:'Noir',graphite:'Graphite',studio:'Gray sweep',stone:'Stone',white:'Porcelain',clear:'Transparent'}};
  let look={rig:'rim',backdrop:'auto'};
  function syncLook(){$('hud-look').textContent=LOOK.backdrop[look.backdrop]+' · '+LOOK.rig[look.rig];
    for(const b of $('rig-chips').children)b.setAttribute('aria-pressed',String(b.dataset.rig===look.rig));
    for(const b of $('backdrop-chips').children)b.setAttribute('aria-pressed',String(b.dataset.backdrop===look.backdrop));}
  for(const b of $('rig-chips').children)b.onclick=()=>{look.rig=b.dataset.rig;stage.setLighting(look.rig);syncLook();};
  // Rim is the default look for every device.
  stage.setLighting(look.rig);syncLook();
  const params0=new URLSearchParams(location.search);
  // Studio chrome theme. Switching also swaps the default backdrop (noir ↔
  // porcelain) unless the viewer picked a different one.
  function applyTheme(theme,swap){
    const light=theme==='light',root=document.documentElement;
    if(light)root.dataset.theme='light';else delete root.dataset.theme;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content',light?'#f5f5f7':'#050506');
    const t=$('theme-toggle');t.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');t.title=light?'Dark mode':'Light mode';
    try{localStorage.setItem('studio-theme',theme);}catch(e){}
    if(swap){const want=light?'white':'auto',from=light?'auto':'white';if(look.backdrop===from)$('backdrop-chips').querySelector('[data-backdrop="'+want+'"]')?.click();}
  }
  $('theme-toggle').onclick=()=>applyTheme(document.documentElement.dataset.theme==='light'?'dark':'light',true);
  for(const b of $('backdrop-chips').children)b.onclick=()=>{look.backdrop=b.dataset.backdrop;stage.setBackdrop(look.backdrop);$('stage').classList.toggle('light',['stone','white','studio'].includes(look.backdrop));$('stage').classList.toggle('clear',look.backdrop==='clear');syncLook();};
  if(document.documentElement.dataset.theme==='light')applyTheme('light',!params0.has('backdrop'));
  syncLook();
  // The Duo cover display follows a Farbound wallpaper; otherwise its own lock screen.
  let coverShown=null;
  const syncCover=()=>{const pres=art.mode==='presentation',id=pres?'presentation':farboundId(art.mode);if(!stage.duo||coverShown===(id||'default')&&!syncCover.stale)return;const c=pres?wallpaperCanvas('duo-cover',1398,2034):id?farboundScreen(id,1398,2034):null;syncCover.stale=!!c?.pending;coverShown=id||'default';stage.duo.setCoverArt(c);stage.mark();};
  // iPad upright views get portrait artwork: the portrait home screen or a
  // portrait Farbound lock screen. Other presets fall back to a centre crop.
  const syncIpadPortrait=()=>{if(!stage.ipad)return;const fb=farboundId(art.mode);const c=art.mode==='presentation'?wallpaperCanvas('ipad-portrait',1312,1888):fb?farboundScreen(fb,1312,1888):null;stage.ipad.setPortraitArt(c);stage.mark();};
  // Vector status bar and FARBOUND wordmark over the Presentation wallpaper.
  preloadWallpapers();
  const screenOverlay=createScreenOverlay(),coverOverlay=createScreenOverlay();
  let thumbsStale=()=>{};
  // SVG presentation layer: vector parts as geometry on the glass, the rest as a
  // bitmap composited into the screen texture (see svg-layer.js).
  const layerOverlay=createScreenOverlay();let layer=null,layerFit=null,layerVersion=0;
  function screenFrame(){const d=devices[stage.device],portrait=stage.device==='ipad'&&stage.ipad?.state().screen==='portrait';return portrait?[1312,1888]:[d.artwork.width,d.artwork.height];}
  function syncLayer(){
    if(!layer){layerOverlay.sync(null);art.setLayer(null);return;}
    const [W,H]=screenFrame(),key=layerVersion+':'+W+'x'+H;
    if(layerFit?.key!==key){
      for(const p of layerFit?.parts||[])p.geometry.dispose();
      const {parts,rest}=splitSVG(fitSVG(layer.text,W,H));layerFit={key,parts,img:null};const fit=layerFit;
      art.setLayer(null);
      rasterImage(rest).then(img=>{if(layerFit!==fit)return;fit.img=img;art.setLayer(img);thumbsStale();stage.mark();});
    }else art.setLayer(layerFit.img);
    layerOverlay.sync({root:stage.model,material:stage.exterior.screenMaterial,W,H,parts:layerFit.parts,layerKey:key,order:2});
  }
  async function setLayer(file){
    try{
      layer=file?{name:file.name,text:await readSVG(file)}:null;layerVersion++;
      $('layer-name').textContent=layer?layer.name:'None';$('layer-name').title=layer?layer.name:'';$('layer-clear').hidden=!layer;
      syncOverlay();if(layer&&!stage.composition)setShot('front');
    }catch(err){liveMessage(err.message);}
  }
  $('layer-upload').onchange=e=>{setLayer(e.target.files[0]);e.target.value='';};
  $('layer-clear').onclick=()=>setLayer(null);
  function syncOverlay(){
    thumbsStale();syncLayer?.();
    const d=devices[stage.device],on=art.mode==='presentation'&&!!d?.overlay;
    if(!on){screenOverlay.sync(null);coverOverlay.sync(null);stage.mark();return;}
    const portrait=stage.device==='ipad'&&stage.ipad?.state().screen==='portrait';
    const [W,H]=portrait?[1312,1888]:[d.artwork.width,d.artwork.height];
    const pts=stage.points?.()||devicePoints[stage.device]||null,isl=pts?.island;
    const island=isl?.isVector3?isl:isl?.p||null;
    screenOverlay.sync({root:stage.model,model:stage.model,material:stage.exterior.screenMaterial,W,H,style:portrait?'phone':d.overlay.style,wordmark:false,color:presentationWallpapers[stage.device]?.ink||'#fff',island:d.overlay.style==='phone'?island:null});
    if(stage.device==='duo')coverOverlay.sync({root:stage.duo.root,model:stage.duo.root,material:stage.duo.outerMaterial,W:1398,H:2034,style:'phone',island:null,wordmark:false,color:presentationWallpapers['duo-cover']?.ink||'#fff'});
    else coverOverlay.sync(null);
    stage.mark();
  }
  onScreenImage(()=>{if(syncCover.stale)syncCover();syncIpadPortrait();});
  $('art-preset').onchange=e=>{art.preset(e.target.value);syncCover();syncIpadPortrait();syncOverlay();if(!stage.composition)setShot('front');else stage.mark();};
  async function importArt(file){if(!file)return;if(isSVGFile(file))return setLayer(file);try{if(await art.upload(file)){syncIpadPortrait();syncOverlay();if(!stage.composition)setShot('front');else stage.mark();}}catch(err){liveMessage(err.message);}}
  $('upload').onchange=e=>{importArt(e.target.files[0]);e.target.value='';};
  $('stage').ondragover=e=>{e.preventDefault();};$('stage').ondrop=e=>{e.preventDefault();importArt(e.dataTransfer.files[0]);};
  const onBusy=value=>{busy=value;stage.control.enabled=!value;$('assembly-toggle').disabled=value;};
  // Screenshot: tool-rail camera button or the S key (outside text fields).
  let snapping=false;
  async function snap(){if(snapping||busy)return;snapping=true;pause();stopMove();try{await saveScreenshot(stage,{notify:liveMessage});}catch(e){liveMessage(e.message||'Screenshot failed.');}finally{snapping=false;}}
  $('snap').onclick=snap;
  document.addEventListener('keydown',e=>{if((e.key==='s'||e.key==='S')&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.target.closest('input,select,textarea,dialog')){e.preventDefault();snap();}});
  bindExport(stage,art,{moveEase,pause:()=>{pause();stopMove();},busy:onBusy,prepareAssembly,motion,refresh(){activeShot=stage.shot;refresh();}});
  const observer=new ResizeObserver(()=>{if(!busy){stage.resize();stage.mark();}});
  observer.observe($('stage'));
  document.addEventListener('visibilitychange',()=>{last=performance.now();});
  function frame(now){
    requestAnimationFrame(frame);const dt=Math.max(0,(now-last)/1000);last=now;
    if(busy||document.hidden)return;
    if(playing){
      phase=Math.min(1,phase+dt/motion.duration);
      const travel=motion.sample(phase);
      stage.duo?.setFoldMotion(stage.device==='duo'?1:0);
      stage.setProgress(playTarget?travel:1-travel);
      if(phase===1){playing=false;playTarget=1-playTarget;playIcon();stage.duo?.setFoldMotion(0);stage.mark();}
      updateTime();
    }
    if(movePlaying){
      moveT+=dt/move.dur;let done=false;
      if(moveT>=1){if(moveLoop||move.loop)moveT%=1;else{moveT=1;done=true;}}
      director.apply(move,moveEase()(moveT));
      if(move.tracks.explode)updateTime();
      if(done)movePlaying=false;
      syncMoves();
    }
    if(turning)stage.orbit(Math.min(.1,dt)*.32);
    stage.render(art.playing);
  }
  // ── Device switching ──
  // iPhone 18 Pro / iPhone Duo. Scene: stage.setDevice(); data: src/devices.js.
  // The shared `shots`, `parts` and `finishes` collections are refilled in place
  // for the active device, so the rest of the UI keeps working unchanged. For
  // the Duo the assembly wording becomes Fold/Open/Close after each UI update.
  {
    const savedFinish={},thumbs={},picker=$('device-picker');
    const fill=(target,source)=>{for(const k of Object.keys(target))delete target[k];Object.assign(target,source);};
    const proWords=[['Exploded','Open'],['Exploding','Opening'],['Assembled','Closed'],['Assembling','Closing'],['Explode','Open'],['Assemble','Close'],['Play disassembly','Play unfold'],['Play reassembly','Play fold'],['Assembly view','Fold view']];
    const degrees=text=>text.replace(/(\d+)%/,(_,n)=>Math.round(1.8*n)+'°');
    function relabel(){
      const d=devices[stage.device],a=d.assembly,duo=stage.device==='duo';
      const set=(id,text)=>{const el=$(id);if(el&&el.textContent!==text)el.textContent=text;};
      set('assembly-title',a.title);set('assembly-from',a.from);set('assembly-to',a.to);
      $('spread').setAttribute('aria-label',a.slider);
      for(const o of $('clip-mode').options){if(o.value==='open')o.textContent=a.clipTo;if(o.value==='close')o.textContent=a.clipFrom;}
      if(a.toAction==='Explode')return;
      // Devices whose assembly is a hinge (Duo fold, MacBook lid) swap the wording.
      const words=duo?proWords:[['Exploded',a.to],['Exploding',a.toing],['Assembled',a.from],['Assembling',a.froming],['Explode',a.toAction],['Assemble',a.fromAction],['Play disassembly',a.playTo],['Play reassembly',a.playFrom],['Assembly view',a.partial]];
      const fmt=t=>d.formatProgress?t.replace(/(\d+)%/,(_,n)=>d.formatProgress(n/100)):t;
      for(const id of ['assembly-action','visibility-state','shot-label']){const el=$(id);if(!el)continue;let t=el.textContent;for(const [from,to] of words)if(t.startsWith(from)){t=to+t.slice(from.length);break;}if(id==='visibility-state')t=fmt(t);if(el.textContent!==t)el.textContent=t;}
      $('progress-out').textContent=fmt($('progress-out').textContent);
      const play=$('play'),label=play.getAttribute('aria-label');for(const [from,to] of words)if(label===from){play.setAttribute('aria-label',to);play.title=to;}
    }
    const baseUpdateTime=updateTime,basePlayIcon=playIcon;
    updateTime=function(){baseUpdateTime();relabel();};
    playIcon=function(){basePlayIcon();relabel();};
    function viewImage(id){
      const image=new Image();image.alt='';image.width=120;image.height=90;
      image.src=thumbs[stage.device+':'+id]||BLANK;
      return image;
    }
    function rebuildViews(){
      for(const b of Object.values(shotButtons))b.remove();
      for(const k of Object.keys(shotButtons))delete shotButtons[k];
      for(const [id,s] of Object.entries(shots)){
        const button=document.createElement('button');button.className='shot';button.title=s.label;button.dataset.shot=id;
        const label=document.createElement('span');label.textContent=s.title;
        button.append(viewImage(id),label);button.onclick=()=>setShot(id);
        $('views-'+shelfFor(id)).append(button);shotButtons[id]=button;
      }
      $('views-count').textContent=Object.keys(shots).length;
    }
    // View thumbnails are live renders of the device as it is set up (finish,
    // presentation wallpaper, vector status bar). They are redrawn a few per
    // frame after any change to the screen or finish, once wallpapers decode.
    const BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    let thumbTimer=0;
    function renderThumbs(){
      clearTimeout(thumbTimer);
      if(busy||playing||movePlaying||art.pending||syncCover.stale){thumbTimer=setTimeout(renderThumbs,400);return;}
      const device=stage.device,start=performance.now();
      for(const id of Object.keys(shots)){
        const key=device+':'+id;if(thumbs[key])continue;
        thumbs[key]=stage.thumbnail(id,320,240);const img=shotButtons[id]?.querySelector('img');if(img)img.src=thumbs[key];
        if(performance.now()-start>40){stage.mark();thumbTimer=setTimeout(renderThumbs,16);return;}
      }
      stage.mark();
    }
    thumbsStale=()=>{for(const k of Object.keys(thumbs))if(k.startsWith(stage.device+':'))delete thumbs[k];clearTimeout(thumbTimer);thumbTimer=setTimeout(renderThumbs,250);};
    function rebuildFinishes(d){
      for(const b of swatches)b.remove();swatches.length=0;
      finishes.splice(0,finishes.length,...d.finishes);
      for(const [name,hex,gradient] of d.finishes){
        const b=document.createElement('button');b.className='swatch';b.title=name;b.setAttribute('aria-label',name+(d.id==='pro'?' titanium':' finish'));
        b.style.background=gradient;b.onclick=()=>finish(hex);swatches.push(b);$('finishes').append(b);
      }
    }
    function rebuildParts(){
      for(const b of Object.values(partButtons))b.remove();
      for(const k of Object.keys(partButtons))delete partButtons[k];
      for(const [key,name] of Object.entries(parts)){
        const b=document.createElement('button');b.className='part';const label=document.createElement('span');label.textContent=name;
        b.append(label,document.createElement('span'));b.onclick=()=>{stage.groups[key].visible=!stage.groups[key].visible;stage.mark();refresh();};partButtons[key]=b;$('part-list').append(b);
      }
      const note=$('part-list').nextElementSibling;if(note?.classList.contains('fineprint'))note.textContent=devices[stage.device].fineprint;
    }
    function setDevice(id,initial=false){
      id=devices[id]?id:'pro';
      if(busy||id===stage.device)return;
      pause();stopMove();director.reset();
      const previous=$('custom-color').value,wasCustom=!finishes.some(f=>f[1].toLowerCase()===previous.toLowerCase());
      if(!initial)savedFinish[stage.device]=previous;
      stage.setDevice(id);const d=devices[id];
      // Some displays (Studio Display XDR) offer only their own presentation and uploads.
      const sel=$('art-preset'),noPresets=d.presets===false;
      for(const o of sel.querySelectorAll('option'))o.hidden=noPresets&&!['presentation','custom'].includes(o.value);
      for(const g of sel.querySelectorAll('optgroup'))g.hidden=noPresets;
      if(noPresets&&!['presentation','custom'].includes(art.mode))art.preset('presentation');
      art.setTarget(stage.exterior.screenMaterial,d.artwork);syncCover();syncIpadPortrait();syncOverlay();
      fill(shots,stage.shots);fill(parts,stage.parts);
      rebuildFinishes(d);rebuildParts();rebuildViews();
      // A custom colour carries over; a named finish switches to the device's own.
      finish(wasCustom?previous:savedFinish[id]||d.finishes.find(f=>f[0]===d.defaultFinish)[1]);
      for(const b of picker?.querySelectorAll('[data-device]')||[])b.setAttribute('aria-pressed',String(b.dataset.device===id));
      document.title=d.name+' · Model studio';
      const url=new URL(location.href);if(id!=='pro')url.searchParams.set('device',id);else url.searchParams.delete('device');if(!initial)url.searchParams.delete('shot');history.replaceState(null,'',url);
      lastSelected='hero';setShot('hero');relabel();filterMoves();
      thumbsStale();
    }
    for(const b of picker?.querySelectorAll('[data-device]')||[])b.onclick=()=>setDevice(b.dataset.device);
    if(deviceFromQuery()!=='pro')setDevice(deviceFromQuery(),true);else art.setTarget(stage.exterior.screenMaterial,devices.pro.artwork);
    if(typeof __STUDIO_QA__!=='undefined'&&__STUDIO_QA__)window.studioDevice=setDevice;
  }
  const params=new URLSearchParams(location.search);
  const initialFinish=finishes.find(f=>f[0].toLowerCase()===params.get('finish')?.toLowerCase())||finishes.find(f=>f[0]===devices[stage.device].defaultFinish)||finishes[1];
  art.preset('presentation');finish(initialFinish[1]);syncOverlay();
  if(Object.hasOwn(shots,params.get('shot')))setShot(params.get('shot'));
  refresh();$('loading').hidden=true;
  stage.render(true);requestAnimationFrame(frame);
  if(typeof __STUDIO_QA__!=='undefined'&&__STUDIO_QA__)window.studioQA={stage,art,motion,setShot,finish,exportGLB:()=>exportGLB(stage,motion),refresh,pause,onBusy};
}
boot().catch(error=>{console.error(error);$('loading').textContent='The 3D viewport could not start. '+error.message;if(typeof __STUDIO_QA__!=='undefined'&&__STUDIO_QA__)fetch('/log',{method:'POST',body:error.stack});});
