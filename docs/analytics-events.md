# Analytics Events

This app uses a single `AnalyticsService` wrapper around Firebase Analytics. Components must not call Firebase directly.

Analytics only initializes when both of these conditions are true:

- `environment.analyticsEnabled === true`
- `environment.firebaseConfig` is present with valid Firebase app keys

The wrapper also keeps a consent-ready structure so analytics can be disabled later without changing event call sites.

## Privacy rules

Never send:

- email
- phone
- name
- transaction reference
- Stripe ids
- client secret
- exact donation amount
- search query text
- free-text input

Donation attribution context is stored only as sanitized funnel metadata in memory/sessionStorage:

- `church_id`
- `district_id`
- `area_id`
- `category`
- `amount_bucket`
- `frequency`
- `user_type`

## Event dictionary

### `app_opened`
Trigger:
- App bootstrap in `AppComponent`

Allowed params:
- `user_type`: `guest | member`

### `give_now_tapped`
Trigger:
- Home screen primary CTA

Allowed params:
- `user_type`: `guest | member`
- `cta_type`: `default | saved_church | saved_churchs_list`

### `branch_selected`
Trigger:
- Branch chosen from branch browser
- Saved church chosen from saved church list
- Home quick-give path when a saved/default branch is used directly

Allowed params:
- `church_id`
- `district_id`
- `area_id`
- `user_type`: `guest | member`

### `donation_form_viewed`
Trigger:
- Donation page shown with a selected branch

Allowed params:
- `church_id`
- `user_type`: `guest | member`

### `donation_checkout_started`
Trigger:
- One-time native checkout submit before checkout creation request
- Monthly recurring checkout submit before subscription bootstrap request

Allowed params:
- `church_id`
- `category`
- `amount_bucket`
- `frequency`: `one_time | monthly`
- `user_type`: `guest | member`

### `donation_payment_success`
Trigger:
- Donation success page after backend verification
- Donation success page fallback using session storage context
- Generic success fallback when verification context is unavailable

Allowed params:
- `church_id`
- `category`
- `amount_bucket`
- `frequency`: `one_time | monthly`
- `user_type`: `guest | member`
- `verification_source`: `backend | session_storage | generic`

### `donation_payment_cancelled`
Trigger:
- Donation cancel page after PaymentSheet cancellation

Allowed params:
- `church_id`
- `category`
- `amount_bucket`
- `frequency`: `one_time | monthly`
- `user_type`: `guest | member`

### `donation_payment_failed`
Trigger:
- Checkout creation failure
- PaymentSheet failure
- Reserved for verification-stage fallback if needed later

Allowed params:
- `church_id`
- `category`
- `amount_bucket`
- `frequency`: `one_time | monthly`
- `user_type`: `guest | member`
- `failure_stage`: `checkout_create | payment_sheet | verification | unknown`

## Amount bucket rules

- `0_10`
- `10_25`
- `25_50`
- `50_100`
- `100_250`
- `250_plus`

The exact donation amount must never be sent to analytics. Only the derived bucket is allowed.
