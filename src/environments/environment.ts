// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiBaseUrl: 'https://copit-api-staging.up.railway.app/api',
  appOrigin: 'https://copit-staging.web.app',
  appVersion: '1.0.3',
  stripePublishableKey: 'pk_test_51THm0c5TkhnH7UiO7vLQPQiejjd6Fre5rY23sjYXZySj8t6WYsZDYsPkiO2kbhaktejllSv6XXdoRyS2sYxpDst700DkaOG4pC',
  stripeMerchantDisplayName: 'COP Italy Mobile',
  sentryEnabled: false,
  sentryDsn: 'https://1c980c083b10f18d66a13cca5349ad92@o4511588679483392.ingest.de.sentry.io/4511588682694736',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
