/**
 * Roof accessories and animated effects of the wagon skins.
 * Drawn in the carriage's local space: origin at the sprite's ground anchor, y up is negative,
 * w/h the drawn sprite size, s the board cell size. Effects are pure functions of time (no
 * particle state), use no shadowBlur, and stay still under reduced motion.
 */
const TAU=Math.PI*2;
// Screen direction of travel for carriage directions 0..3 (right-down, left-down, left-up, right-up).
const HEADING=[[.866,.48],[-.866,.48],[-.866,-.48],[.866,-.48]];

function star(c,x,y,r,color){
 c.beginPath();
 for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,q=i%2?r*.32:r;i?c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q):c.moveTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}
 c.closePath();c.fillStyle=color;c.fill();
}
function disc(c,x,y,r,color){if(r<=0)return;c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill();}
function heart(c,x,y,r,color){
 c.beginPath();c.moveTo(x,y+r*.9);c.bezierCurveTo(x-r*1.4,y-r*.1,x-r*.6,y-r*1.2,x,y-r*.35);c.bezierCurveTo(x+r*.6,y-r*1.2,x+r*1.4,y-r*.1,x,y+r*.9);c.fillStyle=color;c.fill();
}
function bat(c,x,y,r,flap,color){
 const f=.35+.65*Math.abs(Math.sin(flap));
 c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-r*.6,y-r*f,x-r*1.5,y-r*.5*f);c.quadraticCurveTo(x-r*1.1,y+r*.1,x-r*.75,y-r*.05);c.quadraticCurveTo(x-r*.5,y+r*.35,x,y+r*.2);
 c.quadraticCurveTo(x+r*.5,y+r*.35,x+r*.75,y-r*.05);c.quadraticCurveTo(x+r*1.1,y+r*.1,x+r*1.5,y-r*.5*f);c.quadraticCurveTo(x+r*.6,y-r*f,x,y);c.fillStyle=color;c.fill();
}
/** Gentle cycle 0..1 per item, offset so items never move in lockstep. */
const cycle=(t,speed,i,n)=>((t*speed+i/n)%1+1)%1;

/** Drawn under the carriage: trails and anything that should pass behind it. */
export function drawSkinBack(c,id,o){
 const {reduced}=o;
 if(reduced)return;
 if(id==='galaxy'){
  const a=t*1.3;if(Math.sin(a)<0)planet(c,o,a);
 }
}
function planet(c,{w,h,s},a){
 const x=Math.cos(a)*w*.62,y=-h*.5+Math.sin(a)*h*.2,r=s*.11;
 disc(c,x,y,r,'#ffb86b');disc(c,x-r*.3,y-r*.3,r*.45,'rgba(255,255,255,.45)');
 c.save();c.translate(x,y);c.rotate(-.35);c.beginPath();c.ellipse(0,0,r*1.8,r*.5,0,0,TAU);c.strokeStyle='#ffe6a8';c.lineWidth=Math.max(1,s*.025);c.stroke();c.restore();
}

