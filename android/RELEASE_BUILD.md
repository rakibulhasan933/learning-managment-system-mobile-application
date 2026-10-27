# BanglaBox Android release build

The release variant must never use the debug keystore. The upload keystore for
this project is at `android/app/banglabox-upload.keystore` and is ignored by
git. Set these environment variables before building from the `android`
directory:

```powershell
$env:BANGLABOX_UPLOAD_STORE_FILE = (Resolve-Path ".\app\banglabox-upload.keystore").Path
$env:BANGLABOX_UPLOAD_STORE_PASSWORD = "<store-password>"
$env:BANGLABOX_UPLOAD_KEY_ALIAS = "banglabox-upload"
$env:BANGLABOX_UPLOAD_KEY_PASSWORD = "<key-password>"
```

Then build the Play Store bundle:

```powershell
.\gradlew.bat app:bundleRelease
```

Upload the generated `android/app/build/outputs/bundle/release/app-release.aab`
to Play Console and enable Play App Signing. Do not commit the keystore,
passwords, or this environment configuration to git.
