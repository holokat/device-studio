import * as THREE from 'three';

// The source rail is lofted through matching XY perimeters. Replace a small
// rectangular set of its side quads, leaving every corner and rolled lip intact.
// The flat hole drawing is clipped back into the original loft cells before
// mapping to 3D, so no new triangle can bridge over a change in curvature.
function clip(poly,axis,limit,direction){
  const result=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    const da=direction*(a[axis]-limit),db=direction*(b[axis]-limit);
    if(da>=0)result.push(a);
    if((da>0&&db<0)||(da<0&&db>0))result.push(a.clone().lerp(b,da/(da-db)));
  }
  return result;
}
export function drillRail(geometry,profile,paths){
  const pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
  const rows=profile.length,cols=pos.count/rows;
  const flat=profile.findIndex(([inset])=>inset===0);
  const xAt=i=>pos.getX(flat*cols+i);
  // Include the sectors immediately outside the two outermost acoustic holes.
  const bottom=[];
  for(let i=0;i<cols;i++)if(pos.getY(flat*cols+i)<-6.8)bottom.push(i);
  const left=bottom.filter(i=>xAt(i)<-2.32).at(-1);
  const right=bottom.find(i=>xAt(i)>2.32);
  const first=profile.findLastIndex(([,z])=>z<-.24);
  const last=profile.findIndex(([,z])=>z>.24);
  const minZ=profile[first][1],maxZ=profile[last][1],ix=geometry.index;
  const keep=[];
  for(let i=0;i<ix.count;i+=3){
    const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];
    if(!ids.every(n=>Math.floor(n/cols)>=first&&Math.floor(n/cols)<=last&&n%cols>=left&&n%cols<=right))keep.push(...ids);
  }
  geometry.setIndex(keep);
  const v=(x,y)=>new THREE.Vector2(x,y);
  const boundary=[v(xAt(left),minZ),v(xAt(right),minZ),v(xAt(right),maxZ),v(xAt(left),maxZ)];
  const rings=paths.map(p=>{
    const loop=p.getPoints(30);
    if(loop[0].distanceToSquared(loop.at(-1))<1e-14)loop.pop();
    return loop;
  });
  const triangles=THREE.ShapeUtils.triangulateShape(boundary,rings);
  const points=[...boundary,...rings.flat()],positions=[],normals=[],uvs=[],indices=[];
  const read=(attribute,id)=>new THREE.Vector3().fromBufferAttribute(attribute,id);
  function evaluate(p,col,row,attribute){
    const lo=row*cols+col,hi=lo+cols,fx=(p.x-xAt(col))/(xAt(col+1)-xAt(col));
    const fz=(p.y-profile[row][1])/(profile[row+1][1]-profile[row][1]);
    return read(attribute,lo).lerp(read(attribute,lo+1),fx).lerp(read(attribute,hi).lerp(read(attribute,hi+1),fx),fz);
  }
  function evaluateUV(p,col,row){
    const lo=row*cols+col,hi=lo+cols,fx=(p.x-xAt(col))/(xAt(col+1)-xAt(col));
    const fz=(p.y-profile[row][1])/(profile[row+1][1]-profile[row][1]);
    const point=id=>new THREE.Vector2(uv.getX(id),uv.getY(id));
    return point(lo).lerp(point(lo+1),fx).lerp(point(hi).lerp(point(hi+1),fx),fz);
  }
  function put(p,n,tex){positions.push(...p.toArray());normals.push(...n.toArray());uvs.push(...tex);return positions.length/3-1;}
  for(let row=first;row<last;row++)for(let col=left;col<right;col++){
    for(const tri of triangles){
      let poly=tri.map(i=>points[i]);
      poly=clip(poly,'x',xAt(col),1);poly=clip(poly,'x',xAt(col+1),-1);
      poly=clip(poly,'y',profile[row][1],1);poly=clip(poly,'y',profile[row+1][1],-1);
      if(poly.length<3)continue;
      const start=positions.length/3;
      for(const p of poly){
        const at=evaluate(p,col,row,pos),n=evaluate(p,col,row,normal).normalize();
        // Interpolate the parent rail's perimeter UVs. The satin grain then
        // continues across the drilled replacement cells without planar seams.
        const tex=evaluateUV(p,col,row);
        put(at,n,[tex.x,tex.y]);
      }
      for(let i=1;i<poly.length-1;i++)indices.push(start,start+i,start+i+1);
    }
  }
  const colFor=x=>{let c=left;while(c<right-1&&x>xAt(c+1))c++;return c;};
  const rowFor=z=>{let r=first;while(r<last-1&&z>profile[r+1][1])r++;return r;};
  for(const loop of rings){
    const center=loop.reduce((sum,p)=>sum.add(p),v(0,0)).divideScalar(loop.length);
    const ids=[];
    for(const p of loop){
      const col=colFor(p.x),row=rowFor(p.y),at=evaluate(p,col,row,pos);
      const n=new THREE.Vector3(center.x-p.x,0,center.y-p.y).normalize();
      const tex=evaluateUV(p,col,row);
      ids.push(put(at,n,[tex.x,tex.y]),put(at.clone().add(new THREE.Vector3(0,.07,0)),n,[tex.x,tex.y+.08]));
    }
    for(let i=0;i<loop.length;i++){
      const a=2*i,b=2*((i+1)%loop.length);
      const tri=[ids[a],ids[b],ids[b+1],ids[a],ids[b+1],ids[a+1]];
      if(THREE.ShapeUtils.isClockWise(loop))tri.reverse();
      indices.push(...tri);
    }
  }
  const patch=new THREE.BufferGeometry();
  patch.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  patch.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  patch.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  patch.setIndex(indices);return patch;
}
