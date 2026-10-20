import test from 'node:test';
import assert from 'node:assert/strict';
import {economyDefaults,normalizeEconomy,AdPolicy,rewardedSolution,NativeCommerce} from '../dist/js/monetization.js';
import {defaults,normalizeSave,recordWin,nextLevel} from '../dist/js/storage.js';
import {levels} from '../dist/js/levels.js';
import {parseLevel,simulate} from '../dist/js/engine.js';

test('the fourth, eighth and twelfth completed rounds create the automatic ad opportunity',()=>{
 const e=economyDefaults(),p=new AdPolicy(e),boundaries=[];
 for(let i=1;i<=13;i++)if(p.complete(`round-${i}`))boundaries.push(i);
 assert.deepEqual(boundaries,[4,8,12]);assert.equal(e.roundsTowardAd,1);
});
test('replaying a level counts, but duplicate completion callbacks do not',()=>{
 const e=economyDefaults(),p=new AdPolicy(e);
 for(let i=1;i<=4;i++){
  assert.equal(p.complete(`level-1-play-${i}`),i===4);
  assert.equal(p.complete(`level-1-play-${i}`),false);
 }
 assert.equal(e.roundsTowardAd,0);assert.equal(p.complete(null),false);
});
test('three completions survive a restart and the next completion is the ad boundary',()=>{
 const save=defaults(),p=new AdPolicy(save.economy);
 for(let i=0;i<3;i++)p.complete(`round-${i}`);
 const restored=normalizeSave(JSON.parse(JSON.stringify(save)));
 assert.equal(new AdPolicy(restored.economy).complete('next-session'),true);
 assert.equal(restored.economy.roundsTowardAd,0);
});
test('No Ads suppresses automatic ads and resets the counter',()=>{
 const e={version:4,roundsTowardAd:3},p=new AdPolicy(e);
 for(let i=0;i<20;i++)assert.equal(p.complete(`paid-${i}`,{noAds:true}),false);
 assert.equal(e.roundsTowardAd,0);
 for(let i=1;i<=4;i++)assert.equal(p.complete(`free-${i}`),i===4);
});
test('a rewarded auto-solve never adds a second ad or consumes the three pending completions',()=>{
 const e={version:4,roundsTowardAd:3},p=new AdPolicy(e);
 for(let i=0;i<5;i++)assert.equal(p.complete(`assisted-${i}`,{assisted:true}),false);
 assert.equal(e.roundsTowardAd,3);assert.equal(p.complete('next-unassisted'),true);
});
test('a no-fill boundary is consumed once; no immediate retry or progress lock',()=>{
 const e={version:4,roundsTowardAd:3},p=new AdPolicy(e);
 assert.equal(p.complete('no-fill'),true);assert.equal(p.complete('no-fill'),false);
 for(let i=1;i<=4;i++)assert.equal(p.complete(`next-${i}`),i===4);
});
test('cancelled, unavailable, forged purchase status and stale rewards grant no auto-solve',()=>{
 const l=parseLevel(levels.at(-1)),proof=JSON.stringify(l.solution);
 for(const status of ['cancelled','unavailable','preview','purchased','pending',undefined])assert.equal(rewardedSolution(l,{status},'a','a'),null);
 assert.equal(rewardedSolution(l,{status:'earned'},'old','new'),null);
 assert.equal(rewardedSolution(l,{status:'earned'},null,null),null);
 assert.equal(JSON.stringify(l.solution),proof);
});
test('earned rewards provide valid independent routes on every level',()=>{
 for(const data of levels){
  const l=parseLevel(data),routes=rewardedSolution(l,{status:'earned'},'round','round');
  assert.equal(simulate(l,routes).type,'success');assert.notEqual(routes,l.solution);assert.notEqual(routes[1],l.solution[1]);
 }
 const l=parseLevel({...levels[0],solution:{1:['0,1']}});
 assert.equal(rewardedSolution(l,{status:'earned'},'a','a'),null);
});
test('old progress, settings, four-wagon drafts and all campaign completions round-trip',()=>{
 const old={version:2,completed:{36:{stars:3,rails:47}},lastLevel:36,drafts:{35:levels[34].solution},settings:{sound:false},economy:{guideCredits:3,guides:{36:true}}};
 const s=normalizeSave(old);assert.deepEqual(s.completed,old.completed);assert.deepEqual(s.drafts,old.drafts);assert.equal(s.settings.sound,false);
 assert.deepEqual(s.economy,economyDefaults());s.drafts[44]=levels[43].solution;recordWin(s,43,3,35);
 const reloaded=normalizeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(reloaded.drafts[44],levels[43].solution);assert.equal(reloaded.completed[43].stars,3);
 const full=defaults();for(let id=1;id<=levels.length;id++)recordWin(full,id,3,10);assert.equal(nextLevel(full),levels.length);
});
test('a full counter saved under the old five-round cadence shows the ad on the next completion',()=>{
 const e=normalizeEconomy({version:4,roundsTowardAd:4});assert.equal(e.roundsTowardAd,3);assert.equal(new AdPolicy(e).complete('after-update'),true);
});
test('malformed and legacy economy never grant ownership, guide unlocks or reward credits',()=>{
 for(const raw of [null,{version:3,roundsTowardAd:4,guideCredits:999,guides:{44:true}},{version:4,roundsTowardAd:-1},{version:4,roundsTowardAd:5},{version:4,roundsTowardAd:2.5},{version:4,roundsTowardAd:'4',noAds:true}])assert.deepEqual(normalizeEconomy(raw),economyDefaults());
 assert.deepEqual(normalizeEconomy({version:4,roundsTowardAd:3,noAds:true,guides:{1:true}}),{version:4,roundsTowardAd:3});
});
test('web No Ads trial is session-only and no payment host is present',async()=>{
 const host={},c=new NativeCommerce(host);c.previewNoAds=true;assert.equal(c.noAds,true);assert.equal(c.native,false);
 assert.deepEqual(await c.perform('purchase'),{status:'preview'});assert.equal(new NativeCommerce(host).noAds,false);
});
test('late and duplicate native rewards resolve at most one request',async()=>{
 let id;const host={RotaCommerce:{request:requestId=>id=requestId}},c=new NativeCommerce(host);
 const expired=c.request('rewarded',5);assert.deepEqual(await expired,{status:'unavailable'});c.receive(id,{status:'earned'});assert.equal(c.pending.size,0);
 const valid=c.request('rewarded',50);c.receive(id,{status:'earned'});c.receive(id,{status:'cancelled'});assert.deepEqual(await valid,{status:'earned'});assert.equal(c.pending.size,0);
});
test('native ownership comes only from status and one modal transaction runs at a time',async()=>{
 const requests=[],host={RotaCommerce:{request:(id,action)=>requests.push({id,action})}},c=new NativeCommerce(host);
 c.previewNoAds=true;assert.equal(c.noAds,false);const first=c.perform('purchase');assert.equal((await c.perform('purchase')).status,'busy');
 c.receive(requests[0].id,{status:'purchased',noAds:true});await Promise.resolve();
 c.receive(requests.at(-1).id,{status:'ok',noAds:false});assert.equal((await first).status,'purchased');assert.equal(c.noAds,false);
 const refresh=c.refresh();c.receive(requests.at(-1).id,{status:'ok',noAds:true});await refresh;assert.equal(c.noAds,true);
});
test('No Ads owners must still complete a rewarded ad to auto-solve',async()=>{
 const requests=[],host={RotaCommerce:{request:(id,action)=>requests.push({id,action})}},c=new NativeCommerce(host);
 c.state.noAds=true;const reward=c.perform('rewarded');assert.equal(requests[0].action,'rewarded');
 c.receive(requests[0].id,{status:'cancelled'});await Promise.resolve();c.receive(requests.at(-1).id,{status:'ok',noAds:true});
 const result=await reward;assert.equal(c.noAds,true);assert.equal(rewardedSolution(parseLevel(levels[0]),result,'a','a'),null);
});
test('skin ownership and prices come only from native status for known products',async()=>{
 const requests=[],host={RotaCommerce:{request:(id,action)=>requests.push({id,action})}},c=new NativeCommerce(host);
 c.previewOwned.add('wagon_mint');assert.equal(c.owns('wagon_mint'),false);
 const refresh=c.refresh();c.receive(requests[0].id,{status:'ok',owned:['wagon_mint','wagon_fake',7],prices:{wagon_mint:'₺24,99',evil:'x'}});await refresh;
 assert.equal(c.owns('wagon_mint'),true);assert.equal(c.owns('wagon_fake'),false);assert.deepEqual(c.state.prices,{wagon_mint:'₺24,99'});
 const web=new NativeCommerce({});assert.equal(web.owns('wagon_mint'),false);web.previewOwned.add('wagon_mint');assert.equal(web.owns('wagon_mint'),true);
});
test('a stored skin choice survives reload but unknown skins fall back to classic',()=>{
 const s=defaults();s.wagonSkin='halloween';assert.equal(normalizeSave(JSON.parse(JSON.stringify(s))).wagonSkin,'halloween');
 assert.equal(normalizeSave({version:2,wagonSkin:'gold-hack'}).wagonSkin,'classic');
 assert.deepEqual(normalizeSave({version:2,boosts:{1:6,2:4,99:3,3:12}}).boosts,{1:6});
});
