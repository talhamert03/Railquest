package com.rotaadalari.game;

import android.app.Activity;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.function.BooleanSupplier;
import java.util.function.BiConsumer;

/** Native-only ads. Test units in debug; live release explicitly configured. */
final class AdsController {
    private final Activity activity;
    private final Runnable changed;
    private final BooleanSupplier noAds;
    private final ConsentInformation consent;
    private RewardedAd rewarded;
    private InterstitialAd interstitial;
    private boolean initialized, initializing, loadingReward, loadingInterstitial, showing, destroyed;
    private long rewardedAt, interstitialAt, retryReward, retryInterstitial;

    AdsController(Activity activity, BooleanSupplier noAds, Runnable changed) {
        this.activity=activity; this.noAds=noAds; this.changed=changed;
        consent=UserMessagingPlatform.getConsentInformation(activity);
    }
    void start() {
        if(!BuildConfig.ADS_ENABLED || destroyed) return;
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(),
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> { initialize(); changed.run(); }),
            error -> { initialize(); changed.run(); });
    }
    private void initialize() {
        if(!BuildConfig.ADS_ENABLED || destroyed || !consent.canRequestAds()) return;
        if(initialized) { load(); return; }
        if(initializing) return;
        initializing=true;
        new Thread(() -> MobileAds.initialize(activity.getApplicationContext(), status -> activity.runOnUiThread(() -> {
            initializing=false; initialized=true; load();
        })), "rota-ads-init").start();
    }
    boolean privacyRequired() {
        return BuildConfig.ADS_ENABLED && consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }
    void privacy(Runnable finished) {
        if(!privacyRequired()) { finished.run(); return; }
        rewarded=null; interstitial=null;
        UserMessagingPlatform.showPrivacyOptionsForm(activity, error -> { initialize(); changed.run(); finished.run(); });
    }
    boolean rewardReady() { return available() && rewarded!=null && System.currentTimeMillis()-rewardedAt<3300000; }
    boolean interstitialReady() { return !noAds.getAsBoolean() && available() && interstitial!=null && System.currentTimeMillis()-interstitialAt<3300000; }
    private boolean available() { return !destroyed && BuildConfig.ADS_ENABLED && consent.canRequestAds() && !showing; }
    void load() {
        if(noAds.getAsBoolean()) interstitial=null;
        if(!available() || !initialized) return;
        long now=System.currentTimeMillis();
        if(!rewardReady() && !loadingReward && now>=retryReward) {
            loadingReward=true; rewarded=null;
            RewardedAd.load(activity, BuildConfig.REWARDED_UNIT, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
                @Override public void onAdLoaded(RewardedAd ad) { loadingReward=false; if(!destroyed){rewarded=ad;rewardedAt=System.currentTimeMillis();changed.run();} }
                @Override public void onAdFailedToLoad(LoadAdError error) { loadingReward=false;retryReward=System.currentTimeMillis()+60000;changed.run(); }
            });
        }
        if(!noAds.getAsBoolean() && !interstitialReady() && !loadingInterstitial && now>=retryInterstitial) {
            loadingInterstitial=true; interstitial=null;
            InterstitialAd.load(activity, BuildConfig.INTERSTITIAL_UNIT, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
                @Override public void onAdLoaded(InterstitialAd ad) { loadingInterstitial=false;if(!destroyed && !noAds.getAsBoolean()){interstitial=ad;interstitialAt=System.currentTimeMillis();changed.run();} }
                @Override public void onAdFailedToLoad(LoadAdError error) { loadingInterstitial=false;retryInterstitial=System.currentTimeMillis()+60000;changed.run(); }
            });
        }
    }
    void show(boolean reward, BiConsumer<String,Boolean> finished) {
        if(activity.isFinishing() || !(reward?rewardReady():interstitialReady())) { finished.accept("unavailable",false);load();return; }
        showing=true;
        final boolean[] earned={false},shown={false},resolved={false};
        FullScreenContentCallback callback=new FullScreenContentCallback() {
            private void finish() {
                if(resolved[0]) return; resolved[0]=true; showing=false;
                finished.accept(reward?(earned[0]?"earned":"cancelled"):(shown[0]?"dismissed":"unavailable"),shown[0]);
                load();changed.run();
            }
            @Override public void onAdShowedFullScreenContent() { shown[0]=true; }
            @Override public void onAdDismissedFullScreenContent() { finish(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { finish(); }
        };
        if(reward) {
            RewardedAd ad=rewarded;rewarded=null;ad.setFullScreenContentCallback(callback);
            ad.show(activity, item -> earned[0]=true);
        } else {
            InterstitialAd ad=interstitial;interstitial=null;ad.setFullScreenContentCallback(callback);ad.show(activity);
        }
    }
    void resume() { initialize(); }
    void destroy() { destroyed=true;rewarded=null;interstitial=null; }
}
