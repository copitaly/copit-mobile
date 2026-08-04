import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { AuthLayoutComponent } from './auth-layout.component';
import { AUTH_FALLBACK_RETURN_URL, sanitizeAuthReturnUrl } from './auth-form.utils';
import { LoginFormComponent } from './login-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, AuthLayoutComponent, LoginFormComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-login',
  template: `
    <ion-page class="auth-page">
      <ion-content fullscreen class="auth-page-content">
        <app-auth-layout
          [title]="'auth.loginTitle' | t"
          [subtitle]="'auth.loginSubtitle' | t"
          fallbackRoute="/tabs/home"
        >
          <app-login-form [returnUrl]="returnUrl" appearance="standalone"></app-login-form>
        </app-auth-layout>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-page.auth-page {
        background: #0b1d73;
      }

      ion-content.auth-page-content {
        --background: #0b1d73;
        --keyboard-offset: 0px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .auth-page-content::part(scroll) {
        flex: 1;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        background: #0b1d73;
      }

      .auth-page-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
export class LoginPage {
  readonly returnUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.returnUrl = sanitizeAuthReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), AUTH_FALLBACK_RETURN_URL);

    if (this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot) {
      void this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
    }
  }
}
