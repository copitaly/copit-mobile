import * as Sentry from '@sentry/capacitor';
import { init as sentryAngularInit } from '@sentry/angular';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { sanitizeSentryValue } from './app/core/utils/sentry-sanitizer';

if (environment.sentryEnabled && environment.sentryDsn?.trim()) {
  Sentry.init(
    {
      dsn: environment.sentryDsn,
      environment: environment.sentryEnvironment,
      release: environment.sentryRelease,
      sendDefaultPii: false,
      beforeBreadcrumb(breadcrumb) {
        return {
          ...breadcrumb,
          data: sanitizeSentryValue(breadcrumb.data) as Record<string, unknown> | undefined,
        };
      },
      beforeSend(event) {
        const sanitizedEvent = {
          ...event,
          user: event.user ? { id: event.user.id ?? undefined } : event.user,
          contexts: sanitizeSentryValue(event.contexts) as typeof event.contexts,
          extra: sanitizeSentryValue(event.extra) as typeof event.extra,
          request: event.request
            ? {
                ...event.request,
                data: sanitizeSentryValue(event.request.data) as typeof event.request.data,
                headers: sanitizeSentryValue(event.request.headers) as typeof event.request.headers,
              }
            : event.request,
        };

        return sanitizedEvent;
      },
    },
    sentryAngularInit
  );
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch((err) => {
    if (environment.sentryEnabled && environment.sentryDsn?.trim()) {
      Sentry.captureException(err);
    }
    console.error(err);
  });
