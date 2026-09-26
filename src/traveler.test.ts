import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createTraveler } from './traveler';

describe('两张沙盘共用的小旅人', () => {
  it('包含底座、身体、头、斗笠、双眼和挎包，且有相同轮廓', () => {
    const geometries: THREE.BufferGeometry[] = [];
    const pawn = createTraveler(
      color => new THREE.MeshStandardMaterial({ color }),
      geometry => geometries.push(geometry),
    );
    expect(pawn.children).toHaveLength(7);
    expect(geometries).toHaveLength(7);
    expect(pawn.children.map(child => child.position.y)).toEqual([.08, .48, 1.05, 1.41, 1.09, 1.09, .57]);
    expect((pawn.children[6] as THREE.Mesh).material).toBeInstanceOf(THREE.MeshStandardMaterial);
    pawn.traverse(object => {
      if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose();
    });
    geometries.forEach(geometry => geometry.dispose());
  });
});
