import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalizeSave,homeDestination,recordWin,writeSave,loadSave} from '../dist/js/storage.js';
import {guardGameGestures} from '../dist/js/viewport.js';
test('first play opens chapter selection; returning players keep the exact last selected level',()=>{
 const fresh=defaults();assert.deepEqual(homeDestination(fresh),{screen:'map',level:1});
 fresh.hasStarted=true;fresh.lastLevel=17;fresh.drafts[17]={1:['3,2','4,2']};fresh.settings.sound=false;fresh.economy.roundsTowardAd=3;
 const stored=new Map(),storage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
 writeSave(fresh,storage);const again=loadSave(storage);assert.deepEqual(homeDestination(again),{screen:'game',level:17});assert.deepEqual(again.drafts,fresh.drafts);assert.equal(again.economy.roundsTowardAd,3);assert.equal(again.settings.sound,false);
 recordWin(again,17,3,13);assert.deepEqual(homeDestination(again),{screen:'game',level:18});
 recordWin(again,58,3,51);assert.equal(homeDestination(again).level,58);
});
test('existing v2 saves infer a started journey without erasing routes or completion',()=>{
 for(const old of [{lastLevel:4},{drafts:{1:{1:['0,1']}}},{completed:{1:{stars:2,rails:3}}}]){
  const saved=normalizeSave({version:2,...old});assert.equal(saved.hasStarted,true);
 }
 assert.equal(normalizeSave({version:2,lastLevel:1,completed:{},drafts:{}}).hasStarted,false);
 assert.equal(normalizeSave({version:2,hasStarted:'true'}).hasStarted,false);
});
test('pinch and page zoom are prevented without disabling single-finger scroll; rotating pauses once',()=>{
 const listeners=new Map(),hostListeners=new Map(),events=[],app={inert:false};
 const doc={documentElement:{dataset:{}},querySelector:()=>app,addEventListener:(n,f,o)=>listeners.set(n,{f,o}),removeEventListener:n=>listeners.delete(n)};
 const host={innerWidth:852,innerHeight:393,addEventListener:(n,f)=>hostListeners.set(n,f),removeEventListener:n=>hostListeners.delete(n),dispatchEvent:e=>events.push(e.type)};
 const stop=guardGameGestures(host,doc);assert.equal(app.inert,false);
 let blocked=0;const event={touches:[{}],preventDefault(){blocked++;},cancelable:true};
 listeners.get('touchmove').f(event);assert.equal(blocked,0);event.touches.push({});listeners.get('touchstart').f(event);listeners.get('touchmove').f(event);assert.equal(blocked,2);
 assert.equal(listeners.get('touchmove').o.passive,false);
 listeners.get('wheel').f({...event,ctrlKey:false});assert.equal(blocked,2);listeners.get('wheel').f({...event,ctrlKey:true});assert.equal(blocked,3);
 listeners.get('keydown').f({...event,ctrlKey:true,key:'+'});assert.equal(blocked,4);listeners.get('keydown').f({...event,key:'ArrowDown'});assert.equal(blocked,4);
 host.innerWidth=393;host.innerHeight=852;hostListeners.get('resize')();hostListeners.get('orientationchange')();assert.deepEqual(events,['rota-portrait']);assert.equal(app.inert,true);
 host.innerWidth=852;host.innerHeight=393;hostListeners.get('resize')();assert.equal(app.inert,false);assert.equal(doc.documentElement.dataset.orientation,'landscape');
 stop();assert.equal(listeners.size,0);assert.equal(hostListeners.size,0);
});
