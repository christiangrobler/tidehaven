#!/usr/bin/env bash
# Installs Tidehaven on a Raspberry Pi (Raspberry Pi OS, or any Debian-based system).
#
#   ./install.sh                  Pi is the MAIN SCREEN: starts the game server at boot and opens the
#                                 board full screen in kiosk mode (needs the desktop version of the OS)
#   ./install.sh --server-only    only run the game server (headless Pi). Any device on the network can
#                                 then be made the main screen in its settings.
#   options: --port 8080   --lowq (lighter graphics for older Pis)   --no-kiosk (same as --server-only)
#
# Run it as your normal user (not root); it asks for sudo when it needs it.
set -euo pipefail

PORT=8080; KIOSK=1; LOWQ=0
while [ $# -gt 0 ]; do
  case "$1" in
    --server-only|--no-kiosk) KIOSK=0 ;;
    --lowq) LOWQ=1 ;;
    --port) PORT="${2:?--port needs a number}"; shift ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

if [ "$(id -u)" -eq 0 ]; then echo "Run this as your normal user, not with sudo."; exit 1; fi
HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="$(cd "$HERE/../game" && pwd)"
[ -f "$GAME/tv.html" ] || { echo "Cannot find the game folder next to this script ($GAME)."; exit 1; }
ME="$(id -un)"

echo "==> Installing packages (python3, curl$([ $KIOSK = 1 ] && echo ', chromium, unclutter'))"
sudo apt-get update -y
PKGS="python3 curl"
if [ $KIOSK = 1 ]; then
  if apt-cache show chromium >/dev/null 2>&1; then PKGS="$PKGS chromium"; else PKGS="$PKGS chromium-browser"; fi
  apt-cache show unclutter >/dev/null 2>&1 && PKGS="$PKGS unclutter"
fi
sudo apt-get install -y $PKGS

echo "==> Creating the game server service (port $PORT)"
sudo tee /etc/systemd/system/tidehaven.service >/dev/null <<EOF
[Unit]
Description=Tidehaven game server
After=network-online.target
Wants=network-online.target

[Service]
User=$ME
ExecStart=/usr/bin/python3 $HERE/server.py --port $PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now tidehaven.service

if [ $KIOSK = 1 ]; then
  echo "==> Setting up the full-screen main screen"
  URL="http://localhost:$PORT/tv.html"
  [ $LOWQ = 1 ] && URL="$URL?lowq=1"
  BROWSER="$(command -v chromium || command -v chromium-browser)"
  LAUNCH="$HOME/.local/bin/tidehaven-kiosk"
  mkdir -p "$HOME/.local/bin" "$HOME/.config/autostart"
  cat > "$LAUNCH" <<EOF
#!/usr/bin/env bash
# Opens the Tidehaven main screen full screen. Safe to start twice: a second copy exits.
exec 9>/tmp/tidehaven-kiosk.lock
flock -n 9 || exit 0
for i in \$(seq 1 60); do curl -fs "http://localhost:$PORT/code.json" >/dev/null && break; sleep 1; done
command -v unclutter >/dev/null && (unclutter -idle 2 -root >/dev/null 2>&1 &)
while true; do
  "$BROWSER" --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble \\
    --autoplay-policy=no-user-gesture-required --check-for-update-interval=31536000 \\
    --user-data-dir="$HOME/.config/tidehaven-browser" "$URL"
  sleep 2
done
EOF
  chmod +x "$LAUNCH"
  cat > "$HOME/.config/autostart/tidehaven-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Tidehaven main screen
Exec=$LAUNCH
X-GNOME-Autostart-enabled=true
EOF
  # newer Raspberry Pi OS (labwc / Wayland) starts programs from this file
  if [ -d "$HOME/.config/labwc" ] || pgrep -x labwc >/dev/null 2>&1; then
    mkdir -p "$HOME/.config/labwc"
    touch "$HOME/.config/labwc/autostart"
    grep -q tidehaven-kiosk "$HOME/.config/labwc/autostart" || echo "$LAUNCH &" >> "$HOME/.config/labwc/autostart"
  fi
  # boot to the desktop automatically (no login screen needed)
  command -v raspi-config >/dev/null && sudo raspi-config nonint do_boot_behaviour B4 || true
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "Done."
echo "  Game server:  http://${IP:-<this-pi>}:$PORT/   (phones and computers open this, or scan the QR code on the main screen)"
if [ $KIOSK = 1 ]; then
  echo "  Main screen:  reboot the Pi (sudo reboot) and it opens the board by itself,"
  echo "                or start it now with: $LAUNCH"
else
  echo "  Server only:  on any device open http://${IP:-<this-pi>}:$PORT/tv.html to use it as the main screen."
fi
