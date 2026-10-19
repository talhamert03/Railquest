/** Deterministic rail puzzle rules. No rendering, clocks or stored solutions decide a win. */
export const key=(x,y)=>`${x},${y}`;
export const xy=k=>k.split(',').map(Number);
export const DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1]];
export const manhattan=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
export const direction=(a,b)=>DIRECTIONS.findIndex(([x,y])=>b[0]-a[0]===x&&b[1]-a[1]===y);
export const step=(k,d)=>{const [x,y]=xy(k),[dx,dy]=DIRECTIONS[d];return key(x+dx,y+dy);};
export const walkable=c=>!!c&&!['#','~',' '].includes(c.type);
export const costsRail=c=>!!c&&['.','w','z','q','>','v','<','^','p','l'].includes(c.type);
export const fragileBridge=c=>c?.type==='X'||c?.type==='Y';
export const waitBeats=c=>c?.type==='w'?1:c?.type==='z'?2:0;
export const ONE_WAY={'>':0,'v':1,'<':2,'^':3};
export const signalGreen=(level,k,beat)=>{const s=level.signals?.[k];return !s||((beat+s.phase)%s.period+s.period)%s.period<s.green;};
export function routeDuration(level,path){
 let beat=0;
 for(let i=0;i<path.length-1;i++){
  beat+=waitBeats(level.cells.get(path[i]));
  while(!signalGreen(level,path[i],beat))beat++;
  beat++;
 }
 return beat;
}

export function parseLevel(data){
 if(!data.map?.length||new Set(data.map.map(r=>r.length)).size!==1)throw new Error('Map rows must be rectangular');
 const cells=new Map(),portals=new Map(),wagons=[];let goal;
 data.map.forEach((row,y)=>[...row].forEach((type,x)=>{
  if(!' .#~GVH123456abcwzq>v<^plXY'.includes(type))throw new Error(`Unknown terrain ${type}`);
  const k=key(x,y);cells.set(k,{key:k,x,y,type});
  if(type==='G'){if(goal)throw new Error('Multiple engines');goal=k;}
  if(/[1-6]/.test(type))wagons.push({id:Number(type),key:k,dir:data.directions?.[type]??0});
  if(/[abc]/.test(type)){if(!portals.has(type))portals.set(type,[]);portals.get(type).push(k);}
 }));
 wagons.sort((a,b)=>a.id-b.id);
 if(!goal||!wagons.length||wagons.some((w,i)=>w.id!==i+1))throw new Error(`Invalid endpoints ${data.id}`);
 for(const [label,pair] of portals)if(pair.length!==2)throw new Error(`Tunnel ${label} needs two mouths`);
 const level={...data,cells,portals,wagons,goal,start:wagons[0].key,width:data.map[0].length,height:data.map.length,goalDir:data.goalDir??0};
 for(const k of [...portals.values()].flat())if(!Number.isInteger(data.mouths?.[k])||data.mouths[k]<0||data.mouths[k]>3)throw new Error(`Tunnel direction missing ${k}`);
 for(const [k,s] of Object.entries(data.signals||{}))if(cells.get(k)?.type!=='q'||!s||!Number.isInteger(s.period)||s.period<2||s.period>8||!Number.isInteger(s.green)||s.green<1||s.green>=s.period||!Number.isInteger(s.phase)||s.phase<0||s.phase>=s.period)throw new Error(`Invalid signal ${k}`);
 for(const c of cells.values())if(c.type==='q'&&!data.signals?.[c.key])throw new Error(`Signal timing missing ${c.key}`);
 const gateLinks=new Map(),plateLinks=new Map(),ids=new Set();
 if(data.locks!==undefined&&!Array.isArray(data.locks))throw new Error('Locks must be an array');
 for(const lock of data.locks||[]){
  if(!lock||!Number.isInteger(lock.id)||lock.id<1||lock.id>3||ids.has(lock.id)||cells.get(lock.plate)?.type!=='p'||plateLinks.has(lock.plate)||!Array.isArray(lock.gates)||!lock.gates.length)throw new Error('Invalid key plate');
  ids.add(lock.id);plateLinks.set(lock.plate,lock.id);
  for(const k of lock.gates){if(cells.get(k)?.type!=='l'||gateLinks.has(k))throw new Error(`Invalid linked barrier ${k}`);gateLinks.set(k,lock.id);}
 }
 for(const c of cells.values())if(c.type==='p'&&!plateLinks.has(c.key)||c.type==='l'&&!gateLinks.has(c.key))throw new Error(`Missing lock link ${c.key}`);
 level.gateLinks=gateLinks;level.plateLinks=plateLinks;
 return level;
}
export const blankRoutes=level=>Object.fromEntries(level.wagons.map(w=>[w.id,[w.key]]));
export const cloneRoutes=routes=>Object.fromEntries(Object.entries(routes).map(([id,path])=>[id,[...path]]));
export const portalMate=(level,k)=>{const type=level.cells.get(k)?.type;return level.portals.get(type)?.find(p=>p!==k)??null;};
export const railCount=(level,routes)=>new Set(Object.values(routes).flat().filter(k=>costsRail(level.cells.get(k)))).size;
export function connectionAllowed(level,a,b){
 if(!walkable(level.cells.get(a))||!walkable(level.cells.get(b)))return false;
 const dir=direction(xy(a),xy(b));if(dir<0)return false;
 for(const k of [a,b]){
  const type=level.cells.get(k).type;
  if(['H','X'].includes(type)&&dir%2!==0||['V','Y'].includes(type)&&dir%2!==1)return false;
  if(ONE_WAY[type]!==undefined&&dir!==ONE_WAY[type])return false;
 }
 const from=level.wagons.find(w=>w.key===a);
 if(from&&dir!==from.dir)return false;
 if(level.wagons.some(w=>w.key===b)||a===level.goal)return false;
 if(b===level.goal&&dir!==level.goalDir)return false;
 if(portalMate(level,a)&&dir!==level.mouths[a])return false;
 if(portalMate(level,b)&&dir!==(level.mouths[b]+2)%4)return false;
 return true;
}

