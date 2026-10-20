/** One interstitial opportunity after every four completed, unassisted rounds. */
import {cloneRoutes,simulate} from './engine.js';
export const AD_POLICY=Object.freeze({roundsPerAd:4,legacyRoundsPerAd:5});
export const economyDefaults=()=>({version:4,roundsTowardAd:0});
export function normalizeEconomy(raw){
 const out=economyDefaults();
 // Saves from the five-round cadence keep their progress; a full counter means the next completion shows the ad.
 if(raw?.version===4&&Number.isInteger(raw.roundsTowardAd)&&raw.roundsTowardAd>=0&&raw.roundsTowardAd<AD_POLICY.legacyRoundsPerAd)out.roundsTowardAd=Math.min(raw.roundsTowardAd,AD_POLICY.roundsPerAd-1);
 return out;
}
export class AdPolicy{
 constructor(economy){this.economy=economy;this.completed=new Set();}
 complete(roundId,{noAds=false,assisted=false}={}){
  if(!roundId||this.completed.has(roundId))return false;
  this.completed.add(roundId);
  if(this.completed.size>200)this.completed.delete(this.completed.values().next().value);
  if(noAds){this.economy.roundsTowardAd=0;return false;}
  if(assisted)return false;
  this.economy.roundsTowardAd++;
  if(this.economy.roundsTowardAd<AD_POLICY.roundsPerAd)return false;
  this.economy.roundsTowardAd=0;return true;
 }
}
/** Rewards apply to the requesting playthrough; the bridge consumes each callback once. */
export function rewardedSolution(level,result,requestedRound,currentRound){
 if(result?.status!=='earned'||!requestedRound||requestedRound!==currentRound)return null;
 if(simulate(level,level.solution).type!=='success')return null;
 return cloneRoutes(level.solution);
}
/** The native host resolves requests once. Late/duplicate ad callbacks cannot grant rewards. */
export class NativeCommerce{
 constructor(host=globalThis){
  this.host=host;this.native=typeof host.RotaCommerce?.request==='function';this.previewNoAds=false;this.state={noAds:false,rewardedReady:false,interstitialReady:false,billingReady:false,privacyRequired:false,price:null};this.pending=new Map();this.serial=0;this.busy=false;
  if(this.native){host.rotaCommerceResult=(id,result)=>this.receive(id,result);host.addEventListener?.('rota-commerce-changed',()=>this.refresh());}
 }
 get noAds(){return this.native?this.state.noAds:this.previewNoAds;}
 receive(id,result){const p=this.pending.get(id);if(!p)return;this.pending.delete(id);clearTimeout(p.timer);p.resolve(result&&typeof result==='object'?result:{status:'error'});}
 request(action,timeoutMs=15000){
  if(!this.native)return Promise.resolve({status:'preview'});
  const id=`rota-${++this.serial}`;
  return new Promise(resolve=>{const timer=setTimeout(()=>{this.pending.delete(id);resolve({status:'unavailable'});},timeoutMs);this.pending.set(id,{resolve,timer});try{this.host.RotaCommerce.request(id,action);}catch{this.receive(id,{status:'unavailable'});}});
 }
 async refresh(){const result=await this.request('status');if(result.status==='ok'){const previous=JSON.stringify(this.state);for(const k of ['noAds','rewardedReady','interstitialReady','billingReady','privacyRequired'])this.state[k]=result[k]===true;this.state.price=typeof result.price==='string'?result.price:null;if(JSON.stringify(this.state)!==previous)this.onChange?.(this.state);}return this.state;}
 async perform(action){
  if(this.busy)return {status:'busy'};this.busy=true;
  try{const result=await this.request(action,action==='rewarded'||action==='interstitial'?300000:120000);await this.refresh();return result;}finally{this.busy=false;}
 }
}
