package com.rotaadalari.game;

import android.app.Activity;
import android.content.SharedPreferences;
import com.android.billingclient.api.*;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * One-time, non-consumable products: No Ads and the wagon skins.
 * With BILLING_VERIFY_URL set, entitlement needs our server's Play check; without it, the
 * purchase is acknowledged on the device and Play's own purchase list is the source of truth.
 */
final class BillingController {
    static final String NO_ADS="rota_plus";
    // Must match SKIN_PRODUCTS in dist/js/cosmetics.js (checked by tests/billing.test.mjs).
    static final List<String> SKINS=Collections.unmodifiableList(Arrays.asList(
        "wagon_dragon","wagon_unicorn","wagon_galaxy","wagon_halloween","wagon_icequeen",
        "wagon_sakura","wagon_mermaid","wagon_royal","wagon_candy","wagon_firefly"));
    static final List<String> PRODUCTS;
    static { List<String> all=new ArrayList<>();all.add(NO_ADS);all.addAll(SKINS);PRODUCTS=Collections.unmodifiableList(all); }
    private static final long LOCAL_GRACE=30L*24*3600000L, SERVER_GRACE=72L*3600000L;

    private final Activity activity;
    private final Runnable changed;
    private final SharedPreferences cache;
    private final ExecutorService network=Executors.newSingleThreadExecutor();
    private final Map<String,ProductDetails> details=new HashMap<>();
    private final Map<String,String> prices=new LinkedHashMap<>();
    private BillingClient client;
    private Consumer<String> purchaseResult;
    private String purchasing;
    private boolean destroyed, querying, verifying;
    private long lastVerified;

    BillingController(Activity activity, Runnable changed) {
        this.activity=activity;this.changed=changed;cache=activity.getSharedPreferences("rota-verified-purchases",0);
    }
    private boolean serverVerified() { return BuildConfig.BILLING_VERIFY_URL.startsWith("https://"); }
    private long stored(String key,String product) {
        // Versions before skins stored No Ads under unsuffixed keys.
        return cache.getLong(key+":"+product,NO_ADS.equals(product)?cache.getLong(key,0):0);
    }
    boolean owns(String product) {
        long checked=stored("checked",product);
        // A verified owner keeps offline access. A successful Play/server recheck revokes refunds.
        return checked>0 && stored("until",product)>checked;
    }
    boolean noAds() { return owns(NO_ADS); }
    List<String> owned() { List<String> list=new ArrayList<>();for(String p:PRODUCTS)if(owns(p))list.add(p);return list; }
    Map<String,String> prices() { return Collections.unmodifiableMap(prices); }
    String price() { return prices.get(NO_ADS); }
    boolean known(String product) { return PRODUCTS.contains(product); }
    boolean ready() { return client!=null && client.isReady() && !prices.isEmpty(); }

