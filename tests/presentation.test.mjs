import test from 'node:test';
import assert from 'node:assert/strict';
import {revealDialog,dismissDialog} from '../dist/js/dialogs.js';
import {vehiclePose,easeConvoy} from '../dist/js/vehicle-motion.js';
import {Soundscape} from '../dist/js/audio.js';
const panel=()=>({attributes:new Map(),classes:new Set(),removed:false,setAttribute(k,v){this.attributes.set(k,v);},removeAttribute(k){this.attributes.delete(k);},remove(){this.removed=true;},get classList(){return {add:k=>this.classes.add(k)};}});
test('settings content remains accessible when native modal opening is absent or throws',()=>{
 for(const throws of [false,true]){
  const el=panel();if(throws){el.showModal=()=>{throw new Error('Unsupported modal context');};el.close=()=>{throw new Error('Unsupported close');};}
  assert.equal(revealDialog(el),'fallback');assert.ok(el.attributes.has('open'));assert.equal(el.attributes.get('aria-modal'),'true');assert.equal(el.attributes.get('role'),'dialog');
  dismissDialog(el);assert.ok(el.removed);assert.equal(el.attributes.has('open'),false);
 }
 const native=panel();native.showModal=()=>native.visible=true;native.close=()=>native.visible=false;
 assert.equal(revealDialog(native),'native');assert.ok(native.visible);dismissDialog(native);assert.equal(native.visible,false);assert.ok(native.removed);
});
test('convoy motion stays bounded and has the same settling at 30/60/120 Hz',()=>{
 const results=[];
 for(const hz of [30,60,120]){let n=0;for(let i=0;i<hz;i++){n=easeConvoy(n,6,1/hz);assert.ok(n>=0&&n<=6);}results.push(n);}
 assert.ok(Math.max(...results)-Math.min(...results)<.001);assert.equal(easeConvoy(2,6,0),2);assert.equal(easeConvoy(0,6,.01,true),6);
 for(let t=0;t<40;t+=.05){const p=vehiclePose({time:t,distance:t,moving:true});assert.ok(p.lift<.04&&p.lift>=0);assert.ok(Math.abs(p.tilt)<.025);assert.ok(p.scaleY>.98&&p.scaleY<1.02);}
 assert.deepEqual(vehiclePose({moving:true,selected:true,engine:true,time:42,reducedMotion:true}),{lift:0,tilt:0,scaleY:1});
});
test('music and effects mute existing voices independently; unrelated preferences do not restart music',()=>{
 const calls={music:[],effects:[]},bus=id=>({gain:{cancelScheduledValues(){},setTargetAtTime(value){calls[id].push(value);}}});
 const score=new Soundscape({music:true,sound:true});score.ctx={state:'suspended',currentTime:4};score.musicBus=bus('music');score.effectsBus=bus('effects');
 score.timer=42;score.update({music:true,sound:false,weather:false});assert.equal(score.timer,42);assert.deepEqual(calls,{music:[1],effects:[0]});
 score.update({music:false,sound:true});assert.equal(score.timer,null);assert.deepEqual(calls,{music:[1,0],effects:[0,1]});
});
test('every level and region has an English name for non-Turkish devices',async()=>{
 const {levels}=await import('../dist/js/levels.js');const {worlds}=await import('../dist/js/level-blueprints.js');const {localizeContent,LANG}=await import('../dist/js/i18n.js');
 const ls=levels.map(l=>({...l})),ws=worlds.map(w=>({...w}));localizeContent(ls,ws);
 if(LANG==='tr')return;
 for(const l of ls)assert.doesNotMatch(l.name,/[çğıöşüÇĞİÖŞÜ]/,`level ${l.id}`);
 for(const w of ws){assert.doesNotMatch(w.name,/[çğıöşüÇĞİÖŞÜ]/);assert.doesNotMatch(w.subtitle,/[çğıöşüÇĞİÖŞÜ]/);}
 assert.equal(new Set(ls.map(l=>l.name)).size,ls.length);
});
