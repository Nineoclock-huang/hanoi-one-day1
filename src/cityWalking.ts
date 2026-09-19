export type WalkPoint = { x: number; z: number };
export type WalkObstacle = { x: number; z: number; w: number; d: number };
export const WALK_STEP = .65;
export const PAWN_RADIUS = .55;
export function clearOfBuildings(p: WalkPoint, obstacles: WalkObstacle[]) {
  return !obstacles.some(o => Math.abs(p.x-o.x)<o.w/2+PAWN_RADIUS && Math.abs(p.z-o.z)<o.d/2+PAWN_RADIUS);
}
// Four-way grid paths cannot cut diagonally across the corner of a building.
export function walkingRoute(start: WalkPoint, destination: WalkPoint, canWalk: (p: WalkPoint)=>boolean): WalkPoint[] {
  const key=(x:number,z:number)=>`${x},${z}`, cells=new Map<string,{x:number;z:number;parent:string|null}>();
  const sx=Math.round(start.x/WALK_STEP),sz=Math.round(start.z/WALK_STEP),queue=[key(sx,sz)];
  cells.set(queue[0],{x:sx,z:sz,parent:null});
  let best=queue[0],distance=Infinity;
  for(let i=0;i<queue.length;i++){
    const id=queue[i],cell=cells.get(id)!,p={x:cell.x*WALK_STEP,z:cell.z*WALK_STEP},d=Math.hypot(p.x-destination.x,p.z-destination.z);
    if(d<distance){distance=d;best=id;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=cell.x+dx,z=cell.z+dz,next=key(x,z);
      if(Math.abs(x)>70||Math.abs(z)>70||cells.has(next))continue;
      const end={x:x*WALK_STEP,z:z*WALK_STEP};
      if(!canWalk(end)||!canWalk({x:(p.x+end.x)/2,z:(p.z+end.z)/2}))continue;
      cells.set(next,{x,z,parent:id});queue.push(next);
    }
  }
  const route:WalkPoint[]=[];let id:string|null=best;
  while(id){const cell:{x:number;z:number;parent:string|null}=cells.get(id)!;route.push({x:cell.x*WALK_STEP,z:cell.z*WALK_STEP});id=cell.parent;}
  return route.reverse();
}
export function insidePolygon(p:WalkPoint,polygon:[number,number][]){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,zi]=polygon[i],[xj,zj]=polygon[j];if((zi>p.z)!==(zj>p.z)&&p.x<(xj-xi)*(p.z-zi)/(zj-zi)+xi)inside=!inside;}return inside;}
