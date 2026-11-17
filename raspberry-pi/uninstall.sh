#!/usr/bin/env bash
# Removes the Tidehaven service and kiosk autostart that install.sh created.
# (Installed packages such as chromium are left alone.)
set -u
sudo systemctl disable --now tidehaven.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/tidehaven.service
sudo systemctl daemon-reload
rm -f "$HOME/.local/bin/tidehaven-kiosk" "$HOME/.config/autostart/tidehaven-kiosk.desktop"
[ -f "$HOME/.config/labwc/autostart" ] && sed -i '/tidehaven-kiosk/d' "$HOME/.config/labwc/autostart"
pkill -f tidehaven-kiosk 2>/dev/null || true
echo "Tidehaven service and autostart removed. You can delete this folder now."
