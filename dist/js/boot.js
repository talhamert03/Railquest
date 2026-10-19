import {prepareResources,RESOURCE_COUNT} from './resources.js';
import {watchViewport,guardGameGestures} from './viewport.js';
watchViewport();guardGameGestures();
const panel=document.querySelector('#loading-screen'),bar=document.querySelector('#loading-progress'),number=document.querySelector('#loading-percent'),status=document.querySelector('#loading-status'),retry=document.querySelector('#loading-retry');
let running=false,moduleFailed=false;
async function boot(){
 if(running)return;running=true;retry.hidden=true;
 let resources=0,moduleReady=0,mounted=0,failed=false;
 const update=()=>{if(failed)return;const value=Math.floor((resources+moduleReady+mounted)/(RESOURCE_COUNT+2)*100);bar.value=value;number.textContent=`${value}%`;status.textContent=value===100?'Yolculuk hazır.':'Adalar yolculuğa hazırlanıyor…';};
 update();
 try{
  const [art,game]=await Promise.all([prepareResources(p=>{resources=p.completed;update();}),import('./app.js').then(m=>{moduleReady=1;update();return m;}).catch(error=>{moduleFailed=true;throw error;})]);
  game.mountGame(art);mounted=1;update();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(document.documentElement.dataset.motion!=='reduced'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&panel.animate)await panel.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-out',fill:'forwards'}).finished.catch(()=>{});
  panel.remove();
 }catch(error){failed=true;status.textContent='Yükleme tamamlanamadı. Bağlantını kontrol edip yeniden deneyebilirsin.';retry.hidden=false;}
 finally{running=false;}
}
retry.addEventListener('click',()=>moduleFailed?location.reload():boot());boot();
