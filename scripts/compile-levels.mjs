import {writeFile} from 'node:fs/promises';
import {blueprints} from '../dist/js/level-blueprints.js';
import {key,parseLevel,railCount,validateRoutes,simulate,solveLevel,arrivalTimes} from '../dist/js/engine.js';
const compiled=[];
for(const b of blueprints){
 const grid=Array.from({length:b.h},()=>Array(b.w).fill('#')),mouths={},pairs=new Map();
 const fill=(rect,type)=>{const [x1,y1,x2,y2]=rect;for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=type;};
 for(const r of b.floor||[])fill(r,'.');
 for(const r of b.water||[])fill(r,'~');
 for(const [label,x,y,out,u,v,out2] of b.tunnels||[]){mouths[key(x,y)]=out;mouths[key(u,v)]=out2;pairs.set(key(x,y),key(u,v));pairs.set(key(u,v),key(x,y));grid[y][x]=label;grid[v][u]=label;}
 const solution={};
 b.paths.forEach((points,i)=>{
  const route=[key(...points[0])];
  for(let p=1;p<points.length;p++){
   let [x,y]=points[p-1];const [u,v]=points[p];
   if(pairs.get(key(x,y))===key(u,v)){route.push(key(u,v));continue;}
   if(x!==u&&y!==v)throw new Error(`Diagonal proof ${b.id}`);
   while(x!==u||y!==v){x+=Math.sign(u-x);y+=Math.sign(v-y);route.push(key(x,y));}
  }
  solution[i+1]=route;
  for(const k of route){const [x,y]=k.split(',').map(Number);if(!pairs.has(k))grid[y][x]='.';}
 });
 for(const [x,y,type] of b.bridges||[])grid[y][x]=type;
 for(const [x,y,n] of b.waits||[]){if(grid[y][x]!=='.'||![1,2].includes(n))throw new Error(`Invalid wait platform ${b.id} at ${x},${y}`);grid[y][x]=n===2?'z':'w';}
 const signals={};
 for(const [x,y,period,green,phase] of b.signals||[]){if(grid[y][x]!=='.')throw new Error(`Invalid signal tile ${b.id} at ${x},${y}`);grid[y][x]='q';signals[key(x,y)]={period,green,phase};}
 for(const [x,y,d] of b.oneWays||[]){if(grid[y][x]!=='.'||![0,1,2,3].includes(d))throw new Error(`Invalid one-way tile ${b.id} at ${x},${y}`);grid[y][x]='>v<^'[d];}
 const locks=(b.locks||[]).map((lock,i)=>{
  const [x,y]=lock.plate;if(grid[y]?.[x]!=='.')throw new Error(`Invalid key plate ${b.id} at ${x},${y}`);grid[y][x]='p';
  const gates=lock.gates.map(([u,v])=>{if(grid[v]?.[u]!=='.')throw new Error(`Invalid barrier ${b.id} at ${u},${v}`);grid[v][u]='l';return key(u,v);});
  return {id:i+1,plate:key(x,y),gates};
 });
 b.paths.forEach((p,i)=>{const [x,y]=p[0];grid[y][x]=String(i+1);});
 const goal=b.paths[0].at(-1);for(const p of b.paths)if(key(...p.at(-1))!==key(...goal))throw new Error('Different goals');grid[goal[1]][goal[0]]='G';
 for(let x=goal[0]+1;x<b.w;x++)grid[goal[1]][x]=' ';
 // Cut empty corners for a less rectangular island silhouette; never alter a path.
 for(const [x,y] of [[0,0],[b.w-1,0],[0,b.h-1],[b.w-1,b.h-1]])if(grid[y][x]==='#')grid[y][x]=' ';
 const data={id:b.id,world:b.world,name:b.name,lesson:b.lesson,map:grid.map(r=>r.join('')),directions:b.directions||{},mouths,solution,designNote:b.idea,par:0,budget:199,...(b.signals?.length?{signals}:{}),...(locks.length?{locks}:{})};
 let l=parseLevel(data);data.par=railCount(l,solution);data.budget=data.par+(b.slack||0);l=parseLevel(data);
 const validation=validateRoutes(l,solution),run=simulate(l,solution);
 if(!validation.ok||run.type!=='success')throw new Error(`Invalid proof ${b.id}: ${JSON.stringify({validation,run})}`);
 // Small teaching boards are exhaustively solved, also checking intended alternatives.
 let stats=null;if(b.id<=5){stats=solveLevel(l);data.par=stats.rails;data.solution=stats.routes;}
 compiled.push(data);console.log(`${b.id} ${b.name}: ${data.par}/${data.budget} rails; arrivals ${Object.values(arrivalTimes(l,data.solution)).join(',')}${stats?`; ${stats.solutions} valid solutions`:''}`);
}
await writeFile(new URL('../dist/js/levels.js',import.meta.url),`// Compiled, authored maps. Run node scripts/compile-levels.mjs to rebuild.\nexport const levels=${JSON.stringify(compiled,null,1)};\n`);
