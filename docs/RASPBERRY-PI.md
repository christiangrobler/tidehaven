# Tidehaven on a Raspberry Pi

A Raspberry Pi can do the job of the Android TV: plug it into a TV or monitor with HDMI, and it becomes the **main screen**. Phones, tablets and computers are the controllers, exactly as with the Android TV app.

There are two ways to use a Pi:

| Mode | What the Pi does | Needs |
|---|---|---|
| **Main screen** (default) | Runs the game server and opens the board full screen when it starts | Raspberry Pi OS **with desktop**, an HDMI screen |
| **Server only** (`--server-only`) | Runs the game server, no screen | Any Pi, even headless. Then make any phone, computer or smart-TV browser the main screen. |

## What you need

- Raspberry Pi 4 or 5 recommended (2 GB RAM or more). A Pi 3 works with `--lowq` but the 3D board is slower.
- Raspberry Pi OS (Bookworm or newer), connected to the same Wi-Fi or network as the phones
- A keyboard and mouse for the first setup

## Install

On the Pi, open a terminal:

```bash
git clone https://github.com/christiangrobler/tidehaven.git
cd tidehaven/raspberry-pi
./install.sh
```

The installer asks for your password once (for `sudo`). It:

1. installs `python3`, `curl` and Chromium
2. creates a system service `tidehaven` that serves the game on port 8080 and starts at boot
3. makes the desktop open the board full screen when the Pi starts, and logs in to the desktop automatically

Then restart the Pi:

```bash
sudo reboot
```

After the reboot the Pi shows the Tidehaven logo, a **QR code** and a 5-letter code. Join with phones as described in [CONTROLLERS.md](CONTROLLERS.md).

### Options

```bash
./install.sh --server-only     # no screen: just the game server (headless Pi)
./install.sh --lowq            # lighter graphics for a Pi 3 or a slow screen
./install.sh --port 9000       # use another port
```

Run the installer again with different options at any time. It is safe to repeat.

## Using the Pi

- The main screen opens by itself after the Pi starts. To start it by hand: `~/.local/bin/tidehaven-kiosk`
- Press **Esc** or **Alt+F4** to leave full screen; the game restarts itself after a moment.
- The game server runs in the background: `systemctl status tidehaven` shows it, `sudo systemctl restart tidehaven` restarts it.
- The Pi's address is shown on the main screen under the QR code. You can also find it with `hostname -I`.
- The saved game is kept in the Pi's browser, so an unplugged Pi resumes where it stopped.

## Making any device the main screen

You are not locked to the Pi. Every device remembers whether it is a **main screen** or a **controller**, and you can change that in the settings:

- On a controller: open **Menu** and choose **Make this device the main screen** (tap twice to confirm). This also works from the join screen.
- On a main screen: open **Settings** on the lobby screen and choose **Make this device a controller instead**.
- Open the home page with `?choose` (for example `http://pi-address:8080/?choose`) to pick again.

So a Pi that runs in **server-only** mode can host the game while a laptop or smart-TV browser acts as the main screen, and you can swap them at any time. If a second device becomes the main screen, the controllers follow the new one when they next reconnect. Switch the old main screen to a controller in its Settings so there is only one.

## Uninstall

```bash
cd tidehaven/raspberry-pi
./uninstall.sh
```

## Troubleshooting

**The screen stays on the desktop and the board does not open.**
Check the service: `systemctl status tidehaven`. Start the board by hand with `~/.local/bin/tidehaven-kiosk`. On Raspberry Pi OS Bookworm, make sure the desktop (not "console") starts at boot: `sudo raspi-config` -> System Options -> Boot / Auto Login -> Desktop Autologin.

**The board is slow or stutters.**
Run `./install.sh --lowq`, or use a Pi 4/5. Close other programs. Make sure the Pi uses the HDMI output at 1080p, not 4K.

**No sound.**
Select the HDMI output in the speaker icon in the top bar of the desktop. The main screen plays only the ocean and birds; all other sounds come from the controllers.

**Phones cannot open the address.**
Make sure they are on the same network as the Pi and that the router does not use "client isolation". Check `hostname -I` for the Pi's address.

**I want a different browser or kiosk options.**
Edit `~/.local/bin/tidehaven-kiosk`; it is a small shell script.

> The Raspberry Pi installer was written and checked for syntax and for the game server, but it could not be tested on a physical Pi. If something differs on your version of Raspberry Pi OS, please open an issue.