    void start() {
        if(destroyed || client!=null) return;
        client=BillingClient.newBuilder(activity).setListener((result,purchases) -> activity.runOnUiThread(() -> {
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK && purchases!=null) process(purchases,this::finishPurchase,"purchased",purchasing,false);
            else if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED) finishPurchase("cancelled");
            else if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) restore(this::finishPurchase);
            else finishPurchase("unavailable");
        })).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build();
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                activity.runOnUiThread(() -> { if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){queryProducts(null);restore(status -> {});}changed.run(); });
            }
            @Override public void onBillingServiceDisconnected() { activity.runOnUiThread(changed); }
        });
    }
    private ProductDetails.OneTimePurchaseOfferDetails offer(ProductDetails item) {
        if(item==null || item.getOneTimePurchaseOfferDetailsList()==null) return null;
        for(ProductDetails.OneTimePurchaseOfferDetails o:item.getOneTimePurchaseOfferDetailsList())
            if("buy".equals(o.getPurchaseOptionId()) && o.getRentalDetails()==null && o.getPreorderDetails()==null) return o;
        return null;
    }
    private void queryProducts(Runnable done) {
        if(client==null || !client.isReady()) { if(done!=null)done.run();return; }
        List<QueryProductDetailsParams.Product> list=new ArrayList<>();
        for(String id:PRODUCTS)list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),(result,found) -> activity.runOnUiThread(() -> {
            if(!destroyed && result.getResponseCode()==BillingClient.BillingResponseCode.OK) {
                details.clear();prices.clear();
                for(ProductDetails item:found.getProductDetailsList())
                    if(known(item.getProductId()) && offer(item)!=null){details.put(item.getProductId(),item);prices.put(item.getProductId(),offer(item).getFormattedPrice());}
            }
            changed.run();if(done!=null)done.run();
        }));
    }
    void purchase(String product,Consumer<String> done) {
        if(purchaseResult!=null || verifying) { done.accept("busy");return; }
        if(!known(product) || client==null || !client.isReady()) { done.accept("unavailable");return; }
        purchaseResult=done;purchasing=product;
        queryProducts(() -> {
            ProductDetails item=details.get(product);
            if(item==null || destroyed) { finishPurchase("unavailable");return; }
            BillingFlowParams.ProductDetailsParams params=BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(item).setOfferToken(offer(item).getOfferToken()).build();
            BillingResult result=client.launchBillingFlow(activity,BillingFlowParams.newBuilder().setProductDetailsParamsList(Arrays.asList(params)).build());
            if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)restore(this::finishPurchase);
            else if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK)finishPurchase("unavailable");
        });
    }
    private void finishPurchase(String status) {
        Consumer<String> callback=purchaseResult;purchaseResult=null;purchasing=null;
        if(callback!=null)callback.accept(status);changed.run();
    }
    void restore(Consumer<String> done) {
        if(client==null || !client.isReady()) { done.accept("unavailable");return; }
        if(querying || verifying) { done.accept("verification_pending");return; }
        querying=true;
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(result,list) -> activity.runOnUiThread(() -> {
            querying=false;
            if(destroyed || result.getResponseCode()!=BillingClient.BillingResponseCode.OK){done.accept("unavailable");return;}
            process(list,done,"restored",purchasing,true);
        }));
    }
    /** complete=true when the list is Play's full purchase history, so missing products are revoked. */
    private void process(List<Purchase> purchases,Consumer<String> done,String success,String target,boolean complete) {
        Map<String,Purchase> latest=new LinkedHashMap<>();
        for(Purchase purchase:purchases)for(String product:purchase.getProducts()){
            if(!known(product))continue;
            Purchase seen=latest.get(product);
            if(seen==null || purchase.getPurchaseState()==Purchase.PurchaseState.PURCHASED)latest.put(product,purchase);
        }
        if(complete){
            SharedPreferences.Editor edit=cache.edit();
            for(String product:PRODUCTS){
                Purchase p=latest.get(product);
                if(p==null || p.getPurchaseState()!=Purchase.PurchaseState.PURCHASED)clear(edit,product);
            }
            edit.apply();changed.run();
        }
        List<Purchase> owned=new ArrayList<>();List<String> products=new ArrayList<>();
        for(Map.Entry<String,Purchase> entry:latest.entrySet())
            if(entry.getValue().getPurchaseState()==Purchase.PurchaseState.PURCHASED){owned.add(entry.getValue());products.add(entry.getKey());}
        if(target!=null){
            Purchase mine=latest.get(target);
            if(mine!=null && mine.getPurchaseState()==Purchase.PurchaseState.PENDING){done.accept("pending");return;}
            if(mine==null || mine.getPurchaseState()!=Purchase.PurchaseState.PURCHASED){done.accept("not_owned");return;}
        }
        if(owned.isEmpty()){done.accept("not_owned");return;}
        if(verifying){done.accept("verification_pending");return;}
        verifying=true;
        Map<String,String> outcome=new HashMap<>();
        verifyNext(owned,products,0,outcome,() -> {
            verifying=false;if(destroyed)return;
            changed.run();
            if(target!=null){done.accept(outcome.getOrDefault(target,"not_owned"));return;}
            done.accept(outcome.containsValue(success)?success:outcome.containsValue("verification_pending")?"verification_pending":"not_owned");
        },success);
    }
    private void verifyNext(List<Purchase> owned,List<String> products,int index,Map<String,String> outcome,Runnable finished,String success) {
        if(index>=owned.size() || destroyed){finished.run();return;}
        String product=products.get(index);Purchase purchase=owned.get(index);
        Consumer<String> next=status -> {outcome.put(product,status);verifyNext(owned,products,index+1,outcome,finished,success);};
        if(serverVerified())verifyOnServer(purchase.getPurchaseToken(),product,next,success);
        else verifyLocally(purchase,product,next,success);
    }
    private void verifyLocally(Purchase purchase,String product,Consumer<String> done,String success) {
        if(purchase.isAcknowledged()){grant(product,System.currentTimeMillis()+LOCAL_GRACE);done.accept(success);return;}
        // Unacknowledged purchases are refunded by Play after three days.
        client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),result -> activity.runOnUiThread(() -> {
            if(destroyed)return;
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){grant(product,System.currentTimeMillis()+LOCAL_GRACE);done.accept(success);}
            else done.accept("verification_pending");
        }));
    }
    private void verifyOnServer(String token,String product,Consumer<String> done,String success) {
        network.execute(() -> {
            String status="verification_pending";long until=0;boolean revoked=false;
            HttpURLConnection connection=null;
            try {
                connection=(HttpURLConnection)new URL(BuildConfig.BILLING_VERIFY_URL).openConnection();
                connection.setRequestMethod("POST");connection.setConnectTimeout(10000);connection.setReadTimeout(15000);
                connection.setInstanceFollowRedirects(false);connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");
                byte[] payload=new JSONObject().put("purchaseToken",token).put("productId",product).toString().getBytes(StandardCharsets.UTF_8);
                try(var out=connection.getOutputStream()){out.write(payload);}
                int code=connection.getResponseCode();
                if(code==200){
                    JSONObject data;try(var in=connection.getInputStream()){data=new JSONObject(new String(readLimited(in),StandardCharsets.UTF_8));}
                    if(data.optBoolean("entitled") && product.equals(data.optString("productId"))) {
                        long now=System.currentTimeMillis();until=Math.min(data.optLong("validUntil"),now+SERVER_GRACE);
                        if(until>now)status=success;
                    } else { revoked=true;status="not_owned"; }
                } else if(code==404 || code==410){revoked=true;status="not_owned";}
            } catch(Exception ignored) { /* Tokens and server responses are never logged or sent to JavaScript. */ }
            finally { if(connection!=null)connection.disconnect(); }
            final String result=status;final long expiry=until;final boolean clear=revoked;
            activity.runOnUiThread(() -> {
                if(destroyed)return;
                if(expiry>System.currentTimeMillis())grant(product,expiry);
                else if(clear){SharedPreferences.Editor edit=cache.edit();clear(edit,product);edit.apply();}
                done.accept(result);
            });
        });
    }
    private void grant(String product,long until) {
        lastVerified=System.currentTimeMillis();
        cache.edit().putLong("checked:"+product,lastVerified).putLong("until:"+product,until).apply();
    }
    private void clear(SharedPreferences.Editor edit,String product) {
        edit.remove("checked:"+product).remove("until:"+product);
        if(NO_ADS.equals(product))edit.remove("checked").remove("until");
    }
    private static byte[] readLimited(java.io.InputStream in) throws java.io.IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[1024];int n;
        while((n=in.read(buffer))!=-1){if(out.size()+n>16384)throw new java.io.IOException("Response too large");out.write(buffer,0,n);}
        return out.toByteArray();
    }
    void resume() {
        if(client==null){start();return;}
        if(client.isReady() && System.currentTimeMillis()-lastVerified>60000 && purchaseResult==null){queryProducts(null);restore(status -> {});}
    }
    void destroy() { destroyed=true;purchaseResult=null;if(client!=null)client.endConnection();network.shutdownNow(); }
}