/** Drawn over the carriage: roof accessories and effects in front of it. */
export function drawSkinFront(c,id,o){
 const {w,h,s,t,dir,reduced}=o,side=dir%2?-1:1,tt=reduced?0:t;
 // Accessories sit on the roof's front end so the number badge above the middle stays readable.
 const ax=side*w*.24,ay=-h*.8;
 switch(id){
  case 'dragon':{
   // Wings beat on the roof, horns at the front; a breath of fire every few seconds.
   const beat=reduced?.6:.45+.55*Math.abs(Math.sin(tt*5));
   for(const k of [-1,1]){
    c.save();c.translate(-ax*.25,-h*.86);c.scale(k,beat);
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(w*.18,-s*.42,w*.4,-s*.3);c.quadraticCurveTo(w*.33,-s*.16,w*.28,-s*.1);c.quadraticCurveTo(w*.22,-s*.02,w*.14,-s*.06);c.quadraticCurveTo(w*.1,0,0,0);
    c.fillStyle='#2f8f4a';c.fill();c.strokeStyle='#14532d';c.lineWidth=Math.max(1,s*.02);c.stroke();c.restore();
   }
   for(const k of [-1,1]){c.beginPath();c.moveTo(ax+k*s*.07,ay+s*.02);c.quadraticCurveTo(ax+k*s*.12,ay-s*.14,ax+k*s*.18,ay-s*.2);c.lineTo(ax+k*s*.03,ay+s*.02);c.fillStyle='#fff4d6';c.fill();}
   if(!reduced){
    const breath=Math.max(0,Math.sin(tt*1.4))**4;
    if(breath>.02){
     const [hx,hy]=HEADING[dir%4],fx=hx*w*.5,fy=-h*.42+hy*w*.25;
     for(let i=0;i<6;i++){const p=cycle(tt,1.6,i,6),d=p*s*.9;disc(c,fx+hx*d,fy+hy*d-p*s*.25,s*(.05+p*.12)*breath,['#fff3a6','#ffd23f','#ff9a3c','#ff5a36','#e0442b','#a8321f'][i]);}
    }
   }
   break;
  }
  case 'unicorn':{
   // Golden spiral horn and twinkling sparkles.
   c.beginPath();c.moveTo(ax-s*.07,ay+s*.02);c.lineTo(ax+side*s*.06,ay-s*.34);c.lineTo(ax+s*.07,ay+s*.02);c.closePath();c.fillStyle='#ffd45c';c.fill();
   c.strokeStyle='#e0a325';c.lineWidth=Math.max(1,s*.018);for(let i=1;i<4;i++){const y=ay-i*s*.08;c.beginPath();c.moveTo(ax-s*.06+i*s*.012,y+s*.03);c.lineTo(ax+s*.05-i*s*.012,y);c.stroke();}
   for(let i=0;i<3;i++){const p=reduced?.5:(Math.sin(tt*3+i*2.1)+1)/2;star(c,Math.cos(i*2.2)*w*.42,-h*(.4+i*.22),s*(.04+.07*p),`rgba(255,${200+i*20},${240-i*30},${.4+.6*p})`);}
   break;
  }
  case 'galaxy':{
   const a=tt*1.3;if(Math.sin(a)>=0)planet(c,o,a);
   for(let i=0;i<4;i++){const p=reduced?.6:(Math.sin(tt*2.4+i*1.7)+1)/2;star(c,Math.cos(i*1.9+1)*w*.5,-h*(.25+(i%3)*.28),s*(.03+.06*p),`rgba(220,240,255,${.35+.65*p})`);}
   break;
  }
  case 'halloween':{
   const glow=reduced?.35:.3+.15*Math.sin(tt*9)+.08*Math.sin(tt*23);
   disc(c,ax,ay,s*.2,`rgba(255,200,60,${glow})`);
   pumpkin(c,ax,ay,s*.14);
   if(!reduced)for(let i=0;i<2;i++){const a=tt*1.1+i*Math.PI;bat(c,Math.cos(a)*w*.55,-h*1.05+Math.sin(a*2)*s*.12,s*.11,tt*10+i,'#2a1838');}
   break;
  }
  case 'icequeen':{
   // A small crystal crown; snowflakes drift down around the carriage.
   const spikes=[[-.1,.16],[-.05,.24],[0,.32],[.05,.24],[.1,.16]];
   for(const [dx,hgt] of spikes){c.beginPath();c.moveTo(ax+dx*s-s*.035,ay+s*.02);c.lineTo(ax+dx*s,ay-hgt*s);c.lineTo(ax+dx*s+s*.035,ay+s*.02);c.closePath();c.fillStyle='#d6f3ff';c.fill();c.strokeStyle='#7cc4ef';c.lineWidth=Math.max(1,s*.015);c.stroke();}
   if(!reduced)for(let i=0;i<5;i++){const p=cycle(tt,.35,i,5),x=Math.cos(i*2.4)*w*.55+Math.sin(tt*1.5+i)*s*.08,y=-h*1.15+p*h*1.1;flake(c,x,y,s*.05,`rgba(255,255,255,${Math.sin(p*Math.PI)})`);}
   break;
  }
  case 'sakura':{
   for(let i=0;i<3;i++)blossom(c,ax+(i-1)*s*.08,ay-Math.abs(i-1)*-s*.01-s*.03,s*.055,'#ff8fb8');
   if(!reduced)for(let i=0;i<5;i++){const p=cycle(tt,.28,i,5),x=Math.cos(i*2.1)*w*.6+Math.sin(tt*2+i*1.3)*s*.12,y=-h*1.2+p*h*1.25;c.save();c.translate(x,y);c.rotate(tt*2+i);c.globalAlpha=Math.sin(p*Math.PI);c.beginPath();c.ellipse(0,0,s*.05,s*.028,0,0,TAU);c.fillStyle='#ffb3cf';c.fill();c.restore();}
   break;
  }
  case 'mermaid':{
   starfish(c,ax,ay-s*.03,s*.1,reduced?0:Math.sin(tt*1.5)*.15);
   if(!reduced)for(let i=0;i<5;i++){const p=cycle(tt,.45,i,5),x=Math.cos(i*2.3)*w*.45+Math.sin(tt*3+i)*s*.05,y=-h*.3-p*h*.95,r=s*(.025+.03*p);c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=`rgba(230,255,255,${1-p})`;c.lineWidth=Math.max(1,s*.015);c.stroke();disc(c,x-r*.35,y-r*.35,r*.25,`rgba(255,255,255,${1-p})`);}
   break;
  }
  case 'royal':{
   crown(c,ax,ay,s*.13);
   if(!reduced)for(let i=0;i<3;i++){const p=(Math.sin(tt*2.2+i*2.4)+1)/2;if(p>.6)star(c,Math.cos(i*2.5)*w*.38,-h*(.3+i*.17),s*.1*(p-.6)*2.5,'rgba(255,240,180,.95)');}
   break;
  }
  case 'candy':{
   // Lollipop on the roof, little hearts floating up.
   c.strokeStyle='#fff';c.lineWidth=Math.max(1.5,s*.03);c.beginPath();c.moveTo(ax,ay+s*.02);c.lineTo(ax,ay-s*.2);c.stroke();
   const lx=ax,ly=ay-s*.26,r=s*.1;disc(c,lx,ly,r,'#ff7fb0');
   c.save();c.translate(lx,ly);c.rotate(reduced?0:tt*1.5);c.strokeStyle='#fff';c.lineWidth=Math.max(1,s*.025);c.beginPath();for(let k=0;k<=24;k++){const a=k/24*TAU*2,q=r*.85*k/24;k?c.lineTo(Math.cos(a)*q,Math.sin(a)*q):c.moveTo(0,0);}c.stroke();c.restore();
   if(!reduced)for(let i=0;i<3;i++){const p=cycle(tt,.4,i,3),x=Math.cos(i*2.6)*w*.4+Math.sin(tt*2+i)*s*.06;c.globalAlpha=Math.sin(p*Math.PI);heart(c,x,-h*.5-p*h*.8,s*(.04+.03*p),['#ff6fa5','#ff9ec4','#ffd1e4'][i]);c.globalAlpha=1;}
   break;
  }
  case 'firefly':{
   // Toadstool on the roof; fireflies blink around the carriage.
   c.fillStyle='#fff1dc';c.fillRect(ax-s*.025,ay-s*.1,s*.05,s*.11);
   c.beginPath();c.ellipse(ax,ay-s*.1,s*.11,s*.075,0,Math.PI,TAU);c.fillStyle='#e0412f';c.fill();
   for(const [dx,dy] of [[-.05,-.13],[.02,-.155],[.06,-.12]])disc(c,ax+dx*s,ay+dy*s,s*.016,'#fff');
   for(let i=0;i<5;i++){
    const a=(reduced?0:tt*.9)+i*1.26,x=Math.cos(a)*w*(.45+.1*Math.sin(i)),y=-h*(.45+.35*((i*.37)%1))+Math.sin(a*2)*s*.06,blink=reduced?.7:Math.max(0,Math.sin(tt*3+i*1.9));
    if(blink<.05)continue;disc(c,x,y,s*.07*blink,`rgba(220,255,120,${.25*blink})`);disc(c,x,y,s*.025,`rgba(250,255,170,${blink})`);
   }
   break;
  }
 }
}
function pumpkin(c,x,y,r){
 c.save();c.translate(x,y);
 c.fillStyle='#3e7d2c';c.fillRect(-r*.12,-r*1.25,r*.24,r*.45);
 c.beginPath();c.ellipse(0,0,r*1.05,r*.85,0,0,TAU);c.fillStyle='#f28a1e';c.fill();c.lineWidth=Math.max(1,r*.12);c.strokeStyle='#a4520c';c.stroke();
 c.beginPath();c.ellipse(0,0,r*.45,r*.85,0,0,TAU);c.strokeStyle='rgba(164,82,12,.6)';c.stroke();
 c.fillStyle='#ffe066';
 for(const sx of [-1,1]){c.beginPath();c.moveTo(sx*r*.45,-r*.12);c.lineTo(sx*r*.2,-r*.12);c.lineTo(sx*r*.33,-r*.42);c.closePath();c.fill();}
 c.beginPath();c.moveTo(-r*.55,r*.18);c.quadraticCurveTo(0,r*.7,r*.55,r*.18);c.quadraticCurveTo(0,r*.38,-r*.55,r*.18);c.fill();
 c.restore();
}
function flake(c,x,y,r,color){c.strokeStyle=color;c.lineWidth=Math.max(1,r*.35);c.beginPath();for(let i=0;i<3;i++){const a=i*Math.PI/3;c.moveTo(x-Math.cos(a)*r,y-Math.sin(a)*r);c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.stroke();}
function blossom(c,x,y,r,color){for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2;disc(c,x+Math.cos(a)*r*.7,y+Math.sin(a)*r*.7,r*.55,color);}disc(c,x,y,r*.35,'#ffe27a');}
function starfish(c,x,y,r,tilt){
 c.save();c.translate(x,y);c.rotate(tilt);c.beginPath();
 for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,q=i%2?r*.42:r;i?c.lineTo(Math.cos(a)*q,Math.sin(a)*q):c.moveTo(Math.cos(a)*q,Math.sin(a)*q);}
 c.closePath();c.fillStyle='#ff9a76';c.fill();c.strokeStyle='#d8603c';c.lineWidth=Math.max(1,r*.12);c.stroke();
 for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2;disc(c,Math.cos(a)*r*.45,Math.sin(a)*r*.45,r*.08,'#fff1e6');}
 c.restore();
}
function crown(c,x,y,r){
 c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r,y-r*.9);c.lineTo(x-r*.5,y-r*.45);c.lineTo(x,y-r*1.2);c.lineTo(x+r*.5,y-r*.45);c.lineTo(x+r,y-r*.9);c.lineTo(x+r,y);c.closePath();
 c.fillStyle='#ffd34d';c.fill();c.strokeStyle='#b8860b';c.lineWidth=Math.max(1,r*.12);c.stroke();
 disc(c,x,y-r*.42,r*.2,'#e0245e');disc(c,x-r*.62,y-r*.3,r*.12,'#3db7ff');disc(c,x+r*.62,y-r*.3,r*.12,'#3db7ff');
 for(const dx of [-1,0,1])disc(c,x+dx*r*(dx?1:0),y-r*(dx?.92:1.22),r*.13,'#fff3b0');
}
