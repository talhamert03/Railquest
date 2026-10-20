/** Bounded preload/decode pool. Progress counts completed preparation jobs, not a timer. */
export const IMAGE_SOURCES=Object.freeze({cover:'./assets/cover.webp',props:'./assets/props-v2.webp',vehicles:'./assets/vehicles-v2.webp',conductor:'./assets/conductor.webp',biomesA:'./assets/biomes-desert-snow-v5.webp',biomesB:'./assets/biomes-glacier-clock-v5.webp',skins:'./assets/wagon-skins.webp'});
export const RESOURCE_COUNT=Object.keys(IMAGE_SOURCES).length+1;
const decoded=new Map();
function decodeImage(src){
 if(decoded.has(src))return decoded.get(src);
 const work=new Promise((resolve,reject)=>{
  const im=new Image();let settled=false;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);im.onload=null;im.onerror=null;error?reject(error):resolve(im);};
  const timer=setTimeout(()=>{finish(new Error('Görsel yüklemesi zaman aşımına uğradı.'));im.src='';},20000);
  im.onload=async()=>{try{if(im.decode)await im.decode();finish();}catch{finish(new Error('Bir oyun görseli hazırlanamadı.'));}};
  im.onerror=()=>finish(new Error('Bir oyun görseli yüklenemedi.'));im.src=src;
 });
 decoded.set(src,work);work.catch(()=>decoded.delete(src));return work;
}
async function loadFonts(){
 if(!document.fonts?.load)return;
 // Fonts may fall back to the system face without blocking a playable game.
 let timer;
 await Promise.race([Promise.allSettled([document.fonts.load('400 16px Rubik'),document.fonts.load('700 16px Rubik')]),new Promise(resolve=>{timer=setTimeout(resolve,4000);})]);clearTimeout(timer);
}
export async function prepareResources(onProgress=()=>{},{imageLoader=decodeImage,fontLoader=loadFonts}={}){
 const art={},jobs=Object.entries(IMAGE_SOURCES).map(([id,src])=>async()=>{art[id]=await imageLoader(src);if(!art[id])throw new Error('Bir oyun görseli eksik.');});
 jobs.push(fontLoader);let next=0,completed=0,failure;
 onProgress({completed,total:jobs.length});
 async function worker(){
  while(!failure&&next<jobs.length){const job=jobs[next++];try{await job();completed++;onProgress({completed,total:jobs.length});}catch(error){failure=error;}}
 }
 await Promise.all([worker(),worker(),worker()]);
 if(failure)throw failure;
 return art;
}
