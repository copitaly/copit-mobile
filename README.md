# copit-mobile

## Stripe return URL guidance

This donor-focused PWA currently treats Stripe success/cancel URLs as regular web routes. During development point both callbacks at your local frontend (for example `http://localhost:8100/donate/success` and `/donate/cancel`). In production the same paths should exist on the deployed app (`https://<your-front-domain>/donate/success` and `https://<your-front-domain>/donate/cancel`) so Stripe can return visitors into the flow immediately.  

The `environment.appOrigin` value records the current app origin so you can construct those URLs consistently (`${environment.appOrigin}/donate/success`). Once the project is wrapped in Capacitor in a later phase, you can enhance the Stripe callback handling with native deep links, but the web routes above remain valid and friendly for the PWA experience.

## Deep link redirect contract

1. Stripe success/cancel callbacks point to the Firebase-hosted bridge pages (e.g. `https://<your-web-domain>/donor-redirect/donate/success` and `/donor-redirect/donate/cancel`), so we can safely encode the native deep link payload before invoking the app.
2. The success bridge encodes the `session_id` and navigates to `copit://donate/success?session_id=...`; the cancel bridge simply opens `copit://donate/cancel`. Both pages include a manual "Open app" button and explain how to proceed when the deep link does not trigger automatically.
3. On the native side the `DeepLinkService` wires `App.getLaunchUrl()` (cold start) and `App.addListener('appUrlOpen')` (warm/background) and routes into `/donate/success` or `/donate/cancel`. The success screen requires a `session_id`, while cancel does not.
