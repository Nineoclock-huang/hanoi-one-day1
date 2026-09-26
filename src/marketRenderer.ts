import * as THREE from 'three';
import { STALLS, marketRoute, type StallId } from './market';
import { createTraveler } from './traveler';

type Kind = 'box' | 'round' | 'sphere' | 'roof';
type Piece = { matrix: THREE.Matrix4; color: string };

export function mountMarket(host: HTMLElement, pins: Map<StallId, HTMLButtonElement>) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8dcc6');
  scene.fog = new THREE.Fog('#e8dcc6', 26, 55);
  const camera = new THREE.OrthographicCamera(-11, 11, 11, -11, .1, 100);
  camera.position.set(3, 18, 20);
  camera.lookAt(0, .65, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#fff6dd', '#7b907f', 2.5));
  const sun = new THREE.DirectionalLight('#fff1d0', 3);
  sun.position.set(-8, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(768, 768);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13 });
  sun.shadow.normalBias = .07;
  scene.add(sun);

  // Batch repeated geometry so added details do not become hundreds of draw calls.
  const geometries: Record<Kind, THREE.BufferGeometry> = {
    box: new THREE.BoxGeometry(1, 1, 1),
    round: new THREE.CylinderGeometry(.5, .5, 1, 12),
    sphere: new THREE.IcosahedronGeometry(.5, 1),
    roof: new THREE.ConeGeometry(.5, 1, 4),
  };
  const batches: Record<Kind, Piece[]> = { box: [], round: [], sphere: [], roof: [] };
  const dummy = new THREE.Object3D();
  const part = (kind: Kind, x: number, y: number, z: number, w: number, h: number, d: number, color: string, ry = 0) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    batches[kind].push({ matrix: dummy.matrix.clone(), color });
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => part('box', x, y, z, w, h, d, color);
  const orb = (x: number, y: number, z: number, size: number, color: string) => part('sphere', x, y, z, size, size, size, color);
  const round = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => part('round', x, y, z, w, h, d, color);

  // Raised market square with a clear central walking aisle.
  box(0, -.4, 0, 19.6, .62, 15.5, '#aa987e');
  box(0, -.04, 0, 18.6, .14, 14.7, '#c8b89c');
  for (let x = -8; x <= 8; x++) for (let z = -6; z <= 6; z++)
    box(x, .035, z, .95, .045, .95, (x + z) % 3 === 0 ? '#d9c9ad' : '#d2c1a3');
  box(0, .075, 0, 17.4, .025, 2.35, '#e2d5b7');
  for (let x = -7.5; x < 8; x += 1.5) {
    box(x, .09, -1.25, .45, .02, .045, '#f0e5cd');
    box(x, .09, 1.25, .45, .02, .045, '#f0e5cd');
  }

  // Stylised arched frontage of Chợ Đồng Xuân beyond the stalls.
  box(0, 1.5, -6.65, 17.7, 2.8, .55, '#dfb987');
  box(0, 3.04, -6.65, 18, .3, .9, '#a7533e');
  box(0, 3.37, -6.65, 17.4, .33, .68, '#c5704c');
  for (let i = -4; i <= 4; i++) {
    const x = i * 1.86;
    box(x, 1.36, -6.29, 1.43, 1.65, .06, '#60756c');
    round(x, 2.28, -6.26, 1.42, .18, .13, '#f0d9ad');
    box(x - .78, 1.5, -6.18, .13, 2.05, .25, '#e9c99b');
    box(x + .78, 1.5, -6.18, .13, 2.05, .25, '#e9c99b');
    box(x, .47, -6.16, 1.28, .12, .16, '#ad744e');
  }
  for (const x of [-8.7, 8.7]) {
    box(x, 1.8, -6.3, .5, 3.6, .8, '#c99663');
    part('roof', x, 3.8, -6.3, 1.35, .8, 1.35, '#ac5741', Math.PI / 4);
  }

  const signTextures: THREE.Texture[] = [];
  const sign = (label: string, x: number, y: number, z: number, width: number, front = 1) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#6e4939'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#e0bc85'; ctx.lineWidth = 6; ctx.strokeRect(9, 9, 494, 110);
    ctx.fillStyle = '#fff0d0'; ctx.font = 'bold 46px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 256, 68, 478);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    signTextures.push(texture);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.rotation.y = front < 0 ? Math.PI : 0;
    scene.add(mesh);
  };
  sign('CHỢ ĐỒNG XUÂN', 0, 3.51, -6.15, 5.4);

  STALLS.forEach(t => {
    const front = t.z < 0 ? 1 : -1;
    box(t.x, .65, t.z, 3.75, 1.15, 2.12, '#936c4e');
    box(t.x, 1.24, t.z + front * .46, 3.85, .13, 1.3, '#dec096');
    box(t.x, .72, t.z + front * 1.08, 3.7, .74, .1, '#b8895d');
    for (const dx of [-1.76, 1.76]) box(t.x + dx, 1.68, t.z, .12, 3.36, .12, '#644b3d');
    for (let i = 0; i < 8; i++) {
      box(t.x - 1.66 + i * .47, 3.14, t.z, .47, .17, 3.05, i % 2 ? '#fff0d3' : t.color);
      box(t.x - 1.66 + i * .47, 2.95, t.z + front * 1.52, .47, .25, .08, i % 2 ? '#fff0d3' : t.color);
    }
    sign(t.vi, t.x, 2.44, t.z + front * 1.12, 2.28, front);
    for (let i = 0; i < 3; i++) {
      const x = t.x - 1.04 + i * 1.04, z = t.z + front * .73;
      box(x, 1.43, z, .82, .16, .72, '#b78556');
      if (t.id === 'fruit') {
        for (let j = 0; j < 7; j++)
          orb(x + ((j * 3) % 7 - 3) * .085, 1.57 + Math.floor(j / 4) * .16, z + (j % 3 - 1) * .16, .34, ['#e6ad3e', '#78a154', '#ca6350'][i]);
      } else if (t.id === 'gifts') {
        for (let j = 0; j < 3; j++) {
          box(x - .23 + j * .23, 1.62, z, .19, .19 + (j % 2) * .13, .29, ['#bc8060', '#e1bb72', '#8a9c72'][j]);
          box(x - .23 + j * .23, 1.77 + (j % 2) * .13, z, .22, .045, .3, '#f2dfb6');
        }
      } else {
        for (let j = 0; j < 4; j++)
          box(x - .25 + j * .17, 1.55 + j * .075, z, .65, .075, .46, ['#d89278', '#8aaab1', '#e7c77b', '#a0809e'][j]);
      }
    }
    box(t.x, 1.59, t.z - front * .34, .62, .68, .42, t.color);
    orb(t.x, 2.12, t.z - front * .34, .59, '#ddb38d');
    part('roof', t.x, 2.54, t.z - front * .34, .82, .32, .82, '#544536', Math.PI / 4);
  });

  // Context details remain off the central aisle and away from all route endpoints.
  for (const x of [-8.45, 8.45]) {
    for (const z of [-3.9, -.7, 3.1]) {
      round(x, .34, z, .64, .42, .64, '#a87950');
      orb(x, .69, z, .68, z < 0 ? '#8ca55d' : '#d7a553');
    }
    box(x, .88, 5.05, .16, 1.65, .16, '#856344');
    orb(x, 1.88, 5.05, 1.32, '#6f946e');
    orb(x - .4, 1.52, 5.05, .9, '#88a87c');
  }
  for (const x of [-6.5, -2.2, 2.2, 6.5]) {
    box(x, 2.2, 6.35, .06, 2.5, .06, '#826852');
    round(x, 2.58, 6.35, .35, .52, .35, '#c95f42');
    box(x, 2.89, 6.35, .48, .075, .48, '#d6a767');
  }
  box(6.65, .45, 5.25, 1.4, .27, .4, '#517f79');
  for (const x of [6.17, 7.1]) round(x, .26, 5.28, .43, .12, .43, '#444d4b');
  box(6.47, .85, 5.25, .64, .13, .3, '#618f86');
  box(6.85, .82, 5.25, .07, .65, .08, '#516a63');
  box(0, .32, 6.25, 1.55, .38, .82, '#a67550');
  for (const dx of [-.58, .58]) round(dx, .16, 6.25, .44, .14, .44, '#5b564c');
  for (let i = 0; i < 5; i++) box(-.5 + i * .24, .68, 6.25, .2, .28, .25, '#d4a452');

  const batchMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .83 });
  (Object.keys(batches) as Kind[]).forEach(kind => {
    const items = batches[kind];
    const mesh = new THREE.InstancedMesh(geometries[kind], batchMaterial, items.length);
    items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, new THREE.Color(item.color)); });
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere();
    scene.add(mesh);
  });

  const pawn = createTraveler(color => new THREE.MeshStandardMaterial({ color, roughness: .8 }));
  scene.add(pawn);
  pawn.position.set([-7, 7][Math.floor(Math.random() * 2)], .1, 0);
  const pawnLabel = document.createElement('span');
  pawnLabel.className = 'market-pawn-label';
  pawnLabel.textContent = '小旅人 ↓';
  host.parentElement?.appendChild(pawnLabel);
  let frame = 0, disposed = false, travel = false;
  let resolveTravel: ((value: boolean) => void) | undefined;
  const paint = () => {
    if (disposed) return;
    renderer.render(scene, camera);
    pins.forEach((pin, id) => {
      const stall = STALLS.find(t => t.id === id)!;
      const point = new THREE.Vector3(stall.x, 3.73, stall.z).project(camera);
      pin.style.left = `${(point.x + 1) * 50}%`;
      pin.style.top = `${(1 - point.y) * 50}%`;
    });
    const travelerPoint = pawn.position.clone().add(new THREE.Vector3(0, 1.8, 0)).project(camera);
    pawnLabel.style.left = `${(travelerPoint.x + 1) * 50}%`;
    pawnLabel.style.top = `${(1 - travelerPoint.y) * 50}%`;
    pawnLabel.style.visibility = Math.abs(travelerPoint.x) > 1 || Math.abs(travelerPoint.y) > 1 ? 'hidden' : 'visible';
  };
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    const aspect = w / h, half = Math.max(8, 10 / aspect);
    camera.left = -half * aspect; camera.right = half * aspect;
    camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    paint();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    travelTo(id: StallId): Promise<boolean> {
      if (disposed || travel) return Promise.resolve(false);
      travel = true;
      const route = marketRoute({ x: pawn.position.x, z: pawn.position.z }, id);
      let segment = 1, startTime = 0;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      return new Promise(resolve => {
        resolveTravel = resolve;
        const tick = (now: number) => {
          if (disposed) return;
          if (segment >= route.length) {
            travel = false; resolveTravel = undefined;
            pawn.position.y = .1; pawn.rotation.z = 0; paint(); resolve(true); return;
          }
          if (!startTime) startTime = now;
          const a = route[segment - 1], b = route[segment];
          const duration = reduced ? 1 : Math.max(180, Math.hypot(b.x - a.x, b.z - a.z) * 180);
          const p = Math.min(1, (now - startTime) / duration);
          pawn.position.set(a.x + (b.x - a.x) * p, .1 + (reduced ? 0 : Math.abs(Math.sin(p * Math.PI * Math.ceil(duration / 260))) * .4), a.z + (b.z - a.z) * p);
          pawn.rotation.z = reduced ? 0 : Math.sin(p * Math.PI) * .06;
          if (p < 1) pawn.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
          paint();
          if (p === 1) { segment++; startTime = 0; }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      });
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resolveTravel?.(false);
      observer.disconnect();
      const disposedGeometries = new Set<THREE.BufferGeometry>();
      const disposedMaterials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        if (!disposedGeometries.has(object.geometry)) { object.geometry.dispose(); disposedGeometries.add(object.geometry); }
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          if (!disposedMaterials.has(material)) { material.dispose(); disposedMaterials.add(material); }
      });
      signTextures.forEach(texture => texture.dispose());
      pawnLabel.remove();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
