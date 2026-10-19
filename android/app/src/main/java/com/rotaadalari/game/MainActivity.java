package com.rotaadalari.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;

/** Local assets only. The Android build never loads the hosted preview. */
public final class MainActivity extends Activity {
    private WebView webView;
    private CommerceController commerce;
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/game/index.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(169, 217, 209));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(169, 217, 209));
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                // Temporary system bars overlay the game without shrinking its camera.
                Insets bars = insets.getInsets(WindowInsets.Type.displayCutout());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                // Native padding already keeps the WebView clear of display cutouts.
                // Consume these insets so CSS env(safe-area-inset-*) is not applied twice.
                return WindowInsets.CONSUMED;
            });
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            root.requestApplyInsets();
        } else {
            root.setFitsSystemWindows(true);
        }
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        if (Build.VERSION.SDK_INT >= 29) getWindow().setNavigationBarContrastEnforced(false);
        enterImmersive();
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setVerticalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view,String url) { if(START.equals(url) && commerce!=null)commerce.start(); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())) {
                    WebResourceResponse local = loader.shouldInterceptRequest(uri);
                    if (local != null) return local;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Local game assets only", null, new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !START.equals(request.getUrl().toString());
            }
        });
        webView.addJavascriptInterface(new LocalControls(), "RotaHost");
        commerce=new CommerceController(this,webView,START);
        webView.addJavascriptInterface(commerce,"RotaCommerce");
        webView.loadUrl(START);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::navigateBack);
        }
    }

    @SuppressWarnings("deprecation")
    private void enterImmersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersive();
    }

    private void navigateBack() {
        webView.evaluateJavascript("typeof window.rotaBack==='function' ? window.rotaBack() : false", result -> {
            if (!"true".equals(result)) finish();
        });
    }
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { navigateBack(); }

    public final class LocalControls {
        @JavascriptInterface public void haptic() {
            runOnUiThread(() -> { if(webView != null) webView.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK); });
        }
    }

    @Override protected void onPause() {
        if (webView != null) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('rota-pause'))", null);
            webView.onPause();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        enterImmersive();
        if (webView != null) webView.onResume();
        if (commerce != null) commerce.resume();
    }
    @Override protected void onDestroy() {
        if (commerce != null) commerce.destroy();
        if (webView != null) {
            webView.removeJavascriptInterface("RotaCommerce");
            webView.removeJavascriptInterface("RotaHost");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
