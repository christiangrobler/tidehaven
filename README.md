# Tidehaven

A 3D island trading and building board game for the **big screen**. The TV (or a computer) shows the board; every player uses their own **phone, tablet or computer as a private remote control** with their hand of cards and a mini map for building.

- 2-4 players, or play against the computer
- 3D board, dice, sound and animations, all drawn in code (no copyrighted art)
- Extra boards and scenarios, expansions and house rules
- Runs as an **Android TV app** (APK) or in any modern browser
- Controllers need **no install**: scan a QR code and play

> Fan-made game in the style of classic island resource-trading games. Not affiliated with any commercial game. See [THIRD_PARTY.md](THIRD_PARTY.md).

## Quick start (Android TV / Google TV)

1. Download **`tidehaven.apk`** from the [Releases](../../releases) page (or from `releases/` in this repo).
2. Install it on the TV: see [docs/INSTALL.md](docs/INSTALL.md) (USB stick, the *Downloader* app, or `adb`).
3. Open **Tidehaven** from the TV's app list. The TV shows a **QR code** and a 5-letter code.
4. On each phone (same Wi-Fi as the TV) scan the QR code with the camera. That is your controller.
5. The first player to join picks the board and options and presses **Start**.

More detail: [Install](docs/INSTALL.md) - [Controllers](docs/CONTROLLERS.md) - [How to play](docs/HOW-TO-PLAY.md) - [Build from source](docs/BUILD.md) - [Troubleshooting](docs/TROUBLESHOOTING.md)

## Or let Claude do it: grab the repo, point it at your TV, build

If you use [Claude Code](https://claude.com/claude-code), you can skip the manual steps. This repo includes a [`CLAUDE.md`](CLAUDE.md) that tells Claude how to build and install the app.

1. On the TV turn on **Developer options -> USB debugging / Network debugging** (Settings -> About -> click *Build* 7 times first) and note the TV's IP address (Settings -> Network).
2. Open a terminal and run:

```bash
git clone https://github.com/christiangrobler/tidehaven.git
cd tidehaven
claude
```

3. Tell Claude:

> Build Tidehaven and install it on my Android TV at 192.168.1.50 (use my TV's IP). Install any tools you need, then launch it and show me a screenshot.

Claude will set up the Android SDK if needed, run `android/build.py`, connect to the TV with `adb`, install the APK, start the app and check that the QR code appears. Accept the "Allow debugging" prompt on the TV when it asks.

## No Android TV? Play in a browser

You only need to serve the `game/` folder over HTTP.

```bash
cd game
python -m http.server 8080
```

- On the computer driving the big screen open `http://localhost:8080/tv.html`
- Phones and computers on the same network open the address shown under the QR code (the host computer's LAN IP, for example `http://192.168.1.20:8080/pad.html`)
- One device only: `http://localhost:8080/game.html`

Or publish `game/` with GitHub Pages, Netlify or Cloudflare Pages (must be `https://`) and open `.../tv.html` in any TV browser. See [docs/CONTROLLERS.md](docs/CONTROLLERS.md).

## Connecting phones and computers as controllers

| Controller | How to join |
|---|---|
| iPhone / Android phone | Scan the TV's QR code with the camera app |
| Tablet | Same as a phone |
| Laptop / PC / Mac | Open the **controller address** shown on the TV (for example `http://192.168.1.20:8080/pad.html`) in a browser; enter the 5-letter code if asked |

Everything must be on the **same Wi-Fi or network as the TV**, and the devices need internet: a free public matchmaking service (PeerJS) introduces the devices, then they talk directly. Full guide and a private-server option in [docs/CONTROLLERS.md](docs/CONTROLLERS.md).

## Repository layout

```
game/        the web game (tv.html, pad.html, game.html, js/, css/, vendor/, icons/)
android/     Android TV app source (WebView + small built-in web server) and build.py
releases/    prebuilt tidehaven.apk (debug-signed)
docs/        install, controller, how-to-play, build and troubleshooting guides
```

## How it works

The Android app bundles `game/` and runs a tiny web server on the TV (port 8080). It shows `tv.html` full screen. Phones open `pad.html` from that server, so nothing is hosted online. Game data flows from phone to TV over WebRTC data channels (PeerJS). The TV is the authority and remembers the game, so a locked phone just rejoins its seat.

## Contributing

Issues and pull requests are welcome. Keep all art original. To build the APK yourself, see [docs/BUILD.md](docs/BUILD.md).

## License

[MIT](LICENSE). Third-party libraries are listed in [THIRD_PARTY.md](THIRD_PARTY.md).
