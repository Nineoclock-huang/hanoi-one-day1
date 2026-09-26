import * as THREE from 'three';

/** Both maps use one silhouette, scale and palette for the little traveller. */
export function createTraveler(
  material: (color: string) => THREE.Material,
  onGeometry?: (geometry: THREE.BufferGeometry) => void,
) {
  const group = new THREE.Group();
  const part = (geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) => {
    onGeometry?.(geometry);
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
  };
  part(new THREE.CylinderGeometry(.38, .52, .16, 16), '#f9df96', 0, .08, 0);
  part(new THREE.CylinderGeometry(.2, .38, .65, 16), '#b9533c', 0, .48, 0);
  part(new THREE.SphereGeometry(.36, 16, 12), '#ffe4bd', 0, 1.05, 0);
  part(new THREE.ConeGeometry(.51, .25, 16), '#e5bb6c', 0, 1.41, 0);
  part(new THREE.SphereGeometry(.045, 8, 6), '#302c28', -.12, 1.09, .32);
  part(new THREE.SphereGeometry(.045, 8, 6), '#302c28', .12, 1.09, .32);
  part(new THREE.BoxGeometry(.22, .3, .17), '#3a7772', .33, .57, 0);
  return group;
}
