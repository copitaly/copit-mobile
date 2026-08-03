import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { MemberProfile } from '../../core/models/user.model';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { ForgotPasswordFormComponent } from './forgot-password-form.component';
import { LoginFormComponent } from './login-form.component';
import { RegisterFormComponent } from './register-form.component';

type ProfileAction = {
  title: string;
  subtitle: string;
  icon: string;
  route?: string;
  membersOnly?: boolean;
  destructive?: boolean;
  action?: () => void;
};

type ProfileActionSection = {
  title: string;
  actions: ProfileAction[];
};

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, LoginFormComponent, RegisterFormComponent, ForgotPasswordFormComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-profile',
  template: `
    <ion-page>
      <ion-content fullscreen class="profile-content cop-page cop-page--warm cop-content--tabs">
        <div class="profile-shell cop-page-shell">
          <header class="profile-header cop-page-header" aria-labelledby="profile-title">
            <p class="profile-header__eyebrow cop-page-header__eyebrow">Account hub</p>
            <div class="profile-header__copy">
              <h1 id="profile-title" class="cop-page-header__title">{{ profileHeaderTitle }}</h1>
              <p class="cop-page-header__subtitle">{{ profileHeaderSubtitle }}</p>
            </div>
          </header>

          <div *ngIf="loading" class="state-card state-card--loading" aria-live="polite">
            <div class="summary-skeleton">
              <div class="summary-skeleton__avatar"></div>
              <div class="summary-skeleton__copy">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <div class="state-copy">
              <h2>Loading profile</h2>
              <p>Fetching your member details.</p>
            </div>
          </div>

          <div *ngIf="!loading && errorMessage" class="state-card state-card--error">
            <div class="state-copy">
              <h2>We couldn't load your profile</h2>
              <p>{{ errorMessage }}</p>
            </div>
            <ion-button expand="block" class="state-button" (click)="loadProfile()">Try again</ion-button>
          </div>

          <div *ngIf="!loading && !errorMessage && profile; else signedOutState" class="profile-stack">
            <section class="account-card cop-card cop-card--soft" aria-labelledby="account-summary-title">
              <div class="account-card__identity">
                <div class="account-avatar" aria-hidden="true">{{ initials }}</div>

                <div class="account-copy">
                  <h2 id="account-summary-title">{{ displayName }}</h2>
                  <p class="account-copy__email">{{ profile.email || 'Not provided' }}</p>
                  <p class="account-meta">{{ membershipLabel }} <span aria-hidden="true">•</span> Member since {{ memberSinceLabel }}</p>
                </div>
              </div>

              <button
                type="button"
                class="account-card__edit"
                data-testid="edit-profile-summary"
                (click)="goToEditProfile()"
                aria-label="Edit Profile"
              >
                <span>Edit Profile</span>
                <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
              </button>
            </section>

            <section
              class="profile-group"
              *ngFor="let section of visibleSections"
              [attr.aria-labelledby]="'profile-section-' + section.title"
            >
              <h2 class="profile-group__title" [id]="'profile-section-' + section.title">
                {{ section.title }}
              </h2>

              <div class="profile-group__card cop-card cop-card--soft">
                <button
                  type="button"
                  class="action-row"
                  *ngFor="let action of section.actions; let last = last"
                  [class.action-row--last]="last"
                  [class.action-row--destructive]="action.destructive"
                  [attr.data-testid]="actionTestId(action)"
                  (click)="openAction(action)"
                >
                  <span class="action-row__icon" aria-hidden="true">
                    <ion-icon [name]="action.icon"></ion-icon>
                  </span>

                  <span class="action-row__copy">
                    <strong>{{ action.title }}</strong>
                    <small>{{ action.subtitle }}</small>
                  </span>

                  <span class="action-row__meta" aria-hidden="true">
                    <ion-icon name="chevron-forward"></ion-icon>
                  </span>
                </button>
              </div>
            </section>

            <div class="profile-group__card sign-out-card cop-card cop-card--soft">
              <button
                type="button"
                class="action-row action-row--last action-row--destructive sign-out-row"
                data-testid="sign-out"
                (click)="logout()"
                aria-label="Sign Out"
              >
                <span class="action-row__icon" aria-hidden="true">
                  <ion-icon name="log-out-outline"></ion-icon>
                </span>

                <span class="action-row__copy">
                  <strong>Sign Out</strong>
                  <small>Log out of your account on this device</small>
                </span>

                <span class="action-row__meta" aria-hidden="true">
                  <ion-icon name="chevron-forward"></ion-icon>
                </span>
              </button>
            </div>
          </div>

          <ng-template #signedOutState>
            <section
              *ngIf="!loading && !errorMessage && !profile"
              class="profile-login"
              [class.profile-login--register]="authMode === 'register'"
              aria-labelledby="profile-title"
            >
              <div class="profile-login__card cop-card cop-card--soft" *ngIf="authMode === 'sign-in'; else nonLoginMode">
                <app-login-form
                  appearance="embedded"
                  [returnUrl]="profileTabRoute"
                  heading="Sign in to your account"
                ></app-login-form>
              </div>

              <ng-template #nonLoginMode>
                <div class="profile-login__card cop-card cop-card--soft" *ngIf="authMode === 'register'; else forgotPasswordMode" data-testid="profile-register-card">
                  <app-register-form
                    appearance="embedded"
                    [returnUrl]="profileTabRoute"
                    heading="Create your account"
                  ></app-register-form>
                </div>
              </ng-template>

              <ng-template #forgotPasswordMode>
                <div class="profile-login__card profile-login__card--recovery cop-card cop-card--soft" data-testid="profile-forgot-password-card">
                  <app-forgot-password-form appearance="embedded"></app-forgot-password-form>
                </div>
              </ng-template>

              <section
                *ngIf="authMode === 'sign-in'"
                class="profile-benefits cop-card cop-card--soft"
                aria-labelledby="profile-benefits-title"
                data-testid="profile-benefits"
              >
                <h2 id="profile-benefits-title" class="profile-benefits__title">Why create an account?</h2>

                <ul class="profile-benefits__list">
                  <li><span class="profile-benefits__check" aria-hidden="true">✓</span><span>View your giving history</span></li>
                  <li><span class="profile-benefits__check" aria-hidden="true">✓</span><span>Read Bible Study manuals</span></li>
                  <li><span class="profile-benefits__check" aria-hidden="true">✓</span><span>Save churches for quick access</span></li>
                  <li><span class="profile-benefits__check" aria-hidden="true">✓</span><span>Submit prayer requests</span></li>
                </ul>
              </section>
            </section>
          </ng-template>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host{display:block}
    `
  ],
})
export class ProfilePage implements OnInit, OnDestroy {
  profile: MemberProfile | null = null;
  loading = true;
  refreshing = false;
  errorMessage = '';
  authMode: 'sign-in' | 'register' | 'forgot-password' = 'sign-in';
  private currentUserSubscription?: Subscription;
  private routeQueryParamsSubscription?: Subscription;
  private profileRequestInFlight = false;
  private pendingNavigation = false;
  private loggingOut = false;
  readonly profileTabRoute = '/tabs/profile';

