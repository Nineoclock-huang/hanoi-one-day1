import {expect,it} from 'vitest';
import {clearOfBuildings,walkingRoute} from './cityWalking';
it('routes around a building with clearance rather than jumping through it',()=>{
 const obstacles=[{x:0,z:0,w:3,d:3}],canWalk=(p:{x:number;z:number})=>Math.abs(p.x)<5&&Math.abs(p.z)<5&&clearOfBuildings(p,obstacles);
 const route=walkingRoute({x:-3.25,z:0},{x:3.25,z:0},canWalk);
 expect(route.length).toBeGreaterThan(10);expect(route.every(canWalk)).toBe(true);expect(route.at(-1)?.x).toBe(3.25);
});
it('stops outside an inaccessible building destination',()=>{
 const canWalk=(p:{x:number;z:number})=>Math.abs(p.x)<4&&Math.abs(p.z)<4&&clearOfBuildings(p,[{x:0,z:0,w:2,d:2}]);
 const route=walkingRoute({x:-3.25,z:0},{x:0,z:0},canWalk);expect(canWalk(route.at(-1)!)).toBe(true);
});
