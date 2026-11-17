# Building the Android TV app from source

The app is a plain Android project without Gradle: a `WebView` plus a small built-in web server that serves `game/` from the APK's assets. `android/build.py` compiles it.

## Requirements

- Python 3
- JDK 8 or newer (`javac` and `keytool` on PATH)
- Android SDK with **build-tools 34.0.0** and **platforms/android-34**. Install with `sdkmanager "build-tools;34.0.0" "platforms;android-34"` or Android Studio's SDK Manager.

## Build

```bash
export ANDROID_HOME=/path/to/android-sdk
cd android
python build.py
```

On Windows PowerShell use `$env:ANDROID_HOME="C:\path\to\android-sdk"`.

Output: `android/tidehaven.apk`, signed with a debug key that `build.py` creates on the first run (`android/debug.keystore`, not committed). For a different build-tools version set `BUILD_TOOLS`.

The script copies `game/` into the app, so after changing the game just run it again.

## Install

```bash
adb install -r android/tidehaven.apk
```

## Publishing a release on GitHub

1. Repo page -> **Releases** -> **Draft a new release**.
2. Create a tag such as `v1.0`, drag `tidehaven.apk` into the assets box, and publish.

## Signing for Google Play

Replace the debug key in `build.py` (`--ks`, `--ks-key-alias`, passwords) with your own keystore, and bump `--version-code` and `--version-name`.

## Optional: host the game on GitHub Pages

Settings -> Pages -> deploy from a branch. GitHub Pages serves only the repository root or `/docs`, so copy the contents of `game/` into a branch or folder you publish, then open `https://<user>.github.io/<repo>/tv.html` on any TV browser.

## Debugging on a real TV

Add `WebView.setWebContentsDebuggingEnabled(true);` in `MainActivity.onCreate`, rebuild, install, and inspect through adb port forwarding and `chrome://inspect`. **Remove the line before releasing**: it exposes the WebView on the network.
