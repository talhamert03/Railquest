import {prepareResources,RESOURCE_COUNT} from './resources.js';
import {watchViewport,guardGameGestures} from './viewport.js';
import {L,LANG} from './i18n.js';
watchViewport();guardGameGestures();
const panel=document.querySelector('#loading-screen'),bar=document.querySelector('#loading-progress'),number=document.querySelector('#loading-percent'),status=document.querySelector('#loading-status'),retry=document.querySelector('#loading-retry');
let running=false,moduleFailed=false;
// index.html ships in Turkish; other device languages get the English shell before loading starts.
if(LANG!=='tr'){
 const set=(sel,text)=>{const el=document.querySelector(sel);if(el)el.textContent=text;};
 document.title='Railquest — Journey of Keys';
 document.querySelector('meta[name=description]')?.setAttribute('content','58 original rail puzzles. Six wagons, keyed barriers, fragile bridges and lively islands. A cozy train journey made for phones.');
 panel.setAttribute('aria-label','Loading the game');document.querySelector('.loading-art')?.setAttribute('alt','A little train island');
 set('.loading-copy>.eyebrow','A LITTLE JOURNEY');bar.setAttribute('aria-label','Game loading');retry.textContent='Try again';
 set('#rotate-screen h2','Turn your journey sideways.');
 const rotate=document.querySelector('#rotate-screen p');if(rotate)rotate.innerHTML='Railquest is played in landscape.<br>Turn your phone or tablet sideways.';
}
async function boot(){
 if(running)return;running=true;retry.hidden=true;
 let resources=0,moduleReady=0,mounted=0,failed=false;
 const update=()=>{if(failed)return;const value=Math.floor((resources+moduleReady+mounted)/(RESOURCE_COUNT+2)*100);bar.value=value;panel.style.setProperty('--progress',value/100);number.textContent=`${value}%`;status.textContent=value===100?L('Yolculuk hazır.','Ready to roll.'):L('Adalar yolculuğa hazırlanıyor…','Getting the islands ready…');};
 update();
 try{
  const [art,game]=await Promise.all([prepareResources(p=>{resources=p.completed;update();}),import('./app.js').then(m=>{moduleReady=1;update();return m;}).catch(error=>{moduleFailed=true;throw error;})]);
  game.mountGame(art);mounted=1;update();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(document.documentElement.dataset.motion!=='reduced'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&panel.animate)await panel.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-out',fill:'forwards'}).finished.catch(()=>{});
  panel.remove();
 }catch(error){failed=true;status.textContent=L('Yükleme tamamlanamadı. Bağlantını kontrol edip yeniden deneyebilirsin.','Loading didn’t finish. Check your connection and try again.');retry.hidden=false;}
 finally{running=false;}
}
retry.addEventListener('click',()=>moduleFailed?location.reload():boot());boot();
