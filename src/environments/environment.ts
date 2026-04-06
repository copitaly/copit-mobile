// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api',
  appOrigin: 'http://localhost:8100',
  stripePublishableKey: 'pk_test_51THmDx8TcJ7mDCsmXfPOZ0LeqY7WqPigkBWr92Cpxn2iq0QaKF3pJ6HP28Hp4FFoVs0VisQssg0d0r9c7OrjbPa1002ScC51h0',
  stripeMerchantDisplayName: 'COP Italy Mobile',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
