# Android Release Build

Use this flow to generate the Play Store upload bundle locally for `copit-mobile`.

## 1. Install JDK 21

The Android build is configured for Java 21. Install a JDK 21 distribution and confirm it is available:

```powershell
java -version
```

You should see a Java 21 runtime in the output.

## 2. Set `JAVA_HOME`

Point `JAVA_HOME` at the JDK 21 installation directory and add its `bin` folder to `Path`.

PowerShell example for the current session:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

Verify:

```powershell
java -version
```

## 3. Create the upload keystore

Create the Play upload keystore outside the repository:

```powershell
keytool -genkeypair `
  -v `
  -keystore C:\Users\USER\keystores\peniel-upload.jks `
  -alias upload `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

Notes:
- Keep `peniel-upload.jks` outside `copit-mobile/`.
- Do not commit the keystore or its passwords to the repository.

## 4. Add signing values to the user Gradle properties file

Add the signing values to your user-level Gradle properties file:

```text
%USERPROFILE%\.gradle\gradle.properties
```

Example contents:

```properties
PENIEL_UPLOAD_STORE_FILE=C:\\Users\\USER\\keystores\\peniel-upload.jks
PENIEL_UPLOAD_STORE_PASSWORD=your-keystore-password
PENIEL_UPLOAD_KEY_ALIAS=upload
PENIEL_UPLOAD_KEY_PASSWORD=your-key-password
```

These values are read by the Android release signing config at build time. Keep them in the user profile or CI secrets, not in the repo.

## 5. Retrieve the SHA-256 fingerprint for App Links

Use `keytool -list -v` against the local upload keystore:

```powershell
keytool -list -v `
  -keystore C:\Users\USER\keystores\peniel-upload.jks `
  -alias upload
```

Look for the `SHA256:` line in the output.

Paste that value into:

```text
copit-web/public/.well-known/assetlinks.json
```

Replace:

```text
REPLACE_WITH_RELEASE_SIGNING_SHA256_FINGERPRINT
```

with the real fingerprint string from `keytool`.

Important:
- For local/internal testing with your own signed build, the upload keystore fingerprint is typically the one you need.
- For production Play Store App Links, Google Play App Signing may require the fingerprint from the **Play Console App signing certificate** instead of your local upload key.

## 6. Generate the release bundle

From the project root:

```powershell
npm install
npm run android:bundle
```

This script:
- builds the production web app
- syncs Capacitor Android
- runs Gradle `bundleRelease`

## 7. Locate the `.aab`

After a successful build, the Play upload bundle is here:

```text
android\app\build\outputs\bundle\release\app-release.aab
```

## Optional manual Gradle run

If you want to run Gradle yourself after the Capacitor build/sync step:

```powershell
npm run android:build
cd android
.\gradlew.bat bundleRelease
```
