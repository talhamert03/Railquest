import {levels} from './levels.js';
import {economyDefaults,normalizeEconomy} from './monetization.js';
const KEY='rota-adalari.save.v2',LEGACY='rota-adalari.save.v1',COUNT=levels.length;
export const defaults=()=>({version:2,completed:{},lastLevel:1,hasStarted:false,drafts:{},economy:economyDefaults(),settings:{sound:true,music:true,haptics:true,weather:true,reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches}});
const validId=id=>/^\d+$/.test(id)&&Number(id)>=1&&Number(id)<=COUNT;
export function normalizeSave(raw){
 const out=defaults();if(!raw||typeof raw!=='object')return out;
 for(const k of Object.keys(out.settings))if(typeof raw.settings?.[k]==='boolean')out.settings[k]=raw.settings[k];
 if(raw.version!==2)return out;
 out.economy=normalizeEconomy(raw.economy);
 if(Number.isInteger(raw.lastLevel)&&raw.lastLevel>=1&&raw.lastLevel<=COUNT)out.lastLevel=raw.lastLevel;
 for(const [id,v] of Object.entries(raw.completed||{})){
  if(validId(id)&&v&&Number.isInteger(v.stars)&&v.stars>=1&&v.stars<=3&&Number.isInteger(v.rails)&&v.rails>=0&&v.rails<150)out.completed[id]={stars:v.stars,rails:v.rails};
 }
 for(const [id,routes] of Object.entries(raw.drafts||{})){
  if(!validId(id)||!routes||typeof routes!=='object'||Array.isArray(routes)||Object.keys(routes).length>6)continue;
  if(Object.entries(routes).every(([n,p])=>/^[1-6]$/.test(n)&&Array.isArray(p)&&p.length>0&&p.length<200&&p.every(k=>typeof k==='string'&&/^\d{1,2},\d{1,2}$/.test(k))))out.drafts[id]=routes;
 }
 out.hasStarted=raw.hasStarted===true||out.lastLevel>1||Object.keys(out.completed).length>0||Object.keys(out.drafts).length>0;
 return out;
}
export function loadSave(storage){
 try{const s=storage??globalThis.localStorage,raw=s.getItem(KEY);return normalizeSave(JSON.parse(raw||s.getItem(LEGACY)));}catch{return defaults();}
}
export function writeSave(save,storage){try{(storage??globalThis.localStorage).setItem(KEY,JSON.stringify(save));return true;}catch{return false;}}
export function recordWin(save,id,stars,rails){save.hasStarted=true;const old=save.completed[id];save.completed[id]={stars:Math.max(old?.stars||0,stars),rails:Math.min(old?.rails??Infinity,rails)};delete save.drafts[id];save.lastLevel=Math.min(COUNT,id+1);return save;}
export function nextLevel(save){for(let i=1;i<=COUNT;i++)if(!save.completed[i])return i;return COUNT;}
export const totalStars=save=>Object.values(save.completed).reduce((n,v)=>n+v.stars,0);

// A fresh install opens the journey; returning players resume their selected stop.
export const homeDestination=save=>save.hasStarted?{screen:'game',level:save.lastLevel}:{screen:'map',level:1};
