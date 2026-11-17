# Instructions for Claude Code (build and install Tidehaven on the user's TV)

Tidehaven is a web game (`game/`) wrapped in a small Android TV app (`android/`). When the user asks you to "build it", "put it on my TV" or similar, follow this.

## 1. Ask for what you need (only what is missing)

- The TV's IP address (TV: Settings -> Network). Ask for it if not given.
- The TV needs **Developer options -> USB debugging / Network debugging** switched on (Settings -> About -> click *Build* 7 times first). Tell the user to do this and to accept the "Allow debugging" prompt on the TV the first time.

## 2. Check or install the tools

- Python 3, a JDK (`javac`, `keytool`) and the Android SDK with `build-tools;34.0.0` and `platforms;android-34`, plus `platform-tools` (adb).
- If something is missing, install it (for example download the Android command-line tools and run `sdkmanager "platform-tools" "build-tools;34.0.0" "platforms;android-34"`). Tell the user what you are downloading before you do it.
- Set `ANDROID_HOME` to the SDK folder. Do not hard-code paths in repo files.

## 3. Build

```bash
cd android
python build.py        # writes android/tidehaven.apk (debug-signed)
```

`build.py` copies `game/` into the app, so rebuild after any change in `game/`. Never commit `android/build/`, `*.apk` in `android/`, or `debug.keystore` (they are git-ignored).

## 4. Install and launch on the TV

```bash
adb connect <TV-IP>:5555
adb -s <TV-IP>:5555 install -r android/tidehaven.apk       # -r keeps the saved game
adb -s <TV-IP>:5555 shell am start -S -n com.tidehaven.tv/.MainActivity
```

Verify with a screenshot: `adb -s <TV-IP>:5555 exec-out screencap -p > shot.png` and look at it. The TV should show the title screen with a QR code and a 5-letter code. The app serves the game on TV port 8080 (`/pad.html` is the controller page).

If `adb connect` is refused, the TV's network debugging is off or the IP is wrong. If install says the signature differs, run `adb uninstall com.tidehaven.tv` and install again.

## 5. Other platforms

- **Raspberry Pi:** `raspberry-pi/install.sh` (see `docs/RASPBERRY-PI.md`). It serves `game/` with `raspberry-pi/server.py`, the same job as the Android app's `MiniServer.java`. Keep the two servers in step (`/code.json`, `/tv-code`).
- **Main screen vs controller:** `game/js/role.js` stores the device's role; settings live in `pad.js` (controller menu) and `tv.js` (lobby Settings).

## 6. Rules

- To debug the TV's WebView you may temporarily add `WebView.setWebContentsDebuggingEnabled(true);` in `MainActivity.onCreate`. **Remove it and rebuild before the final install**; it exposes the WebView on the network.
- After changing `game/tv.html`, bump the `?v=` cache-busting number on its script tags.
- Keep all art original vector/code art. Do not add third-party game assets.
- Do not ask for or store the user's passwords or tokens. The user signs in to GitHub or anything else themselves.
