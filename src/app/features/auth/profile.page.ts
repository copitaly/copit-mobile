import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { canUseMemberApp, hasMemberRole } from '../../core/auth/member-app-access';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import { MemberProfile } from '../../core/models/user.model';
import { PUBLIC_INFO_LINKS } from '../../core/constants/public-info-links';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { ForgotPasswordFormComponent } from './forgot-password-form.component';
import { LoginFormComponent } from './login-form.component';
import { RegisterFormComponent } from './register-form.component';

type ProfileAction = {
  titleKey?: string;
  subtitleKey?: string;
  title?: string;
  subtitle?: string;
  icon: string;
  route?: string;
  state?: Record<string, unknown>;
  requiresMemberAppCapability?: boolean;
  requiresExactMemberRole?: boolean;
  destructive?: boolean;
  action?: () => void;
  testId: string;
};

type ProfileActionSection = {
  titleKey?: string;
  title?: string;
  actions: ProfileAction[];
};

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, LoginFormComponent, RegisterFormComponent, ForgotPasswordFormComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-profile',
  template: `
    <ion-page>
      <ion-content fullscreen class="profile-content cop-page cop-page--warm cop-content--tabs">
        <div class="profile-shell cop-page-shell">
          <header class="profile-header cop-page-header" aria-labelledby="profile-title">
            <p class="profile-header__eyebrow cop-page-header__eyebrow">{{ 'auth.accountHub' | t }}</p>
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
              <h2>{{ 'profile.loadingTitle' | t }}</h2>
              <p>{{ 'profile.loadingSubtitle' | t }}</p>
            </div>
          </div>

          <div *ngIf="!loading && errorMessage" class="state-card state-card--error">
            <div class="state-copy">
              <h2>{{ 'profile.errorTitle' | t }}</h2>
              <p>{{ errorMessage }}</p>
            </div>
            <ion-button expand="block" class="state-button" (click)="loadProfile()">{{ 'common.tryAgain' | t }}</ion-button>
          </div>

          <div *ngIf="!loading && !errorMessage && profile; else signedOutState" class="profile-stack">
            <section class="account-card cop-card cop-card--soft" aria-labelledby="account-summary-title">
              <div class="account-card__identity">
                <div class="account-avatar" aria-hidden="true">{{ initials }}</div>

                <div class="account-copy">
                  <h2 id="account-summary-title">{{ displayName }}</h2>
                  <p class="account-copy__email">{{ profile.email || ('profile.notProvided' | t) }}</p>
                  <p class="account-meta">{{ 'profile.memberSince' | t:{ year: memberSinceLabel } }}</p>
                </div>
              </div>

              <button
                type="button"
                class="account-card__edit"
                data-testid="edit-profile-summary"
                (click)="goToEditProfile()"
                [attr.aria-label]="'profile.editProfile' | t"
              >
                <span>{{ 'profile.editProfile' | t }}</span>
                <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
              </button>
            </section>

            <section
              class="profile-group"
              *ngFor="let section of visibleSections"
              [attr.aria-labelledby]="'profile-section-' + sectionId(section)"
            >
              <h2 class="profile-group__title" [id]="'profile-section-' + sectionId(section)">
                {{ sectionTitle(section) }}
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
                    <strong>{{ actionTitle(action) }}</strong>
                    <small>{{ actionSubtitle(action) }}</small>
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
                [attr.aria-label]="'profile.signOut' | t"
              >
                <span class="action-row__icon" aria-hidden="true">
                  <ion-icon name="log-out-outline"></ion-icon>
                </span>

                <span class="action-row__copy">
                  <strong>{{ 'profile.signOut' | t }}</strong>
                  <small>{{ 'profile.signOutSubtitle' | t }}</small>
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
                  [heading]="'auth.loginHeading' | t"
                ></app-login-form>
              </div>

              <ng-template #nonLoginMode>
                <div class="profile-login__card cop-card cop-card--soft" *ngIf="authMode === 'register'; else forgotPasswordMode" data-testid="profile-register-card">
                  <app-register-form
                    appearance="embedded"
                    [returnUrl]="profileTabRoute"
                    [heading]="'auth.registerHeading' | t"
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
                <h2 id="profile-benefits-title" class="profile-benefits__title">{{ 'auth.createAccountBenefitsTitle' | t }}</h2>

                <ul class="profile-benefits__list">
                  <li><span class="profile-benefits__check" aria-hidden="true">&#10003;</span><span>{{ 'auth.benefitGivingHistory' | t }}</span></li>
                  <li><span class="profile-benefits__check" aria-hidden="true">&#10003;</span><span>{{ 'auth.benefitBibleStudy' | t }}</span></li>
                  <li><span class="profile-benefits__check" aria-hidden="true">&#10003;</span><span>{{ 'auth.benefitSavedChurches' | t }}</span></li>
                  <li><span class="profile-benefits__check" aria-hidden="true">&#10003;</span><span>{{ 'auth.benefitPrayerRequests' | t }}</span></li>
                </ul>
              </section>

              <section
                class="profile-group"
                *ngFor="let section of publicInfoSections"
                [attr.aria-labelledby]="'profile-public-section-' + sectionId(section)"
              >
                <h2 class="profile-group__title" [id]="'profile-public-section-' + sectionId(section)">
                  {{ sectionTitle(section) }}
                </h2>

                <div class="profile-group__card cop-card cop-card--soft">
                  <button
                    type="button"
                    class="action-row"
                    *ngFor="let action of section.actions; let last = last"
                    [class.action-row--last]="last"
                    [attr.data-testid]="actionTestId(action)"
                    (click)="openAction(action)"
                  >
                    <span class="action-row__icon" aria-hidden="true">
                      <ion-icon [name]="action.icon"></ion-icon>
                    </span>

                    <span class="action-row__copy">
                      <strong>{{ actionTitle(action) }}</strong>
                      <small>{{ actionSubtitle(action) }}</small>
                    </span>

                    <span class="action-row__meta" aria-hidden="true">
                      <ion-icon name="chevron-forward"></ion-icon>
                    </span>
                  </button>
                </div>
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
      titleKey: 'profile.sectionPersonal',
      actions: [
        {
          titleKey: 'profile.editProfile',
          subtitleKey: 'profile.editProfileSubtitle',
          icon: 'create-outline',
          route: '/profile/account-settings/edit-profile',
          testId: 'edit-profile',
        },
        {
          titleKey: 'profile.accountSettings',
          subtitleKey: 'profile.accountSettingsSubtitle',
          icon: 'settings-outline',
          route: '/profile/account-settings',
          testId: 'account-settings',
        },
      ],
    },
    {
      titleKey: 'profile.sectionPrayer',
      actions: [
        {
          titleKey: 'profile.myPrayerRequests',
          subtitleKey: 'profile.myPrayerRequestsSubtitle',
          icon: 'chatbubbles-outline',
          route: '/tabs/prayer/my-requests',
          requiresMemberAppCapability: true,
          testId: 'my-prayer-requests',
        },
      ],
    },
    {
      titleKey: 'profile.sectionGiving',
      actions: [
        {
          titleKey: 'profile.myDonations',
          subtitleKey: 'profile.myDonationsSubtitle',
          icon: 'heart-outline',
          route: '/tabs/profile/my-donations',
          testId: 'my-donations',
        },
        {
          titleKey: 'profile.recurringDonations',
          subtitleKey: 'profile.recurringDonationsSubtitle',
          icon: 'repeat-outline',
          route: '/tabs/profile/recurring-donations',
          testId: 'recurring-donations',
        },
      ],
    },
    {
      titleKey: 'profile.sectionChurch',
      actions: [
        {
          titleKey: 'profile.savedChurches',
          subtitleKey: 'profile.savedChurchesSubtitle',
          icon: 'bookmark-outline',
          route: '/saved-churches',
          testId: 'saved-churches',
        },
      ],
    },
    {
      titleKey: 'profile.sectionAccount',
      actions: [
        {
          titleKey: 'profile.deleteAccount',
          subtitleKey: 'profile.deleteAccountSubtitle',
          icon: 'trash-outline',
          route: '/profile/account-settings/delete-account',
          requiresExactMemberRole: true,
          destructive: true,
          testId: 'delete-account',
        },
      ],
    },
    {
      title: 'COP ITALY',
      actions: [
        {
          title: 'About COP Italy',
          subtitle: 'Learn more about the church in Italy',
          icon: 'information-circle-outline',
          route: PUBLIC_INFO_LINKS.about,
          state: { fallbackRoute: this.profileTabRoute },
          testId: 'about-cop-italy',
        },
        {
          title: 'Contact Us',
          subtitle: 'Address, phone, and email details',
          icon: 'mail-open-outline',
          route: PUBLIC_INFO_LINKS.contact,
          state: { fallbackRoute: this.profileTabRoute },
          testId: 'contact-us',
        },
      ],
    },
    {
      title: 'LEGAL',
      actions: [
        {
          title: 'Privacy Policy',
          subtitle: 'Read how your information is handled',
          icon: 'shield-checkmark-outline',
          route: PUBLIC_INFO_LINKS.privacyPolicy,
          state: { fallbackRoute: this.profileTabRoute },
          testId: 'privacy-policy',
        },
        {
          title: 'Terms & Conditions',
          subtitle: 'Review the terms for using COP Italy',
          icon: 'document-text-outline',
          route: PUBLIC_INFO_LINKS.termsAndConditions,
          state: { fallbackRoute: this.profileTabRoute },
          testId: 'terms-and-conditions',
        },
      ],
    },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly sentryTelemetry: SentryTelemetryService,
    private readonly localeService: LocaleService
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
    return `${firstName} ${lastName}`.trim() || this.localeService.translate('profile.fallbackDisplayName');
  }

  get memberSinceLabel(): string {
    const joinedAt = this.profile?.date_joined;
    if (!joinedAt) {
      return this.localeService.translate('profile.memberSinceFallback');
    }

    const joinedDate = new Date(joinedAt);
    if (Number.isNaN(joinedDate.getTime())) {
      return this.localeService.translate('profile.memberSinceFallback');
    }

    return joinedDate.getUTCFullYear().toString();
  }

  get profileHeaderSubtitle(): string {
    if (!this.profile) {
      if (this.authMode === 'register') {
        return this.localeService.translate('auth.profileRegisterSubtitle');
      }

      if (this.authMode === 'forgot-password') {
        return this.localeService.translate('auth.forgotPasswordEmbeddedSubtitle');
      }

      return this.localeService.translate('auth.profileSignedOutSubtitle');
    }

    return this.localeService.translate('profile.signedInSubtitle');
  }

  get profileHeaderTitle(): string {
    if (!this.profile && this.authMode === 'forgot-password') {
      return this.localeService.translate('auth.profileForgotPasswordTitle');
    }

    return this.localeService.translate('auth.profileTitle');
  }

  get visibleSections(): ProfileActionSection[] {
    return this.actionSections
      .map((section) => ({
        ...section,
        actions: section.actions.filter((action) => {
          if (action.requiresExactMemberRole && !this.hasExactMemberRole) {
            return false;
          }

          if (action.requiresMemberAppCapability && !this.hasMemberAppCapability) {
            return false;
          }

          return true;
        }),
      }))
      .filter((section) => section.actions.length > 0);
  }

  get publicInfoSections(): ProfileActionSection[] {
    return this.actionSections.filter((section) => section.title === 'COP ITALY' || section.title === 'LEGAL');
  }

  get isTabsProfileRoute(): boolean {
    return this.router.url.startsWith('/tabs/profile');
  }

  get hasMemberAppCapability(): boolean {
    return canUseMemberApp(this.profile);
  }

  get hasExactMemberRole(): boolean {
    return hasMemberRole(this.profile);
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
    return action.testId;
  }

  sectionId(section: ProfileActionSection): string {
    return section.titleKey ?? section.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'section';
  }

  sectionTitle(section: ProfileActionSection): string {
    return section.titleKey ? this.localeService.translate(section.titleKey) : section.title ?? '';
  }

  actionTitle(action: ProfileAction): string {
    return action.titleKey ? this.localeService.translate(action.titleKey) : action.title ?? '';
  }

  actionSubtitle(action: ProfileAction): string {
    return action.subtitleKey ? this.localeService.translate(action.subtitleKey) : action.subtitle ?? '';
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
          this.errorMessage = this.localeService.translate('errors.network');
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

    void this.navigateByUrl(action.route, action.state);
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

  private async navigateByUrl(url: string, state?: Record<string, unknown>): Promise<void> {
    if (this.pendingNavigation) {
      return;
    }

    this.pendingNavigation = true;
    try {
      await this.router.navigateByUrl(url, state ? { state } : undefined);
    } finally {
      this.pendingNavigation = false;
    }
  }
}
