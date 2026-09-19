import * as T from 'three';
import { renderQuality } from './renderQuality';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { CITY_PLACES, CITY_VIEWS, cityPlace, clampCityZoom, type CityViewId } from './cityData';

type Point = [number, number];
type Marker = { id: string; element: HTMLElement };
export type CityHandle = { dispose: () => void; setView: (id: CityViewId) => void; zoom: (factor: number) => void };
type Options = { markers: Marker[]; onSelect: (id: string) => void; initialView: CityViewId };

export function mountCity(host: HTMLElement, pin: HTMLElement, onEnter: () => void, onLost: () => void, options: Options): CityHandle {
  const quality = renderQuality(window.innerWidth, window.devicePixelRatio);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.setClearColor('#dce9e8');
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-50, 50, 35, -35, .1, 260);
  const controls = new MapControls(camera, renderer.domElement);
  controls.enableRotate = false; controls.enableDamping = true; controls.dampingFactor = .13;
  controls.screenSpacePanning = false; controls.minZoom = .75; controls.maxZoom = 2.2; controls.zoomSpeed = .6;
  scene.add(new T.HemisphereLight(0xf5fbff, 0x788777, 1.9));
  const sun = new T.DirectionalLight(0xfff2d5, 2.4);
  sun.position.set(-38, 75, 30); sun.castShadow = true; sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, far: 180 });
  sun.shadow.bias = -.0008; sun.shadow.normalBias = .12; scene.add(sun);
  const materials: T.Material[] = [], geometries: T.BufferGeometry[] = [];
  const standard = (color: string, roughness = .8) => { const m = new T.MeshStandardMaterial({ color, roughness }); materials.push(m); return m; };
  // Repeated buildings, windows and trees are instanced instead of individual draw calls.
  const primitives = { box: new T.BoxGeometry(1, 1, 1), tree: new T.IcosahedronGeometry(1, 1), roof: new T.ConeGeometry(1, 1, 4), round: new T.CylinderGeometry(1, 1, 1, 12) };
  type Primitive = keyof typeof primitives;
  const batches: Record<Primitive, { matrix: T.Matrix4; color: string }[]> = { box: [], tree: [], roof: [], round: [] };
  const dummy = new T.Object3D();
  function part(kind: Primitive, x:number,y:number,z:number,w:number,h:number,d:number,color:string,ry=0,rz=0) {
    dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,ry,rz);dummy.updateMatrix();batches[kind].push({matrix:dummy.matrix.clone(),color});
  }
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,ry=0,rz=0)=>part('box',x,y,z,w,h,d,color,ry,rz);
  const roof=(x:number,y:number,z:number,w:number,d:number,color='#95644e')=>part('roof',x,y,z,w*.75,.8,d*.75,color,Math.PI/4);
  const tree=(x:number,z:number,size=1)=>{box(x,.8,z,.12,1.1,.12,'#92765d');part('tree',x,1.5*size,z,.65*size,.85*size,.65*size,'#709a87');};
  const beam=(a:T.Vector3,b:T.Vector3,color:string)=>{const direction=b.clone().sub(a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize());dummy.scale.set(.08,direction.length(),.08);dummy.updateMatrix();batches.box.push({matrix:dummy.matrix.clone(),color});};
  function polygon(points:Point[],color:string,y=.12,depth=0){
    const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const g=depth?new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);geometries.push(g);
    const mesh=new T.Mesh(g,standard(color,color==='#85bab9'?.35:.88));mesh.position.y=y;mesh.receiveShadow=true;scene.add(mesh);
  }
  function ribbon(points:Point[],width:number,color:string,y:number,smooth=true){
    const source=points.map(([x,z])=>new T.Vector3(x,y,z)),sampled=smooth?new T.CatmullRomCurve3(source).getPoints(points.length*12):source;
    const vertices:number[]=[],indices:number[]=[];
    sampled.forEach((p,i)=>{const a=sampled[Math.max(0,i-1)],b=sampled[Math.min(sampled.length-1,i+1)],dir=b.clone().sub(a).normalize(),nx=-dir.z*width/2,nz=dir.x*width/2;vertices.push(p.x+nx,y,p.z+nz,p.x-nx,y,p.z-nz);if(i<sampled.length-1){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();geometries.push(g);
    const m=standard(color);m.side=T.DoubleSide;const mesh=new T.Mesh(g,m);mesh.receiveShadow=true;scene.add(mesh);return sampled;
  }
  const ground:Point[]=[[-43,-24],[-35,-40],[-17,-45],[4,-42],[20,-38],[35,-27],[44,-9],[42,13],[34,31],[15,38],[-6,36],[-27,30],[-42,15],[-45,-7]];
  polygon(ground,'#b9cac0',-1.6,1.6);polygon(ground,'#d9dfd4',.03);
  const river:Point[]=[[11,-40],[15,-32],[19,-18],[23,-7],[29,6],[31,21],[27,33]];
  ribbon(river,9,'#aec9b7',.09);ribbon(river,6.8,'#82b4b8',.15);ribbon([[20,-24],[24,-13],[29,-3]],1.8,'#bdcba2',.19);
  for(let i=0;i<24;i++){const z=-32+i*2.5;tree(15+(z+32)*.23-4.4,z,.8);}
  // Relative geography: West Lake NW, old town N of Hoan Kiem, Red River E.
  const westLake:Point[]=[[-28,-26],[-26,-34],[-18,-38],[-9,-34],[-5,-29],[-2,-23],[-3,-16],[-8,-12],[-17,-12],[-23,-16],[-27,-20]];
  polygon(westLake.map(([x,z])=>[-15+(x+15)*1.05,-25+(z+25)*1.05]),'#e9e5d4',.1);polygon(westLake,'#85bab9',.16);
  polygon([[-2,-15],[2,-14],[4,-11],[1,-8],[-3,-9],[-4,-12]],'#85bab9',.17);ribbon([[-3,-18],[-4,-14],[-5,-10]],.5,'#e9dbc5',.2);
  westLake.forEach(([x,z])=>tree(x-.9,z-.4,.85));
  const lake:Point[]=Array.from({length:36},(_,i)=>{const a=i/36*Math.PI*2;return [10+2.75*Math.cos(a)*(1+.06*Math.sin(3*a)),15+5*Math.sin(a)];});
  polygon(lake.map(([x,z])=>[10+(x-10)*1.2,15+(z-15)*1.13]),'#e6debf',.17);polygon(lake,'#85bab9',.2);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;tree(10+3.7*Math.cos(a),15+5.85*Math.sin(a),.65);}
  part('round',10,.35,17,.65,.15,.65,'#d6caa9');
  for(let i=0;i<3;i++){box(10,.7+i*.45,17,.85-i*.17,.4,.7-i*.12,'#f0e4c8');box(10,.94+i*.45,17,1-i*.17,.12,.85-i*.12,'#7e806c');}
  box(11.3,.37,11.5,1.5,.2,1.4,'#bfcca7');roof(11.3,1.1,11.5,1.6,1.3,'#ad5847');box(12.35,.52,11.25,1.6,.13,.35,'#b44e3f');box(12.35,.8,11.05,1.6,.1,.05,'#b44e3f');
  const roads:Point[][]=[
    [[-38,9],[-25,9],[-12,10],[-2,10],[4,10],[7,9]],
    [[-31,-5],[-19,-5],[-7,-5],[4,-4],[14,-5],[18,-7]],
    [[-22,27],[-21,17],[-22,7],[-22,-4],[-21,-10]],
    [[-31,23],[-31,13],[-31,0],[-29,-12],[-31,-22]],
    [[-13,28],[-12,19],[-10,13],[-4,8],[0,3],[1,-4],[0,-8]],
    [[6,-7],[6,-2],[6,4],[7,9]],[[17,-6],[18,1],[18,12],[21,24],[22,32]],
    [[-27,23],[-15,23],[-3,23],[7,23],[17,25],[23,26]],
    [[-8,28],[-1,28],[12,29],[20,29]],[[34,-18],[35,-7],[37,4],[35,16],[32,26]],
    [[-26,-39],[-14,-41],[-4,-35],[3,-27],[6,-19],[7,-12]],
  ];
  roads.forEach((route,index)=>{ribbon(route,2.05,'#f1eee0',.18);const path=ribbon(route,1.45,'#8d9c9e',.2);for(let i=0;i<path.length-1;i+=5){const p=path[i],q=path[i+1];box(p.x,.23,p.z,.055,.012,.45,'#f6edce',Math.atan2(q.x-p.x,q.z-p.z));}if(index<4)for(let i=4;i<path.length;i+=12){const p=path[i];tree(p.x+1.45,p.z,.63);}});
  const oldStreets:Point[][]=[];for(const z of [-1.8,2.5,6])oldStreets.push([[0,z],[15.5,z]]);for(const x of [2,10.5,14.5])oldStreets.push([[x,-3],[x,8.7]]);
  oldStreets.forEach(p=>ribbon(p,.62,'#b6bcb0',.2,false));
  for(const [x,z] of [[-22,9],[-31,9],[-12,23],[18,2]])for(let k=0;k<5;k++)box(x-.55+k*.27,.24,z,.13,.012,1.3,'#f5f0df');
  function building(x:number,z:number,w:number,d:number,h:number,modern=false,seed=0){
    const palette=['#e5d3b1','#e9e2d1','#c1d0ca','#dab5a0','#d7dbcf'];box(x,.25+h/2,z,w,h,d,modern?'#c1d1d4':palette[seed%palette.length]);
    if(modern){box(x,h+.35,z,w+.15,.2,d+.15,'#eaf0e9');box(x,h+.5,z,w*.35,.2,d*.4,'#829993');for(let y=1;y<h;y+=.9){box(x,y,z+d/2+.015,w*.82,.48,.035,'#6f969f');box(x+w/2+.015,y,z,.035,.48,d*.8,'#789fa8');}for(let dx=-w*.3;dx<w*.4;dx+=w*.3)box(x+dx,h/2,z+d/2+.05,.065,h-.4,.05,'#dce5dd');}
    else{if(seed%3)roof(x,h+.5,z,w,d);else{box(x,h+.3,z,w+.1,.16,d+.1,'#b7b3a2');box(x,h+.65,z,w*.5,.5,d*.4,'#ded9c5');}for(let y=.9;y<h;y+=.85)for(const dx of [-w*.24,w*.24]){box(x+dx,y,z+d/2+.025,w*.2,.38,.045,'#547b7c');box(x+dx,y-.22,z+d/2+.09,w*.3,.05,.2,'#efdfc1');}box(x,.65,z+d/2+.07,w*.4,.85,.06,'#5d756e');if(seed%4===0)box(x,1.2,z+d/2+.25,w,.12,.65,'#ba7760');}
  }
  const distanceToSegment=(x:number,z:number,a:Point,b:Point)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};
  function allowed(x:number,z:number){
    if(CITY_PLACES.some(p=>Math.hypot(x-p.x,z-p.z)<(p.id==='ba-dinh'||p.id==='literature'?4.3:p.id==='cafe'||p.id==='hotel'||p.id==='restaurant'?2:p.id==='bus'?1.3:3.1)))return false;
    if(x>6&&x<14&&z>8&&z<22)return false;
    return !roads.some(path=>path.slice(1).some((b,i)=>distanceToSegment(x,z,path[i],b)<1.7))&&!oldStreets.some(path=>path.slice(1).some((b,i)=>distanceToSegment(x,z,path[i],b)<.85));
  }
  let seed=0;
  for(let z=-7;z<=30;z+=3.1)for(let x=-36;x<=18;x+=2.9){seed++;if(!allowed(x,z)||(x>0&&z<9))continue;const modern=x< -26;building(x,z,modern?1.9:1.65,modern?2:1.8,modern?4.5+seed%6:1.6+(seed%5)*.45,modern,seed);}
  for(let z=-5.3;z<9;z+=1.55)for(let x=.3;x<17;x+=1.55){seed++;if(allowed(x,z))building(x,z,1,1.15,1.7+(seed%4)*.4,false,seed);}
  for(let z=-22;z<=20;z+=4.4)for(let x=34;x<=39;x+=3.8){seed++;if(allowed(x,z))building(x,z,2.1,2.6,4+seed%6,true,seed);}
  for(let i=0;i<11;i++){const x=-31+i*3.2,z=-38+Math.sin(i*.6)*1.5;if(x< -26||x> -7)building(x,z,2,2,3+i%4,true,i);}
  for(let i=0;i<8;i++)building(-35,-24+i*3,2,2,3+i%3,false,i);
  // Lakeside homes, promenades, planted courtyards and a mixed-height skyline.
  for(let i=0;i<9;i++){const z=-32+i*2.5,x=7+(z+32)*.15;building(x,z,1.8,1.7,2.3+i%3,i%3===0,i);tree(x-1.8,z,.65);}
  for(let i=0;i<5;i++){building(-39+i*.4,-16+i*4,1.7,2,3.5+i,true,i);}
  box(-31.8,.24,26,5.8,.12,3.8,'#b8c9a2');ribbon([[-34,26],[-29,26]],.5,'#e9e1cd',.32,false);for(let i=0;i<4;i++){tree(-34+i*1.5,25,.7);tree(-34+i*1.5,27,.7);}
  for(const [x,z] of [[-24,9],[-18,10],[-6,10],[18,15],[-14,23],[4,23]]){box(x,.9,z,.07,1.5,.07,'#687b75');box(x+.2,1.65,z,.48,.1,.22,'#f3eacb');box(x+.6,.46,z,1,.12,.4,'#af9a78');}
  // Distinct silhouettes for civic, religious and cultural landmarks.
  const civic=cityPlace('ba-dinh');box(civic.x,.2,civic.z,7,.1,6,'#b0c295');for(let i=0;i<3;i++)box(civic.x,.38+i*.23,civic.z,4.8-i*.35,.23,3.1-i*.2,'#d8d2c5');box(civic.x,1.65,civic.z,3.6,1.7,2.4,'#b6bdb2');box(civic.x,2.65,civic.z,4.4,.45,3.1,'#d9d8c9');for(let i=0;i<6;i++)box(civic.x-1.5+i*.6,1.75,civic.z+1.3,.2,1.6,.2,'#e1ddcd');for(let i=0;i<4;i++)box(civic.x-2.5+i*1.7,.24,civic.z+4,.95,.08,2,'#91b08b');
  const citadel=cityPlace('citadel');box(citadel.x,.2,citadel.z,5,.13,5,'#c9d1b5');for(const dz of [-2,2])box(citadel.x,.8,citadel.z+dz,5,1.2,.35,'#c1a57f');box(citadel.x,1.1,citadel.z+2,2.2,1.8,.8,'#cbb58c');box(citadel.x,2.3,citadel.z+2,1.4,.8,.8,'#e1c9a2');roof(citadel.x,2.95,citadel.z+2,2.1,1.3);
  const literature=cityPlace('literature');box(literature.x,.2,literature.z,5,.14,7,'#b8c4a1');for(const dx of [-2.5,2.5])box(literature.x+dx,.55,literature.z,.2,.8,7,'#d6c3a3');for(const dz of [-2,0,2.8]){box(literature.x,.8,literature.z+dz,3.6,1,1.2,'#ddc5a2');roof(literature.x,1.7,literature.z+dz,4.3,1.9,'#8d5140');}
  part('round',-4,.3,-15,1.2,.2,1.2,'#c3c69a');for(let i=0;i<6;i++){box(-4,.65+i*.65,-15,.85-i*.08,.5,.85-i*.08,'#bd6e54');roof(-4,1+i*.65,-15,1.3-i*.11,1.3-i*.11,'#ae5744');}
  const cathedral=cityPlace('cathedral');box(cathedral.x,1.6,cathedral.z,2.4,2.8,2,'#a8b1aa');for(const dx of [-1,1]){box(cathedral.x+dx,2.2,cathedral.z+.65,.7,4,.8,'#a9b3ad');roof(cathedral.x+dx,4.4,cathedral.z+.65,.9,.9,'#576c68');}box(cathedral.x,3.6,cathedral.z+.8,.1,.8,.1,'#e3dcc8');box(cathedral.x,3.7,cathedral.z+.8,.45,.1,.1,'#e3dcc8');
  const opera=cityPlace('opera');box(opera.x,.3,opera.z,5,.3,3.4,'#cbbda4');box(opera.x,1.45,opera.z,4.4,2,2.8,'#ead6a8');roof(opera.x,2.9,opera.z,5,3.6,'#79887c');for(let i=0;i<6;i++)box(opera.x-1.8+i*.72,1.35,opera.z+1.65,.2,1.8,.2,'#fff0cf');
  const market=cityPlace('market');for(let i=0;i<3;i++){building(market.x-1.6+i*1.6,market.z,1.5,3,1.8,false,1);box(market.x-1.6+i*1.6,.9,market.z+1.55,1,1.1,.1,'#738d87');}
  const cafe=cityPlace('cafe');building(cafe.x,cafe.z,2.5,2.4,2.1,false,3);for(let i=0;i<6;i++)box(cafe.x-1.1+i*.44,1.5,cafe.z+1.55,.44,.15,.85,i%2?'#fff0d4':'#b45944');box(cafe.x,2,cafe.z+1.24,2,.4,.1,'#385f54');for(const dx of [-.9,.9]){part('round',cafe.x+dx,.6,cafe.z+2.1,.33,.12,.33,'#c99f70');box(cafe.x+dx,.35,cafe.z+2.1,.1,.5,.1,'#6e7863');}
  const hotel=cityPlace('hotel');building(hotel.x,hotel.z,2.1,2.3,4,true);box(hotel.x,1.4,hotel.z+1.3,2.5,.12,.8,'#b2ad89');
  const restaurant=cityPlace('restaurant');building(restaurant.x,restaurant.z,2.5,2.4,1.8,false,4);
  const bus=cityPlace('bus');box(bus.x,1.4,bus.z,2.2,.12,.9,'#467a81');box(bus.x,.7,bus.z-.35,2.1,1.4,.07,'#acd1d0');box(bus.x,.5,bus.z,.9,.13,.4,'#cfb594');
  function bridge(a:Point,b:Point,truss:boolean){const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);box((a[0]+b[0])/2,.85,(a[1]+b[1])/2,1.6,.26,length,'#aab7ad',angle);for(let i=0;i<=8;i++){const t=i/8,x=a[0]+dx*t,z=a[1]+dz*t;box(x,.3,z,.45,1.4,.45,'#a5a79b');for(const side of [-1,1]){const sx=x+Math.cos(angle)*side*.7,sz=z-Math.sin(angle)*side*.7;box(sx,1.7,sz,.09,truss?1.5:.5,.09,'#7a7970');if(truss&&i<8)beam(new T.Vector3(sx,i%2?2.4:1.05,sz),new T.Vector3(sx+dx/8,i%2?1.05:2.4,sz+dz/8),'#8d8170');}}if(truss)for(const side of [-1,1]){box((a[0]+b[0])/2+Math.cos(angle)*side*.7,2.4,(a[1]+b[1])/2-Math.sin(angle)*side*.7,.1,.12,length,'#857a68',angle);box((a[0]+b[0])/2+Math.cos(angle)*side*.22,1.01,(a[1]+b[1])/2-Math.sin(angle)*side*.22,.055,.04,length,'#6c7d77',angle);}}
  bridge([16,-2],[30,-11],true);bridge([21,8],[36,1],false);
  for(const x of [-38,-26,-4])for(let z=12;z<29;z+=3.4)if(allowed(x,z))tree(x,z,.8);for(let i=0;i<12;i++)tree(34+Math.sin(i)*1.5,24+i*.65,.7);
  const instancedMaterial=standard('#ffffff',.72);
  for(const kind of Object.keys(primitives) as Primitive[]){const items=batches[kind],mesh=new T.InstancedMesh(primitives[kind],instancedMaterial,items.length);items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);mesh.setColorAt(i,new T.Color(item.color));});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}
  const traffic:T.Group[]=[],carGeometry=new T.BoxGeometry(1,1,1);geometries.push(carGeometry);
  const trafficRoutes=[roads[3],roads[9]].map(route=>new T.CatmullRomCurve3(route.map(([x,z])=>new T.Vector3(x,0,z))));
  for(let i=0;i<8;i++){const car=new T.Group(),body=new T.Mesh(carGeometry,standard(['#faf3dc','#4b7d88','#c6755c','#8fa69d'][i%4])),cabin=new T.Mesh(carGeometry,standard('#466c75'));body.scale.set(.45,.28,.9);body.position.y=.46;cabin.scale.set(.36,.18,.45);cabin.position.y=.68;car.add(body,cabin);scene.add(car);traffic.push(car);}
  let view=CITY_VIEWS.find(v=>v.id===options.initialView)!;
  let disposed=false,frame=0,last=0,labelsDirty=true;
  const markerList=[{id:'cafe',element:pin},...options.markers].sort((a,b)=>cityPlace(b.id).priority-cityPlace(a.id).priority);
  const projectLabels=()=>{
    const w=host.clientWidth,h=host.clientHeight,occupied:{x:number;y:number;w:number;h:number}[]=[];
    host.parentElement?.querySelectorAll<HTMLElement>('.city-map-caption,.city-compass,.city-map-tools').forEach(el=>occupied.push({x:el.offsetLeft,y:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight}));
    markerList.forEach(({id,element})=>{const p=cityPlace(id),v=new T.Vector3(p.x,p.height,p.z).project(camera),x=(v.x*.5+.5)*w,y=(-v.y*.5+.5)*h,ew=element.offsetWidth||100,eh=element.offsetHeight||28,b={x:x-ew/2,y:y-eh,w:ew,h:eh};const outside=b.x<8||b.x+b.w>w-8||b.y<8||y>h-48,collision=occupied.some(a=>b.x<a.x+a.w+8&&b.x+b.w+8>a.x&&b.y<a.y+a.h+7&&b.y+b.h+7>a.y);element.style.visibility=outside||collision?'hidden':'visible';element.style.left=`${x}px`;element.style.top=`${y}px`;if(!outside&&!collision)occupied.push(b);});
  };
  const resize=()=>{if(disposed)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const aspect=w/h,halfHeight=Math.max(view.span*.66,view.span*.7/aspect);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();renderer.setSize(w,h);labelsDirty=true;};
  const setView=(id:CityViewId)=>{view=CITY_VIEWS.find(v=>v.id===id)!;controls.target.set(view.x,0,view.z);camera.position.set(view.x+52,72,view.z+78);camera.zoom=1;camera.lookAt(controls.target);controls.update();resize();};
  setView(options.initialView);const observer=new ResizeObserver(resize);observer.observe(host);
  const labelObserver=new ResizeObserver(()=>{labelsDirty=true;});markerList.forEach(({element})=>labelObserver.observe(element));
  const changed=()=>{labelsDirty=true;};controls.addEventListener('change',changed);
  const pointer=new T.Vector2(),raycaster=new T.Raycaster();let downX=0,downY=0,moved=false,pointerCount=0;
  const down=(e:PointerEvent)=>{pointerCount++;downX=e.clientX;downY=e.clientY;moved=pointerCount>1;};
  const move=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>5)moved=true;};
  const cancel=()=>{pointerCount=0;moved=true;};
  const up=(e:PointerEvent)=>{
    pointerCount=Math.max(0,pointerCount-1);if(moved)return;
    const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hits=CITY_PLACES.flatMap(p=>{const bounds=new T.Box3(new T.Vector3(p.x-1.4,.2,p.z-1.4),new T.Vector3(p.x+1.4,p.height+.3,p.z+1.4)),hit=raycaster.ray.intersectBox(bounds,new T.Vector3());return hit?[{id:p.id,distance:hit.distanceTo(camera.position)}]:[];}).sort((a,b)=>a.distance-b.distance);
    if(hits[0]?.id==='cafe')onEnter();else if(hits[0])options.onSelect(hits[0].id);
  };
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  // Only traffic moves; the city and sun are static, so reuse their shadow map.
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const draw=(time:number)=>{if(disposed)return;frame=requestAnimationFrame(draw);if(document.hidden||time-last<quality.frameInterval)return;last=time;controls.update();camera.updateMatrixWorld();if(labelsDirty){projectLabels();labelsDirty=false;}traffic.forEach((car,i)=>{const route=trafficRoutes[i<4?0:1],t=((reduced.matches?0:time*.000025)+i*.23)%1,position=route.getPointAt(t),direction=route.getTangentAt(t);car.position.copy(position);car.rotation.y=Math.atan2(direction.x,direction.z);});renderer.render(scene,camera);};frame=requestAnimationFrame(draw);
  const lost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(frame);onLost();};renderer.domElement.addEventListener('webglcontextlost',lost);
  return {setView,zoom:(factor:number)=>{camera.zoom=clampCityZoom(camera.zoom*factor);camera.updateProjectionMatrix();labelsDirty=true;},dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();labelObserver.disconnect();controls.removeEventListener('change',changed);controls.dispose();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',lost);Object.values(primitives).forEach(g=>g.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}
