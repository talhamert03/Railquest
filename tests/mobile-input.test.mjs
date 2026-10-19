import test from 'node:test';
import assert from 'node:assert/strict';
import {BoardCamera} from '../dist/js/camera.js';
import {BoardGesture} from '../dist/js/board-gesture.js';
import {watchViewport} from '../dist/js/viewport.js';
import {levels} from '../dist/js/levels.js';
import {parseLevel} from '../dist/js/engine.js';

const viewports=[[246,300],[318,470],[450,180],[640,231],[706,255],[832,301],[700,740],[920,560],[1200,620]];
test('all 58 maps retain usable editing scale and fit their full train in phone/tablet overviews',()=>{
 for(const data of levels)for(const [width,height] of viewports){
  const l=parseLevel(data),c=new BoardCamera();c.setLevel(l);c.resize(width,height);
  assert.ok(c.size>=36&&c.size<=104,`${data.id}: initial rail scale ${width}×${height}`);
  c.fit();const b=c.bounds;
  for(const [x,y] of [[b.left,b.top],[b.right,b.bottom]]){
   const px=c.cx+x*c.size,py=c.cy+y*c.size;
   assert.ok(px>=-1e-6&&px<=width+1e-6&&py>=-1e-6&&py<=height+1e-6,`${data.id}: overview`);
  }
  for(const cell of l.cells.values()){
   c.zoomBy(3);c.focusCell(cell.key);
   const px=c.cx+(cell.x-cell.y)*.866*c.size,py=c.cy+(cell.x+cell.y)*.48*c.size;
   assert.ok(px>=0&&px<=width&&py>=0&&py<=height,`${data.id}: accessible cell ${cell.key}`);
  }
 }
});
test('zoom keeps the point under the finger stable and clamps extreme panning',()=>{
 const c=new BoardCamera();c.setLevel(parseLevel(levels.at(-1)));c.resize(706,255);c.zoomBy(2);
 const point={x:365,y:140},world=c.worldAt(point);c.zoomBy(1.2,point);
 assert.ok(Math.abs(c.worldAt(point).x-world.x)<1e-9);assert.ok(Math.abs(c.worldAt(point).y-world.y)<1e-9);
 for(const [dx,dy] of [[1e6,1e6],[-1e6,-1e6],[1e6,-1e6],[-1e6,1e6]]){
  c.panBy(dx,dy);const b=c.bounds;
  assert.ok(c.cx+b.left*c.size<=c.width&&c.cx+b.right*c.size>=0);
  assert.ok(c.cy+b.top*c.size<=c.height&&c.cy+b.bottom*c.size>=0);
 }
 c.zoomBy(1000);assert.equal(c.size,104);c.zoomBy(.00001);assert.equal(c.size,c.fitSize);
});
test('orientation changes preserve user zoom and focus, and overview remains an overview',()=>{
 const c=new BoardCamera();c.setLevel(parseLevel(levels.at(-1)));c.resize(706,255);c.zoomBy(1.25);c.focusCell('4,4');
 const oldCenter={...c.center},zoom=c.userZoom;c.resize(300,600);
 assert.equal(c.userZoom,zoom);assert.ok(Math.hypot(c.center.x-oldCenter.x,c.center.y-oldCenter.y)<1.5);
 c.resize(706,255);assert.ok(c.size>=36);c.fit();c.resize(920,560);assert.equal(c.size,c.fitSize);
});

function gestureHarness(){
 const calls={pan:[],draw:[],begin:0,start:0,end:0,cancel:0,tap:0};
 const g=new BoardGesture({pick:p=>p.x<30?{wagon:1,key:'0,0'}:null,begin:()=>calls.begin++,drawStart:()=>calls.start++,draw:(a,b)=>calls.draw.push([a,b]),pan:(x,y)=>calls.pan.push([x,y]),end:()=>calls.end++,cancel:()=>calls.cancel++,tap:()=>calls.tap++});
 return {g,calls};
}
test('gesture mode is chosen once: crossing a wagon does not turn a pan into a drawing',()=>{
 const {g,calls}=gestureHarness();g.down(1,{x:100,y:20});g.move(1,{x:98,y:23});assert.equal(calls.pan.length,0);
 g.move(1,{x:20,y:20});g.move(1,{x:10,y:30});g.up(1,{x:10,y:30});
 assert.deepEqual(calls.pan,[[-80,0],[-10,10]]);assert.equal(calls.draw.length,0);assert.equal(calls.tap,0);
 g.down(2,{x:10,y:10});g.move(2,{x:100,y:20});g.up(2,{x:100,y:20});
 assert.equal(calls.start,1);assert.equal(calls.draw.length,1);assert.equal(calls.pan.length,2);assert.equal(calls.end,1);
});
test('a second finger cannot steal a gesture or start editing when the primary finger lifts',()=>{
 const {g,calls}=gestureHarness();g.down(1,{x:100,y:20});g.down(2,{x:10,y:10});g.move(2,{x:200,y:200});
 g.move(1,{x:110,y:20});g.up(1,{x:110,y:20});g.move(2,{x:120,y:20});g.down(3,{x:10,y:10});g.move(3,{x:100,y:100});g.up(3,{x:100,y:100});g.up(2,{x:120,y:20});
 assert.deepEqual(calls.pan,[[10,0]]);assert.equal(calls.begin,0);assert.equal(calls.tap,0);assert.equal(g.active,null);
 g.down(4,{x:10,y:10});g.up(4,{x:10,y:10});assert.equal(calls.begin,1);assert.equal(calls.tap,1);
});
test('system interruption rolls a drawing back once; a small tap does not start a stroke',()=>{
 const {g,calls}=gestureHarness();g.down(1,{x:10,y:10});g.move(1,{x:13,y:12});g.up(1,{x:13,y:12});
 assert.equal(calls.start,0);assert.equal(calls.tap,1);
 g.down(2,{x:10,y:10});g.move(2,{x:50,y:30});g.cancel();g.up(2,{x:50,y:30},true);g.cancel();
 assert.equal(calls.cancel,1);assert.equal(calls.end,2);assert.equal(g.pointers.size,0);
 g.down(3,{x:10,y:10});g.up(3,{x:10,y:10},true);assert.equal(calls.cancel,2);assert.equal(calls.tap,1);
});
test('browser chrome and rotation update usable height once per frame; pinch scaling does not shrink the UI',()=>{
 const listeners=new Map(),visualListeners=new Map(),frames=new Map(),values=[];let id=0;
 const host={innerHeight:700,visualViewport:{height:650,scale:1,addEventListener:(n,f)=>visualListeners.set(n,f),removeEventListener:n=>visualListeners.delete(n)},addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n),requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:n=>frames.delete(n)};
 const root={style:{setProperty:(n,v)=>values.push([n,v])}},flush=()=>{const queued=[...frames.values()];frames.clear();queued.forEach(f=>f());};
 const stop=watchViewport(host,root);assert.deepEqual(values.at(-1),['--app-height','650px']);
 host.visualViewport.height=360;host.innerHeight=412;listeners.get('orientationchange')();listeners.get('resize')();visualListeners.get('resize')();assert.equal(frames.size,1);flush();assert.equal(values.at(-1)[1],'360px');
 host.visualViewport.scale=2;host.visualViewport.height=180;visualListeners.get('resize')();flush();assert.equal(values.at(-1)[1],'412px');
 const count=values.length;listeners.get('resize')();flush();assert.equal(values.length,count);
 stop();assert.equal(listeners.size,0);assert.equal(visualListeners.size,0);assert.equal(frames.size,0);
});
