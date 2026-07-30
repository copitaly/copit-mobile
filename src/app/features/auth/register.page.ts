import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { AUTH_FALLBACK_RETURN_URL, sanitizeAuthReturnUrl } from './auth-form.utils';
import { RegisterFormComponent } from './register-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, RegisterFormComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-register',
  template: `
    <ion-page>
      <ion-content fullscreen class="auth-content">
        <div class="auth-hero app-header app-header--inner">
          <app-mobile-header
            title="Create account"
            subtitle="Start giving with your profile"
            [fallbackRoute]="loginRoute"
          ></app-mobile-header>
        </div>

        <div class="surface auth-surface">
          <div class="surface__content auth-surface__content">
            <div class="auth-card">
              <app-register-form
                [returnUrl]="returnUrl"
                heading="Create your account"
              ></app-register-form>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-page {
        background: #0b1d73;
      }

      ion-content.auth-content {
        --background: #0b1d73;
        --keyboard-offset: 0px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .auth-content::part(scroll) {
        flex: 1;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        background: #0b1d73;
      }

      .auth-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .auth-hero {width:100%;padding-bottom:1.9rem;background:#0b1d73}

      .auth-surface {flex:1;margin-top:-.08rem;padding-top:1.3rem;background:#f4f7ff;box-shadow:0 -8px 24px rgba(2,18,54,.08);border-radius:26px 26px 0 0}

      .auth-surface__content {width:100%;max-width:456px;margin:0 auto;gap:0;padding:.4rem 1rem calc(1.5rem + env(safe-area-inset-bottom))}

      .auth-card {background:#fff;border-radius:24px;box-shadow:0 14px 36px rgba(6,21,74,.1);padding:1.3rem}

      @media (max-height: 760px) {
        .auth-surface {
          margin-top: -0.06rem;
          padding-top: 1.1rem;
        }
      }
    `,
  ],
})
export class RegisterPage {
  readonly returnUrl: string;
  readonly loginRoute: string;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.returnUrl = sanitizeAuthReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), AUTH_FALLBACK_RETURN_URL);
    this.loginRoute =
      this.returnUrl === AUTH_FALLBACK_RETURN_URL
        ? '/login'
        : `/login?returnUrl=${encodeURIComponent(this.returnUrl)}`;

    if (this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot) {
      void this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
    }
  }
}
