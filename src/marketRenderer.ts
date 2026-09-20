import * as THREE from 'three';
import { STALLS, marketRoute, type StallId } from './market';
export function mountMarket(host:HTMLElement,pins:Map<StallId,HTMLButtonElement>){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9ddc8');
  const camera=new THREE.OrthographicCamera(-11,11,11,-11,.1,100);camera.position.set(4,18,20);camera.lookAt(0,0,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#fff4d6','#66786e',2.5));const sun=new THREE.DirectionalLight('#fff5db',3);sun.position.set(-8,20,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13});scene.add(sun);
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,parent:THREE.Object3D=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.88}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  box(0,-.3,0,19,.55,15,'#b4b297');box(0,.005,0,18,.08,2.3,'#d8c7a5');
  for(let x=-8;x<=8;x+=1)for(let z=-6;z<=6;z+=1)box(x,-.01,z,.94,.05,.94,(x+z)%2?'#d3c3a6':'#d8cbb2');
  // Low perimeter shopfronts leave the interior and the walking aisle visible.
  box(0,1,-6.4,17,2,.45,'#d5aa7a');box(0,2.1,-6.4,17,.25,.8,'#a64c35');
  for(let x=-7;x<=7;x+=2){box(x,1,-6.1,1.35,1.4,.12,'#6f7561');box(x,2.65,-6.35,1.8,.22,1.5,'#a9563c');}
  STALLS.forEach(t=>{
    const front=t.z<0?1:-1;
    box(t.x,.7,t.z,3.7,1.35,2.1,'#8e6546');box(t.x,1.45,t.z+front*.7,3.8,.15,1.2,'#d8ae73');
    for(const dx of [-1.7,1.7])box(t.x+dx,1.65,t.z, .1,3.3,.1,'#695346');
    for(let i=0;i<8;i++){box(t.x-1.75+i*.5,3.15,t.z, .5,.18,3,i%2?'#fff1d1':t.color);box(t.x-1.75+i*.5,2.98,t.z+front*1.5,.5,.3,.07,i%2?'#fff1d1':t.color);}
    for(let i=0;i<6;i++){
      if(t.id==='fruit'){const fruit=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),new THREE.MeshStandardMaterial({color:i%2?'#ebba43':'#94a754'}));fruit.position.set(t.x-1.3+i*.5,1.7,t.z+front*.85);scene.add(fruit);}
      else box(t.x-1.3+i*.5,1.67,t.z+front*.8,.38,.28,.45,t.id==='gifts'?'#a4b467':['#d88a69','#7999a3','#e7c77b'][i%3]);
    }
    const vendor=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),new THREE.MeshStandardMaterial({color:'#d8a476'}));vendor.position.set(t.x,2.08,t.z);scene.add(vendor);box(t.x,1.55,t.z,.6,.7,.4,t.color);
  });
  for(const x of [-8,8]){box(x,.45,3,.7,.8,.7,'#a67955');const tree=new THREE.Mesh(new THREE.SphereGeometry(.85,12,10),new THREE.MeshStandardMaterial({color:'#788a62'}));tree.position.set(x,1.6,3);scene.add(tree);}
  const pawn=new THREE.Group();const material=new THREE.MeshStandardMaterial({color:'#ca6646'});const body=new THREE.Mesh(new THREE.ConeGeometry(.32,.65,16),material);body.position.y=.5;pawn.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.26,16,12),new THREE.MeshStandardMaterial({color:'#f2d4a1'}));head.position.y=1;pawn.add(head);const hat=new THREE.Mesh(new THREE.ConeGeometry(.44,.28,16),new THREE.MeshStandardMaterial({color:'#f6e6b5'}));hat.position.y=1.25;pawn.add(hat);scene.add(pawn);pawn.position.set([-7,0,7][Math.floor(Math.random()*3)],.05,0);
  let frame=0,disposed=false,travel=false,resolveTravel:((value:boolean)=>void)|undefined;
  const paint=()=>{if(disposed)return;renderer.render(scene,camera);pins.forEach((pin,id)=>{const t=STALLS.find(t=>t.id===id)!;const p=new THREE.Vector3(t.x,3.7,t.z).project(camera);pin.style.left=`${(p.x+1)*50}%`;pin.style.top=`${(1-p.y)*50}%`;});};
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const aspect=w/h,half=Math.max(8,10/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h);paint();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return{
    travelTo(id:StallId):Promise<boolean>{
      if(disposed||travel)return Promise.resolve(false);travel=true;
      const route=marketRoute({x:pawn.position.x,z:pawn.position.z},id);let segment=1,startTime=0;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      return new Promise(resolve=>{resolveTravel=resolve;const tick=(now:number)=>{
        if(disposed)return;if(segment>=route.length){travel=false;resolveTravel=undefined;pawn.position.y=.05;paint();resolve(true);return;}
        if(!startTime)startTime=now;const a=route[segment-1],b=route[segment],duration=reduced?1:Math.max(180,Math.hypot(b.x-a.x,b.z-a.z)*180),p=Math.min(1,(now-startTime)/duration);
        pawn.position.set(a.x+(b.x-a.x)*p,.05+(reduced?0:Math.abs(Math.sin(p*Math.PI*Math.ceil(duration/260)))*.4),a.z+(b.z-a.z)*p);pawn.rotation.z=reduced?0:Math.sin(p*Math.PI)*.06;paint();if(p===1){segment++;startTime=0;}frame=requestAnimationFrame(tick);
      };frame=requestAnimationFrame(tick);});
    },
    dispose(){disposed=true;cancelAnimationFrame(frame);resolveTravel?.(false);observer.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();},
  };
}
