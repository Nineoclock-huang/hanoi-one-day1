import * as T from 'three';

// A deliberately compact, handmade Hanoi-inspired diorama. No remote assets.
export function mountCity(host: HTMLElement, pin: HTMLElement, onEnter: () => void, onLost: () => void) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-24, 24, 17, -17, .1, 160);
  camera.position.set(32, 37, 44);
  camera.lookAt(0, 0, 0);
  scene.add(new T.HemisphereLight(0xfff8e8, 0x647b69, 2.6));
  const sun = new T.DirectionalLight(0xffedc7, 3);
  sun.position.set(-20, 35, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
  sun.shadow.bias = -.001;
  scene.add(sun);
  const materials = new Map<string, T.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .85 }));
    return materials.get(color)!;
  };
  const cube = new T.BoxGeometry(1, 1, 1);
  const sphere = new T.IcosahedronGeometry(1, 1);
  const cone = new T.ConeGeometry(1, 1, 4);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 32);
  const box = (x:number,y:number,z:number,w:number,h:number,d:number,color:string,parent:T.Object3D=scene) => {
    const mesh = new T.Mesh(cube, material(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const tree = (x:number,z:number,size=1) => {
    box(x,.65,z,.17,1.3,.17,'#836748');
    const crown = new T.Mesh(sphere, material('#70956b')); crown.position.set(x,1.6*size,z); crown.scale.set(.75*size,1*size,.75*size); crown.castShadow=true; scene.add(crown);
  };
  box(0,-.7,0,36,1.4,29,'#b6b38d');
  box(0,.02,0,36,.16,29,'#ccd0a8');
  // River along the eastern edge; surrounding countryside on the far bank.
  box(13,.15,0,5,.13,29,'#79aaa5');
  box(16.6,.24,0,2,.2,29,'#9faf85');
  for (let z=-13;z<14;z+=2.4) tree(16.6,z,.8);
  for (const z of [-8,1,9]) box(-3,.18,z,27,.08,1.35,'#c5b9a0');
  for (const x of [-12,-5,7]) box(x,.2,0,1.3,.09,28,'#c5b9a0');
  for(let z=-13;z<14;z+=1.5) box(-12,.26,z,.07,.015,.6,'#fff0ce');
  // Hoan Kiem Lake, park and Turtle Tower.
  const lake = new T.Mesh(cylinder,material('#72ada5')); lake.position.set(1,.24,5); lake.scale.set(4.7,.18,6); scene.add(lake);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;tree(1+5.3*Math.cos(a),5+6.6*Math.sin(a),.75);}
  const island = new T.Mesh(cylinder,material('#d7c49c')); island.scale.set(.85,.2,.75);island.position.set(1,.42,6);scene.add(island);
  for(let i=0;i<3;i++){
    box(1,.8+i*.6,6,1.05-i*.2,.5,.85-i*.15,'#eee0b8');
    box(1,1.08+i*.6,6,1.18-i*.2,.13,1-i*.15,'#786c53');
    box(1,.8+i*.6,6.44-i*.075,.21,.3,.03,'#575d52');
  }
  box(4,.48,1.9,2.3,.18,.4,'#b34b37');
  for(const z of [1.64,2.16])box(4,.8,z,2.4,.12,.08,'#b34b37');
  const palette=['#e6c790','#e9d8b4','#b7c3af','#d8a47f','#eadcae','#cfb895'];
  function building(x:number,z:number,w:number,d:number,h:number,color:string,parent:T.Object3D=scene){
    box(x,.3+h/2,z,w,h,d,color,parent);
    const roof=new T.Mesh(cone,material('#a96750'));roof.position.set(x,h+.6,z);roof.rotation.y=Math.PI/4;roof.scale.set(w*.8,.8,d*.8);roof.castShadow=true;parent.add(roof);
    for(let y=1;y<h;y+=1.1) for(let dx=-w*.28;dx<=w*.3;dx+=w*.56){box(x+dx,y,z+d/2+.02,.32,.48,.04,'#53766e',parent);box(x+dx,y-.29,z+d/2+.05,.43,.06,.15,'#f0dfb6',parent);}
    box(x,.8,z+d/2+.03,.5,1,.04,'#405e56',parent);
  }
  // Dense narrow tube houses in the old quarter north of the lake.
  for(let row=0;row<3;row++) for(let col=0;col<9;col++){
    const x=-15+col*2.7,z=-11+row*3.35;
    if(Math.abs(x+12)<1.5 || Math.abs(x+5)<1.3)continue;
    building(x,z,1.8,2.1,1.9+((row*7+col*3)%5)*.45,palette[(row+col)%6]);
  }
  for(let i=0;i<5;i++){building(-15,3+i*2.2,2,1.6,2.1+(i%3)*.6,palette[i]);}
  for(let i=0;i<4;i++){building(9,-5+i*4,1.7,2.3,2.2+(i%2),palette[i+1]);}
  // Market hall and west-side civic buildings.
  building(-8,-11,4.3,2.5,1.7,'#dec394');
  for(let i=0;i<4;i++) box(-9.5+i,.9,-9.72,.6,1,.06,'#607e73');
  building(-8,10,3.2,2.5,2.4,'#ede0c2');
  for(let i=0;i<4;i++)box(-9.15+i*.75,1.4,11.5,.18,2,.18,'#f6ebd2');
  // Long Bien-inspired river crossing, with visible trusses.
  box(13,.85,-8,7.1,.25,1.4,'#b9ab89');
  for(const z of [-8.7,-7.3])for(let i=0;i<6;i++){
    box(10+i,1.3,z,.09,1.1,.09,'#795d48');
    const beam=box(10.5+i,1.3,z,1.5,.07,.07,'#795d48');beam.rotation.z=i%2?-.75:.75;
  }
  // Interactive café: every component belongs to the same raycast group.
  const cafe=new T.Group();scene.add(cafe);
  building(-8,3,3.7,3,2.7,'#edca88',cafe);
  for(let i=0;i<8;i++)box(-9.65+i*.47,1.8,4.9,.47,.16,1.2,i%2?'#f5e7cb':'#ab4836',cafe);
  box(-8,2.37,4.55,2.8,.55,.12,'#3b6052',cafe);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;
  const ctx=labelCanvas.getContext('2d')!;ctx.fillStyle='#3b6052';ctx.fillRect(0,0,512,128);ctx.fillStyle='#fff0cf';ctx.font='bold 64px serif';ctx.textAlign='center';ctx.fillText('CÀ PHÊ',256,86);
  const texture=new T.CanvasTexture(labelCanvas);texture.colorSpace=T.SRGBColorSpace;
  const signMaterial=new T.MeshBasicMaterial({map:texture});const signGeo=new T.PlaneGeometry(2.7,.5);
  const sign=new T.Mesh(signGeo,signMaterial);sign.position.set(-8,2.37,4.63);cafe.add(sign);
  for(const x of [-9,-7]) {box(x,.65,5.8,.7,.1,.7,'#976c49',cafe);box(x,.4,5.8,.12,.5,.12,'#6b5e48',cafe);for(const dx of [-.5,.5])box(x+dx,.4,5.8,.3,.5,.3,'#658573',cafe);}
  for(const [x,z] of [[-10,6],[-6,7],[-10,-2],[-3,-12],[8,12],[-15,12]])tree(x,z);
  // Small scooters bring life to the fixed camera view.
  const scooters:T.Group[]=[];
  for(let i=0;i<4;i++){const s=new T.Group();box(0,.45,0,.35,.35,.8,['#aa4939','#e6bf61','#48766c','#f0e3c5'][i],s);box(0,.75,0,.25,.4,.25,'#60584a',s);scene.add(s);scooters.push(s);}
  const raycaster=new T.Raycaster();const pointer=new T.Vector2();
  const hit=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(cafe.children,true).length>0;};
  const click=(e:PointerEvent)=>{if(hit(e))onEnter();};
  const hover=(e:PointerEvent)=>{renderer.domElement.style.cursor=hit(e)?'pointer':'default';};
  renderer.domElement.addEventListener('pointerup',click);renderer.domElement.addEventListener('pointermove',hover);
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;const aspect=w/h;const halfHeight=Math.max(16,25/aspect);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();camera.updateMatrixWorld();renderer.setSize(w,h);const pos=new T.Vector3(-8,4.5,3).project(camera);pin.style.left=`${(pos.x*.5+.5)*100}%`;pin.style.top=`${(-pos.y*.5+.5)*100}%`;};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=0;
  const draw=(time:number)=>{frame=requestAnimationFrame(draw);if(document.hidden || time-last<33)return;last=time;scooters.forEach((s,i)=>{s.position.set(-12+(i%2)*.4,0,reduced.matches?i*4-10:((time*.0015+i*7)%26)-13);});renderer.render(scene,camera);};
  frame=requestAnimationFrame(draw);
  const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(frame);onLost();};renderer.domElement.addEventListener('webglcontextlost',lost);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('pointermove',hover);renderer.domElement.removeEventListener('webglcontextlost',lost);cube.dispose();sphere.dispose();cone.dispose();cylinder.dispose();signGeo.dispose();texture.dispose();signMaterial.dispose();materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
}