  readonly actionSections: ProfileActionSection[] = [
    {
      title: 'Personal',
      actions: [
        {
          title: 'Edit Profile',
          subtitle: 'Update your name and member details',
          icon: 'create-outline',
          route: '/profile/account-settings/edit-profile',
        },
        {
          title: 'Account Settings',
          subtitle: 'Manage your account and privacy',
          icon: 'settings-outline',
          route: '/profile/account-settings',
        },
      ],
    },
    {
      title: 'Prayer & Care',
      actions: [
        {
          title: 'Prayer',
          subtitle: 'Share a request or pray with the community',
          icon: 'heart-outline',
          route: '/prayer',
        },
        {
          title: 'My Prayer Requests',
          subtitle: 'Review your submitted prayer history',
          icon: 'chatbubbles-outline',
          route: '/prayer/my-requests',
          membersOnly: true,
        },
      ],
    },
    {
      title: 'Giving',
      actions: [
        {
          title: 'My Donations',
          subtitle: 'View your giving history',
          icon: 'heart-outline',
          route: '/my-donations',
        },
        {
          title: 'Recurring Donations',
          subtitle: 'Manage scheduled gifts',
          icon: 'repeat-outline',
          route: '/profile/recurring-donations',
        },
      ],
    },
    {
      title: 'Church',
      actions: [
        {
          title: 'Saved Churches',
          subtitle: 'Quick access to your churches',
          icon: 'bookmark-outline',
          route: '/saved-churches',
        },
      ],
    },
    {
      title: 'Account',
      actions: [
        {
          title: 'Delete Account',
          subtitle: 'Permanently close your member account',
          icon: 'trash-outline',
          route: '/profile/account-settings/delete-account',
          destructive: true,
        },
      ],
    },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly sentryTelemetry: SentryTelemetryService
  ) {}

  get initials(): string {
    const first = this.profile?.first_name?.trim()?.charAt(0) ?? '';
    const last = this.profile?.last_name?.trim()?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'ME';
  }

  get displayName(): string {
    const fullName = this.profile?.full_name?.trim();
    if (fullName) {
      return fullName;
    }

    const firstName = this.profile?.first_name?.trim() ?? '';
    const lastName = this.profile?.last_name?.trim() ?? '';
    return `${firstName} ${lastName}`.trim() || 'Your account';
  }

