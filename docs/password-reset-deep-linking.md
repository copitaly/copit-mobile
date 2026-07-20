# Password Reset Deep Linking

This app uses one canonical member reset URL:

```text
https://copit-production-97631.web.app/reset-password/:uid/:token
```

That URL serves two purposes:

1. If the COP native app is installed and the platform verifies the domain association, the operating system opens the app and hands the HTTPS URL to Capacitor.
2. If the app is not installed, Firebase Hosting serves the Ionic web app and Angular handles the same `/reset-password/:uid/:token` route.

## Current implementation

- Angular route: `/reset-password/:uid/:token`
- Native URL handling: `App.getLaunchUrl()` and `App.addListener('appUrlOpen')`
- Android App Links host:
  - `https://copit-production-97631.web.app/reset-password/*`
- Firebase Hosting fallback:
  - static app served from `www`
  - SPA rewrite `** -> /index.html`

## Files involved

- `src/app/core/services/deep-link.service.ts`
- `src/app/app-routing.module.ts`
- `android/app/src/main/AndroidManifest.xml`
- `src/.well-known/assetlinks.json`
- `src/.well-known/apple-app-site-association`
- `firebase.json`

## Android App Links

The Android manifest already includes an `android:autoVerify="true"` intent filter for:

```text
https://copit-production-97631.web.app/reset-password/
```

To complete production verification, replace the placeholder fingerprint in:

```text
src/.well-known/assetlinks.json
```

with the SHA-256 fingerprint of the certificate that signs the production app users receive.

If Google Play App Signing is enabled, use the **App signing certificate** fingerprint from Play Console, not the local upload certificate fingerprint.

Example command for a local keystore:

```powershell
keytool -list -v `
  -keystore C:\path\to\upload-or-release.jks `
  -alias your-key-alias
```

## iOS Universal Links

There is currently no `ios/` Capacitor project checked into this repo, so iOS native changes still need to be applied when the iOS shell exists.

When you add or open the iOS app:

1. Enable the Associated Domains entitlement.
2. Add:

```text
applinks:copit-production-97631.web.app
```

3. Replace `REPLACE_WITH_APPLE_TEAM_ID` in:

```text
src/.well-known/apple-app-site-association
```

with the real Apple Team ID.

The `appIDs` value must become:

```text
YOUR_TEAM_ID.com.peniel.platform
```

## Firebase Hosting requirements

The donor app must be deployed to Firebase Hosting with:

- `public: "www"`
- SPA rewrite:

```json
{
  "source": "**",
  "destination": "/index.html"
}
```

- JSON content type header for:

```text
/.well-known/apple-app-site-association
```

## Deployment steps

From `copit-mobile`:

```bash
npm run build
firebase hosting:sites:list --project copit-5975e
firebase hosting:sites:create copit-production-97631 --project copit-5975e
firebase target:apply hosting donor copit-production-97631 --project copit-5975e
firebase deploy --only hosting:donor --project copit-5975e
```

## Verification

Web fallback checks:

- `https://copit-production-97631.web.app`
- `https://copit-production-97631.web.app/forgot-password`
- `https://copit-production-97631.web.app/login`
- `https://copit-production-97631.web.app/reset-password/test/test`

Native checks after app signing and deploy:

1. Install a signed build that matches the published Android/iOS association files.
2. Open a password reset email on device.
3. Tap the HTTPS reset link.
4. Confirm the app opens directly on the reset-password screen with the same `uid` and `token`.

## Security note

The deep-link service must never log raw password reset tokens. It only logs the route template `/reset-password/:uid/:token`.
