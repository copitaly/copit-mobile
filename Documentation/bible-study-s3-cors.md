# Bible Study S3 CORS

The COP mobile Bible Study reader loads private PDFs from presigned S3 URLs inside the Capacitor Android WebView.

## Production Android Origin

Google Play distribution does not determine the WebView origin. `copit-mobile/capacitor.config.ts` does.

Production Android is intentionally fixed to:

```text
https://localhost
```

The Capacitor configuration must keep:

```ts
server: {
  hostname: 'localhost',
  androidScheme: 'https',
}
```

Do not inject `server.url` for debug, staging, or production builds. That would change the WebView origin and break the S3 CORS contract for the PDF reader.

## Required S3 CORS Origin

Keep this Android production origin in the S3 bucket CORS configuration:

```text
https://localhost
```

The Play Store channel, including Google Play Internal Testing, Closed Testing, and Production, does not change that origin by itself.

## Reader Verification

For every Android release candidate, verify:

1. The installed app origin is `https://localhost`.
2. The signed S3 PDF response includes:
   - `Access-Control-Allow-Origin: https://localhost`
3. Bible Study PDF read, retry, reopen, and download all succeed on device.
