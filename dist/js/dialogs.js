/** Native dialogs when available; an accessible in-page modal on older WebViews. */
export function revealDialog(el){
 if(typeof el.showModal==='function'){
  try{el.showModal();return 'native';}catch{/* The same content remains reachable through the fallback. */}
 }
 el.setAttribute('open','');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.classList.add('dialog-fallback');
 return 'fallback';
}
export function dismissDialog(el){
 if(typeof el.close==='function'){try{el.close();}catch{/* Removal below is authoritative. */}}
 el.removeAttribute('open');el.remove();
}
