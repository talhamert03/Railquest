/** Fixed particle budget; no particle allocation inside a frame. */
export function createWeather(width,height,kind,seed=1){
 const count=kind==='snow'?Math.min(36,Math.max(14,Math.floor(width*height/15000))):kind==='dust'?22:kind==='frost'?12:kind==='glow'?10:kind==='motes'?12:0;
 return Array.from({length:count},(_,i)=>({x:((i*73+seed*19)%997)/997,y:((i*137+seed*43)%991)/991,size:.65+(i%4)*.35,speed:kind==='dust'?15+i%7:7+i%9,phase:i*1.7}));
}
export function paintWeather(ctx,particles,{width,height,kind,time,enabled=true,reducedMotion=false}){
 if(!enabled||reducedMotion||!particles.length)return;
 ctx.save();ctx.lineCap='round';
 for(const p of particles){
  const drift=Math.sin(time*.25+p.phase)*9;
  const x=kind==='dust'?(p.x*width+time*p.speed*1.8)%(width+60)-30:p.x*width+drift;
  const y=kind==='snow'?(p.y*height+time*p.speed)%(height+20)-10:p.y*height+Math.sin(time*.4+p.phase)*5;
  if(kind==='dust'){
   ctx.globalAlpha=.08+(Math.sin(time*.7+p.phase)+1)*.035;ctx.strokeStyle='#ad784c';ctx.lineWidth=p.size*.6;
   ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+10,y-2,x+24+p.size*5,y-1);ctx.stroke();
  }else{
   ctx.globalAlpha=kind==='snow'?.23+(p.size/3)*.18:.12+(Math.sin(time*.7+p.phase)+1)*.08;
   ctx.fillStyle=kind==='glow'||kind==='motes'?'#ffe6a1':'#fffefa';ctx.beginPath();ctx.arc(x,y,kind==='frost'?p.size*.65:p.size,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.restore();
}