/** A rail tile has one downstream exit and at most two incoming branches. */
export function validateRoutes(level,routes,{complete=true,budget=level.budget??Infinity}={}){
 if(!routes||typeof routes!=='object'||Array.isArray(routes))return {ok:false,reason:'invalid-route'};
 if(Object.keys(routes).some(id=>!level.wagons.some(w=>String(w.id)===id)))return {ok:false,reason:'invalid-route'};
 const exits=new Map(),links=new Map();
 for(const wagon of level.wagons){
  const path=routes[wagon.id];
  if(!Array.isArray(path)||path[0]!==wagon.key)return {ok:false,reason:'invalid-start',wagon:wagon.id};
  const seen=new Set();
  for(let i=0;i<path.length;i++){
   const k=path[i];if(!walkable(level.cells.get(k))||seen.has(k))return {ok:false,reason:'loop',wagon:wagon.id,key:k};seen.add(k);
   const next=path[i+1],previous=path[i-1],mate=portalMate(level,k);
   if(mate&&previous!==mate&&next!==mate)return {ok:false,reason:'tunnel',wagon:wagon.id,key:k};
   if(next){
    const teleport=mate===next;
    if(!teleport&&!connectionAllowed(level,k,next))return {ok:false,reason:'direction',wagon:wagon.id,key:k};
    if(exits.has(k)&&exits.get(k)!==next)return {ok:false,reason:'junction',wagon:wagon.id,key:k};
    exits.set(k,next);
    if(!teleport){for(const [a,b] of [[k,next],[next,k]]){if(!links.has(a))links.set(a,new Set());links.get(a).add(b);}}
   }
  }
  if(complete&&path.at(-1)!==level.goal)return {ok:false,reason:'unfinished',wagon:wagon.id,key:path.at(-1)};
 }
 for(const [k,edges] of links)if(edges.size>3)return {ok:false,reason:'crossing',key:k};
 const rails=railCount(level,routes);
 if(rails>budget)return {ok:false,reason:'budget',rails};
 return {ok:true,rails,exits};
}

/** Paint a wagon's route. Joining a built line copies its downstream track. */
export function extendRoute(level,routes,id,target,{budget=level.budget??Infinity,autoJoin=true}={}){
 const old=routes[id];if(!old)return {ok:false,reason:'invalid-start',routes};
 const result=cloneRoutes(routes),existing=old.indexOf(target);
 if(existing>=0){let n=existing+1;if(portalMate(level,target)===old[n])n++;result[id]=old.slice(0,n);return {ok:true,routes:result,trimmed:true};}
 if(!connectionAllowed(level,old.at(-1),target))return {ok:false,reason:'direction',routes};
 const path=[...old,target],mate=portalMate(level,target);
 if(mate){if(path.includes(mate))return {ok:false,reason:'loop',routes};path.push(mate);}
 let joined=false;
 if(autoJoin){
  for(const [other,route] of Object.entries(routes)){
   if(Number(other)===Number(id))continue;
   const i=route.indexOf(path.at(-1));
   if(i>=0&&i<route.length-1){path.push(...route.slice(i+1));joined=true;break;}
  }
 }
 result[id]=path;
 const valid=validateRoutes(level,result,{complete:false,budget});
 return valid.ok?{ok:true,routes:result,teleported:!!mate,joined}:{...valid,routes};
}
export function undoRoute(level,routes,id){
 const next=cloneRoutes(routes),path=next[id];if(path.length<2)return next;
 const n=portalMate(level,path.at(-2))===path.at(-1)?2:1;next[id]=path.slice(0,-n);return next;
}
export function restoreRoutes(level,value){
 const valid=validateRoutes(level,value,{complete:false});
 return valid.ok?cloneRoutes(value):blankRoutes(level);
}
export const rating=(level,routes)=>railCount(level,routes)<=level.par?3:railCount(level,routes)<=level.par+2?2:1;

