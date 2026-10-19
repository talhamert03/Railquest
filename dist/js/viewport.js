// Resize when browser chrome, a split-screen divider or device orientation changes.
export function watchViewport(host=window,root=document.documentElement){
 let frame=0,lastHeight=0;
 const measure=()=>{
  frame=0;const visual=host.visualViewport;
  const height=Math.round(visual&&Math.abs(visual.scale-1)<.01?visual.height:host.innerHeight);
  if(height>0&&height!==lastHeight){root.style.setProperty('--app-height',`${height}px`);lastHeight=height;}
 };
 const queue=()=>{if(!frame)frame=host.requestAnimationFrame(measure);};
 measure();host.addEventListener('resize',queue);host.addEventListener('orientationchange',queue);host.visualViewport?.addEventListener('resize',queue);
 return ()=>{host.cancelAnimationFrame(frame);host.removeEventListener('resize',queue);host.removeEventListener('orientationchange',queue);host.visualViewport?.removeEventListener('resize',queue);};
}

/** Keep webview/page zoom separate from the board camera. Single-finger scrolling remains native. */
export function guardGameGestures(host=window,doc=document){
 const prevent=e=>{if(e.cancelable!==false)e.preventDefault();};
 const multi=e=>{if(e.touches?.length>1)prevent(e);};
 const wheel=e=>{if(e.ctrlKey)prevent(e);};
 const keys=e=>{if((e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key))prevent(e);};
 const rotate=()=>{
  const portrait=host.innerHeight>host.innerWidth,root=doc.documentElement;
  if(root.dataset.orientation===(portrait?'portrait':'landscape'))return;
  root.dataset.orientation=portrait?'portrait':'landscape';
  if(portrait)host.dispatchEvent(new Event('rota-portrait'));
  const app=doc.querySelector('#app');if(app)app.inert=portrait;
 };
 doc.addEventListener('touchstart',multi,{passive:false});doc.addEventListener('touchmove',multi,{passive:false});
 doc.addEventListener('gesturestart',prevent,{passive:false});doc.addEventListener('gesturechange',prevent,{passive:false});
 doc.addEventListener('wheel',wheel,{passive:false});doc.addEventListener('keydown',keys);
 host.addEventListener('resize',rotate);host.addEventListener('orientationchange',rotate);rotate();
 return ()=>{doc.removeEventListener('touchstart',multi);doc.removeEventListener('touchmove',multi);doc.removeEventListener('gesturestart',prevent);doc.removeEventListener('gesturechange',prevent);doc.removeEventListener('wheel',wheel);doc.removeEventListener('keydown',keys);host.removeEventListener('resize',rotate);host.removeEventListener('orientationchange',rotate);};
}
