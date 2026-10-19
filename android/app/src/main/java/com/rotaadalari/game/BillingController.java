package com.rotaadalari.game;

import android.app.Activity;
import android.content.SharedPreferences;
import com.android.billingclient.api.*;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Arrays;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/** One non-consumable. Entitlement is granted only after our server verifies Play. */
final class BillingController {
    private static final String PRODUCT="rota_plus";
    private final Activity activity;
    private final Runnable changed;
    private final SharedPreferences cache;
    private final ExecutorService network=Executors.newSingleThreadExecutor();
    private BillingClient client;
    private String price;
    private Consumer<String> purchaseResult;
    private boolean destroyed, querying, verifying;
    private long lastVerified;

    BillingController(Activity activity, Runnable changed) {
        this.activity=activity;this.changed=changed;cache=activity.getSharedPreferences("rota-verified-purchases",0);
    }
    boolean enabled() { return BuildConfig.BILLING_VERIFY_URL.startsWith("https://"); }
    boolean noAds() {
        long now=System.currentTimeMillis(),checked=cache.getLong("checked",0);
        // A verified owner keeps offline access. A successful Play/server recheck revokes refunds.
        return enabled() && checked>0 && cache.getLong("until",0)>checked;
    }
    boolean ready() { return enabled() && client!=null && client.isReady() && price!=null; }
    String price() { return price; }
    void start() {
        if(!enabled() || destroyed || client!=null) return;
        client=BillingClient.newBuilder(activity).setListener((result,purchases) -> activity.runOnUiThread(() -> {
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK && purchases!=null) process(purchases, this::finishPurchase, "purchased");
            else if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED) finishPurchase("cancelled");
            else if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) restore(this::finishPurchase);
            else finishPurchase("unavailable");
        })).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build();
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                activity.runOnUiThread(() -> { if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){queryProduct(null);restore(status -> {});}changed.run(); });
            }
            @Override public void onBillingServiceDisconnected() { activity.runOnUiThread(changed); }
        });
    }
    private ProductDetails.OneTimePurchaseOfferDetails offer(ProductDetails details) {
        if(details==null || details.getOneTimePurchaseOfferDetailsList()==null) return null;
        for(ProductDetails.OneTimePurchaseOfferDetails item:details.getOneTimePurchaseOfferDetailsList())
            if("buy".equals(item.getPurchaseOptionId()) && item.getRentalDetails()==null && item.getPreorderDetails()==null) return item;
        return null;
    }
    private void queryProduct(Consumer<ProductDetails> done) {
        if(client==null || !client.isReady()) { if(done!=null)done.accept(null);return; }
        QueryProductDetailsParams params=QueryProductDetailsParams.newBuilder().setProductList(Arrays.asList(
            QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT).setProductType(BillingClient.ProductType.INAPP).build())).build();
        client.queryProductDetailsAsync(params,(result,details) -> activity.runOnUiThread(() -> {
            ProductDetails product=null;
            if(!destroyed && result.getResponseCode()==BillingClient.BillingResponseCode.OK)
                for(ProductDetails item:details.getProductDetailsList())if(PRODUCT.equals(item.getProductId()) && offer(item)!=null){product=item;break;}
            price=product==null?null:offer(product).getFormattedPrice();changed.run();if(done!=null)done.accept(product);
        }));
    }
    void purchase(Consumer<String> done) {
        if(purchaseResult!=null || verifying) { done.accept("busy");return; }
        if(!ready()) { done.accept("unavailable");return; }
        purchaseResult=done;
        queryProduct(product -> {
            if(product==null || destroyed) { finishPurchase("unavailable");return; }
            BillingFlowParams.ProductDetailsParams item=BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(product).setOfferToken(offer(product).getOfferToken()).build();
            BillingResult result=client.launchBillingFlow(activity,BillingFlowParams.newBuilder().setProductDetailsParamsList(Arrays.asList(item)).build());
            if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)restore(this::finishPurchase);
            else if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK)finishPurchase("unavailable");
        });
    }
    private void finishPurchase(String status) {
        Consumer<String> callback=purchaseResult;purchaseResult=null;
        if(callback!=null)callback.accept(status);changed.run();
    }
    void restore(Consumer<String> done) {
        if(!enabled() || client==null || !client.isReady()) { done.accept("unavailable");return; }
        if(querying || verifying) { done.accept("verification_pending");return; }
        querying=true;
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(result,list) -> activity.runOnUiThread(() -> {
            querying=false;
            if(destroyed || result.getResponseCode()!=BillingClient.BillingResponseCode.OK){done.accept("unavailable");return;}
            process(list,done,"restored");
        }));
    }
    private void process(List<Purchase> purchases,Consumer<String> done,String success) {
        Purchase target=null;
        for(Purchase purchase:purchases)if(purchase.getProducts().contains(PRODUCT)){target=purchase;if(purchase.getPurchaseState()==Purchase.PurchaseState.PURCHASED)break;}
        if(target==null){cache.edit().clear().apply();changed.run();done.accept("not_owned");return;}
        if(target.getPurchaseState()==Purchase.PurchaseState.PENDING){cache.edit().clear().apply();changed.run();done.accept("pending");return;}
        if(target.getPurchaseState()!=Purchase.PurchaseState.PURCHASED){done.accept("not_owned");return;}
        if(verifying){done.accept("verification_pending");return;}
        verify(target.getPurchaseToken(),done,success);
    }
    private void verify(String token,Consumer<String> done,String success) {
        verifying=true;
        network.execute(() -> {
            String status="verification_pending";long until=0;boolean revoked=false;
            HttpURLConnection connection=null;
            try {
                connection=(HttpURLConnection)new URL(BuildConfig.BILLING_VERIFY_URL).openConnection();
                connection.setRequestMethod("POST");connection.setConnectTimeout(10000);connection.setReadTimeout(15000);
                connection.setInstanceFollowRedirects(false);connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");
                byte[] payload=new JSONObject().put("purchaseToken",token).toString().getBytes(StandardCharsets.UTF_8);
                try(var out=connection.getOutputStream()){out.write(payload);}
                int code=connection.getResponseCode();
                if(code==200){
                    JSONObject data;try(var in=connection.getInputStream()){data=new JSONObject(new String(readLimited(in),StandardCharsets.UTF_8));}
                    if(data.optBoolean("entitled") && PRODUCT.equals(data.optString("productId"))) {
                        long now=System.currentTimeMillis();until=Math.min(data.optLong("validUntil"),now+72*3600000L);
                        if(until>now)status=success;
                    } else { revoked=true;status="not_owned"; }
                } else if(code==404 || code==410){revoked=true;status="not_owned";}
            } catch(Exception ignored) { /* Tokens and server responses are never logged or sent to JavaScript. */ }
            finally { if(connection!=null)connection.disconnect(); }
            final String outcome=status;final long expiry=until;final boolean clear=revoked;
            activity.runOnUiThread(() -> {
                verifying=false;if(destroyed)return;
                if(expiry>System.currentTimeMillis()){lastVerified=System.currentTimeMillis();cache.edit().putLong("checked",lastVerified).putLong("until",expiry).apply();}
                else if(clear)cache.edit().clear().apply();
                changed.run();done.accept(outcome);
            });
        });
    }
    private static byte[] readLimited(java.io.InputStream in) throws java.io.IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[1024];int n;
        while((n=in.read(buffer))!=-1){if(out.size()+n>16384)throw new java.io.IOException("Response too large");out.write(buffer,0,n);}
        return out.toByteArray();
    }
    void resume() {
        if(client==null){start();return;}
        if(client.isReady() && System.currentTimeMillis()-lastVerified>60000 && purchaseResult==null){queryProduct(null);restore(status -> {});}
    }
    void destroy() { destroyed=true;purchaseResult=null;if(client!=null)client.endConnection();network.shutdownNow(); }
}
