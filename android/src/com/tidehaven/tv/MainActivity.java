package com.tidehaven.tv;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.*;
import java.net.*;
import java.util.*;

public class MainActivity extends Activity {
    private WebView web;
    private MiniServer server;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private String currentIp = "";

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        server = new MiniServer(getAssets());
        server.start(new int[]{8080, 8081, 8888, 0});
        buildWeb();
        currentIp = lanIp();
        web.loadUrl(urlFor(currentIp));
        ui.postDelayed(ipCheck, 10000);
    }

    private String urlFor(String ip) { return "http://" + ip + ":" + server.port + "/tv.html"; }

    private void buildWeb() {
        if (web != null) { try { web.destroy(); } catch (Exception ignored) {} }
        web = new WebView(this);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            /** If the web view's process is killed (low memory), build a fresh one and carry on. */
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                ui.post(new Runnable() { public void run() { buildWeb(); web.loadUrl(urlFor(currentIp)); } });
                return true;
            }
        });
        web.setBackgroundColor(0xFF120C08);
        setContentView(web);
    }

    /** If the TV gets a new network address (or finally gets one), reload so the QR code points at the right place. */
    private final Runnable ipCheck = new Runnable() {
        public void run() {
            String ip = lanIp();
            if (!ip.equals(currentIp)) { currentIp = ip; if (web != null) web.loadUrl(urlFor(ip)); }
            ui.postDelayed(this, 10000);
        }
    };

    /** The TV's own Wi-Fi or Ethernet address, so the QR code points phones at this TV. */
    private static String lanIp() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (a instanceof Inet4Address && a.isSiteLocalAddress()) return a.getHostAddress();
                }
            }
        } catch (Exception ignored) {}
        return "127.0.0.1";
    }

    @Override public void onWindowFocusChanged(boolean f) {
        super.onWindowFocusChanged(f);
        if (f) getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        ui.removeCallbacks(ipCheck);
        if (server != null) server.stop();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
