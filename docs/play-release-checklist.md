# Google Play Release Readiness Checklist

Repository audit date: 2026-05-30  
Scope: current `copit-mobile` repository state, plus linked donor redirect host configuration in `copit-web`

Status markers:
- `[x]` Completed in the repository
- `[ ]` Still required
- `[-]` Partially complete or depends on local/Play Console setup

## Completed

- [x] Android package identity is no longer using the Ionic starter defaults.
  - `appId`: `com.peniel.platform`
  - visible app name: `COP Italy`
- [x] Android namespace and application ID are aligned to `com.peniel.platform`.
- [x] Initial Android versioning is aligned for first release.
  - `versionName`: `1.0.0`
  - `versionCode`: `1`
  - `package.json` version: `1.0.0`
- [x] Android release bundle command exists.
  - `npm run android:bundle`
- [x] Release signing configuration is wired to local Gradle properties / environment variables without committing secrets.
  - `PENIEL_UPLOAD_STORE_FILE`
  - `PENIEL_UPLOAD_STORE_PASSWORD`
  - `PENIEL_UPLOAD_KEY_ALIAS`
  - `PENIEL_UPLOAD_KEY_PASSWORD`
- [x] Auth token storage has been migrated away from direct `localStorage` usage in the auth service.
  - secure storage plugin is installed and synced
- [x] Android app backups are disabled.
  - `android:allowBackup="false"`
  - `android:fullBackupContent="false"`
- [x] Existing custom-scheme deep links are still supported.
  - `copit://donate/success`
  - `copit://donate/cancel`
- [x] HTTPS Android App Links intent filters have been added with `android:autoVerify="true"` for the current donor redirect host.
- [x] `copit-web/public/.well-known/assetlinks.json` exists with the correct package name placeholder structure.
- [x] Firebase hosting has been prepared to serve `/.well-known/assetlinks.json` directly.
- [x] Non-auth donation/session persistence has been minimized for fallback behavior.
- [x] A visible internal-test label appears when a production build still points at staging/test configuration.
- [x] Local developer docs exist for:
  - JDK 21
  - `JAVA_HOME`
  - keystore creation
  - signing properties
  - SHA-256 fingerprint retrieval
  - local `.aab` generation

## Required Before Internal Testing

- [ ] Install JDK 21 on the build machine and set `JAVA_HOME`.
  - The current repo expects Java 21 for Android compilation.
- [ ] Confirm `java -version` and Gradle can run locally.
  - The last known blocker was missing `JAVA_HOME` / `java` on the machine.
- [ ] Create a local upload keystore (`peniel-upload.jks`) outside the repo.
- [ ] Add the four `PENIEL_UPLOAD_*` values to user Gradle properties or environment variables.
- [ ] Replace `REPLACE_WITH_RELEASE_SIGNING_SHA256_FINGERPRINT` in:
  - `copit-web/public/.well-known/assetlinks.json`
  with the SHA-256 from the local signing certificate used for internal testing.
- [ ] Build the first signed test bundle locally and confirm output exists at:
  - `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Verify custom-scheme deep links still open the app on a real Android device.
- [ ] Verify HTTPS App Links on the current donor redirect host open the app on a real Android device.
- [ ] Confirm the current test build label is visible for testers.

## Required Before Closed Testing

- [ ] Move production mobile environment values off staging infrastructure.
  - Current `environment.prod.ts` still points to staging:
    - `apiBaseUrl` contains `staging`
    - `appOrigin` contains `staging`
- [ ] Replace the current Stripe publishable key in `environment.prod.ts`.
  - Current value starts with `pk_test`
- [ ] Confirm Stripe backend return/cancel URLs point to the correct donor redirect host for the build being tested.
- [ ] Replace the App Links fingerprint in `assetlinks.json` with the actual fingerprint used by the closed-test signed build.
- [ ] Confirm `.well-known/assetlinks.json` is publicly reachable on the test host after deployment.
- [ ] Verify signed `bundleRelease` completes on the actual release machine, not just TypeScript / Capacitor sync.
- [ ] Prepare basic Google Play store listing draft assets.
  - app title
  - short description
  - full description
  - app icon
  - phone screenshots
  - feature graphic
- [ ] Confirm internal/closed testing privacy disclosures and tester notes are ready.

## Required Before Production

- [ ] Replace staging donor redirect host intent filters and documentation with the final production host.
  - Current App Links host is `copit-staging.web.app`
- [ ] Update `copit-web/public/.well-known/assetlinks.json` with the correct production fingerprint.
  - If Play App Signing is enabled, this may need the **Play Console App signing certificate** SHA-256, not the local upload key.
- [ ] Replace all remaining staging/test production environment values.
  - production API base URL
  - production app origin
  - live Stripe publishable key
- [ ] Verify a fully signed production `.aab` can be generated and uploaded.
- [ ] Publish a production privacy policy URL.
  - No repository-hosted privacy policy artifact has been identified yet.
- [ ] Complete Google Play Data Safety disclosure.
  - The app handles account/contact data and donation/payment-related data, so Data Safety answers must reflect actual collection, transmission, retention, and deletion behavior.
- [ ] Confirm final Play Console app setup.
  - Play developer account
  - app entry created
  - package name matches `com.peniel.platform`
  - App Signing configured
  - testers/tracks configured
- [ ] Finalize store listing assets and metadata.
  - screenshots for required device classes
  - feature graphic
  - support contact details
  - privacy policy link
  - category/content rating
- [ ] Complete policy/compliance items as needed.
  - content rating questionnaire
  - target audience declaration if applicable
  - ads declaration if applicable

## Current Risk Summary

- [-] Package identity, versioning, secure auth storage, backup hardening, and signing hooks are in good shape in the repo.
- [-] App Links are structurally in place, but still pointed at the current staging donor redirect host and still use a placeholder SHA-256 in `assetlinks.json`.
- [ ] The current `production` environment is not production-safe for Play release because it still uses staging URLs and a Stripe `pk_test` key.
- [ ] A signed `.aab` has not yet been fully verified from this environment because Java/`JAVA_HOME` and local signing inputs are still machine-dependent prerequisites.
- [ ] Privacy policy, Data Safety, store listing assets, and Play Console setup remain external release blockers.