  get memberSinceLabel(): string {
    const joinedAt = this.profile?.date_joined;
    if (!joinedAt) {
      return 'recently';
    }

    const joinedDate = new Date(joinedAt);
    if (Number.isNaN(joinedDate.getTime())) {
      return 'recently';
    }

    return joinedDate.getUTCFullYear().toString();
  }

  get membershipLabel(): string {
    if (this.resolvedRole === 'member') {
      return 'Member account';
    }

    return this.profile?.role?.trim() || 'Account active';
  }

  get profileHeaderSubtitle(): string {
    if (!this.profile) {
      if (this.authMode === 'register') {
        return 'Create your account to access your giving, Bible studies, churches, and prayer requests.';
      }

      if (this.authMode === 'forgot-password') {
        return "Enter your email and we'll send you a reset link.";
      }

      return 'Sign in to access your account, giving history, and church connections.';
    }

    return 'Manage your details, giving history, and church connections in one place.';
  }

  get profileHeaderTitle(): string {
    if (!this.profile && this.authMode === 'forgot-password') {
      return 'Forgot password';
    }

    return 'Profile';
  }

  get visibleSections(): ProfileActionSection[] {
    return this.actionSections
      .map((section) => ({
        ...section,
        actions: section.actions.filter((action) => !action.membersOnly || this.resolvedRole === 'member'),
      }))
      .filter((section) => section.actions.length > 0);
  }

  get isTabsProfileRoute(): boolean {
    return this.router.url.startsWith('/tabs/profile');
  }

  get resolvedRole(): string | null {
    return this.normalizeRole(this.profile?.role);
  }

  ngOnInit(): void {
    this.routeQueryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      const requestedMode = params.get('authMode');
      this.authMode =
        requestedMode === 'register'
          ? 'register'
          : requestedMode === 'forgot-password'
            ? 'forgot-password'
            : 'sign-in';
    });

    this.currentUserSubscription = this.authService.currentUser$.subscribe((user) => {
      this.profile = user;
      this.loading = false;
      this.refreshing = false;
      if (user) {
        this.errorMessage = '';
      }
    });

    if (!this.authService.isAuthenticatedSnapshot && !this.authService.accessTokenSnapshot) {
      this.loading = false;
      this.profile = null;
      return;
    }

    this.loadProfile();
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticatedSnapshot && !this.authService.accessTokenSnapshot) {
      this.loading = false;
      this.refreshing = false;
      this.errorMessage = '';
      this.profile = null;
      return;
    }

    this.loadProfile({ preserveCurrent: !!this.profile });
  }

  ngOnDestroy(): void {
    this.currentUserSubscription?.unsubscribe();
    this.routeQueryParamsSubscription?.unsubscribe();
  }

  actionTestId(action: ProfileAction): string {
    return action.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  loadProfile(options?: { preserveCurrent?: boolean }): void {
    if (this.profileRequestInFlight) {
      return;
    }

    const preserveCurrent = !!options?.preserveCurrent && !!this.profile;
    this.profileRequestInFlight = true;
    this.loading = !preserveCurrent;
    this.refreshing = preserveCurrent;
    this.errorMessage = '';

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loading = false;
        this.refreshing = false;
        this.profileRequestInFlight = false;
      },
      error: () => {
        this.loading = false;
        this.refreshing = false;
        this.profileRequestInFlight = false;
        if (!preserveCurrent || !this.profile) {
          this.errorMessage = 'Please check your connection and try again.';
        }
        this.sentryTelemetry.addFeatureBreadcrumb(
          'profile',
          'Profile load failed',
          {
            route: '/tabs/profile',
          },
          'error'
        );
      },
    });
  }

  openAction(action: ProfileAction): void {
    if (action.action) {
      action.action();
      return;
    }

    if (!action.route) {
      return;
    }

    void this.navigateByUrl(action.route);
  }

  logout(): void {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;
    this.authService.logout();
    this.profile = null;
    this.errorMessage = '';
    this.loading = false;
    this.refreshing = false;
    void this.router.navigateByUrl(this.profileTabRoute, { replaceUrl: true }).finally(() => {
      this.loggingOut = false;
    });
  }

  goToEditProfile(): void {
    void this.navigateByUrl('/profile/account-settings/edit-profile');
  }

  private normalizeRole(role: string | null | undefined): string | null {
    return typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : null;
  }

  private async navigateByUrl(url: string): Promise<void> {
    if (this.pendingNavigation) {
      return;
    }

    this.pendingNavigation = true;
    try {
      await this.router.navigateByUrl(url);
    } finally {
      this.pendingNavigation = false;
    }
  }
}
