import { CommonModule, Location } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-mobile-header',
  template: `
    <div class="app-header__inner app-header__inner--mobile-header">
      <button
        *ngIf="showBack"
        class="app-header__back"
        type="button"
        [attr.aria-label]="backAriaLabel"
        (click)="goBack()"
      >
        <ion-icon class="app-back-icon" name="chevron-back" aria-hidden="true"></ion-icon>
      </button>

      <div class="app-header__copy" [class.app-header__copy--centered]="centerCopy">
        <h1 class="app-header__title">{{ title }}</h1>
        <p *ngIf="subtitle" class="app-header__subtitle">{{ subtitle }}</p>
      </div>
    </div>
  `,
})
export class MobileHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() showBack = true;
  @Input() backAriaLabel = 'Go back';
  @Input() centerCopy = false;
  @Input() fallbackRoute = '/home';

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  goBack(): void {
    if (this.authService.isAuthenticatedSnapshot && this.router.url === '/profile') {
      void this.router.navigateByUrl(this.fallbackRoute, { replaceUrl: true });
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(this.fallbackRoute, { replaceUrl: true });
  }
}
