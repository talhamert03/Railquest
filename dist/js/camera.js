const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ISO_X=.866,ISO_Y=.48;
export function islandBounds(level){
 const [gx,gy]=level.goal.split(',').map(Number),apron=.76+level.wagons.length*.84+2;
 return {left:-level.height*ISO_X,right:Math.max(level.width*ISO_X,(gx+apron-gy+.65)*ISO_X),top:-1.65,bottom:Math.max((level.width+level.height-1)*ISO_Y+.3,(gx+apron+gy+.6)*ISO_Y)};
}
/** Camera units are CSS pixels, never display pixels. The board can outgrow its viewport. */
export class BoardCamera{
 constructor(){this.width=1;this.height=1;this.size=40;this.userZoom=1;this.fitted=false;this.initialized=false;}
 setLevel(level){this.bounds=islandBounds(level);this.initialized=false;this.userZoom=1;this.fitted=false;}
 resize(width,height){
  if(!this.bounds)return;
  this.width=Math.max(1,width);this.height=Math.max(1,height);
  const b=this.bounds,pad=Math.min(16,this.width*.08,this.height*.08);
  this.padding=pad;
  this.fitSize=Math.max(.1,Math.min((this.width-pad*2)/(b.right-b.left),(this.height-pad*2)/(b.bottom-b.top),82));
  this.baseline=Math.max(this.fitSize,clamp(Math.min(this.width,this.height)*.115,36,52));
  this.size=this.fitted?this.fitSize:clamp(this.baseline*this.userZoom,this.fitSize,104);
  if(!this.initialized){this.center={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};this.initialized=true;}
  this.clamp();
 }
 clamp(){
  const b=this.bounds;if(!b||!this.center)return;
  const constrain=(v,lo,hi,span)=>{const a=lo+span/2,c=hi-span/2;return clamp(v,Math.min(a,c),Math.max(a,c));};
  this.center.x=constrain(this.center.x,b.left,b.right,(this.width-2*this.padding)/this.size);
  this.center.y=constrain(this.center.y,b.top,b.bottom,(this.height-2*this.padding)/this.size);
 }
 get cx(){return this.width/2-this.center.x*this.size;}
 get cy(){return this.height/2-this.center.y*this.size;}
 worldAt(point){return {x:(point.x-this.width/2)/this.size+this.center.x,y:(point.y-this.height/2)/this.size+this.center.y};}
 panBy(dx,dy){this.center.x-=dx/this.size;this.center.y-=dy/this.size;this.clamp();}
 zoomBy(factor,point={x:this.width/2,y:this.height/2}){
  const world=this.worldAt(point);this.fitted=false;this.size=clamp(this.size*factor,this.fitSize,104);this.userZoom=this.size/this.baseline;
  this.center={x:world.x-(point.x-this.width/2)/this.size,y:world.y-(point.y-this.height/2)/this.size};this.clamp();
 }
 fit(){this.fitted=true;this.userZoom=1;this.size=this.fitSize;const b=this.bounds;this.center={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};}
 focusCell(k){const [x,y]=k.split(',').map(Number);this.center={x:(x-y)*ISO_X,y:(x+y)*ISO_Y-.45};this.clamp();}
}
