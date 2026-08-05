# Apple Pay iOS Setup for COP Italy

This project is prepared in code to enable Apple Pay through Stripe PaymentSheet on iOS, but the Apple Developer and Xcode steps must still be completed on macOS with a real iOS project.

## Current code expectations

- Environment field: `stripeApplePayMerchantId`
- Expected format: `merchant.<reverse-domain-name>`
- Example only, based on the current app identifier `com.peniel.platform`:
  - `merchant.com.peniel.platform`

Do not treat the example above as a committed production Merchant ID. Create the real Merchant ID in Apple Developer first, then copy that exact value into the appropriate mobile environment file or secret-managed config.

## Apple Developer requirements

1. Enroll the organization in the Apple Developer Program.
2. Create a Merchant ID in Apple Developer.
3. Use a stable naming convention such as:
   - `merchant.com.peniel.platform`
4. Open the App ID used by the iOS app.
5. Enable the Apple Pay capability on that App ID.
6. Regenerate or refresh the provisioning profiles after Apple Pay is enabled.

## Xcode steps

These steps require a generated `ios/App` project and Xcode on macOS.

1. Create the iOS Capacitor project if it does not already exist:
   - `npx cap add ios`
2. Open the iOS project in Xcode.
3. Go to `Signing & Capabilities`.
4. Add the `Apple Pay` capability.
5. Select the Merchant ID created in Apple Developer.
6. Confirm the entitlement key is present:
   - `com.apple.developer.in-app-payments`
7. Refresh signing and provisioning if Xcode reports stale profiles.

## Stripe Dashboard steps

For the current destination-charge architecture, Apple Pay should be configured on the platform Stripe account, not individually on each destination church account.

1. Enable Apple Pay in the correct Stripe mode:
   - test mode for test builds
   - live mode for production builds
2. Complete any required Stripe Apple Pay certificate or iOS application configuration shown in Stripe Dashboard.
3. Keep the existing destination-charge flow unchanged:
   - `automatic_payment_methods`
   - `transfer_data.destination`
   - existing webhook and metadata handling

## Testing requirements

Apple Pay must be validated on a physical iPhone.

Required conditions:

- A physical iPhone
- iOS build installed through Xcode or TestFlight
- A signed-in Apple ID
- Wallet configured with a supported card
- Supported Apple Pay region
- Matching Merchant ID configured in the mobile environment

Recommended validation flow:

1. Test a one-time offering with Stripe test mode.
2. Confirm PaymentSheet still falls back to card when Apple Pay is unavailable.
3. Confirm connected-account destination payouts remain unchanged.
4. Verify success, cancellation, and failure return flows.

## Recurring offerings

Recurring Apple Pay support depends on the existing Stripe recurring setup correctly saving a wallet-backed payment method through the current subscription/setup flow.

Before advertising recurring Apple Pay support:

1. Verify the backend recurring flow returns the correct client secret type for PaymentSheet.
2. Test that Apple Pay can authorize and persist the payment method for future recurring charges.
3. Confirm the existing subscription and webhook flow works without architecture changes.

## Native Apple Pay vs Apple Pay on the web

This document covers native iOS Apple Pay through Stripe PaymentSheet only.

It does not cover:

- Safari web Apple Pay domain verification
- web Payment Request Button setup
- browser merchant validation flows
