/**
 * Premium carriage finishes, drawn in the carriage's local space (origin at the sprite's ground
 * anchor, sprite box -w/2..w/2 by -h..0). Every effect stays on the carriage: the sheen is clipped
 * to its silhouette, the glow is its own emissive paint (pre-blurred, added with 'lighter'), and
 * sparkles sit on its brightest paint. Effects are functions of time, use no shadowBlur, and hold
 * still under reduced motion.
 */
import {SKIN_RECTS,SKIN_CELL} from './cosmetics.js';
import {GLINTS} from './skin-glints.js';

const TAU=Math.PI*2;
/** Per finish: sheen colour (null = none), glow behaviour and sparkle colour. */
const FINISH={
 gold:{sheen:'255,246,210',glow:{base:.85,amp:.15,speed:1.6},glint:'255,247,214'},
 neon:{sheen:'190,240,255',sheenAlpha:.35,glow:{base:.86,amp:.14,speed:3.2,flicker:true},glint:'200,250,255'},
 rosegold:{sheen:'255,236,228',glow:{base:.8,amp:.2,speed:1.4},glint:'255,240,232'},
 lava:{sheen:null,glow:{base:.62,amp:.38,speed:1.1},embers:true},
 emerald:{sheen:'230,255,240',glow:{base:.85,amp:.15,speed:1.5},glint:'255,243,200'},
 ruby:{sheen:'255,226,226',glow:{base:.85,amp:.15,speed:1.5},glint:'255,238,205'},
 pearl:{sheen:'255,240,255',sheenAlpha:.5,glow:{base:.8,amp:.2,speed:1.2},glint:'255,244,255'},
 galaxy:{sheen:'200,180,255',sheenAlpha:.35,glow:{base:.7,amp:.3,speed:2.6,twinkle:true},glint:'220,240,255'},
 frost:{sheen:'240,252,255',glow:{base:.8,amp:.2,speed:1.3},glint:'245,253,255'},
 halloween:{sheen:'255,214,170',sheenAlpha:.4,glow:{base:.72,amp:.28,speed:7,candle:true},glint:'214,255,170'},
};
let scratch=null;
function canvasFor(w,h){
 if(!scratch)scratch=document.createElement('canvas');
 if(scratch.width<w||scratch.height<h){scratch.width=Math.max(scratch.width,w);scratch.height=Math.max(scratch.height,h);}
 return scratch;
}
function sparkle(c,x,y,r,rgb,a){
 c.fillStyle=`rgba(${rgb},${a*.35})`;c.beginPath();c.arc(x,y,r*.55,0,TAU);c.fill();
 c.fillStyle=`rgba(${rgb},${a})`;c.beginPath();
 for(let i=0;i<8;i++){const ang=i*Math.PI/4-Math.PI/2,q=i%2?r*.18:r;i?c.lineTo(x+Math.cos(ang)*q,y+Math.sin(ang)*q):c.moveTo(x+Math.cos(ang)*q,y+Math.sin(ang)*q);}
 c.closePath();c.fill();
}
function glowLevel(g,t,seed){
 let v=g.base+g.amp*Math.sin(t*g.speed+seed);
 if(g.flicker&&Math.sin(t*13.7+seed*3)>.985)v*=.35;
 if(g.candle)v=g.base+g.amp*(.6*Math.sin(t*g.speed+seed)+.4*Math.sin(t*g.speed*2.9+seed*2));
 return Math.max(0,Math.min(1,v));
}

/**
 * Draws a skinned carriage. art: {skins, skinGlow}. o: {t, dir, s, reduced, seed}.
 * Falls back to the plain painted sprite when an image is missing.
 */
export function drawSkinnedCar(c,art,skin,w,h,o){
 const dir=o.dir%4,[sx,sy0,sw,sh]=SKIN_RECTS[dir],sy=sy0+skin.row*SKIN_CELL[1],f=FINISH[skin.id]||{},t=o.reduced?0:o.t,seed=o.seed||0;
 // Sheen: a soft band of light crosses the carriage every few seconds, clipped to its shape.
 const period=4.2,phase=((t+seed*.37)%period)/period,sweep=!o.reduced&&f.sheen&&phase<.38;
 if(sweep&&c.getTransform){
  const m=c.getTransform(),scale=Math.min(3,Math.hypot(m.a,m.b)),pw=Math.max(8,Math.ceil(w*scale)),ph=Math.max(8,Math.ceil(h*scale)),k=canvasFor(pw,ph),x=k.getContext('2d');
  x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,pw,ph);x.globalCompositeOperation='source-over';x.drawImage(art.skins,sx,sy,sw,sh,0,0,pw,ph);
  x.globalCompositeOperation='source-atop';
  // A narrow diagonal band over the roof and body only; the wheels below ~74% keep their colour.
  const p=phase/.38,cx=(-.3+p*1.6)*pw,g=x.createLinearGradient(cx-pw*.13,ph*.1,cx+pw*.13,ph*.42);
  const a=f.sheenAlpha??.55;g.addColorStop(0,`rgba(${f.sheen},0)`);g.addColorStop(.5,`rgba(${f.sheen},${a})`);g.addColorStop(1,`rgba(${f.sheen},0)`);
  x.fillStyle=g;x.fillRect(0,0,pw,ph*.74);x.globalCompositeOperation='source-over';
  c.drawImage(k,0,0,pw,ph,-w/2,-h,w,h);
 }else c.drawImage(art.skins,sx,sy,sw,sh,-w/2,-h,w,h);
 // Emissive paint breathes (neon flickers, a jack-o'-lantern glow wavers).
 if(art.skinGlow&&f.glow){
  const prev=c.globalCompositeOperation,alpha=c.globalAlpha;
  c.globalCompositeOperation='lighter';c.globalAlpha=alpha*(o.reduced?f.glow.base:glowLevel(f.glow,t,seed));
  c.drawImage(art.skinGlow,sx/2,sy/2,sw/2,sh/2,-w/2,-h,w,h);
  c.globalCompositeOperation=prev;c.globalAlpha=alpha;
 }
 if(o.reduced)return;
 // Sparkles where the light catches the paint.
 const spots=GLINTS[skin.id]?.[dir]||[];
 if(f.glint)spots.forEach(([u,v],i)=>{
  const life=Math.sin(t*(f.glow?.twinkle?2.2:1.15)+i*2.399+seed);if(life<.55)return;
  const a=(life-.55)/.45;sparkle(c,-w/2+u*w,-h+v*h,o.s*(.05+.06*a),f.glint,a);
 });
 // Lava sheds a few embers that rise off the roof.
 if(f.embers)for(let i=0;i<4;i++){
  const p=((t*.45+i/4+seed*.13)%1+1)%1,x=-w*.35+((i*.29+seed*.07)%1)*w*.7+Math.sin(t*2+i)*o.s*.05,y=-h*.72-p*h*.55;
  c.fillStyle=`rgba(255,${150+Math.round(80*(1-p))},60,${(1-p)*.9})`;c.beginPath();c.arc(x,y,o.s*(.035*(1-p)+.01),0,TAU);c.fill();
 }
}
