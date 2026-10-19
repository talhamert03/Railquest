package com.rotaadalari.game;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;

/** Only our packaged page can call this bridge; no purchase tokens cross it. */
public final class CommerceController {
    private final Activity activity;
    private final WebView web;
    private final String trustedUrl;
    private final BillingController billing;
    private final AdsController ads;
    private boolean started,busy,destroyed;
    CommerceController(Activity activity,WebView web,String trustedUrl) {
        this.activity=activity;this.web=web;this.trustedUrl=trustedUrl;
        billing=new BillingController(activity,this::changed);
        ads=new AdsController(activity,billing::noAds,this::changed);
    }
    void start(){if(started)return;started=true;billing.start();ads.start();}
    private boolean trusted(){return !destroyed && trustedUrl.equals(web.getUrl());}
    private void changed(){if(trusted())web.evaluateJavascript("window.dispatchEvent(new Event('rota-commerce-changed'))",null);}
    private void respond(String id,String status,boolean shown){
        try { JSONObject result=new JSONObject().put("status",status).put("shown",shown);send(id,result); }
        catch(Exception ignored){}
    }
    private void send(String id,JSONObject result){
        if(trusted())web.evaluateJavascript("window.rotaCommerceResult?.("+JSONObject.quote(id)+","+result.toString()+")",null);
    }
    @JavascriptInterface public void request(String id,String action){
        if(id==null || !id.matches("rota-[0-9]{1,12}") || action==null)return;
        activity.runOnUiThread(() -> {
            if(!trusted())return;
            if("status".equals(action)){
                ads.load();
                try { send(id,new JSONObject().put("status","ok").put("noAds",billing.noAds()).put("price",billing.price()==null?JSONObject.NULL:billing.price())
                    .put("billingReady",billing.ready()).put("rewardedReady",ads.rewardReady()).put("interstitialReady",ads.interstitialReady()).put("privacyRequired",ads.privacyRequired())); }
                catch(Exception ignored){}
                return;
            }
            if(busy){respond(id,"busy",false);return;}busy=true;
            switch(action){
                case "rewarded": case "interstitial":
                    if("interstitial".equals(action) && billing.noAds()){busy=false;respond(id,"unavailable",false);return;}
                    web.evaluateJavascript("window.dispatchEvent(new Event('rota-pause'))",null);
                    ads.show("rewarded".equals(action),(status,shown)->{busy=false;respond(id,status,shown);});break;
                case "purchase": billing.purchase(status->{busy=false;respond(id,status,false);});break;
                case "restore": billing.restore(status->{busy=false;respond(id,status,false);});break;
                case "privacy":
                    web.evaluateJavascript("window.dispatchEvent(new Event('rota-pause'))",null);
                    ads.privacy(()->{busy=false;respond(id,"ok",false);});break;
                default:busy=false;respond(id,"unavailable",false);
            }
        });
    }
    void resume(){if(started){billing.resume();ads.resume();}}
    void destroy(){destroyed=true;ads.destroy();billing.destroy();}
}
