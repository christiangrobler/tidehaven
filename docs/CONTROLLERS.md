# Using phones, tablets and computers as controllers

The TV is the board. Each player uses a **controller**: a web page, nothing to install, that shows their private cards and mini map. Up to 4 players. A controller can be a phone, tablet, laptop or desktop.

## What you need

- The TV app running (or `tv.html` open on a big-screen browser)
- Every controller on the **same Wi-Fi or network as the TV**
- Internet access on the TV and the controllers. A free public matchmaking service (PeerJS) only introduces the devices; game data then goes straight between them. If you have no internet or the service is blocked, see *Private matchmaking server* below.

## Join with a phone or tablet (QR code)

1. Start Tidehaven on the TV. It shows a QR code and a 5-letter code.
2. Open the phone **Camera** app (iPhone and most Android phones), or Google Lens, point it at the QR code and tap the link.
3. The controller opens in the phone browser. The first player to join is **Player 1** and chooses the board, expansions and whether the opponent is a person or the computer. Press **Start**.
4. Other players scan the same QR code and take the next seats.

Tip: *Add to Home Screen* (iPhone: Share -> Add to Home Screen; Android Chrome: menu -> Add to Home screen) makes a full-screen controller with no browser bars.

## Join with a computer (or any device without a camera)

1. The TV shows the **controller address** under the QR code, for example `192.168.1.50:8080/pad.html`.
2. On the computer open a browser (Chrome, Edge, Firefox or Safari) and type `http://192.168.1.50:8080/pad.html`, using the address on your TV.
3. If it asks for a code, enter the 5-letter code from the TV, or open `http://192.168.1.50:8080/pad.html#ABCDE` with the code after the `#`.

If you cannot read the address, find the TV's IP in Settings -> Network and use `http://<TV-IP>:8080/pad.html`.

## Choosing the main screen

Every device is either a **main screen** (shows the board) or a **controller** (your private cards). The Android TV app and a Raspberry Pi start as main screens. You can change any device in the settings, and it remembers the choice:

- **Controller -> main screen:** open **Menu** and choose **Make this device the main screen**. Tap twice to confirm. The same button is on the join screen.
- **Main screen -> controller:** on the lobby screen choose **Settings**, then **Make this device a controller instead**. (With a TV remote, move to the button and press OK.)
- **Pick again from the home page:** open `http://<address>:8080/?choose`.

Use only one main screen at a time. When a new main screen starts, controllers that reconnect follow it. Switch the old one to a controller in its Settings.

## Sound

- **The TV** plays only the ocean and the birds.
- **Phones and computers** play everything else: dice, building roads, settlements and cities, cards, trades, the robber, and a church bell when it becomes your turn.
- Phones only start playing sound after your first tap on the controller, and an iPhone's silent switch mutes it. Turn the volume up and flip the switch off.

## Rejoining

If a phone locks, loses signal or reloads, open the controller page again and it takes its seat back automatically. The TV remembers the game even if the app is closed. To clear a leftover game, use **Reset all devices** in the controller menu.

## One phone and the computer opponent

The host phone picks **Computer** as the opponent. No other device is needed.

## Playing without the Android app

Serve the `game/` folder:

```bash
cd game
python -m http.server 8080
```

Open `http://localhost:8080/tv.html` on the screen that acts as the TV, and `http://<that-computer-IP>:8080/pad.html` on the controllers. Or host `game/` on GitHub Pages, Netlify or Cloudflare Pages (https required) and open `https://your-site/tv.html` in a TV browser such as TV Bro or Puffin TV.

## Private matchmaking server (optional)

If the public PeerJS service is blocked on your network, run your own:

```bash
npx peer --port 9000
```

Then open the TV page with `?sig=your-server-ip:9000` added (and `&secure=1` if the server is behind https), for example `http://localhost:8080/tv.html?sig=192.168.1.20:9000`. The QR code passes the setting to the controllers automatically. This is for the browser version; the TV app opens its own built-in address, so use the browser version if you need a private server.

## Privacy

Hands stay on each controller; the TV never shows them. Only the matchmaking handshake goes through the PeerJS service. Moves go device to device.
