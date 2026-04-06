# Deep Link Redirect Contract

## Flow
1. Stripe success/cancel callbacks go to the Firebase-hosted bridge pages under `donor-redirect/donate/*`. These static HTML pages encode the native link before invoking the app so the browser never issues a redirect with unsafe characters.
2. The success bridge encodes the `session_id` via `encodeURIComponent` and redirects to `copit://donate/success?session_id=...` (with a fallback manual link if the session ID is missing). The cancel bridge simply opens `copit://donate/cancel`.
3. Inside the native app `DeepLinkService` wires `App.getLaunchUrl()` for cold starts and `App.addListener('appUrlOpen')` for warm/background opens, parses the path + query string, logs the URL/session_id, and navigates into `/donate/success` or `/donate/cancel` while running through `NgZone`.

## Requirements
- Success semantics require a `session_id`; cancel does not.
- If the bridge loads without a `session_id`, it surfaces a warning and leaves the manual link intact so the user can try again.
- The mobile success page still falls back to the cached session summary when backend verification fails.
