import * as THREE from 'three';

// Screen-plane axes, center and scale fitted to the twelve reference thumbnails.
const perspectives={
  '01':{title:"Upright left",position:[0.275, 0.775],scale:0.58194,right:[0.72006, -0.13425, -0.6808],up:[0.0, 0.98111, -0.19347]},
  '02':{title:"Upright right",position:[0.5, 0.6625],scale:0.67188,right:[0.67653, 0.18499, -0.71281],up:[0.0, 0.96794, 0.2512]},
  '03':{title:"Right edge",position:[-0.4, 0.4],scale:0.63777,right:[0.8018, 0.13363, 0.58246],up:[0.0, 0.97468, -0.22362]},
  '04':{title:"Near frontal",position:[0.3, 0.2],scale:0.58108,right:[0.9778, 0.0, 0.20953],up:[0.0, 1.0, -0.0]},
  '05':{title:"Device wall",position:[-0.175, -0.1],scale:0.68243,right:[0.96788, 0.0, 0.25142],up:[0.0, 1.0, -0.0]},
  '06':{title:"Low diagonal",position:[0.0125, -0.0875],scale:0.59194,right:[0.7259, 0.30596, -0.616],up:[-0.63066, 0.65349, -0.4186]},
  '07':{title:"Right lean",position:[-0.525, 0.775],scale:0.69117,right:[0.76041, -0.01028, 0.64937],up:[0.33238, 0.86516, -0.37552]},
  '08':{title:"Left lean",position:[0.525, -0.375],scale:0.64768,right:[0.72373, 0.20835, -0.65788],up:[-0.50596, 0.8085, -0.30056]},
  '09':{title:"Steep diagonal",position:[-0.4875, 0.425],scale:0.69058,right:[0.72506, -0.1954, 0.66039],up:[0.52101, 0.78273, -0.34042]},
  '10':{title:"Elevated left",position:[0.225, 0.15],scale:0.6088,right:[0.75829, -0.13999, -0.6367],up:[0.0, 0.97667, -0.21474]},
  '11':{title:"High three-quarter",position:[-0.05, -0.025],scale:0.58783,right:[0.79742, -0.15707, -0.58262],up:[0.0, 0.96553, -0.2603]},
  '12':{title:"Shallow left",position:[-0.125, 0.5125],scale:0.6151,right:[0.75052, -0.0866, -0.65515],up:[0.0, 0.99138, -0.13104]},
};
export const compositions=Object.fromEntries(
  // The device wall (05) is retired from the Views list on every device.
  Object.entries(perspectives).filter(([id])=>id!=='05').sort(([a],[b])=>a.localeCompare(b)).map(([id,pose])=>[
    'scene'+id,{title:pose.title,label:pose.title,composition:id}
  ])
);

function deviceWall(model,groups){
  const wall=new THREE.Group(),placements=[];
  for(let y=-1;y<=1;y++)for(let x=-6;x<=6;x++)if(x||y){
    placements.push(new THREE.Matrix4().compose(new THREE.Vector3(x*4.84-.175,y*10.28-.1,-.97),new THREE.Quaternion(),new THREE.Vector3(.664,.664,.664)));
  }
  model.updateWorldMatrix(true,true);
  const inv=model.matrixWorld.clone().invert(),matrices=new THREE.Matrix4(),materials=new Map();
  // The diagonal strip of light runs continuously over the tiled back panels.
  function striped(original){
    if(materials.has(original))return materials.get(original);
    const mat=original.clone();
    mat.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vWall;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWall=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='varying vec3 vWall;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','float stripe=abs(mod(vWall.y+vWall.x*.59+3.3,9.6)-4.8); outgoingLight*=0.15+1.84*exp(-stripe*stripe/2.9);\n#include <opaque_fragment>');
    };
    mat.customProgramCacheKey=()=>'wall-strip';materials.set(original,mat);return mat;
  }
  for(const group of [groups.back,groups.frame,groups.cameras]){
    group.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
      // Only exterior-facing pieces contribute to this wall of rear enclosures.
      if(group===groups.frame&&!o.name.match(/perimeter|rail|antenna/i))return;
      const local=inv.clone().multiply(o.matrixWorld),m=new THREE.InstancedMesh(o.geometry,striped(o.material),placements.length);
      for(let i=0;i<placements.length;i++)m.setMatrixAt(i,matrices.multiplyMatrices(placements[i],local));
      m.computeBoundingSphere();wall.add(m);
    });
  }
  wall.userData.sync=()=>materials.forEach((m,src)=>m.color.copy(src.color));
  return wall;
}
export function createCompositions(scene,model,groups){
  const placement=new THREE.Group();
  scene.add(placement);placement.add(model);
  let wall=null,current=null;
  function clear(){
    placement.position.set(0,0,0);placement.quaternion.identity();placement.scale.setScalar(1);
    if(wall)wall.visible=false;
    current=null;
  }
  function apply(id){
    clear();
    const pose=perspectives[id];
    if(!pose)return;
    if(id==='05'&&!wall){wall=deviceWall(model,groups);scene.add(wall);}
    if(wall)wall.visible=id==='05';
    const right=new THREE.Vector3(...pose.right).normalize().negate(),up=new THREE.Vector3(...pose.up);
    const normal=new THREE.Vector3().crossVectors(right,up).normalize();
    up.crossVectors(normal,right);
    placement.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,normal));
    placement.scale.setScalar(pose.scale);
    placement.position.set(...pose.position,0);
    placement.updateWorldMatrix(true,true);
    current=id;
  }
  return {apply,clear,sync(){if(current==='05')wall.userData.sync();},get current(){return current;}};
}
