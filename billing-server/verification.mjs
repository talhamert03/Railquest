/** All business decisions use the authenticated Google response, never client flags. */
export async function verifyPurchase({token,packageName,productId='rota_plus',allowTest=false,google,now=Date.now()}){
 if(typeof token!=='string'||token.length<8||token.length>4096||/\s/.test(token))return {code:400,body:{error:'invalid_request'}};
 const base=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases`;
 const response=await google(`${base}/productsv2/tokens/${encodeURIComponent(token)}`);
 if(response.status===404||response.status===410)return {code:200,body:{entitled:false,productId}};
 if(!response.ok)throw new Error('Play verification unavailable');
 const valid=purchase=>{const item=purchase.productLineItem?.find(v=>v.productId===productId),offer=item?.productOfferDetails;return purchase.purchaseStateContext?.purchaseState==='PURCHASED'&&item&&!offer?.rentOfferDetails&&!offer?.preorderOfferDetails&&offer?.refundableQuantity!==0&&offer?.consumptionState!=='CONSUMPTION_STATE_CONSUMED'&&(!purchase.testPurchaseContext||allowTest);};
 const purchase=await response.json();
 if(!valid(purchase))return {code:200,body:{entitled:false,productId}};
 if(purchase.acknowledgementState==='ACKNOWLEDGEMENT_STATE_PENDING'){
  const ack=await google(`${base}/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,{method:'POST',body:'{}'});
  if(!ack.ok){
   // A concurrent restore may have acknowledged the same non-consumable already.
   const again=await google(`${base}/productsv2/tokens/${encodeURIComponent(token)}`);
   if(!again.ok)throw new Error('Play acknowledgement pending');
   const refreshed=await again.json();
   if(!valid(refreshed))return {code:200,body:{entitled:false,productId}};
   if(refreshed.acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')throw new Error('Play acknowledgement pending');
  }
 }else if(purchase.acknowledgementState!=='ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')throw new Error('Unknown acknowledgement state');
 return {code:200,body:{entitled:true,productId,validUntil:now+72*3600000}};
}
