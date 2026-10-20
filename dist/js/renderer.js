import {xy,key,walkable,portalMate,connectionAllowed,step,DIRECTIONS,waitBeats,signalGreen,ONE_WAY,fragileBridge} from './engine.js';
import {worlds} from './level-blueprints.js';
import {BIOME_SPRITES} from './biome-sprites.js';
import {createWeather,paintWeather} from './weather.js';
import {vehiclePose,easeConvoy} from './vehicle-motion.js';
import {keySign} from './key-signs.js';
import {BoardCamera} from './camera.js';
import {BoardGesture} from './board-gesture.js';
import {SKIN_RECTS,SKIN_CELL,skinById} from './cosmetics.js';
import {drawSkinBack,drawSkinFront} from './skin-effects.js';
const RECT={tree:[31,54,332,402],pine:[402,33,356,425],stones:[819,191,326,263],flowers:[1208,224,304,209],tunnelE:[10,554,368,371],tunnelS:[401,553,367,371],station:[772,559,516,393],sign:[1311,538,179,407]};
const VEHICLES=[[30,79,344,370],[409,79,340,370],[791,85,332,370],[1185,82,333,367],[35,586,328,338],[423,586,326,340],[801,583,322,344],[1189,581,320,344]];
/** Canvas resolution budget, shared by every board. Lowered once if a device cannot keep up. */
const QUALITY={cap:2,floor:1.25,pixels:2200000};
export const CAR_COLORS=['#276e86','#c97931','#9069a6','#ad5265','#53854e','#5268a3'];
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class IslandRenderer{
 constructor(canvas,art,callbacks,settings){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.art=art;this.callbacks=callbacks;this.settings=settings;
  this.width=0;this.height=0;this.size=32;this.zoom=1;this.camera=new BoardCamera();this.last=0;this.lastDraw=0;this.dead=false;this.hover=null;this.focused=null;this.particles=[];this.dirty=true;
  this.events=new AbortController();this.terrain=document.createElement('canvas');this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
  this.bindInput();this.resize();this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
 }
 setLevel(level,state){this.level=level;this.state=state;this.world=worlds[level.world];this.signalKeys=Object.keys(level.signals||{});this.hover=null;this.focused=level.start;this.camera.setLevel(level);this.particles=[];this.convoyCount=0;this.motionTime=0;this.resize();if(this.camera.size>this.camera.fitSize*1.05)this.focusCell(state.routes[state.selected]?.at(-1)||level.start); }
 updateState(state){this.state=state;this.dirty=true;}
 resize(quiet=false){
  const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  if(!quiet)this.input?.cancel();this.width=r.width;this.height=r.height;this.dpr=Math.min(window.devicePixelRatio||1,QUALITY.cap,Math.sqrt(QUALITY.pixels/(r.width*r.height)));
  // The cached ground extends past the viewport so panning only shifts it instead of repainting it.
  this.margin=Math.round(Math.max(r.width,r.height)*.22);
  this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);this.terrain.width=Math.round((r.width+2*this.margin)*this.dpr);this.terrain.height=Math.round((r.height+2*this.margin)*this.dpr);
  this.weather=createWeather(this.width,this.height,this.world?.weather,this.level?.id||1);
  const palette={meadow:['#d8ecc6','#90c9bd'],desert:['#ffe6b8',this.world?.water||'#a4d6cc'],snow:['#eff6f4','#b2cfdf'],ice:['#dfebff','#83b8d0'],clock:['#e8d6dc','#b8b5d7']}[this.world?.biome]||['#c9e6d3','#a9d9d1'];
  const t=this.terrain.getContext('2d');
  this.atmosphere=t.createRadialGradient(this.width*.5,this.height*.5,0,this.width*.5,this.height*.5,Math.min(this.width,this.height)*.5);this.atmosphere.addColorStop(0,`${palette[0]}99`);this.atmosphere.addColorStop(1,`${palette[1]}00`);
  this.light=t.createRadialGradient(this.width*.6,this.height*.4,0,this.width*.6,this.height*.4,Math.min(this.width,this.height)*.4);this.light.addColorStop(0,this.world?.biome==='ice'?'#9affd655':'#fff5c744');this.light.addColorStop(1,'#ffffff00');
  this.aurora=t.createLinearGradient(0,0,this.width,0);this.aurora.addColorStop(0,'#c3ffeb00');this.aurora.addColorStop(.25,'#c3ffeb');this.aurora.addColorStop(.75,'#d5c5ff');this.aurora.addColorStop(1,'#d5c5ff00');
  this.camera.resize(this.width,this.height);this.updateProjection();this.cacheTerrain();this.dirty=true;this.callbacks.camera?.();
 }
 updateProjection(){
  if(!this.level||!this.camera.initialized)return;
  this.size=this.camera.size;this.cx=this.camera.cx;this.cy=this.camera.cy;this.zoom=this.size/this.camera.fitSize;
 }
 refreshCamera(){this.updateProjection();this.dirty=true;this.callbacks.camera?.();}
 panBy(dx,dy){this.camera.panBy(dx,dy);this.refreshCamera();}
 zoomBy(factor,point){this.input.cancel();this.camera.zoomBy(factor,point);this.refreshCamera();}
 fitBoard(){this.input.cancel();this.camera.fit();this.refreshCamera();}
 focusCell(k,detail=false){if(detail&&this.camera.size<this.camera.baseline){this.camera.fitted=false;this.camera.userZoom=1;this.camera.resize(this.width,this.height);}this.camera.focusCell(k);this.focused=k;this.refreshCamera();}
 keepCellVisible(k){const p=this.project(...xy(k)),margin=Math.min(this.size*1.2,this.width*.2,this.height*.2),dx=clamp(p.x,margin,this.width-margin)-p.x,dy=clamp(p.y,margin,this.height-margin)-p.y;if(dx||dy)this.panBy(dx,dy);}
 cameraSnapshot(){return {center:{...this.camera.center},userZoom:this.camera.userZoom,fitted:this.camera.fitted};}
 restoreCamera(saved){this.input.cancel();this.camera.center={...saved.center};this.camera.userZoom=saved.userZoom;this.camera.fitted=saved.fitted;this.camera.resize(this.width,this.height);this.refreshCamera();}
 railAnchor(point){
  if(!this.level||this.state?.journey||this.state?.overlay)return null;
  const entity=this.entityHit(point.x,point.y),k=entity||this.hit(point.x,point.y),wagon=this.level.wagons.find(w=>w.key===k);
  if(wagon)return {key:k,wagon:wagon.id,entity:!!entity,start:true};
  const order=[this.state.selected,...this.level.wagons.map(w=>w.id).filter(id=>id!==this.state.selected)];
  const owner=order.find(id=>this.state.routes[id]?.includes(k));
  return owner?{key:k,wagon:owner,entity:false,start:false}:null;
 }
 drawStroke(from,to){
  const offset=this.dragOffset||{x:0,y:0},a={x:from.x+offset.x,y:from.y+offset.y},b={x:to.x+offset.x,y:to.y+offset.y};
  const length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.min(1024,Math.max(1,Math.ceil(length/Math.max(2,this.size*.16))));
  for(let i=1;i<=steps;i++){const t=i/steps,k=this.hit(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);if(k!==this.lastCell){this.callbacks.cell?.(k,false);this.lastCell=k;}}
 }
 project(x,y,z=0){return {x:this.cx+(x-y)*this.size*.866,y:this.cy+(x+y)*this.size*.48-z*this.size};}
 hit(px,py){const a=(px-this.cx)/(.866*this.size),b=(py-this.cy)/(.48*this.size);return key(Math.round((a+b)/2),Math.round((b-a)/2));}
 entityHit(px,py){
  if(!this.level||this.state?.journey)return null;
  for(const w of [...this.level.wagons].sort((a,b)=>{const [x,y]=xy(a.key),[u,v]=xy(b.key);return u+v-x-y;})){
   const [x,y]=xy(w.key),p=this.project(x,y),s=this.size;
   if(Math.abs(px-p.x)<Math.max(13,s*.48)&&py>p.y-s*1.27&&py<p.y+s*.15)return w.key;
  }return null;
 }
 poly(ctx,pts,fill,stroke=null,width=1){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 diamond(ctx,x,y,scale=1,z=0,fill,stroke,width=1){this.poly(ctx,[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([dx,dy])=>this.project(x+dx*scale,y+dy*scale,z)),fill,stroke,width);}
 line(ctx,a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
 circle(ctx,x,y,r,fill,stroke=null,width=1){if(!Number.isFinite(r)||r<=0)return;ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
 cacheTerrain(){
  if(!this.level||!this.width)return;this.terrainDirty=false;
  const c=this.terrain.getContext('2d'),m=this.margin,{level,size:s,world:w}=this;
  this.terrainView={cx:this.cx,cy:this.cy,size:this.size};
  // Sea, atmosphere and light are static, so they live in the cache instead of being refilled every frame.
  // Biome art uses multiply against this opaque sea; a transparent backing exposes the atlases' white matte.
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle=w.water;c.fillRect(0,0,this.width+2*m,this.height+2*m);c.translate(m,m);
  c.fillStyle=this.atmosphere;c.fillRect(-m,-m,this.width+2*m,this.height+2*m);
  if(this.settings.weather!==false){
   c.save();c.globalAlpha=.8;c.fillStyle=this.light;c.fillRect(-m,-m,this.width+2*m,this.height+2*m);c.restore();
   if(w.biome==='ice'){
    c.save();c.globalAlpha=.12;c.strokeStyle=this.aurora;c.lineWidth=Math.max(12,this.height*.075);c.lineCap='round';c.beginPath();
    for(let i=0;i<=12;i++){const x=i*this.width/12,y=this.height*(.13+Math.sin(i*.35)*.075);i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.restore();
   }
  }
  for(let i=0;i<(w.biome==='desert'||w.biome==='clock'?0:9);i++){
   const px=(i*197+43)%this.width,py=(i*83+51)%this.height;c.globalAlpha=.19;
   c.beginPath();c.ellipse(px,py,11+(i%3)*7,2,0,0,Math.PI);c.strokeStyle='#effbf1';c.lineWidth=1.6;c.stroke();
  }c.globalAlpha=1;
  // The map is a small solid island; water lanes physically divide it.
  const cells=[...level.cells.values()].sort((a,b)=>a.x+a.y-b.x-b.y);
  c.save();c.shadowColor='rgba(42,91,78,.15)';c.shadowBlur=s*.5;c.shadowOffsetY=s*.42;
  this.poly(c,[this.project(-.5,-.5,-.25),this.project(level.width-.5,-.5,-.25),this.project(level.width-.5,level.height-.5,-.25),this.project(-.5,level.height-.5,-.25)],'rgba(67,123,102,.18)');c.restore();
  for(const cell of cells){
   const {x,y,type}=cell;
   if(type===' ')continue;
   const water=['~','H','V','X','Y'].includes(type);
   // Vertical island banks; front faces are painted before each top surface.
   if(!water){
    for(const side of [0,1]){
     const n=level.cells.get(key(x+(side===0?1:0),y+(side===1?1:0)));
     if(!n||['~','H','V','X','Y',' '].includes(n.type)){
      const aa=side===0?[x+.5,y-.5]:[x-.5,y+.5],bb=[x+.5,y+.5];
      this.poly(c,[this.project(...aa),this.project(...bb),this.project(...bb,-.27),this.project(...aa,-.27)],side===0?w.bank:w.sand,'rgba(77,101,72,.14)',1);
      this.line(c,this.project(...aa,-.055),this.project(...bb,-.055),'rgba(255,241,194,.45)',s*.06);
     }
    }
   }
   this.diamond(c,x,y,1,water?-.20:0,water?w.water:((x*7+y*11)%3===0?w.grassLight:w.grass),water?'rgba(255,255,255,.08)':`${w.detail}66`,Math.max(.65,s*.012));
   if(!water&&walkable(cell)){
    const p=this.project(x,y);this.circle(c,p.x,p.y,1.1,`${w.detail}66`);
   }
   if(!water&&type==='#'){
    for(let j=0;j<3;j++){
     const p=this.project(x-.25+(j*.19),y+.25-.07*j);this.line(c,p,{x:p.x+2,y:p.y-(w.biome==='meadow'?4:1)},`${w.detail}80`,1);
    }
   }
   if(type==='H'||type==='V')this.bridge(c,cell);
  }
  const [gx,gy]=xy(level.goal);
  for(let i=1;i<=Math.max(3,level.wagons.length);i++)this.bridge(c,{x:gx+i,y:gy,type:'H'});
 }
 bridge(ctx,cell){
  const {x,y,type}=cell,along=['H','X'].includes(type)?[1,0]:[0,1],side=[-along[1],along[0]],s=this.size;
  const points=[[-.57,-.28],[.57,-.28],[.57,.28],[-.57,.28]].map(([u,v])=>this.project(x+along[0]*u+side[0]*v,y+along[1]*u+side[1]*v,.025));
  this.poly(ctx,points,'#b99162','#826e4d',1.5);
  for(let i=-.5;i<=.51;i+=.16){const a=this.project(x+along[0]*i-side[0]*.28,y+along[1]*i-side[1]*.28,.03),b=this.project(x+along[0]*i+side[0]*.28,y+along[1]*i+side[1]*.28,.03);this.line(ctx,a,b,'#e3be86',s*.06);}
  for(const sideSign of [-1,1])this.line(ctx,this.project(x-along[0]*.55+side[0]*.14*sideSign,y-along[1]*.55+side[1]*.14*sideSign,.055),this.project(x+along[0]*.55+side[0]*.14*sideSign,y+along[1]*.55+side[1]*.14*sideSign,.055),'#627566',Math.max(1.2,s*.035));
 }
 prop(ctx,name,x,y,width,z=0,alpha=1){
  const sprite=BIOME_SPRITES[name];
  if(sprite){
   const im=this.art[sprite.sheet];if(!im)return;
   const [sx,sy,sw,sh]=sprite.rect,scale=im.width/1774,p=this.project(x,y,z),w=width*this.size,h=w*sh/sw;
   ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='multiply';
   if(!this.settings.reducedMotion&&/tree|spruce|palm|hedge|shrub/.test(name)){const sway=Math.sin((this.motionTime||0)*.65+x*.8+y)*.012;ctx.translate(p.x,p.y);ctx.rotate(sway);ctx.translate(-p.x,-p.y);}
   ctx.drawImage(im,sx*scale,sy*scale,sw*scale,sh*scale,p.x-w*sprite.anchor[0],p.y-h*sprite.anchor[1]+this.size*.07,w,h);ctx.restore();return;
  }
  if(!this.art.props)return;
  const [sx,sy,sw,sh]=RECT[name],p=this.project(x,y,z),w=width*this.size,h=w*sh/sw;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(this.art.props,sx,sy,sw,sh,p.x-w/2,p.y-h+this.size*.1,w,h);ctx.restore();
 }
 routePolyline(keys){
  if(keys.length<2)return [];
  const coords=keys.map(xy),result=[];
  result.push(this.project(...coords[0],.04));
  for(let i=1;i<coords.length-1;i++){
   const a=coords[i-1],b=coords[i],c=coords[i+1];
   const q=[b[0]+(a[0]-b[0])*.18,b[1]+(a[1]-b[1])*.18],r=[b[0]+(c[0]-b[0])*.18,b[1]+(c[1]-b[1])*.18];
   result.push(this.project(...q,.04));
   for(let j=1;j<=6;j++){const t=j/6;result.push(this.project((1-t)**2*q[0]+2*(1-t)*t*b[0]+t*t*r[0],(1-t)**2*q[1]+2*(1-t)*t*b[1]+t*t*r[1],.04));}
  }
  result.push(this.project(...coords.at(-1),.04));return result;
 }
 strokePolyline(ctx,pts,color,width){if(pts.length<2)return;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
 rails(ctx,path,ghost=false){
  const pieces=[];let piece=[];
  for(const k of path){if(this.state.journey?.brokenBridges.has(k)){pieces.push(piece);piece=[];continue;}if(piece.length&&portalMate(this.level,piece.at(-1))===k){pieces.push(piece);piece=[];}piece.push(k);}pieces.push(piece);
  const s=this.size;ctx.save();if(ghost)ctx.globalAlpha=.45;
  for(const part of pieces){
   const pts=this.routePolyline(part);if(pts.length<2)continue;
   this.strokePolyline(ctx,pts,'rgba(92,104,68,.2)',s*.36);
   this.strokePolyline(ctx,pts,'#d6bd88',s*.29);
   // Sleepers are sampled by distance along the exact same rounded centerline.
   // All sleepers of a piece share one path and one stroke (hundreds of strokes per frame otherwise).
   let carry=0;ctx.beginPath();
   for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<.01)continue;
    const nx=-(b.y-a.y)/len*s*.19,ny=(b.x-a.x)/len*s*.19;
    for(let d=carry;d<len;d+=s*.145){const t=d/len,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;ctx.moveTo(x+nx,y+ny);ctx.lineTo(x-nx,y-ny);}
    carry=(carry-len)%(s*.145);if(carry<0)carry+=s*.145;
   }
   ctx.strokeStyle='#987448';ctx.lineWidth=Math.max(2,s*.052);ctx.lineCap='round';ctx.stroke();
   for(const side of [-1,1]){
    const rail=pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:p.x-(b.y-a.y)/len*s*.095*side,y:p.y+(b.x-a.x)/len*s*.095*side};});
    this.strokePolyline(ctx,rail,'#415a4d',Math.max(2.5,s*.062));this.strokePolyline(ctx,rail,'#e9e8ca',Math.max(1,s*.025));
   }
  }
  ctx.restore();
 }
 badge(ctx,x,y,text,color,z=.95){
  const p=this.project(x,y,z),s=this.size,r=Math.max(10,Math.min(17,s*.24));
  // A soft offset disc instead of shadowBlur: badges are drawn every frame and blur is the costliest canvas op.
  this.circle(ctx,p.x,p.y+2,r+1.5,'rgba(34,57,42,.16)');this.circle(ctx,p.x,p.y,r,color,'#fff9e9',2);
  ctx.fillStyle='#fffdf0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.max(13,r*1.13)}px Rubik, sans-serif`;ctx.fillText(text,p.x,p.y+.5);
 }
 waitPlatform(ctx,cell){
  const n=waitBeats(cell),s=this.size,p=this.project(cell.x-.32,cell.y+.28,.30),r=Math.max(7,s*.17);
  this.diamond(ctx,cell.x,cell.y,.90,.012,'rgba(249,221,146,.38)','#ae925c',Math.max(1,s*.024));
  this.line(ctx,{x:p.x,y:p.y+r*.6},{x:p.x,y:p.y+s*.3},'#8a6c4a',Math.max(2,s*.055));
  this.circle(ctx,p.x,p.y,r,'#fff2cf','#99784c',Math.max(1.3,s*.035));
  this.line(ctx,p,{x:p.x,y:p.y-r*.56},'#685741',1.6);this.line(ctx,p,{x:p.x+r*.46,y:p.y},'#685741',1.6);
  for(let i=0;i<n;i++)this.circle(ctx,p.x+(i-(n-1)/2)*r*.65,p.y+r+3,2,'#8c6551');
 }
 signal(ctx,cell){
  const beat=this.state.journey?.beat||0,open=signalGreen(this.level,cell.key,beat),s=this.size,p=this.project(cell.x-.32,cell.y+.28,.45),r=Math.max(5,s*.14),color=open?'#4c9a65':'#ba5750';
  this.diamond(ctx,cell.x,cell.y,.91,.013,open?'#70bd871c':'#dc7b651c',color,Math.max(1,s*.025));
  this.line(ctx,{x:p.x,y:p.y+r},{x:p.x,y:p.y+s*.39},'#655c58',Math.max(2,s*.055));
  this.circle(ctx,p.x,p.y,r+2,'#fff1d8','#5c605b',1.2);this.circle(ctx,p.x,p.y,r,color);
  ctx.save();ctx.strokeStyle='#fff9e9';ctx.lineWidth=1.5;ctx.beginPath();
  if(open){ctx.moveTo(p.x-r*.45,p.y);ctx.lineTo(p.x-r*.08,p.y+r*.35);ctx.lineTo(p.x+r*.5,p.y-r*.4);}else{ctx.moveTo(p.x-r*.45,p.y);ctx.lineTo(p.x+r*.45,p.y);}ctx.stroke();
  ctx.fillStyle='#384e4b';ctx.font=`700 ${Math.max(10,s*.19)}px Rubik, sans-serif`;ctx.textAlign='center';ctx.fillText(`S${this.signalKeys.indexOf(cell.key)+1}`,p.x,p.y-r-6);ctx.restore();
 }
 oneWay(ctx,cell){
  this.diamond(ctx,cell.x,cell.y,.85,.018,'#e9b77935','#a58653',Math.max(1,this.size*.025));
  this.arrow(ctx,cell.key,ONE_WAY[cell.type],'#885e36');
 }
 lockMarker(ctx,cell){
  const plate=cell.type==='p',id=(plate?this.level.plateLinks:this.level.gateLinks).get(cell.key),open=this.state.journey?.openLocks.has(id),color=keySign(id).color,s=this.size;
  this.diamond(ctx,cell.x,cell.y,.86,.018,open?'#7fb78522':`${color}22`,open?'#568466':color,Math.max(1.2,s*.03));
  if(plate){
   const p=this.project(cell.x,cell.y,.05),r=Math.max(2.5,s*.075);this.circle(ctx,p.x-s*.12,p.y,r,null,color,Math.max(1.6,s*.035));this.line(ctx,{x:p.x-s*.05,y:p.y},{x:p.x+s*.18,y:p.y},color,Math.max(2,s*.04));this.line(ctx,{x:p.x+s*.14,y:p.y},{x:p.x+s*.14,y:p.y+s*.09},color,Math.max(2,s*.04));
   this.keyBadge(ctx,cell.x-.28,cell.y+.28,id,open,.45);
  }else{
   const a=this.project(cell.x-.32,cell.y+.24,.06),b=this.project(cell.x+.32,cell.y-.24,.06),top={x:a.x,y:a.y-s*.34};
   this.line(ctx,a,top,'#7c7161',Math.max(2,s*.06));this.line(ctx,top,open?{x:top.x+s*.06,y:top.y-s*.36}:{x:b.x,y:b.y-s*.34},open?'#72975c':'#dd9b66',Math.max(3,s*.085));
   this.keyBadge(ctx,cell.x-.34,cell.y+.28,id,open,.79);
  }
 }
 keyBadge(ctx,x,y,id,open,z){
  const p=this.project(x,y,z),r=Math.max(9,this.size*.215),color=keySign(id).color;
  this.circle(ctx,p.x,p.y,r,'#fff9e9',color,Math.max(1.4,this.size*.03));
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(r*.67,r*.67);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=.19;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  if(id===1){
   ctx.arc(0,0,.39,0,TAU);
   for(let i=0;i<8;i++){const a=i*TAU/8;ctx.moveTo(Math.cos(a)*.67,Math.sin(a)*.67);ctx.lineTo(Math.cos(a)*.94,Math.sin(a)*.94);}
   ctx.stroke();
  }else if(id===2){
   ctx.moveTo(.72,.35);ctx.bezierCurveTo(-.28,.73,-.74,-.05,-.36,-.88);ctx.bezierCurveTo(-1.55,-.28,-.72,1.45,.46,.87);ctx.bezierCurveTo(.69,.74,.85,.55,.92,.33);ctx.closePath();ctx.fill();
  }else{
   for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,n=i%2?.42:.95;ctx[i?'lineTo':'moveTo'](Math.cos(a)*n,Math.sin(a)*n);}ctx.closePath();ctx.stroke();
  }
  ctx.restore();
  // Keep the matching symbol readable after collection; the small seal shows open state.
  if(open){const cx=p.x+r*.73,cy=p.y+r*.66,q=Math.max(4,r*.39);this.circle(ctx,cx,cy,q,'#4f805d','#fff9e9',1);this.line(ctx,{x:cx-q*.45,y:cy},{x:cx-q*.08,y:cy+q*.35},'#fff9e9',1.3);this.line(ctx,{x:cx-q*.08,y:cy+q*.35},{x:cx+q*.47,y:cy-q*.38},'#fff9e9',1.3);}
 }
 fragile(ctx,cell){
  const broken=this.state.journey?.brokenBridges.has(cell.key),s=this.size;
  if(!broken)this.bridge(ctx,cell);
  const p=this.project(cell.x,cell.y,.07);
  ctx.save();ctx.setLineDash([Math.max(2,s*.08),Math.max(2,s*.07)]);this.diamond(ctx,cell.x,cell.y,.9,.03,null,broken?'#a66057':'#b48051',Math.max(1.3,s*.03));ctx.restore();
  if(broken){this.line(ctx,{x:p.x-s*.2,y:p.y-s*.1},{x:p.x+s*.2,y:p.y+s*.1},'#a66057',Math.max(2,s*.05));this.line(ctx,{x:p.x+s*.2,y:p.y-s*.1},{x:p.x-s*.2,y:p.y+s*.1},'#a66057',Math.max(2,s*.05));}
  else{const tag=this.project(cell.x-.28,cell.y+.25,.27);this.circle(ctx,tag.x,tag.y,Math.max(7,s*.17),'#fff1d3','#ae8050',1.2);ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#875a39';ctx.font=`700 ${Math.max(10,s*.22)}px Rubik, sans-serif`;ctx.fillText('1×',tag.x,tag.y);ctx.restore();}
 }
 arrow(ctx,k,dir,color='#367164'){
  const [x,y]=xy(k),[dx,dy]=DIRECTIONS[dir],a=this.project(x-dx*.17,y-dy*.17,.04),b=this.project(x+dx*.2,y+dy*.2,.04);
  this.line(ctx,a,b,color,Math.max(2,this.size*.045));
  const ang=Math.atan2(b.y-a.y,b.x-a.x),s=this.size*.13;
  for(const sign of [-1,1])this.line(ctx,b,{x:b.x-Math.cos(ang+sign*.55)*s,y:b.y-Math.sin(ang+sign*.55)*s},color,Math.max(2,this.size*.04));
 }
 vehicle(ctx,pos,engine=false,id=1){
  if(!this.art.vehicles)return;
  const {x,y,dir=0,alpha=1}=pos,p=this.project(x,y),s=this.size,pose=vehiclePose({time:this.motionTime||0,distance:pos.distance??x+y,moving:pos.moving,selected:pos.selected,engine,reducedMotion:this.settings.reducedMotion});
  ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(p.x,p.y+s*.02,s*.49,s*.20,0,0,TAU);ctx.fillStyle='rgba(41,65,47,.20)';ctx.fill();
  // Carriages may wear a purchased skin; the engine always keeps the original art.
  const skin=!engine&&this.art.skins?skinById(this.skin):null,skinned=skin&&skin.row>=0;
  let [sx,sy,sw,sh]=skinned?SKIN_RECTS[dir%4]:VEHICLES[(engine?0:4)+(dir%4)];if(skinned)sy+=skin.row*SKIN_CELL[1];
  const w=s*(engine?1.13:1.01),h=w*sh/sw;
  ctx.translate(p.x,p.y+s*.22);ctx.rotate(pose.tilt);ctx.scale(1,pose.scaleY);ctx.translate(0,-s*pose.lift);
  const fx=skinned?{w,h,s,t:this.motionTime||0,dir,moving:!!pos.moving,reduced:this.settings.reducedMotion}:null;
  if(fx)drawSkinBack(ctx,skin.id,fx);
  ctx.drawImage(skinned?this.art.skins:this.art.vehicles,sx,sy,sw,sh,-w/2,-h,w,h);
  if(fx)drawSkinFront(ctx,skin.id,fx);
  ctx.restore();
  if(!engine&&alpha>.4)this.badge(ctx,x,y,String(id),CAR_COLORS[id-1],1.01+pose.lift);
 }
 burst(k,color='#f6c967'){
  if(this.settings.reducedMotion)return;
  const [x,y]=xy(k),p=this.project(x,y,.4);
  for(let i=0;i<12;i++){const a=i/12*TAU;this.particles.push({x:p.x,y:p.y,vx:Math.cos(a)*48,vy:Math.sin(a)*38-32,life:1,color});}
  this.dirty=true;
 }
 draw(time,dt){
  if(!this.level)return;
  const view=this.terrainView,m=this.margin;
  if(this.terrainDirty||!view||view.size!==this.size||Math.abs(this.cx-view.cx)>m||Math.abs(this.cy-view.cy)>m)this.cacheTerrain();
  const c=this.ctx,{level,state,size:s}=this,d=this.dpr;
  c.setTransform(d,0,0,d,0,0);
  if(!state.paused&&!state.overlay)this.motionTime=(this.motionTime||0)+Math.max(0,dt);
  const phase=this.settings.reducedMotion?0:time;
  // One opaque blit replaces the sea, light and ground passes; a pan just shifts the source window.
  c.drawImage(this.terrain,(m-this.cx+this.terrainView.cx)*d,(m-this.cy+this.terrainView.cy)*d,this.width*d,this.height*d,0,0,this.width,this.height);
  const selected=state.routes[state.selected],tail=selected.at(-1),color=CAR_COLORS[state.selected-1];
  if(!state.journey&&!state.preview){
   for(const cell of level.cells.values())if(connectionAllowed(level,tail,cell.key))this.diamond(c,cell.x,cell.y,.85,.008,'rgba(255,250,220,.38)','rgba(62,111,76,.38)',1.1);
   const [x,y]=xy(tail);this.diamond(c,x,y,.92,.015,'rgba(255,239,163,.35)',color,Math.max(1.5,s*.045));
  }
  const ordered=Object.entries(state.routes).sort(([a],[b])=>Number(a===String(state.selected))-Number(b===String(state.selected)));
  for(const cell of level.cells.values())if(fragileBridge(cell))this.fragile(c,cell);
  for(const [,path] of ordered)this.rails(c,path);
  for(const cell of level.cells.values()){
   if(waitBeats(cell))this.waitPlatform(c,cell);
   if(cell.type==='q')this.signal(c,cell);
   if(ONE_WAY[cell.type]!==undefined)this.oneWay(c,cell);
   if(cell.type==='p'||cell.type==='l')this.lockMarker(c,cell);
  }
  // The locomotive waits on a short fixed track beyond the coupling point.
  const [gx,gy]=xy(level.goal),count=state.journey?.arrived.length||0;
  if(!state.journey)this.convoyCount=0;
  this.convoyCount=easeConvoy(this.convoyCount||0,count,state.paused||state.overlay?0:dt,this.settings.reducedMotion);
  this.rails(c,[key(gx-.5,gy),key(gx+Math.max(1.1,count*.84+.65),gy)]);
  this.arrow(c,level.goal,level.goalDir);
  for(const wagon of level.wagons){
   if(!state.journey&&!state.preview&&state.routes[wagon.id].length===1)this.arrow(c,step(wagon.key,wagon.dir),wagon.dir,CAR_COLORS[wagon.id-1]);
  }
  if(state.hint){const [x,y]=xy(state.hint);this.diamond(c,x,y,.90,.05,'rgba(255,219,96,.62)','#ac772c',2.5);}
  if(this.hover&&walkable(level.cells.get(this.hover))&&!state.journey){const [x,y]=xy(this.hover);this.diamond(c,x,y,.95,.02,'rgba(255,248,220,.21)',color,1.6);}
  if(document.activeElement===this.canvas&&this.focused){const [x,y]=xy(this.focused);c.save();c.setLineDash([4,3]);this.diamond(c,x,y,.98,.03,null,'#235b57',2);c.restore();}
  const entities=[];
  for(const cell of level.cells.values()){
   if(cell.type==='#'&&!(cell.x===gx&&cell.y===gy-1)){
    const hash=(cell.x*71+cell.y*23+level.id*13)%13;
    const choices={desert:['desert-cactus','desert-sandstone','desert-palm'],snow:['snow-spruce','snow-rocks','snow-shrub'],ice:['glacier-crystals','glacier-boulders','glacier-arch'],clock:['clock-plum-tree','clock-gears','clock-amber-hedge']}[this.world.biome];
    const name=choices?choices[hash<5?0:hash<11?1:2]:hash<4?'tree':hash<10?'stones':'flowers';
    const width=name==='tree'?.91:name.includes('tree')||name.includes('spruce')?.79:name.includes('crystals')?.63:name.includes('gears')?.59:name==='flowers'?.53:.71;
    entities.push({depth:cell.x+cell.y+.03,draw:()=>this.prop(c,name,cell.x,cell.y,width,0,this.hover===key(cell.x,cell.y-1)?.6:1)});
   }
   if(portalMate(level,cell.key)){
    const out=level.mouths[cell.key],color={a:'#8473b4',b:'#c08345',c:'#397f83'}[cell.type];
    this.diamond(c,cell.x,cell.y,.9,.02,'rgba(232,224,251,.45)');
    const mate=portalMate(level,cell.key);
    // The exit arrow belongs only to the downstream mouth, never its entrance.
    if(selected.includes(mate)&&selected.indexOf(cell.key)>selected.indexOf(mate))this.arrow(c,step(cell.key,out),out,color);
    entities.push({depth:cell.x+cell.y+.2,draw:()=>{this.prop(c,out%2?'tunnelS':'tunnelE',cell.x,cell.y,1.10);this.badge(c,cell.x,cell.y,cell.type.toUpperCase(),color,1.10);}});
   }
  }
  const departed=state.phase==='won'&&!this.settings.reducedMotion?Math.min(2,(state.winTime||0)*.6):0;
  const engineX=gx+.76+this.convoyCount*.84+departed,convoyMoving=!state.paused&&!state.overlay&&(departed>0||Math.abs(count-this.convoyCount)>.005);
  entities.push({depth:engineX+gy+.2,draw:()=>this.vehicle(c,{x:engineX,y:gy,dir:0,moving:convoyMoving},true)});
  for(let i=0;i<count;i++){
   const x=gx+.76+(this.convoyCount-i-1)*.84+departed;
   entities.push({depth:x+gy+.21,draw:()=>this.vehicle(c,{x,y:gy,dir:0,moving:convoyMoving},false,i+1)});
  }
  if(state.journey){
   for(const car of state.journey.cars)if(!car.arrived){const pos=state.journey.position(car);pos.moving=!state.paused&&!state.overlay&&!state.journey.done&&!pos.wait&&!pos.signalWait&&!pos.gateWait;pos.distance=car.index+state.journey.t;entities.push({depth:pos.x+pos.y+.15,draw:()=>{this.vehicle(c,pos,false,car.id);if(pos.wait)this.badge(c,pos.x+.45,pos.y,`+${pos.wait}`,'#967040',.50);}});}
  }else{
   for(const wagon of level.wagons){const [x,y]=xy(wagon.key);entities.push({depth:x+y+.15,draw:()=>this.vehicle(c,{x,y,dir:wagon.dir,selected:state.selected===wagon.id},false,wagon.id)});}
  }
  // One station and signal frame the destination without covering its input tile.
  const station={desert:'desert-station',snow:'snow-cabin',ice:'glacier-observatory',clock:'clock-tower'}[this.world.biome]||'station';
  entities.push({depth:gx+gy-.9,draw:()=>this.prop(c,station,gx+.30,gy-1.1,station==='clock-tower'?.88:1.10)});
  entities.sort((a,b)=>a.depth-b.depth);for(const e of entities)e.draw();
  if(!this.settings.reducedMotion){
   const p=this.project(engineX+.18,gy,1.01);
   for(let i=0;i<3;i++){const t=(time*.45+i/3)%1;c.globalAlpha=(1-t)*.55;this.circle(c,p.x-s*t*.2,p.y-s*t*.6,s*(.05+t*.10),'#fffcf0');}c.globalAlpha=1;
  }
  for(const p of this.particles){
   p.life-=Math.max(0,dt)*1.3;if(p.life<=0)continue;
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;c.globalAlpha=p.life;this.circle(c,p.x,p.y,3*p.life,p.color);
  }c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  paintWeather(c,this.weather,{width:this.width,height:this.height,kind:this.world.weather,time,enabled:this.settings.weather!==false,reducedMotion:this.settings.reducedMotion});
 }
 frame(now){
  if(this.dead)return;
  const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
  if(!document.hidden){
   this.callbacks.tick?.(dt);const active=this.state?.journey&&!this.state?.paused&&!this.state?.overlay&&!this.state.journey.done;
   if(this.dirty||active||(!this.settings.reducedMotion&&!this.suspended&&now-this.lastDraw>40)||this.particles.length){
    if(active)this.measure(now);
    this.draw(now/1000,this.lastDraw?Math.min((now-this.lastDraw)/1000,.1):0);this.lastDraw=now;this.dirty=false;
   }
  }
  this.raf=requestAnimationFrame(this.frame);
 }
 measure(now){
  // While trains run every frame is drawn; if a device averages under ~38 fps, render fewer pixels once.
  const gap=now-(this.lastDraw||now),p=this.perf||(this.perf={n:0,sum:0});
  if(gap<=0||gap>200){p.n=0;p.sum=0;return;}
  p.n++;p.sum+=gap;
  if(p.n<45)return;
  const slow=p.sum/p.n>26;p.n=0;p.sum=0;
  if(slow&&this.dpr>QUALITY.floor+.05){QUALITY.cap=Math.max(QUALITY.floor,this.dpr-.35);this.resize(true);}
 }
 bindInput(){
  const signal=this.events.signal,on=(name,fn)=>this.canvas.addEventListener(name,fn,{signal});
  const point=e=>{const r=this.canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*this.width/r.width,y:(e.clientY-r.top)*this.height/r.height};};
  this.input=new BoardGesture({
   pick:p=>this.railAnchor(p),
   begin:(anchor,p)=>{this.callbacks.begin?.();this.callbacks.select?.(anchor.wagon);const base=this.project(...xy(anchor.key));this.dragOffset=anchor.entity?{x:base.x-p.x,y:base.y-p.y}:{x:0,y:0};this.lastCell=anchor.key;},
   drawStart:anchor=>this.callbacks.cell?.(anchor.key,true),
   draw:(a,b)=>this.drawStroke(a,b),
   pan:(dx,dy)=>{this.hover=null;this.panBy(dx,dy);},
   tap:(p,anchor)=>{if(anchor){if(!anchor.start)this.callbacks.cell?.(anchor.key,true);}else if(!this.state?.journey){const k=this.hit(p.x,p.y);if(walkable(this.level?.cells.get(k)))this.callbacks.cell?.(k,true);this.callbacks.end?.();}},
   end:()=>{this.lastCell=null;this.callbacks.end?.();},
   cancel:()=>this.callbacks.cancel?.(),
   mode:mode=>{if(this.canvas.dataset)this.canvas.dataset.gesture=mode;this.dirty=true;}
  });
  on('pointerdown',e=>{
   if(!this.level||this.state?.overlay||e.button!==0&&e.pointerType==='mouse')return;
   e.preventDefault();try{this.canvas.setPointerCapture(e.pointerId);}catch{}
   this.input.down(e.pointerId,point(e));this.dirty=true;
  });
  on('pointermove',e=>{
   const p=point(e);if(this.input.active?.mode!=='pan')this.hover=this.hit(p.x,p.y);
   this.input.move(e.pointerId,p);this.dirty=true;
  });
  on('pointerup',e=>{const p=point(e);this.input.move(e.pointerId,p);this.input.up(e.pointerId,p);});
  const cancel=e=>this.input.up(e.pointerId,point(e),true);
  on('pointercancel',cancel);on('lostpointercapture',cancel);on('pointerleave',()=>{this.hover=null;this.dirty=true;});
  on('wheel',e=>{if(!this.level||this.state?.overlay||this.input.active)return;e.preventDefault();this.zoomBy(Math.exp(-clamp(e.deltaY,-120,120)*.0025),point(e));});
  on('contextmenu',e=>e.preventDefault());
  on('keydown',e=>{
   const directions={ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowUp:[0,-1]};
   if(directions[e.key]){e.preventDefault();const [x,y]=xy(this.focused||this.level.start),[dx,dy]=directions[e.key];this.focused=key(clamp(x+dx,0,this.level.width-1),clamp(y+dy,0,this.level.height-1));this.keepCellVisible(this.focused);this.hover=this.focused;this.dirty=true;this.callbacks.focus?.(this.focused);}
   if(e.key==='Enter'||e.key===' '){e.preventDefault();this.callbacks.cell?.(this.focused,true);this.callbacks.end?.();}
   if(e.key==='Backspace'){e.preventDefault();this.callbacks.undo?.();}
  });
  on('focus',()=>{this.dirty=true;});on('blur',()=>{this.dirty=true;});
 }
 dispose(){this.input.cancel();this.dead=true;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.events.abort();}
}
export function paintMiniBoard(canvas,level){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,s=Math.min((w-18)/((level.width+level.height)*.866),(h-14)/((level.width+level.height)*.48)),cx=w/2-(level.width-level.height)*s*.433,cy=10;
 const project=(x,y)=>({x:cx+(x-y)*s*.866,y:cy+(x+y)*s*.48});c.clearRect(0,0,w,h);
 for(const cell of level.cells.values()){
  const {type}=cell;if(type===' ')continue;const p=project(cell.x,cell.y);
  c.beginPath();c.moveTo(p.x,p.y-s*.48);c.lineTo(p.x+s*.866,p.y);c.lineTo(p.x,p.y+s*.48);c.lineTo(p.x-s*.866,p.y);c.closePath();
  c.fillStyle=type==='#'?worlds[level.world].blocker:['~','H','V','X','Y'].includes(type)?worlds[level.world].water:worlds[level.world].grassLight;c.fill();c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=.6;c.stroke();
  if(type==='G'||/[1-6abcwzqplXY]/.test(type)){
   c.beginPath();c.arc(p.x,p.y,Math.max(3,s*.25),0,TAU);c.fillStyle=type==='G'?'#285e54':/[1-6]/.test(type)?CAR_COLORS[Number(type)-1]:type==='q'?'#bd6958':['p','l'].includes(type)?'#b48345':fragileBridge(cell)?'#a16c5f':waitBeats(cell)?'#b08c49':'#8977b2';c.fill();
  }
 }
}
