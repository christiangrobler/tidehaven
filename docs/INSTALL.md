# Installing Tidehaven on Android TV / Google TV

Requirements: Android TV, Google TV, Fire TV (Android 5.0 or newer) or any Android box, connected to Wi-Fi or Ethernet. There is no Play Store listing: you install the APK file directly ("sideloading").

## 1. Allow installs from unknown sources

Settings -> Device Preferences (or Privacy) -> **Security & restrictions** -> **Unknown sources**, and allow the app you will open the file with (Downloader, a file manager, and so on). On Fire TV: Settings -> My Fire TV -> Developer options -> *Install unknown apps*.

## 2. Pick one way to install

### Option A: Downloader app (easiest)

1. Install **Downloader** (by AFTVnews) from the TV's app store.
2. Open it and type the direct link to the APK from this repository's **Releases** page (on a computer, right-click the `tidehaven.apk` asset and copy the link; a short link service helps with typing).
3. Download, then **Install**, then **Open**.

### Option B: USB stick

1. Copy `tidehaven.apk` to a USB stick.
2. Plug it into the TV, open a file manager app (for example *File Commander* or *X-plore*) and select the APK.
3. Install, then open.

### Option C: adb over Wi-Fi (best for developers)

1. On the TV: Settings -> About -> click **Build** 7 times to enable Developer options. Then Developer options -> enable **USB debugging** / **Network debugging**. Note the TV's IP address (Settings -> Network).
2. On your computer install [Android platform-tools](https://developer.android.com/tools/releases/platform-tools).
3. Run:

```bash
adb connect 192.168.1.50:5555
adb install -r tidehaven.apk
adb shell am start -n com.tidehaven.tv/.MainActivity
```

Use your own TV address. `-r` keeps your saved game when updating.

## 3. Start playing

Open **Tidehaven** from the app row. You should see the title screen with a QR code and a 5-letter code. Now connect controllers: see [CONTROLLERS.md](CONTROLLERS.md).

## Updating

Install a newer APK over the old one (Option A or B, or `adb install -r`). Your saved game is kept.

## Uninstalling

Settings -> Apps -> Tidehaven -> Uninstall.

## About the APK

The release APK is signed with a standard Android *debug* key. That is fine for sideloading but it cannot be published on Google Play as is. You can build your own from source: [BUILD.md](BUILD.md). The app asks for network permissions only: it serves the game to phones on your Wi-Fi and uses the internet for matchmaking.
