#!/usr/bin/env python3
"""Tidehaven web server for a Raspberry Pi (or any computer).

Does the same job as the Android TV app's built-in server:
  * serves the game folder (default ../game) on port 8080
  * /code.json   which main screen and join code phones should use
  * /tv-code?c=X the main screen tells us its current join code
                 (accepted from this device and from the home network only)

Only the Python 3 standard library is needed.

  python3 server.py                  # port 8080, serves ../game
  python3 server.py --port 9000
"""
import argparse, functools, gzip, io, ipaddress, json, os, re, sys, threading
import http.server, socketserver, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = {"code": ""}
LOCK = threading.Lock()
GZIP_TYPES = ("text/", "application/javascript", "application/json", "image/svg+xml", "application/manifest+json")


def lan_client(addr):
    """True for this device and for devices on a private home network."""
    try:
        ip = ipaddress.ip_address(addr.split("%")[0])
        if getattr(ip, "ipv4_mapped", None):
            ip = ip.ipv4_mapped
        return ip.is_loopback or ip.is_private or ip.is_link_local
    except ValueError:
        return False


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".webmanifest": "application/manifest+json", ".js": "application/javascript"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass

    def _send(self, status, body, ctype="text/plain"):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/tv-code":
            c = urllib.parse.parse_qs(u.query).get("c", [""])[0]
            if re.fullmatch(r"[A-Za-z0-9]{3,8}", c) and lan_client(self.client_address[0]):
                with LOCK:
                    STATE["code"] = c.upper()
                return self._send(200, "ok")
            return self._send(403, "no")
        if u.path == "/code.json":
            with LOCK:
                body = json.dumps({"app": "tidehaven", "code": STATE["code"]})
            return self._send(200, body, "application/json")
        if u.path == "/":
            self.path = "/index.html" + (("?" + u.query) if u.query else "")
        return self._serve_file()

    do_HEAD = do_GET

    def _serve_file(self):
        """Static files, gzip-compressed when the browser accepts it (the 3D library is large)."""
        path = self.translate_path(urllib.parse.urlparse(self.path).path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if not os.path.isfile(path):
            return self._send(404, "not found")
        ctype = self.guess_type(path)
        with open(path, "rb") as f:
            data = f.read()
        gz = "gzip" in self.headers.get("Accept-Encoding", "") and ctype.startswith(GZIP_TYPES) and len(data) > 1024
        if gz:
            data = gzip.compress(data, 6)
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        if gz:
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    ap = argparse.ArgumentParser(description="Tidehaven web server")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--game", default=os.path.join(HERE, "..", "game"), help="folder with tv.html, pad.html, ...")
    a = ap.parse_args()
    game = os.path.abspath(a.game)
    if not os.path.isfile(os.path.join(game, "tv.html")):
        sys.exit("Cannot find tv.html in " + game)
    handler = functools.partial(Handler, directory=game)
    srv = Server(("0.0.0.0", a.port), handler)
    print("Tidehaven is being served from %s on port %d" % (game, a.port), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
