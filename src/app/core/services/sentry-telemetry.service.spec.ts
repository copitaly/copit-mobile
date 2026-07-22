import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from './auth.service';
import { SentryTelemetryService } from './sentry-telemetry.service';

describe('SentryTelemetryService', () => {
  it('does not include email in the Sentry user payload implementation', () => {
    TestBed.configureTestingModule({
      providers: [
        SentryTelemetryService,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated$: new BehaviorSubject(false).asObservable(),
            currentUser$: new BehaviorSubject(null).asObservable(),
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/prayer/my-requests',
            events: new BehaviorSubject(null).asObservable(),
          },
        },
      ],
    });

    const service = TestBed.inject(SentryTelemetryService);
    const implementation = (service as any).applyUserContext.toString();

    expect(implementation).not.toContain('email');
  });
});
