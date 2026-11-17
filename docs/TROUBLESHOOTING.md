# Troubleshooting

**The QR code shows 127.0.0.1, or phones cannot open it**
The TV has no network address yet. Connect it to Wi-Fi or Ethernet. The app re-checks every 10 seconds and refreshes the QR code. Make sure the phones are on the same network (not a guest network or mobile data) and that the router does not use "AP isolation" or "client isolation".

**The phone opens the page but never connects to the TV**
Both devices need internet access for the matchmaking service. Check that nothing blocks `0.peerjs.com`, or run your own server (see [CONTROLLERS.md](CONTROLLERS.md)). Reload the controller page.

**The board stutters on an old TV box**
Use the browser version with `?lowq=1` added to the TV address. It turns off shadows and edge smoothing.

**No sound**
Press OK once on the TV remote (a first interaction is needed before sound can play). Check the TV volume.

**A phone locked and lost its seat**
Open the controller page again; it rejoins automatically.

**An old test game keeps coming back**
The TV restores the last game on start. Use **Reset all devices** in the controller menu.

**"App not installed" while sideloading**
A copy signed with a different key may already be installed: uninstall it first. Also check the TV has free storage (about 10 MB).

**adb cannot connect**
Enable network debugging in Developer options, use the IP and port shown there (usually 5555), and make sure the computer is on the same network.
