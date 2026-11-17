package com.tidehaven.tv;

import android.content.res.AssetManager;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.CRC32;
import java.util.zip.GZIPOutputStream;

/**
 * Small static web server for the bundled game (assets/www), reachable from phones on the same network.
 * Files are cached in memory, sent gzip-compressed when the browser accepts it, and carry an ETag so
 * repeat visits are answered with a tiny 304 instead of the whole file.
 */
public class MiniServer {
    private static final int MAX_HEADER_BYTES = 16384;
    private final AssetManager assets;
    private ServerSocket ss;
    private volatile boolean running;
    private ExecutorService pool;
    public int port;
    private volatile String tvCode = "";
    private final HashMap<String, Asset> cache = new HashMap<>();
    private static final Asset MISSING = new Asset();

    private static class Asset {
        byte[] raw; byte[] gz; String etag; String mime; boolean text;
    }

    public MiniServer(AssetManager a) { assets = a; }

    public boolean start(int[] ports) {
        for (int p : ports) {
            try { ss = new ServerSocket(p); port = ss.getLocalPort(); break; } catch (IOException e) { ss = null; }
        }
        if (ss == null) return false;
        running = true;
        ThreadPoolExecutor ex = new ThreadPoolExecutor(32, 32, 15, TimeUnit.SECONDS, new LinkedBlockingQueue<Runnable>(128), new ThreadFactory() {
            public Thread newThread(Runnable r) { Thread t = new Thread(r, "mini-worker"); t.setDaemon(true); return t; }
        });
        ex.allowCoreThreadTimeOut(true);   // threads are created as needed and released when idle
        pool = ex;
        Thread t = new Thread(new Runnable() {
            public void run() {
                while (running) {
                    try {
                        final Socket s = ss.accept();
                        pool.execute(new Runnable() { public void run() { handle(s); } });
                    } catch (IOException e) { if (!running) break; }
                    catch (RejectedExecutionException e) { break; }
                }
            }
        }, "mini-accept");
        t.setDaemon(true);
        t.start();
        // load and compress the game files in the background while the web view starts up
        Thread w = new Thread(new Runnable() { public void run() { warmDir(""); } }, "mini-warm");
        w.setDaemon(true);
        w.setPriority(Thread.NORM_PRIORITY - 1);
        w.start();
        return true;
    }

    private static boolean skipWarm(String path) {
        return path.equals("/vendor/three.min.js") || path.equals("/vendor/OrbitControls.js") || path.equals("/js/scene.js")
            || path.equals("/js/realism.js") || path.equals("/js/dice3d.js") || path.equals("/game.html");
    }

    private void warmDir(String dir) {
        try {
            String[] names = assets.list(dir.isEmpty() ? "www" : "www/" + dir);
            if (names == null) return;
            for (String n : names) {
                if (!running) return;
                String rel = dir.isEmpty() ? n : dir + "/" + n;
                String[] sub = assets.list("www/" + rel);
                if (sub != null && sub.length > 0) { warmDir(rel); continue; }
                String path = "/" + rel;
                if (skipWarm(path)) continue;
                Asset a = load(path);
                if (a != null && a.text && a.raw.length > 1024) gz(a);
            }
        } catch (IOException ignored) {}
    }

    public void stop() {
        running = false;
        try { if (ss != null) ss.close(); } catch (IOException ignored) {}
        if (pool != null) pool.shutdownNow();
    }

