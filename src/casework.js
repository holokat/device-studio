import * as THREE from 'three';

// The perimeter is shared by every section of a machined profile. Closely spaced
// sections describe the rolled edge without rounding the entire phone into a box.
// `r` may be one radius or four, ordered top-right, top-left, bottom-left,
// bottom-right (used by asymmetric housings such as a foldable's hinge edge).
const cornerRadius=(r,corner)=>Array.isArray(r)?r[corner]:r;
const insetRadius=(r,inset)=>Array.isArray(r)?r.map(v=>Math.max(.015,v-inset)):Math.max(.015,r-inset);
export function perimeter(w,h,radius){
  const points=[],quarter=18;
  for(let corner=0;corner<4;corner++){
    const r=Math.min(w/2-.001,h/2-.001,cornerRadius(radius,corner));
    const sx=corner===0||corner===3?1:-1, sy=corner<2?1:-1;
    for(let i=0;i<=quarter;i++){
      const a=(corner+i/quarter)*Math.PI/2, cx=Math.cos(a),cy=Math.sin(a);
      const curve=v=>Math.sign(v)*Math.pow(Math.abs(v),.86);
      points.push([sx*(w/2-r)+curve(cx)*r,sy*(h/2-r)+curve(cy)*r]);
    }
  }
  return points;
}
export function profileGeometry(w,h,r,sections,closed=false,holes=[]){
  const pos=[],uv=[],idx=[];
  const outline=perimeter(w,h,r),n=outline.length,tile=1.4;
  const distances=[0];
  for(let i=0;i<n;i++){
    const a=outline[i],b=outline[(i+1)%n];
    distances.push(distances[i]+Math.hypot(b[0]-a[0],b[1]-a[1]));
  }
  // Fold at opposite corners to keep UVs continuous across the closing quad.
  const u=distances.map(length=>Math.min(length,distances[n]-length)/tile);
  let v=0;
  for(let row=0;row<sections.length;row++){
    const [inset,z]=sections[row];
    if(row){const prev=sections[row-1];v+=Math.hypot(inset-prev[0],z-prev[1])/tile;}
    const ring=perimeter(w-inset*2,h-inset*2,insetRadius(r,inset));
    for(let i=0;i<ring.length;i++){
      const [x,y]=ring[i];
      // U follows the physical rail perimeter, not a planar X/Y projection.
      // This keeps a brushed texture tangential over the vertical walls and
      // through the rolled corners; V runs across the 0.84 rail profile.
      pos.push(x,y,z);uv.push(u[i],v);
    }
  }
  const rows=sections.length;
  // Circular bores and shaped openings share the same cap and wall contours.
  const cutouts=holes.map(hole=>{
    if(hole.contour)return hole.contour;
    const [cx,cy,r]=hole;
    return Array.from({length:56},(_,i)=>{
      const a=-2*Math.PI*i/56;
      return [cx+r*Math.cos(a),cy+r*Math.sin(a)];
    });
  });
  function bridge(a,b){for(let i=0;i<n;i++){const j=(i+1)%n,A=a*n+i,B=a*n+j,C=b*n+j,D=b*n+i;idx.push(A,B,C,A,C,D);}}
  for(let j=1;j<rows;j++)bridge(j-1,j);
  if(closed)bridge(rows-1,0);
  else{
    const caps=[[0,-1],[rows-1,1]];
    for(const [row,sign] of caps){
      const start=pos.length/3;
      // Duplicate flat caps so their normals stay planar at the edge of the lip.
      for(let i=0;i<n;i++){const p=(row*n+i)*3;pos.push(...pos.slice(p,p+3));uv.push(pos[p]/tile+.5,pos[p+1]/tile+.5);}
      if(!holes.length){
        const center=pos.length/3;pos.push(0,0,sections[row][1]);uv.push(.5,.5);
        for(let i=0;i<n;i++){const j=(i+1)%n;if(sign>0)idx.push(center,start+i,start+j);else idx.push(center,start+j,start+i);}
      }else{
        const contour=Array.from({length:n},(_,i)=>new THREE.Vector2(pos[(start+i)*3],pos[(start+i)*3+1]));
        const rings=cutouts.map(loop=>loop.map(([x,y])=>{
          pos.push(x,y,sections[row][1]);uv.push(x/tile+.5,y/tile+.5);return new THREE.Vector2(x,y);
        }));
        for(const f of THREE.ShapeUtils.triangulateShape(contour,rings)){const [a,b,c]=f;idx.push(start+a,start+(sign>0?b:c),start+(sign>0?c:b));}
      }
    }
    for(const loop of cutouts){
      const start=pos.length/3,count=loop.length;
      for(const row of [0,rows-1])loop.forEach(([x,y],i)=>{
        pos.push(x,y,sections[row][1]);uv.push(i/count,row/(rows-1));
      });
      for(let i=0;i<count;i++){const j=(i+1)%count;idx.push(start+i,start+j,start+count+j,start+i,start+count+j,start+count+i);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  // Keep the perimeter normals independent of the very long triangle edges
  // along the straight sides. That keeps highlights continuous through corners.
  const normals=g.getAttribute('normal'),xy=perimeter(w,h,r);
  for(let k=0;k<rows;k++){
    const a=sections[k>0?k-1:closed?rows-1:0], b=sections[k],c=sections[k<rows-1?k+1:closed?0:rows-1];
    const pre=new THREE.Vector2(b[1]-a[1],b[0]-a[0]).normalize(),post=new THREE.Vector2(c[1]-b[1],c[0]-b[0]).normalize();
    const cross=pre.add(post).normalize();
    for(let i=0;i<n;i++){
      const before=xy[(i+n-1)%n],here=xy[i],after=xy[(i+1)%n];
      const tangent=new THREE.Vector2(here[0]-before[0],here[1]-before[1]).normalize().add(new THREE.Vector2(after[0]-here[0],after[1]-here[1]).normalize()).normalize();
      normals.setXYZ(k*n+i,tangent.y*cross.x,-tangent.x*cross.x,cross.y);
    }
  }
  return g;
}
export function titaniumMaps() {
  // Satin is optical micro-roughness, not bumpy geometry. The texture's X axis
  // follows profileGeometry's perimeter U, so its long marks run with the rail.
  const size = 768;
  const makeSurface = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    return canvas.getContext('2d');
  };
  const albedo = makeSurface();
  const roughness = makeSurface();
  const colorPixels = albedo.createImageData(size, size);
  const roughPixels = roughness.createImageData(size, size);
  let seed = 35493;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  // Interrupted machining strokes and finer bead-blast scatter. Wrap the
  // stroke grid at the texture boundary so reflections travel across each tile.
  const nx=24,ny=size/2;
  const strokes=Float32Array.from({length:nx*ny},()=>random()*2-1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const col=x*nx/size, left=Math.floor(col), row=Math.floor(y/2)*nx;
      const t=col-left, blend=t*t*(3-2*t);
      const brush=strokes[row+left]*(1-blend)+strokes[row+(left+1)%nx]*blend;
      const scatter=random()+random()-1;
      const tone = 239 + brush*8 + scatter*9;
      const gloss = 209 + brush*29 + scatter*22;
      colorPixels.data.set([tone, tone, tone, 255], i);
      roughPixels.data.set([gloss, gloss, gloss, 255], i);
    }
  }
  albedo.putImageData(colorPixels, 0, 0);
  roughness.putImageData(roughPixels, 0, 0);
  const map = new THREE.CanvasTexture(albedo.canvas);
  const roughnessMap = new THREE.CanvasTexture(roughness.canvas);
  for (const texture of [map, roughnessMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = 8;
    texture.generateMipmaps = true;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, roughnessMap };
}
