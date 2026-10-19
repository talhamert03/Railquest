/** Lock the gesture on contact: empty space pans; a wagon/rail draws until release. */
export class BoardGesture{
 constructor(actions){this.actions=actions;this.pointers=new Set();this.active=null;}
 down(id,point){
  if(this.pointers.has(id))return;
  this.pointers.add(id);
  if(this.pointers.size!==1||this.active)return;
  const anchor=this.actions.pick(point),mode=anchor?'draw':'pan';
  this.active={id,mode,anchor,start:point,last:point,moved:false};
  if(anchor)this.actions.begin?.(anchor,point);
  this.actions.mode?.(mode);
 }
 move(id,point){
  const g=this.active;if(!g||g.id!==id||g.mode==='blocked')return;
  if(!g.moved&&Math.hypot(point.x-g.start.x,point.y-g.start.y)<6)return;
  if(!g.moved){g.moved=true;if(g.mode==='draw')this.actions.drawStart?.(g.anchor);}
  if(g.mode==='pan')this.actions.pan(point.x-g.last.x,point.y-g.last.y);
  else this.actions.draw(g.last,point,g.anchor);
  g.last=point;
 }
 up(id,point,cancelled=false){
  if(!this.pointers.delete(id))return;
  const g=this.active;
  if(g?.id===id&&g.mode!=='blocked'){
   if(cancelled&&g.mode==='draw')this.actions.cancel?.();
   else if(!cancelled&&!g.moved)this.actions.tap?.(point,g.anchor);
   if(g.mode==='draw')this.actions.end?.();
   this.active=this.pointers.size?{mode:'blocked'}:null;this.actions.mode?.('idle');
  }
  if(!this.pointers.size)this.active=null;
 }
 cancel(){
  if(this.active?.mode==='draw'){this.actions.cancel?.();this.actions.end?.();}
  this.pointers.clear();this.active=null;this.actions.mode?.('idle');
 }
}
