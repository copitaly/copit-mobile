import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { SentryTelemetryService } from '../services/sentry-telemetry.service';

@Injectable()
export class SentryHttpInterceptor implements HttpInterceptor {
  constructor(private readonly sentryTelemetry: SentryTelemetryService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const featureArea = this.sentryTelemetry.getCurrentFeatureArea();

    return next.handle(request).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.sentryTelemetry.addHttpBreadcrumb(
            request.method,
            request.urlWithParams,
            event.status,
            featureArea
          );
        }
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          this.sentryTelemetry.captureHttpFailure(error, request.method, request.urlWithParams, featureArea);
        }

        return throwError(() => error);
      })
    );
  }
}
