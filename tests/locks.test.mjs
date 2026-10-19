import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLevel,Journey,simulate,arrivalTimes,connectionAllowed,railCount} from '../dist/js/engine.js';
const linked=()=>parseLevel({id:99,world:3,map:['2.pw....','........','1l.....G'],budget:30,mouths:{},locks:[{id:1,plate:'2,0',gates:['1,2']}]});
const routes={1:['0,2','1,2','2,2','3,2','4,2','5,2','6,2','7,2'],2:['0,0','1,0','2,0','3,0','4,0','5,0','6,0','6,1','6,2','7,2']};
for(let collector=1;collector<=6;collector++)for(let lock=1;lock<=3;lock++){
 test(`wagon ${collector} can collect key ${lock} without a matching number`,()=>{
  // Swap starting wagon numbers while preserving the same complete track network.
  // Inspect collection before any wagon reaches the engine, where arrival order applies.
  const ids=[collector,...[1,2,3,4,5,6].filter(id=>id!==collector)],map=ids.map((id,row)=>`${id}${row===0?'pl........':row===1?'.l........':'..........'}`);
  map.push('..........G');
  const l=parseLevel({id:99,world:3,map,budget:100,mouths:{},locks:[{id:lock,plate:'1,0',gates:['2,0','2,1']}]});
  // Put another linked gate on a different wagon's route.
  // The plate opens both gates for the next movement, regardless of the collector.
  const paths=Object.fromEntries(ids.map((id,y)=>[id,[...Array.from({length:10},(_,x)=>`${x},${y}`),...Array.from({length:6-y},(_,i)=>`9,${y+i+1}`),'10,6']]));
  const j=new Journey(l,paths);assert.equal(j.validation.ok,true);
  const events=j.advance();assert.equal(j.done,false);assert.deepEqual(events.filter(e=>e.type==='unlock'),[{type:'unlock',lock,wagon:collector,key:'1,0',beat:1}]);
  assert.equal(j.gateClosed('2,0'),false);assert.equal(j.gateClosed('2,1'),false);
  j.advance();assert.equal(j.done,false);assert.equal(j.cars.find(c=>c.id===collector).index,2);
  assert.equal(j.cars.find(c=>c.id===ids[1]).index,2);
 });
}
test('a later wagon opens the earlier wagon barrier for the next beat, permanently',()=>{
 const l=linked(),j=new Journey(l,routes);j.advance();j.t=.5;
 assert.equal(j.position(j.cars[0]).gateWait,true);assert.equal(j.position(j.cars[0]).x,0);
 const events=j.advance();assert.ok(events.some(e=>e.type==='unlock'&&e.lock===1&&e.beat===2));assert.equal(j.cars[0].index,0);
 assert.ok(j.openLocks.has(1));assert.ok(j.position(j.cars[0]).x>0);j.advance();assert.equal(j.cars[0].index,1);
 for(let i=0;i<20&&!j.done;i++)j.advance();
 assert.equal(j.result.type,'success');assert.deepEqual(j.arrivalBeats,{1:9,2:10});assert.deepEqual(arrivalTimes(l,routes),{1:9,2:10});assert.ok(j.openLocks.has(1));
 assert.equal(railCount(l,{1:['0,2','1,2'],2:['0,0','1,0','2,0']}),3);
 const retry=new Journey(l,routes);assert.equal(retry.openLocks.size,0);
});
test('all wagons behind unopened barriers stop with an actionable locked result',()=>{
 const l=parseLevel({id:99,world:3,map:['1l.pG'],budget:3,mouths:{},locks:[{id:1,plate:'3,0',gates:['1,0']}]});
 const r={1:['0,0','1,0','2,0','3,0','4,0']};assert.deepEqual(simulate(l,r),{type:'failure',reason:'locked',key:'1,0',lock:1});assert.equal(arrivalTimes(l,r),null);
});
test('a wagon waiting before a locked barrier can still be hit from behind',()=>{
 const l=parseLevel({id:99,world:3,map:['2..p.','1.l.G'],budget:20,mouths:{},locks:[{id:1,plate:'3,0',gates:['2,1']}]});
 const r={1:['0,1','1,1','2,1','3,1','4,1'],2:['0,0','1,0','1,1','2,1','3,1','4,1']};
 assert.equal(simulate(l,r).reason,'collision');
});
test('a fragile bridge is free, straight, collapses on exit and resets on retry',()=>{
 const l=parseLevel({id:99,world:5,map:['....','1X.G','....'],budget:2,mouths:{}}),r={1:['0,1','1,1','2,1','3,1']},j=new Journey(l,r);
 assert.equal(railCount(l,r),1);assert.equal(connectionAllowed(l,'1,1','1,0'),false);
 j.advance();assert.equal(j.brokenBridges.size,0);const events=j.advance();assert.ok(j.brokenBridges.has('1,1'));assert.ok(events.some(e=>e.type==='collapse'));
 j.advance();assert.equal(j.result.type,'success');assert.equal(new Journey(l,r).brokenBridges.size,0);
 const vertical=parseLevel({id:99,world:5,map:['1..','Y..','..G'],directions:{1:1},budget:9,mouths:{}});
 assert.equal(connectionAllowed(vertical,'0,0','0,1'),true);assert.equal(connectionAllowed(vertical,'0,1','1,1'),false);
});
test('a second wagon cannot enter on the exact beat the first leaves a fragile bridge',()=>{
 for(const top of ['2....#','2w...#']){
  const l=parseLevel({id:99,world:5,map:[top,'1.X..G'],budget:15,mouths:{}}),r={1:['0,1','1,1','2,1','3,1','4,1','5,1'],2:['0,0','1,0','1,1','2,1','3,1','4,1','5,1']};
  assert.equal(simulate(l,r).reason,'fragile');
 }
});
test('malformed or orphaned plate/barrier definitions are rejected at load time',()=>{
 const data={id:99,world:3,map:['1pl.G'],budget:3,mouths:{}};
 for(const locks of [undefined,{},[],[{id:1,plate:'1,0',gates:[]}],[{id:1,plate:'0,0',gates:['2,0']}],[{id:1,plate:'1,0',gates:['9,0']}],[{id:1,plate:'1,0',gates:['2,0','2,0']}],[{id:4,plate:'1,0',gates:['2,0']}]] )assert.throws(()=>parseLevel({...data,locks}));
 assert.doesNotThrow(()=>parseLevel({...data,locks:[{id:1,plate:'1,0',gates:['2,0']}]}));
});
