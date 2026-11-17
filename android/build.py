"""Build tidehaven.apk (debug-signed) without Gradle.

Needs: Python 3, a JDK (javac + keytool on PATH), and the Android SDK with
build-tools 34.0.0 and platforms/android-34.  Point ANDROID_HOME (or ANDROID_SDK_ROOT)
at the SDK.  Run:  python build.py
"""
import os, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SDK = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
if not SDK or not os.path.isdir(SDK):
    sys.exit("Set ANDROID_HOME to your Android SDK folder (needs build-tools/34.0.0 and platforms/android-34).")
BTV = os.environ.get("BUILD_TOOLS", "34.0.0")
BT = os.path.join(SDK, "build-tools", BTV)
JAR = os.path.join(SDK, "platforms", "android-34", "android.jar")
GAME = os.path.join(ROOT, "..", "game")
B = os.path.join(ROOT, "build")
KS = os.path.join(ROOT, "debug.keystore")   # created on first run, git-ignored
WIN = os.name == "nt"
def tool(n, bat=False):
    return os.path.join(BT, n + (".bat" if bat and WIN else ".exe" if WIN else ""))

def run(*a):
    print(">", " ".join(a)[:160])
    subprocess.run(list(a), check=True)

if not os.path.exists(KS):
    run("keytool", "-genkeypair", "-keystore", KS, "-storepass", "android", "-keypass", "android",
        "-alias", "androiddebugkey", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
        "-dname", "CN=Android Debug,O=Android,C=US")

shutil.rmtree(B, ignore_errors=True)
for d in ("res_c", "classes", "dex", "assets/www"):
    os.makedirs(os.path.join(B, d))

# app icon / TV banner come from the game icon
for d in ("mipmap-xxxhdpi", "drawable"):
    os.makedirs(os.path.join(ROOT, "res", d), exist_ok=True)
shutil.copy(os.path.join(GAME, "icons", "icon-512.png"), os.path.join(ROOT, "res", "mipmap-xxxhdpi", "ic_launcher.png"))
# (res/drawable/banner.png, the TV app-row banner, is the Tidehaven logo and is committed as is)

# bundle the game (the service worker is not needed inside the app)
shutil.copytree(GAME, os.path.join(B, "assets", "www"), dirs_exist_ok=True)
for junk in ("README.md", "sw.js"):
    p = os.path.join(B, "assets", "www", junk)
    if os.path.exists(p): os.remove(p)

aapt2 = tool("aapt2")
run(aapt2, "compile", "--dir", os.path.join(ROOT, "res"), "-o", os.path.join(B, "res_c"))
flats = [os.path.join(B, "res_c", f) for f in os.listdir(os.path.join(B, "res_c"))]
base = os.path.join(B, "base.apk")
run(aapt2, "link", "-o", base, "-I", JAR, "--manifest", os.path.join(ROOT, "AndroidManifest.xml"),
    "-A", os.path.join(B, "assets"), "--min-sdk-version", "21", "--target-sdk-version", "34",
    "--version-code", "1", "--version-name", "1.0", *flats)

srcs = []
for dp, _, fs in os.walk(os.path.join(ROOT, "src")):
    srcs += [os.path.join(dp, f) for f in fs if f.endswith(".java")]
run("javac", "-source", "8", "-target", "8", "-Xlint:-options", "-classpath", JAR, "-d", os.path.join(B, "classes"), *srcs)
classes = []
for dp, _, fs in os.walk(os.path.join(B, "classes")):
    classes += [os.path.join(dp, f) for f in fs if f.endswith(".class")]
run(tool("d8", True), "--min-api", "21", "--lib", JAR, "--output", os.path.join(B, "dex"), *classes)

unsigned = os.path.join(B, "unsigned.apk")
with zipfile.ZipFile(base) as zin, zipfile.ZipFile(unsigned, "w", zipfile.ZIP_DEFLATED) as zout:
    for it in zin.infolist():
        zout.writestr(it, zin.read(it.filename))
    zout.write(os.path.join(B, "dex", "classes.dex"), "classes.dex")

aligned = os.path.join(B, "aligned.apk")
run(tool("zipalign"), "-f", "4", unsigned, aligned)
out = os.path.join(ROOT, "tidehaven.apk")
run(tool("apksigner", True), "sign", "--ks", KS, "--ks-pass", "pass:android", "--key-pass", "pass:android",
    "--ks-key-alias", "androiddebugkey", "--out", out, aligned)
print("BUILT", out, os.path.getsize(out))
