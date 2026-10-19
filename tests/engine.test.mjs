import test from 'node:test';
import assert from 'node:assert/strict';
import {levels} from '../dist/js/levels.js';
import {parseLevel,blankRoutes,cloneRoutes,extendRoute,undoRoute,railCount,validateRoutes,portalMate,simulate,Journey,solveLevel,restoreRoutes,routeDuration,arrivalTimes} from '../dist/js/engine.js';
import {loadSave,writeSave,normalizeSave,defaults,recordWin} from '../dist/js/storage.js';
for(const data of levels){
 test(`level ${data.id}: build the authored solution with player actions; all wagons arrive in order`,()=>{
  const l=parseLevel(data);let routes=blankRoutes(l);
  for(const wagon of l.wagons)for(const target of l.solution[wagon.id].slice(1)){
   if(routes[wagon.id].includes(target))continue;
   const edit=extendRoute(l,routes,wagon.id,target);assert.equal(edit.ok,true,`wagon ${wagon.id}, ${target}: ${edit.reason}`);routes=edit.routes;
  }
  assert.equal(validateRoutes(l,routes).ok,true);
  assert.ok(railCount(l,routes)<=l.budget);
  const j=new Journey(l,routes);const arrivals=[];
  for(let i=0;i<3000&&!j.done;i++)for(const e of j.update(.017))if(e.type==='coupled')arrivals.push(e.wagon);
  assert.equal(j.result?.type,'success');assert.deepEqual(arrivals,l.wagons.map(w=>w.id));
  assert.deepEqual(restoreRoutes(l,JSON.parse(JSON.stringify(routes))),routes);
 });
}
test('shared trunk spends each physical rail once and refunds only unused pieces',()=>{
 const l=parseLevel(levels[4]),r=cloneRoutes(l.solution);
 const summed=Object.values(r).reduce((n,path)=>n+path.filter(k=>l.cells.get(k).type==='.').length,0);
 assert.ok(railCount(l,r)<summed);
 const before=railCount(l,r),edited=undoRoute(l,r,1);
 assert.equal(railCount(l,edited),before,'removing one route cannot refund a rail the other wagon needs');
});
test('budget is enforced during input and for tampered saved routes',()=>{
 const l=parseLevel({...levels[0],budget:2});let r=blankRoutes(l);
 for(const k of ['1,1','2,1'])r=extendRoute(l,r,1,k).routes;
 assert.equal(extendRoute(l,r,1,'3,1').reason,'budget');
 assert.equal(validateRoutes(l,l.solution).reason,'budget');assert.deepEqual(restoreRoutes(l,l.solution),blankRoutes(l));
});
test('tunnel entry/exit is atomic; orientation is enforced; undo cannot strand a wagon underground',()=>{
 const l=parseLevel(levels[8]);let r=blankRoutes(l);
 r=extendRoute(l,r,1,'1,3').routes;
 const edit=extendRoute(l,r,1,'0,3');assert.ok(edit.teleported);assert.equal(edit.routes[1].at(-1),'4,1');
 assert.equal(extendRoute(l,edit.routes,1,'4,2').ok,false);
 assert.deepEqual(undoRoute(l,edit.routes,1),r);
 const corrupted=cloneRoutes(edit.routes);corrupted[1].pop();assert.equal(validateRoutes(l,corrupted,{complete:false}).reason,'tunnel');
 assert.equal(portalMate(l,'0,3'),'4,1');
});
test('A and B tunnel pairs cannot be interchanged',()=>{
 const l=parseLevel(levels[11]),r=cloneRoutes(l.solution),a=r[1].indexOf('4,1');r[1][a]='3,4';
 assert.equal(validateRoutes(l,r).ok,false);assert.equal(portalMate(l,'0,0'),'4,1');assert.equal(portalMate(l,'0,5'),'3,4');
});
test('bridges cannot be turned into corners',()=>{
 const l=parseLevel(levels[12]);let r=blankRoutes(l);
 for(const k of ['1,2','2,2','3,2'])r=extendRoute(l,r,1,k).routes;
 assert.equal(extendRoute(l,r,1,'3,3').ok,false);
 assert.equal(extendRoute(l,r,1,'4,2').ok,true);
});
const timingLevel=()=>parseLevel({id:99,world:0,name:'Timing',map:['2.....#','......#','1.....G','.......'],budget:30,directions:{1:0,2:0},mouths:{}});
test('wrong arrival order fails even when both routes reach the engine',()=>{
 const l=timingLevel(),r={1:['0,2','1,2','1,3','2,3','3,3','4,3','5,3','5,2','6,2'],2:['0,0','1,0','2,0','3,0','4,0','5,0','5,1','5,2','6,2']};
 // Detour 1 further: 10 beats, wagon 2 takes 8.
 r[1]=['0,2','1,2','1,1','2,1','2,2','2,3','3,3','4,3','5,3','5,2','6,2'];
 assert.ok(validateRoutes(l,r).ok);const result=simulate(l,r);assert.equal(result.reason,'order');assert.equal(result.expected,1);assert.equal(result.wagon,2);
});
test('simultaneous merging crashes; sequential use of the same rail succeeds',()=>{
 const l=timingLevel();
 const collision={1:['0,2','1,2','1,3','2,3','3,3','4,3','5,3','5,2','6,2'],2:['0,0','1,0','2,0','3,0','4,0','5,0','5,1','5,2','6,2']};
 assert.ok(validateRoutes(l,collision).ok);assert.equal(simulate(l,collision).reason,'collision');
 const success={...collision,1:['0,2','1,2','2,2','3,2','4,2','5,2','6,2']};assert.equal(simulate(l,success).type,'success');
});
test('one physical junction cannot have conflicting downstream exits',()=>{
 const l=timingLevel(),r={1:['0,2','1,2','2,2','3,2','4,2','5,2','6,2'],2:['0,0','1,0','1,1','1,2','1,3']};
 assert.equal(validateRoutes(l,r,{complete:false}).reason,'junction');
});
test('a route with a gap, duplicate cell, fabricated wagon or missing start cannot be loaded',()=>{
 const l=parseLevel(levels[0]);
 for(const r of [{1:['0,1','3,1','4,1']},{1:['0,1','1,1','0,1']},{1:['0,1'],8:['2,1']},{1:['1,1']},null])assert.deepEqual(restoreRoutes(l,r),blankRoutes(l));
});
test('two distinct unprovided solutions genuinely pass on the same map',()=>{
 const l=parseLevel(levels[3]),solved=solveLevel(l);assert.equal(solved.solutions,2);
 const lower={1:['0,2','1,2','1,1','2,1','3,1','4,1','5,1','5,2','6,2']};
 assert.notDeepEqual(lower,l.solution);assert.equal(simulate(l,lower).type,'success');assert.equal(railCount(l,lower),7);
});
test('simulation is independent of 30/60/120 Hz and terminates once',()=>{
 const l=parseLevel(levels[23]),runs=[];
 for(const hz of [30,60,120]){
  const j=new Journey(l,l.solution),events=[];
  for(let i=0;i<30*hz&&!j.done;i++)events.push(...j.update(1/hz));
  assert.equal(j.result.type,'success');assert.deepEqual(j.update(99),[]);runs.push(events);
 }
 assert.deepEqual(runs[0],runs[1]);assert.deepEqual(runs[1],runs[2]);
});
test('v1 progress remains untouched; preferences migrate to the new campaign',()=>{
 const data=new Map([['rota-adalari.save.v1',JSON.stringify({version:1,completed:{1:{stars:3,rails:3}},settings:{sound:false},drafts:{1:['0,1']}})]]),store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const previous=data.get('rota-adalari.save.v1'),save=loadSave(store);assert.equal(save.version,2);assert.equal(save.settings.sound,false);assert.deepEqual(save.completed,{});
 recordWin(save,1,3,3);assert.ok(writeSave(save,store));assert.equal(data.get('rota-adalari.save.v1'),previous);assert.equal(loadSave(store).completed[1].stars,3);
});
test('malformed save and unavailable storage recover without a runtime error',()=>{
 assert.deepEqual(normalizeSave({version:2,drafts:{1:{1:['bad']}}}).drafts,{});
 const storage={getItem(){throw new Error('blocked');},setItem(){throw new Error('full');}};
 assert.deepEqual(loadSave(storage),defaults());assert.equal(writeSave(defaults(),storage),false);
});
test('a wagon holds its position for exactly the number of beats marked on a platform',()=>{
 const l=parseLevel({id:99,world:3,name:'Wait',map:['1w.zG'],budget:3,mouths:{}}),routes={1:['0,0','1,0','2,0','3,0','4,0']},j=new Journey(l,routes);
 assert.equal(railCount(l,routes),3);j.advance();assert.equal(j.cars[0].wait,1);assert.equal(j.position(j.cars[0]).x,1);
 j.advance();assert.equal(j.cars[0].index,1);j.advance();j.advance();assert.equal(j.cars[0].wait,2);
 j.advance();j.advance();assert.equal(j.cars[0].index,3);j.advance();assert.equal(j.result.type,'success');assert.equal(j.beat,7);assert.deepEqual(j.advance(),[]);
});
test('a stationary wagon on a shared platform can be hit by the following wagon',()=>{
 const l=parseLevel({id:99,world:3,name:'Bottleneck',map:['2...#','1w..G'],budget:12,mouths:{}});
 const routes={1:['0,1','1,1','2,1','3,1','4,1'],2:['0,0','1,0','1,1','2,1','3,1','4,1']};
 assert.ok(validateRoutes(l,routes).ok);assert.equal(simulate(l,routes).reason,'collision');
});
test('every expert guide reports real arrival times including waits and tunnels at 30/60/120 Hz',()=>{
 for(const data of levels.slice(24)){
  const l=parseLevel(data),expected=l.locks?Object.values(arrivalTimes(l,l.solution)):l.wagons.map(w=>routeDuration(l,l.solution[w.id]));
  for(const hz of [30,60,120]){const j=new Journey(l,l.solution),actual=[];
   for(let i=0;i<60*hz&&!j.done;i++)for(const e of j.update(1/hz))if(e.type==='coupled')actual.push(e.beat);
   assert.deepEqual(actual,expected,`level ${l.id} at ${hz} Hz`);
  }
 }
});
