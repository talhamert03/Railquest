import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareResources,RESOURCE_COUNT,IMAGE_SOURCES} from '../dist/js/resources.js';
import {createWeather,paintWeather} from '../dist/js/weather.js';
test('preparation reports completed jobs and decodes at most three images concurrently',async()=>{
 let active=0,peak=0,decoded=0,fontReady=false;const progress=[];
 const art=await prepareResources(p=>{progress.push(p);assert.ok(p.completed<=decoded+(fontReady?1:0));},{imageLoader:async src=>{active++;peak=Math.max(peak,active);await Promise.resolve();active--;decoded++;return {src};},fontLoader:async()=>{fontReady=true;}});
 assert.equal(peak,3);assert.equal(progress[0].completed,0);assert.equal(progress.at(-1).completed,RESOURCE_COUNT);assert.deepEqual(Object.keys(art).sort(),Object.keys(IMAGE_SOURCES).sort());
});
test('a missing required image rejects loading and never reports complete; retry can succeed',async()=>{
 const progress=[];
 await assert.rejects(prepareResources(p=>progress.push(p),{imageLoader:async src=>{if(src.includes('props-v2'))throw new Error('offline');return {};},fontLoader:async()=>{}}),/offline/);
 assert.ok(progress.every(p=>p.completed<p.total));
 const art=await prepareResources(()=>{},{imageLoader:async()=>({}),fontLoader:async()=>{}});assert.equal(Object.keys(art).length,7);
});
test('a null decoder result cannot produce a successful game boot',async()=>{
 await assert.rejects(prepareResources(()=>{},{imageLoader:async()=>null,fontLoader:async()=>{}}));
});
test('weather is deterministic, capped, and emits no drawing when disabled or reduced',()=>{
 for(const kind of ['snow','dust','frost','glow']){
  const p=createWeather(4000,4000,kind,52);assert.ok(p.length<=36);assert.deepEqual(p,createWeather(4000,4000,kind,52));
  const blocked=new Proxy({},{get(){throw new Error('drawing must not occur');}});
  paintWeather(blocked,p,{width:100,height:100,kind,time:10,enabled:false});paintWeather(blocked,p,{width:100,height:100,kind,time:10,reducedMotion:true});
 }
 assert.equal(createWeather(100,100,undefined).length,0);
});
