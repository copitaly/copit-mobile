# iOS App Store Setup for COP Italy

This document covers the remaining macOS/Xcode steps after the Capacitor iOS project has been generated in this repository.

It applies to the first App Store release of `copit-mobile`.

## Current repository state

- Native iOS project path: `ios/App`
- App name: `COP Italy`
- Bundle identifier: `com.peniel.platform`
- Capacitor web directory: `www`
- Production web origin: `https://copit-production-97631.web.app`
- Production API: `https://copit-api-production.up.railway.app/api`
- Apple Pay: intentionally disabled for v1

## Open the project on macOS

1. Use a macOS machine with Xcode installed.
2. Open:
   - `ios/App/App.xcodeproj`
3. If Xcode prompts to resolve Swift packages, allow it.

Note:
- This generated iOS project currently uses Swift Package Manager for Capacitor plugins.
- There is no committed CocoaPods setup in this repository at this stage.

## Signing and identity

In Xcode:

1. Select the `App` target.
2. Open `Signing & Capabilities`.
3. Select the correct Apple Developer Team.
4. Confirm the bundle identifier is:
   - `com.peniel.platform`
5. Configure automatic or manual signing according to the release account.
6. Ensure the Release configuration signs successfully for archive builds.

## Versioning

Current generated values:

- `MARKETING_VERSION`: `1.0.19`
- `CURRENT_PROJECT_VERSION`: `1`

Before submission:

1. Confirm `1.0.19` is the intended App Store version.
2. Set a valid build number policy for `CURRENT_PROJECT_VERSION`.
3. Ensure the build number is unique for every archive uploaded to App Store Connect.

## Deployment target

Current generated deployment target:

- iOS `15.0`

Verify this target remains acceptable for the intended release audience.

## Associated Domains

The repository now includes an entitlements file with:

- `applinks:copit-production-97631.web.app`

In Xcode:

1. Confirm the `Associated Domains` capability appears for the target.
2. If Xcode does not show it automatically, add the capability and keep:
   - `applinks:copit-production-97631.web.app`
3. Confirm the Apple App ID is provisioned to use Associated Domains.

## apple-app-site-association

Repository file:

- `src/.well-known/apple-app-site-association`

It now includes route coverage for:

- `/reset-password/*/*`
- `/tabs/donate/success`
- `/tabs/donate/cancel`
- `/donate/success`
- `/donate/cancel`
- `/donor-redirect/donate/success`
- `/donor-redirect/donate/cancel`

Still required before production use:

1. Replace:
   - `REPLACE_WITH_APPLE_TEAM_ID.com.peniel.platform`
   with the real Apple Team ID prefix.
2. Deploy the updated file so it is publicly served at:
   - `https://copit-production-97631.web.app/.well-known/apple-app-site-association`
3. Verify the response is served as JSON and without redirects that break Universal Links.

## Privacy manifest

No app-level `PrivacyInfo.xcprivacy` has been added in this repository pass.

Before submission:

1. Let Xcode resolve all Swift packages.
2. Inspect bundled SDKs and generated app contents for privacy manifests.
3. Verify whether an app-level privacy manifest is required in addition to SDK-provided manifests.
4. Confirm App Store privacy validation passes in Xcode Organizer / App Store Connect.

## Permissions

No new iOS permission usage descriptions were added in this pass.

Before submission:

1. Inspect `Info.plist`.
2. Confirm only genuinely required `NS*UsageDescription` keys are present.
3. Do not add camera, microphone, photos, location, contacts, or Bluetooth permissions unless a current feature actually requires them.

## Icons and splash

Generated native assets now exist under:

- `ios/App/App/Assets.xcassets/AppIcon.appiconset`
- `ios/App/App/Assets.xcassets/Splash.imageset`

Before submission:

1. Verify the App Icon renders correctly in Xcode previews and on a device.
2. Confirm the 1024x1024 App Store icon is accepted.
3. Verify the splash assets display correctly on iPhone sizes used for review.

## Stripe / payments

For v1:

- Apple Pay remains disabled.
- Stripe card PaymentSheet should remain available on iOS.

Before release:

1. Test one-time card offering on a physical iPhone.
2. Test recurring offering flow on a physical iPhone.
3. Verify success and cancel return handling for donation routes.
4. Verify hosted Checkout fallback behavior if the native path is unavailable.

Future optional capability:

- Apple Pay can be evaluated later as a separate release track.

It is not part of the required checklist for v1.

## Public legal pages

Verify the following routes remain accessible without authentication:

- `/privacy-policy`
- `/terms-and-conditions`
- `/about`
- `/contact`

## Account deletion

Verify the in-app delete-account flow remains reachable from:

- `Profile -> Account Settings -> Delete Account`

This is important for App Store review because the app supports account creation.

## Final Xcode release checklist

1. Open `ios/App/App.xcodeproj`.
2. Resolve Swift packages.
3. Select Apple Developer Team.
4. Confirm bundle identifier `com.peniel.platform`.
5. Confirm signing for Release.
6. Confirm deployment target.
7. Confirm Associated Domains capability.
8. Replace the AASA Team ID placeholder and deploy the updated AASA file.
9. Verify privacy manifest requirements.
10. Verify app icon and launch assets.
11. Run on a physical iPhone.
12. Test login, offering, password reset, legal pages, and delete-account flow.
13. Archive using Release.
14. Validate the archive.
15. Upload to App Store Connect.
