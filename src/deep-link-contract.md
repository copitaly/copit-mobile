# Deep Link Redirect Contract

## Flow
1. Stripe success/cancel callbacks go to the Firebase-hosted bridge pages under `donor-redirect/donate/*`. These static HTML pages encode the native link before invoking the app so the browser never issues a redirect with unsafe characters.
2. The success bridge encodes the `session_id` via `encodeURIComponent` and redirects to `copit://donate/success?session_id=...` (with a fallback manual link if the session ID is missing). The cancel bridge simply opens `copit://donate/cancel`.
3. Inside the native app `DeepLinkService` wires `App.getLaunchUrl()` for cold starts and `App.addListener('appUrlOpen')` for warm/background opens, normalizes both `copit://donate/*` links and HTTPS donor redirect links, logs the URL/session_id, and navigates into `/donate/success` or `/donate/cancel` while running through `NgZone`.

## Requirements
- Success semantics require a `session_id`; cancel does not.
- If the bridge loads without a `session_id`, it surfaces a warning and leaves the manual link intact so the user can try again.
- The mobile success page still falls back to the cached session summary when backend verification fails.

## Android App Links
- Android keeps the custom-scheme deep link support via `copit://donate/success` and `copit://donate/cancel`.
- Verified HTTPS App Links are also enabled for:
  - `https://copit-staging.web.app/donor-redirect/donate/success`
  - `https://copit-staging.web.app/donor-redirect/donate/cancel`
- The Android manifest uses `android:autoVerify="true"` so the app can open those URLs directly once the host serves a valid Digital Asset Links file.

### Required `assetlinks.json`
Host this file at:

```text
https://copit-staging.web.app/.well-known/assetlinks.json
```

Required content:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.peniel.platform",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_RELEASE_SIGNING_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

Notes:
- `package_name` must stay `com.peniel.platform`.
- Replace `REPLACE_WITH_RELEASE_SIGNING_SHA256_FINGERPRINT` with the real SHA-256 fingerprint for the certificate that signs the distributed app.
- For Play deployment, use the production donor redirect host and the SHA-256 fingerprint from the certificate that Android users will receive through Play App Signing.

### Getting the SHA-256 fingerprint locally

Windows PowerShell example:

```powershell
keytool -list -v `
  -keystore C:\Users\USER\keystores\peniel-upload.jks `
  -alias upload
```

Copy the `SHA256:` value from the command output and paste it into:

```text
copit-web/public/.well-known/assetlinks.json
```

Replace:

```text
REPLACE_WITH_RELEASE_SIGNING_SHA256_FINGERPRINT
```

with the actual fingerprint.

For production App Links distributed through Google Play:
- verify whether Android should trust the **Play Console App signing certificate** fingerprint rather than the local upload keystore fingerprint
- if Play App Signing is enabled, use the App signing certificate fingerprint shown in Play Console for the final production `assetlinks.json`