/** All wagons advance together, one edge per beat. Merging needs a free beat. */
export class Journey{
 constructor(level,routes,speed=1.65){
  this.level=level;this.routes=cloneRoutes(routes);this.speed=speed;this.t=0;this.beat=0;this.done=false;this.arrived=[];this.result=null;
  this.cars=level.wagons.map(w=>({...w,index:0,arrived:false,wait:0}));
  this.openLocks=new Set();this.brokenBridges=new Set();this.arrivalBeats={};
  this.validation=validateRoutes(level,routes,{complete:false});
 }
 fail(reason,detail={}){this.done=true;this.result={type:'failure',reason,...detail};return this.result;}
 gateClosed(k){const id=this.level.gateLinks?.get(k);return id!==undefined&&!this.openLocks.has(id);}
 advance(){
  const events=[];
  if(this.done)return events;
  if(!this.validation.ok)return [this.fail(this.validation.reason,this.validation)];
  const moves=this.cars.filter(c=>!c.arrived).map(car=>{
   const path=this.routes[car.id],from=path[car.index],next=path[car.index+1],gateWait=this.gateClosed(next),waiting=car.wait>0||!signalGreen(this.level,from,this.beat)||gateWait;
   return {car,from,to:path[car.index+(waiting?0:1)],next,waiting,gateWait};
  });
  const unfinished=moves.find(m=>!m.to);
  if(unfinished)return [this.fail('unfinished',{wagon:unfinished.car.id,key:unfinished.from})];
  if(moves.length&&moves.every(m=>m.gateWait))return [this.fail('locked',{key:moves[0].next,lock:this.level.gateLinks.get(moves[0].next)})];
  const collapsing=new Set(moves.filter(m=>!m.waiting&&fragileBridge(this.level.cells.get(m.from))).map(m=>m.from));
  const broken=moves.find(m=>!m.waiting&&(this.brokenBridges.has(m.to)||collapsing.has(m.to)));
  if(broken)return [this.fail('fragile',{wagon:broken.car.id,key:broken.to})];
  for(let i=0;i<moves.length;i++)for(let j=i+1;j<moves.length;j++){
   const a=moves[i],b=moves[j];
   if(a.to===b.to||a.from===b.to&&a.to===b.from)return [this.fail('collision',{wagons:[a.car.id,b.car.id],key:a.to})];
  }
  for(const m of moves){
   if(m.waiting){if(m.car.wait>0)m.car.wait--;continue;}
   m.car.index++;
   if(m.to===this.level.goal){
    const expected=this.arrived.length+1;
    if(m.car.id!==expected)return [this.fail('order',{wagon:m.car.id,expected,key:m.to})];
    m.car.arrived=true;this.arrived.push(m.car.id);this.arrivalBeats[m.car.id]=this.beat+1;events.push({type:'coupled',wagon:m.car.id,key:m.to,beat:this.beat+1});
   }else if(portalMate(this.level,m.from)===m.to)events.push({type:'tunnel',wagon:m.car.id,key:m.to});
   m.car.wait=waitBeats(this.level.cells.get(m.to));
   if(m.car.wait)events.push({type:'wait',wagon:m.car.id,key:m.to,beats:m.car.wait});
  }
  // Plates are pressed on arrival: linked barriers open for the following beat.
  for(const m of moves)if(!m.waiting){
   const id=this.level.plateLinks?.get(m.to);
   // A key belongs to its barrier group. Any wagon can collect it.
   if(id!==undefined&&!this.openLocks.has(id)){this.openLocks.add(id);events.push({type:'unlock',lock:id,wagon:m.car.id,key:m.to,beat:this.beat+1});}
  }
  for(const k of collapsing){this.brokenBridges.add(k);events.push({type:'collapse',key:k,beat:this.beat+1});}
  this.beat++;
  if(this.arrived.length===this.cars.length){this.done=true;this.result={type:'success',rails:railCount(this.level,this.routes),beats:this.beat};events.push(this.result);}
  return events;
 }
 update(dt){
  if(this.done||!Number.isFinite(dt)||dt<=0)return [];
  this.t+=Math.min(dt,.25)*this.speed;const events=[];
  while(this.t>=1&&!this.done){this.t-=1;events.push(...this.advance());}
  if(this.done)this.t=0;
  return events;
 }
 position(car){
  const path=this.routes[car.id],a=xy(path[car.index]),b=xy(path[car.index+1]||path[car.index]);
  let dir=direction(a,b);if(dir<0)dir=car.index?direction(xy(path[car.index-1]),a):car.dir;
  if(dir<0)dir=this.level.mouths[path[car.index]]??car.dir;
  const signalWait=!signalGreen(this.level,path[car.index],this.beat);
  const gateWait=this.gateClosed(path[car.index+1]);
  if(this.done||car.wait>0||signalWait||gateWait)return {x:a[0],y:a[1],dir,alpha:1,wait:car.wait,signalWait,gateWait};
  const t=this.t;
  if(portalMate(this.level,path[car.index])===path[car.index+1]){
   const outgoing=t>=.5,p=outgoing?b:a;
   return {x:p[0],y:p[1],dir:outgoing?this.level.mouths[path[car.index+1]]:(this.level.mouths[path[car.index]]+2)%4,alpha:Math.abs(t-.5)*2,teleport:true};
  }
  let x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
  // Match the renderer's rounded rail centerline at the same 0.18-cell radius.
  const previous=path[car.index-1]&&xy(path[car.index-1]),next=path[car.index+2]&&xy(path[car.index+2]);
  let q,center,r,u;
  if(previous&&t<.18&&manhattan(previous,a)===1){
   center=a;q=[a[0]+(previous[0]-a[0])*.18,a[1]+(previous[1]-a[1])*.18];r=[a[0]+(b[0]-a[0])*.18,a[1]+(b[1]-a[1])*.18];u=(t+.18)/.36;
  }else if(next&&t>.82&&manhattan(b,next)===1){
   center=b;q=[b[0]+(a[0]-b[0])*.18,b[1]+(a[1]-b[1])*.18];r=[b[0]+(next[0]-b[0])*.18,b[1]+(next[1]-b[1])*.18];u=(t-.82)/.36;
  }
  if(center){
   x=(1-u)**2*q[0]+2*(1-u)*u*center[0]+u*u*r[0];y=(1-u)**2*q[1]+2*(1-u)*u*center[1]+u*u*r[1];
   const dx=(1-u)*(center[0]-q[0])+u*(r[0]-center[0]),dy=(1-u)*(center[1]-q[1])+u*(r[1]-center[1]);
   dir=Math.abs(dx)>=Math.abs(dy)?(dx>=0?0:2):(dy>=0?1:3);
  }
  return {x,y,dir,alpha:1};
 }
}
export function simulate(level,routes){
 const j=new Journey(level,routes);
 for(let n=0;n<level.cells.size*12+12&&!j.done;n++)j.advance();
 return j.result||{type:'failure',reason:'loop'};
}
/** Gates make arrivals depend on the entire convoy, not one path's length. */
export function arrivalTimes(level,routes){
 const j=new Journey(level,routes);
 for(let n=0;n<level.cells.size*12+12&&!j.done;n++)j.advance();
 return j.result?.type==='success'?{...j.arrivalBeats}:null;
}

