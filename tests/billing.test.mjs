import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPurchase} from '../billing-server/verification.mjs';
const valid=()=>({purchaseStateContext:{purchaseState:'PURCHASED'},productLineItem:[{productId:'rota_plus',productOfferDetails:{refundableQuantity:1,consumptionState:'CONSUMPTION_STATE_YET_TO_BE_CONSUMED'}}],acknowledgementState:'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'});
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
const verify=(body,extra={})=>verifyPurchase({token:'valid-purchase-token',packageName:'com.rotaadalari.game',now:1000,google:async()=>response(body),...extra});
test('only the server-verified non-consumable opens No Ads',async()=>{
 const result=await verify(valid());assert.equal(result.body.entitled,true);assert.equal(result.body.productId,'rota_plus');assert.equal(result.body.validUntil,1000+72*3600000);
});
test('pending, cancelled, wrong products, consumed products, refunds and rental offers never grant',async()=>{
 for(const state of ['PENDING','CANCELLED','PURCHASE_STATE_UNSPECIFIED']){const data=valid();data.purchaseStateContext.purchaseState=state;assert.equal((await verify(data)).body.entitled,false);}
 for(const mutation of [v=>v.productLineItem[0].productId='other',v=>v.productLineItem[0].productOfferDetails.refundableQuantity=0,v=>v.productLineItem[0].productOfferDetails.consumptionState='CONSUMPTION_STATE_CONSUMED',v=>v.productLineItem[0].productOfferDetails.rentOfferDetails={}]){const data=valid();mutation(data);assert.equal((await verify(data)).body.entitled,false);}
});
test('test cards are rejected unless the verifier is explicitly configured for Play testing',async()=>{
 const data={...valid(),testPurchaseContext:{fopType:'TEST'}};assert.equal((await verify(data)).body.entitled,false);assert.equal((await verify(data,{allowTest:true})).body.entitled,true);
});
test('unacknowledged purchases are acknowledged before a successful entitlement response; repeat restore is idempotent',async()=>{
 const data=valid();data.acknowledgementState='ACKNOWLEDGEMENT_STATE_PENDING';const calls=[];
 const result=await verify(data,{google:async(url,options)=>{calls.push({url,options});return options?.method==='POST'?new Response(null,{status:204}):response(data);}});
 assert.equal(result.body.entitled,true);assert.equal(calls.length,2);assert.match(calls[0].url,/applications\/com.rotaadalari.game\/purchases\/productsv2\/tokens\/valid-purchase-token$/);assert.match(calls[1].url,/products\/rota_plus\/tokens\/valid-purchase-token:acknowledge$/);
 assert.equal((await verify(valid())).body.entitled,true);
});
test('verification outages fail closed, revoked tokens deny access and malformed tokens do not call Google',async()=>{
 await assert.rejects(verify(valid(),{google:async()=>response({},503)}));
 assert.equal((await verify(valid(),{google:async()=>response({},410)})).body.entitled,false);
 assert.equal((await verify(valid(),{token:'bad',google:()=>{throw new Error('Must not call');}})).code,400);
 const data=valid();data.acknowledgementState='ACKNOWLEDGEMENT_STATE_PENDING';await assert.rejects(verify(data,{google:async(url,options)=>options?response({},503):response(data)}));
});
test('a wagon skin is verified and acknowledged under its own product id',async()=>{
 const data=valid();data.productLineItem[0].productId='wagon_halloween';data.acknowledgementState='ACKNOWLEDGEMENT_STATE_PENDING';const calls=[];
 const result=await verify(data,{productId:'wagon_halloween',google:async(url,options)=>{calls.push(url);return options?.method==='POST'?new Response(null,{status:204}):response(data);}});
 assert.equal(result.body.entitled,true);assert.equal(result.body.productId,'wagon_halloween');assert.match(calls[1],/products\/wagon_halloween\/tokens\//);
 assert.equal((await verify(data,{productId:'wagon_sakura'})).body.entitled,false);
});
test('the Android product list matches the skins sold in the game',async()=>{
 const {readFile}=await import('node:fs/promises');const {SKIN_PRODUCTS,WAGON_SKINS}=await import('../dist/js/cosmetics.js');
 const java=await readFile(new URL('../android/app/src/main/java/com/rotaadalari/game/BillingController.java',import.meta.url),'utf8');
 const listed=[...java.match(/SKINS=Collections\.unmodifiableList\(Arrays\.asList\(([^)]*)\)/)[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(listed,SKIN_PRODUCTS);assert.equal(SKIN_PRODUCTS.length,10);assert.equal(new Set(WAGON_SKINS.map(s=>s.row)).size,WAGON_SKINS.length);
});
