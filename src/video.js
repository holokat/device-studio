// Fixed-rate WebM. Each encoded frame uses the timeline clock, independent of render speed.
const ascii=s=>new TextEncoder().encode(s);
function uint(n){
  let bytes=1;while(n>=2**(8*bytes))bytes++;
  const a=new Uint8Array(bytes);for(let i=bytes-1;i>=0;i--){a[i]=n%256;n=Math.floor(n/256);}return a;
}
function join(arr){const out=new Uint8Array(arr.reduce((a,b)=>a+b.length,0));let p=0;for(const b of arr){out.set(b,p);p+=b.length;}return out;}
function size(n){let len=1;while(n>=2**(7*len)-1)len++;let a=new Uint8Array(len);for(let i=len-1;i>=0;i--){a[i]=n%256;n=Math.floor(n/256);}a[0]|=1<<(8-len);return a;}
function elem(id,...body){const data=join(body);return join([uint(id),size(data.length),data]);}
function num(id,n){return elem(id,uint(n));}
function str(id,s){return elem(id,ascii(s));}
function makeWebM(frames,w,h,fps,codec){
  const duration=new Uint8Array(8);new DataView(duration.buffer).setFloat64(0,1000*frames.length/fps);
  const header=elem(0x1a45dfa3,num(0x4286,1),num(0x42f7,1),num(0x42f2,4),num(0x42f3,8),str(0x4282,'webm'),num(0x4287,2),num(0x4285,2));
  const info=elem(0x1549a966,num(0x2ad7b1,1000000),str(0x4d80,'Model studio'),str(0x5741,'Model studio'),elem(0x4489,duration));
  const tracks=elem(0x1654ae6b,elem(0xae,num(0xd7,1),num(0x73c5,1),num(0x83,1),num(0x9c,0),str(0x86,codec),num(0x23e383,Math.round(1e9/fps)),elem(0xe0,num(0xb0,w),num(0xba,h))));
  const clusters=[];let start=0,blocks=[];
  for(const frame of frames){
    const ms=Math.round(frame.ts/1000);
    if(frame.key&&blocks.length){clusters.push(elem(0x1f43b675,num(0xe7,start),...blocks));blocks=[];start=ms;}
    const dt=ms-start;
    blocks.push(elem(0xa3,new Uint8Array([0x81,(dt>>8)&255,dt&255,frame.key?128:0]),frame.bytes));
  }
  if(blocks.length)clusters.push(elem(0x1f43b675,num(0xe7,start),...blocks));
  const segment=[info,tracks,...clusters];return new Blob([header,uint(0x18538067),size(segment.reduce((a,b)=>a+b.length,0)),...segment],{type:'video/webm'});
}
const wait=()=>new Promise(r=>setTimeout(r,0));
export async function encodeClip(stage,art,mode,seconds,ease,onProgress,signal,move=null){
  if(!globalThis.VideoEncoder)throw Error('Video encoding requires Brave or Chrome on localhost or HTTPS.');
  const {width,height}=stage.canvas,fps=30,count=Math.max(2,Math.round(seconds*fps)),bitrate=width*height>2500000?35_000_000:16_000_000;
  let config=null,codecId;
  for(const [codec,id] of [['vp09.00.10.08','V_VP9'],['vp8','V_VP8']]){
    const value={codec,width,height,bitrate,framerate:fps,latencyMode:'quality'};
    if((await VideoEncoder.isConfigSupported(value)).supported){config=value;codecId=id;break;}
  }
  if(!config)throw Error('The browser encoder does not support this resolution. Try 1920 px.');
  const chunks=[];let failure=null;
  const encoder=new VideoEncoder({output(chunk){const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push({ts:chunk.timestamp,key:chunk.type==='key',bytes});},error(err){failure=err;}});
  const media=art.media,mediaStart=media?.currentTime;
  if(media)media.pause();
  try{
    encoder.configure(config);
    for(let i=0;i<count;i++){
      if(signal.aborted)throw Error('Export cancelled.');
      if(failure)throw failure;
      const t=i/(count-1);
      if(move)stage.director.apply(move,ease(t));
      else if(mode==='orbit'){if(i)stage.orbit(2*Math.PI/count);}
      else{if(stage.device==='duo')stage.duo?.setFoldMotion(i===count-1?0:1);stage.setProgress(mode==='open'?ease(t):1-ease(t));}
      if(media&&i&&Number.isFinite(media.duration)){
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{media.removeEventListener('seeked',done);reject(Error('The screen video could not seek to the next frame.'));},5000);
          function done(){clearTimeout(timer);resolve();}
          media.addEventListener('seeked',done,{once:true});media.currentTime=(mediaStart+i/fps)%media.duration;
        });
        stage.exterior.screenMaterial.map.needsUpdate=true;
      }
      stage.render(true);const frame=new VideoFrame(stage.canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
      try{encoder.encode(frame,{keyFrame:i%fps===0});}finally{frame.close();}
      if(encoder.encodeQueueSize>4)await encoder.flush();
      if(i%3===0){onProgress(Math.round(100*(i+1)/count));await wait();}
    }
    await encoder.flush();if(failure)throw failure;
    chunks.sort((a,b)=>a.ts-b.ts);if(chunks.length!==count)throw Error('The encoder returned an incomplete frame sequence.');
    return makeWebM(chunks,width,height,fps,codecId);
  }finally{if(encoder.state!=='closed')encoder.close();if(media){media.currentTime=mediaStart;await media.play().catch(()=>{});}}
}