    /** Reads one line, giving up if the request header grows past the budget. */
    private static String readLine(InputStream in, int[] budget) throws IOException {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) != -1) {
            if (--budget[0] < 0) throw new IOException("header too large");
            if (c == '\n') return sb.toString();
            if (c != '\r') sb.append((char) c);
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    private void handle(Socket s) {
        try {
            s.setSoTimeout(5000);
            s.setTcpNoDelay(true);
            InputStream in = new BufferedInputStream(s.getInputStream(), 4096);
            int[] budget = { MAX_HEADER_BYTES };
            String line = readLine(in, budget);
            if (line == null) { s.close(); return; }
            String ifNone = null; boolean gzip = false; String h;
            while ((h = readLine(in, budget)) != null && h.length() > 0) {
                String low = h.toLowerCase(Locale.ROOT);
                if (low.startsWith("if-none-match:")) ifNone = h.substring(14).trim();
                else if (low.startsWith("accept-encoding:") && low.contains("gzip")) gzip = true;
            }
            String[] parts = line.split(" ");
            String method = parts.length > 0 ? parts[0] : "";
            boolean head = "HEAD".equals(method);
            if (!head && !"GET".equals(method)) { respond(s, 405, "text/plain", "method not allowed".getBytes(), false, null, false, null); return; }
            String path = parts.length > 1 ? parts[1] : "/";
            String query = "";
            int q = path.indexOf('?'); if (q >= 0) { query = path.substring(q + 1); path = path.substring(0, q); }
            int hs = path.indexOf('#'); if (hs >= 0) path = path.substring(0, hs);
            path = URLDecoder.decode(path, "UTF-8");
            if (path.equals("/")) path = "/index.html";

            if (path.equals("/tv-code")) {            // the main screen tells us its current join code (accepted from this device and from the home network)
                InetAddress ra = s.getInetAddress();
                boolean local = ra.isLoopbackAddress() || ra.isSiteLocalAddress() || NetworkInterface.getByInetAddress(ra) != null;   // this device, or any device on the home network that is made the main screen
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:^|&)c=([A-Za-z0-9]{3,8})").matcher(query);
                if (local && m.find()) { tvCode = m.group(1).toUpperCase(Locale.ROOT); respond(s, 200, "text/plain", "ok".getBytes(), head, null, false, null); }
                else respond(s, 403, "text/plain", "no".getBytes(), head, null, false, null);
                return;
            }
            if (path.equals("/code.json")) {          // phones ask which TV and code to join
                String body = "{\"app\":\"tidehaven\",\"code\":\"" + tvCode + "\"}";
                respond(s, 200, "application/json", body.getBytes("UTF-8"), head, null, false, null);
                return;
            }
            if (path.contains("..") || path.indexOf('\0') >= 0) { respond(s, 400, "text/plain", "bad request".getBytes(), head, null, false, null); return; }

            Asset a = load(path);
            if (a == null) { respond(s, 404, "text/plain", "not found".getBytes(), head, null, false, null); return; }
            if (ifNone != null && ifNone.equals(a.etag)) { respond(s, 304, a.mime, null, head, a.etag, false, null); return; }
            if (gzip && a.text && a.raw.length > 1024) {
                byte[] g = gz(a);
                if (g != null && g.length < a.raw.length) { respond(s, 200, a.mime, g, head, a.etag, true, null); return; }
            }
            respond(s, 200, a.mime, a.raw, head, a.etag, false, null);
        } catch (Exception e) {
            try { s.close(); } catch (IOException ignored) {}
        }
    }

    private Asset load(String path) {
        synchronized (cache) {
            Asset a = cache.get(path);
            if (a != null) return a == MISSING ? null : a;
            try {
                InputStream in = assets.open("www" + path);
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                byte[] buf = new byte[16384]; int n;
                while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
                in.close();
                a = new Asset();
                a.raw = bo.toByteArray();
                CRC32 crc = new CRC32(); crc.update(a.raw);
                a.etag = "\"" + Long.toHexString(crc.getValue()) + "-" + Integer.toHexString(a.raw.length) + "\"";
                a.mime = mime(path);
                a.text = a.mime.startsWith("text/") || a.mime.contains("javascript") || a.mime.contains("json") || a.mime.contains("svg");
                cache.put(path, a);
                return a;
            } catch (IOException nf) {
                cache.put(path, MISSING);
                return null;
            }
        }
    }

    private byte[] gz(Asset a) {
        synchronized (a) {
            if (a.gz != null) return a.gz;
            try {
                ByteArrayOutputStream bo = new ByteArrayOutputStream(a.raw.length / 3 + 64);
                GZIPOutputStream g = new GZIPOutputStream(bo);
                g.write(a.raw); g.close();
                a.gz = bo.toByteArray();
            } catch (IOException e) { a.gz = new byte[0]; }
            return a.gz.length == 0 ? null : a.gz;
        }
    }

    private static String reason(int c) {
        switch (c) { case 200: return "OK"; case 304: return "Not Modified"; case 400: return "Bad Request";
            case 403: return "Forbidden"; case 404: return "Not Found"; case 405: return "Method Not Allowed"; default: return "Error"; }
    }

    private void respond(Socket s, int code, String type, byte[] body, boolean head, String etag, boolean gzip, String unused) throws IOException {
        OutputStream o = s.getOutputStream();
        StringBuilder h = new StringBuilder();
        h.append("HTTP/1.1 ").append(code).append(' ').append(reason(code)).append("\r\n");
        h.append("Content-Type: ").append(type).append("\r\n");
        h.append("Content-Length: ").append(body == null ? 0 : body.length).append("\r\n");
        h.append("Cache-Control: no-cache\r\n");
        if (etag != null) h.append("ETag: ").append(etag).append("\r\n");
        if (gzip) h.append("Content-Encoding: gzip\r\n");
        h.append("Vary: Accept-Encoding\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n");
        o.write(h.toString().getBytes("ISO-8859-1"));
        if (!head && body != null) o.write(body);
        o.flush();
        s.close();
    }

    private static String mime(String p) {
        String x = p.toLowerCase(Locale.ROOT);
        if (x.endsWith(".html")) return "text/html; charset=utf-8";
        if (x.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (x.endsWith(".css")) return "text/css; charset=utf-8";
        if (x.endsWith(".png")) return "image/png";
        if (x.endsWith(".jpg") || x.endsWith(".jpeg")) return "image/jpeg";
        if (x.endsWith(".svg")) return "image/svg+xml";
        if (x.endsWith(".webmanifest")) return "application/manifest+json";
        if (x.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }
}
