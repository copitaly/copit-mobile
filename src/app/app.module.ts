import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { createErrorHandler } from '@sentry/angular';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';
import { SentryHttpInterceptor } from './core/interceptors/sentry-http.interceptor';
import { SentryTelemetryService } from './core/services/sentry-telemetry.service';
import { AnalyticsService } from './core/services/analytics.service';

function initializeAuth(authService: AuthService): () => Promise<void> {
  return () => authService.initialize();
}

function initializeSentryTelemetry(sentryTelemetry: SentryTelemetryService): () => void {
  return () => sentryTelemetry.initialize();
}

function initializeAnalytics(analyticsService: AnalyticsService): () => Promise<void> {
  return () => analyticsService.initialize();
}

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: ErrorHandler,
      useValue: createErrorHandler({
        logErrors: !environment.production,
      }),
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SentryHttpInterceptor,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSentryTelemetry,
      deps: [SentryTelemetryService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAnalytics,
      deps: [AnalyticsService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
