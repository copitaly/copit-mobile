# copit-mobile

## Stripe return URL guidance

This donor-focused PWA currently treats Stripe success/cancel URLs as regular web routes. During development point both callbacks at your local frontend (for example `http://localhost:8100/donate/success` and `/donate/cancel`). In production the same paths should exist on the deployed app (`https://<your-front-domain>/donate/success` and `https://<your-front-domain>/donate/cancel`) so Stripe can return visitors into the flow immediately.  

The `environment.appOrigin` value records the current app origin so you can construct those URLs consistently (`${environment.appOrigin}/donate/success`). Once the project is wrapped in Capacitor in a later phase, you can enhance the Stripe callback handling with native deep links, but the web routes above remain valid and friendly for the PWA experience.