/** Enumerates genuine routes, including unprovided alternative solutions. Tooling only. */
export function enumerateRoutes(level,wagon,{maxNodes=200000,maxCost=level.budget??Infinity}={}){
 const found=[];let nodes=0;
 function visit(path,cost){
  if(++nodes>maxNodes)throw new Error(`Path search limit in level ${level.id}`);
  if(path.at(-1)===level.goal){found.push(path);return;}
  for(let d=0;d<4;d++){
   const next=step(path.at(-1),d);
   if(path.includes(next)||!connectionAllowed(level,path.at(-1),next))continue;
   const added=[next],mate=portalMate(level,next);
   if(mate){if(path.includes(mate))continue;added.push(mate);}
   const c=cost+(costsRail(level.cells.get(next))?1:0);if(c<=maxCost)visit([...path,...added],c);
  }
 }
 visit([wagon.key],0);return found;
}
export function solveLevel(level,{maxCombinations=2000000,limit=Infinity}={}){
 const options=level.wagons.map(w=>enumerateRoutes(level,w));let nodes=0,best=null,bestCost=Infinity,solutions=0;
 function combine(i,routes,lastLength){
  if(++nodes>maxCombinations)throw new Error(`Combination search limit in level ${level.id}`);
  if(solutions>=limit)return;
  if(i===options.length){
   if(validateRoutes(level,routes).ok&&simulate(level,routes).type==='success'){
    solutions++;const cost=railCount(level,routes);if(cost<bestCost){bestCost=cost;best=cloneRoutes(routes);}
   }return;
  }
  for(const path of options[i]){
   const duration=routeDuration(level,path);if(!level.locks?.length&&duration<=lastLength)continue;
   const next={...routes,[level.wagons[i].id]:path};
   if(railCount(level,next)>level.budget)continue;
   combine(i+1,next,duration);
  }
 }
 combine(0,{},0);return {routes:best,rails:bestCost,nodes,solutions,options:options.map(p=>p.length)};
}
