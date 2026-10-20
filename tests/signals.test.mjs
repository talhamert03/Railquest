import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLevel,Journey,simulate,routeDuration,connectionAllowed,railCount} from '../dist/js/engine.js';
import {normalizeSave,defaults} from '../dist/js/storage.js';
import {levels} from '../dist/js/levels.js';
const data={id:99,world:3,name:'Signal',map:['1q.G'],signals:{'1,0':{period:4,green:1,phase:0}},budget:2,mouths:{}};
test('a red signal holds a wagon on the tile until its exact green beat',()=>{
 const l=parseLevel(data),routes={1:['0,0','1,0','2,0','3,0']},j=new Journey(l,routes);
 j.advance();assert.equal(j.beat,1);assert.equal(j.cars[0].index,1);
 j.t=.5;assert.equal(j.position(j.cars[0]).x,1);assert.equal(j.position(j.cars[0]).signalWait,true);
 j.advance();j.advance();j.advance();assert.equal(j.beat,4);assert.equal(j.cars[0].index,1);
 assert.equal(j.position(j.cars[0]).signalWait,undefined);j.advance();assert.equal(j.cars[0].index,2);j.advance();
 assert.equal(j.result.type,'success');assert.equal(j.beat,6);assert.equal(routeDuration(l,routes[1]),6);assert.equal(railCount(l,routes),2);
});
test('a following wagon can collide with one held by a red signal',()=>{
 const l=parseLevel({id:99,world:3,name:'Queue',map:['2...#','1q..G'],budget:12,mouths:{},signals:{'1,1':{period:4,green:1,phase:0}}});
 const routes={1:['0,1','1,1','2,1','3,1','4,1'],2:['0,0','1,0','1,1','2,1','3,1','4,1']};
 assert.equal(simulate(l,routes).reason,'collision');
});
test('one-way gates enforce direction on both entry and exit and still cost a rail',()=>{
 const l=parseLevel({id:99,world:3,map:['...G','1>..','....'],budget:8,mouths:{}});
 assert.equal(connectionAllowed(l,'0,1','1,1'),true);assert.equal(connectionAllowed(l,'1,1','2,1'),true);
 assert.equal(connectionAllowed(l,'2,1','1,1'),false);assert.equal(connectionAllowed(l,'1,1','1,0'),false);assert.equal(connectionAllowed(l,'1,2','1,1'),false);
 assert.equal(railCount(l,{1:['0,1','1,1']}),1);
});
test('signals reject zero-length green, invalid phases, missing timing and off-map definitions',()=>{
 for(const settings of [{period:1,green:1,phase:0},{period:4,green:0,phase:0},{period:4,green:4,phase:0},{period:9,green:1,phase:0},{period:4,green:1,phase:-1},{period:4,green:1,phase:4}])assert.throws(()=>parseLevel({...data,signals:{'1,0':settings}}));
 assert.throws(()=>parseLevel({...data,signals:{}}));assert.throws(()=>parseLevel({...data,signals:{...data.signals,'8,8':data.signals['1,0']}}));
});
test('six-wagon drafts, last chapter, weather preference and the ad counter survive reload',()=>{
 const saved=defaults();saved.drafts[52]=levels[51].solution;saved.lastLevel=52;saved.settings.weather=false;saved.economy.roundsTowardAd=3;
 const restored=normalizeSave(JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(restored.drafts[52],levels[51].solution);assert.equal(restored.lastLevel,52);assert.equal(restored.settings.weather,false);assert.equal(restored.economy.roundsTowardAd,3);
 assert.equal(normalizeSave({version:2,settings:{sound:false}}).settings.weather,true);
});
