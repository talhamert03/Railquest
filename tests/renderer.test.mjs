import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {levels} from '../dist/js/levels.js';
import {parseLevel,Journey,blankRoutes,cloneRoutes,extendRoute,simulate} from '../dist/js/engine.js';
import {IslandRenderer,paintMiniBoard} from '../dist/js/renderer.js';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas`:'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
globalThis.window={devicePixelRatio:2};globalThis.document={createElement:()=>createCanvas(1,1),hidden:false,activeElement:null};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const art={props:await loadImage(new URL('../dist/assets/props-v2.webp',import.meta.url).pathname),vehicles:await loadImage(new URL('../dist/assets/vehicles-v2.webp',import.meta.url).pathname),biomesA:await loadImage(new URL('../dist/assets/biomes-desert-snow-v5.webp',import.meta.url).pathname),biomesB:await loadImage(new URL('../dist/assets/biomes-glacier-clock-v5.webp',import.meta.url).pathname)};
function setup(width,height,callbacks={}){
 const canvas=createCanvas(width,height),handlers=new Map();canvas.getBoundingClientRect=()=>({width,height,left:23,top:11});canvas.addEventListener=(name,fn)=>handlers.set(name,fn);canvas.setPointerCapture=()=>{};
 const renderer=new IslandRenderer(canvas,art,callbacks, {reducedMotion:false});
 renderer.send=(name,p={},id=1,extra={})=>handlers.get(name)?.({clientX:p.x+23,clientY:p.y+11,pointerId:id,pointerType:'touch',button:0,preventDefault(){},...extra});
 // Match browser Canvas semantics which @napi-rs/canvas does not enforce.
 const arc=renderer.ctx.arc.bind(renderer.ctx);
 renderer.ctx.arc=(x,y,r,...rest)=>{assert.ok(Number.isFinite(r)&&r>=0,'Canvas radius must be non-negative');return arc(x,y,r,...rest);};
 return renderer;
}
test('mail/coupling particles expire without the negative-radius crash',()=>{
 const r=setup(720,300),level=parseLevel(levels[0]);r.setLevel(level,{routes:level.solution,selected:1,journey:null});r.burst(level.goal);
 for(let i=0;i<100;i++)r.draw(i*.016,.016);
 assert.equal(r.particles.length,0);r.dispose();
});
test('biome matte blends into the sea outside the island, with an opaque coastal backing',()=>{
 const r=setup(720,280),l=parseLevel(levels.find(l=>l.world===5));
 r.setLevel(l,{routes:blankRoutes(l),selected:1,journey:null});r.fitBoard();r.draw(0,0);
 const data=r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;
 for(let i=3;i<data.length;i+=4)assert.equal(data[i],255,'white-backed decorations must never blend against transparency');
 // Draw a coastal crystal away from the island and sample its white source corner.
 r.ctx.fillStyle=r.world.water;r.ctx.fillRect(0,0,r.width,r.height);
 const origin=r.project(0,0),before=r.ctx.getImageData(Math.round(origin.x*r.dpr),Math.round((origin.y-r.size*.65)*r.dpr),1,1).data;
 r.prop(r.ctx,'glacier-crystals',0,0,.8);
 const after=r.ctx.getImageData(Math.round((origin.x-r.size*.36)*r.dpr),Math.round((origin.y-r.size*.7)*r.dpr),1,1).data;
 assert.ok(after[0]<225&&after[1]<240&&after[2]<250,'no white sprite rectangle in the sea');assert.equal(before[3],255);r.dispose();
});
for(const [width,height] of [[450,231],[832,301],[390,460],[1200,620]]){
 test(`all maps: Canvas execution and touch coordinates at ${width}×${height}`,()=>{
  const r=setup(width,height);
  for(const data of levels){
   const l=parseLevel(data),state={routes:l.solution,selected:1,hint:null,journey:null,paused:false};r.setLevel(l,state);r.fitBoard();r.draw(1,.016);
   for(const cell of l.cells.values()){
    const p=r.project(cell.x,cell.y);assert.equal(r.hit(p.x,p.y),cell.key);assert.ok(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height,'tile centers fit in overview');
   }
   state.journey=new Journey(l,state.routes);
   for(let i=0;i<600&&!state.journey.done;i++){
    for(const e of state.journey.update(.05))if(e.type==='coupled')r.burst(e.key);
    if(i%10===0)r.draw(i*.05,.05);
   }
   for(let i=0;i<25;i++)r.draw(i*.05,.05);
   const [gx,gy]=l.goal.split(',').map(Number),engine=r.project(gx+.76+l.wagons.length*.84+2,gy);
   assert.ok(engine.x>=0&&engine.x<=width&&engine.y>=0&&engine.y<=height,'entire coupled train apron fits');
   assert.equal(state.journey.result?.type,'success');assert.equal(r.particles.length,0);paintMiniBoard(createCanvas(280,144),l);
  }
  r.dispose();
 });
}
test('real pointer handlers pan across rails without edits and lock the camera for wagon drawing',()=>{
 const l=parseLevel(levels[0]),state={routes:cloneRoutes(l.solution),selected:1,journey:null},edits=[];
 let snapshot,cancels=0,ends=0;
 const r=setup(450,231,{
  begin(){snapshot=cloneRoutes(state.routes);},select(id){state.selected=id;},
  cell(k){const result=extendRoute(l,state.routes,state.selected,k);if(result.ok){state.routes=result.routes;edits.push(k);}},
  cancel(){state.routes=snapshot;cancels++;},end(){ends++;}
 });
 r.setLevel(l,state);r.zoomBy(1.5);
 const untouched=cloneRoutes(state.routes),before=r.cameraSnapshot(),empty={x:442,y:8},wagon=r.project(...l.start.split(',').map(Number));
 r.send('pointerdown',empty);r.send('pointermove',wagon);r.send('pointerup',wagon);
 assert.notDeepEqual(r.cameraSnapshot(),before);assert.deepEqual(state.routes,untouched);assert.equal(edits.length,0);
 r.fitBoard();const start=r.project(...l.start.split(',').map(Number)),top={x:start.x,y:start.y-r.size*.65};
 // Tapping the wagon selects it without removing its existing route.
 r.send('pointerdown',top);r.send('pointerup',top);assert.deepEqual(state.routes,untouched);
 state.routes=blankRoutes(l);const locked=r.cameraSnapshot();r.send('pointerdown',top);
 for(const k of l.solution[1].slice(1)){const p=r.project(...k.split(',').map(Number));r.send('pointermove',{x:p.x,y:p.y-r.size*.65});}
 r.send('pointerup',{x:r.project(...l.solution[1].at(-1).split(',').map(Number)).x,y:r.project(...l.solution[1].at(-1).split(',').map(Number)).y-r.size*.65});
 assert.deepEqual(state.routes,l.solution);assert.equal(simulate(l,state.routes).type,'success');assert.deepEqual(r.cameraSnapshot(),locked);
 // The established rail is another drawing anchor, including a fast stroke.
 const middle=r.project(...l.solution[1][2].split(',').map(Number));r.send('pointerdown',middle);r.send('pointerup',middle);
 assert.equal(state.routes[1].at(-1),l.solution[1][2]);
 const rail=r.project(...l.solution[1][2].split(',').map(Number)),goal=r.project(...l.goal.split(',').map(Number));
 r.send('pointerdown',rail);r.send('pointermove',goal);r.send('pointerup',goal);assert.deepEqual(state.routes,l.solution);
 // Both OS cancellation and a resize roll back the unfinished gesture once.
 for(const cancel of ['pointercancel','resize']){
  const snapshotRoutes=cloneRoutes(state.routes);r.send('pointerdown',top);r.send('pointermove',middle);assert.notDeepEqual(state.routes,snapshotRoutes);
  if(cancel==='resize')r.resize();else r.send(cancel,middle);
  const count=cancels;r.send('lostpointercapture',middle);r.send('pointerup',middle);
  assert.deepEqual(state.routes,snapshotRoutes);assert.equal(cancels,count);
 }
 assert.equal(cancels,2);assert.ok(ends>=5);r.dispose();
});
test('empty single tap still adds a rail, while overlay and secondary mouse button ignore input',()=>{
 const l=parseLevel(levels[0]),state={routes:blankRoutes(l),selected:1,journey:null};let cells=0;
 const r=setup(450,231,{cell(k){cells++;const edit=extendRoute(l,state.routes,1,k);if(edit.ok)state.routes=edit.routes;}});r.setLevel(l,state);
 const p=r.project(...l.solution[1][1].split(',').map(Number));r.send('pointerdown',p);r.send('pointerup',p);
 assert.equal(state.routes[1].at(-1),l.solution[1][1]);assert.equal(cells,1);
 r.send('pointerdown',p,2,{pointerType:'mouse',button:2});r.send('pointerup',p,2,{pointerType:'mouse',button:2});assert.equal(cells,1);
 state.overlay=true;r.send('pointerdown',p);r.send('pointerup',p);assert.equal(cells,1);r.dispose();
});
test('touching another wagon selects its track without moving the camera; keyboard focus stays reachable',()=>{
 const l=parseLevel(levels.at(-1)),state={routes:blankRoutes(l),selected:1,journey:null};
 const r=setup(706,255,{select(id){state.selected=id;}});r.setLevel(l,state);r.fitBoard();
 const w=l.wagons.at(-1),p=r.project(...w.key.split(',').map(Number));p.y-=r.size*.5;const fixed=r.cameraSnapshot();
 r.send('pointerdown',p);r.send('pointerup',p);assert.equal(state.selected,w.id);assert.deepEqual(r.cameraSnapshot(),fixed);
 r.zoomBy(4);r.focused=l.start;
 for(let i=0;i<l.width+l.height;i++){
  r.send('keydown',{},0,{key:i<l.width?'ArrowRight':'ArrowDown'});
  const selected=r.project(...r.focused.split(',').map(Number));assert.ok(selected.x>=0&&selected.x<=r.width&&selected.y>=0&&selected.y<=r.height);
 }
 r.dispose();
});
test('carriages draw from the skin atlas when a skin is chosen; the engine keeps its own art',async()=>{
 const skins=await loadImage(new URL('../dist/assets/wagon-skins.webp',import.meta.url).pathname);
 const r=setup(720,300),level=parseLevel(levels[24]);r.art={...r.art,skins};r.skin='halloween';r.setLevel(level,{routes:level.solution,selected:1,journey:null});
 const used=[];const draw=r.ctx.drawImage.bind(r.ctx);r.ctx.drawImage=(img,...rest)=>{used.push(img);return draw(img,...rest);};
 r.draw(0,.016);assert.ok(used.includes(skins));assert.ok(used.includes(r.art.vehicles));
 used.length=0;r.skin='classic';r.terrainDirty=true;r.draw(.1,.016);assert.ok(!used.includes(skins));r.dispose();
});
