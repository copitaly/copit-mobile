import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MemberProfile } from '../../core/models/user.model';

type QuickAction = {
  title: string;
  subtitle: string;
  icon: string;
  soon?: boolean;
  route?: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-profile',
  template: `
    <ion-page>
      <ion-content fullscreen class="profile-content">
        <div class="profile-hero app-header app-header--inner">
          <div class="app-header__inner">
            <button class="profile-back app-header__back" type="button" aria-label="Back" (click)="goHome()">
              <ion-icon class="app-back-icon" name="arrow-back" aria-hidden="true"></ion-icon>
            </button>
            <div class="app-header__copy profile-hero__copy">
              <h1 class="app-header__title">My Profile</h1>
            </div>
          </div>
        </div>

        <div class="surface profile-surface">
          <div class="surface__content profile-surface__content">
            <div *ngIf="loading" class="state-card loading-state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading profile</h2>
                <p>Fetching your member details.</p>
              </div>
            </div>

            <div *ngIf="!loading && errorMessage" class="state-card error-state">
              <div class="state-copy">
                <h2>We couldn't load your profile</h2>
                <p>{{ errorMessage }}</p>
              </div>
              <ion-button expand="block" class="state-button" (click)="loadProfile()">Try again</ion-button>
            </div>

            <div *ngIf="!loading && !errorMessage && profile; else signedOutState" class="profile-stack">
              <section class="profile-card">
                <div class="profile-card__header">
                  <div class="profile-avatar" aria-hidden="true">{{ initials }}</div>
                  <div class="profile-identity">
                    <h2>{{ profile.full_name || fullName }}</h2>
                    <p>Member since {{ memberSinceYear }}</p>
                  </div>
                </div>

                <div class="profile-divider"></div>

                <div class="profile-detail">
                  <div class="detail-icon">
                    <ion-icon name="call-outline" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="detail-copy">
                    <span>Phone</span>
                    <strong>{{ profile.phone_number || profile.phone || 'Not provided' }}</strong>
                  </div>
                </div>

                <div class="profile-detail">
                  <div class="detail-icon">
                    <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="detail-copy">
                    <span>Email</span>
                    <strong>{{ profile.email || 'Not provided' }}</strong>
                  </div>
                </div>

                <div class="profile-detail">
                  <div class="detail-icon">
                    <ion-icon name="language-outline" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="detail-copy">
                    <span>Language</span>
                    <strong>{{ profile.language || 'Not provided' }}</strong>
                  </div>
                </div>
              </section>

              <section class="profile-section">
                <h3 class="profile-section__title">Quick Actions</h3>

                <div class="action-card">
                  <button
                    type="button"
                    class="action-row"
                    *ngFor="let action of quickActions; let last = last"
                    [class.action-row--last]="last"
                    (click)="openQuickAction(action)"
                  >
                    <span class="action-icon" aria-hidden="true">
                      <ion-icon [name]="action.icon"></ion-icon>
                    </span>

                    <span class="action-copy">
                      <strong>{{ action.title }}</strong>
                      <small>{{ action.subtitle }}</small>
                    </span>

                    <span class="action-meta">
                      <span *ngIf="action.soon" class="soon-badge">Soon</span>
                      <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
                    </span>
                  </button>
                </div>
              </section>

              <ion-button expand="block" class="give-now-button" (click)="goToDonationFlow()">
                <ion-icon name="gift-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>Give now</span>
              </ion-button>

              <ion-button expand="block" fill="outline" class="logout-button" (click)="logout()">
                <ion-icon name="log-out-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>Log out</span>
              </ion-button>

              <p class="profile-footer">The Church of Pentecost — Italy</p>
            </div>

            <ng-template #signedOutState>
              <div *ngIf="!loading && !errorMessage && !profile" class="state-card signed-out-state">
                <div class="state-copy">
                  <h2>Sign in required</h2>
                  <p>Log in to view your member profile.</p>
                </div>
                <ion-button expand="block" class="state-button" (click)="goToLogin()">Go to Login</ion-button>
              </div>
            </ng-template>
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

      ion-content.profile-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        --background: #0b1d73;
      }

      ion-content.profile-content::part(scroll) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .profile-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .profile-hero {
        width: 100%;
        padding-bottom: 2.15rem;
      }

      .profile-back {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(6px);
        justify-content: center;
        padding: 0;
        min-height: 40px;
      }

      .profile-back ion-icon {
        font-size: 1.1rem;
      }

      .profile-hero__copy {
        text-align: center;
        align-items: center;
      }

      .profile-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
      }

      .profile-surface__content {
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
      }

      .profile-stack {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .profile-card,
      .action-card,
      .state-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
      }

      .profile-card {
        padding: 1.2rem;
      }

      .profile-card__header {
        display: flex;
        align-items: center;
        gap: 0.95rem;
      }

      .profile-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(180deg, #f4c646, #e9ad13);
        color: #0b1d73;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.15rem;
        font-weight: 800;
        box-shadow: 0 10px 24px rgba(233, 173, 19, 0.28);
        flex-shrink: 0;
      }

      .profile-identity {
        min-width: 0;
      }

      .profile-identity h2,
      .profile-identity p {
        margin: 0;
      }

      .profile-identity h2 {
        color: #03173f;
        font-size: 1.15rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .profile-identity p {
        margin-top: 0.28rem;
        color: rgba(3, 23, 63, 0.62);
        font-size: 0.9rem;
      }

      .profile-divider {
        height: 1px;
        background: rgba(3, 23, 63, 0.08);
        margin: 1rem 0 0.4rem;
      }

      .profile-detail {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.7rem 0;
      }

      .detail-icon {
        width: 38px;
        height: 38px;
        border-radius: 14px;
        background: #f3f5fb;
        color: rgba(3, 23, 63, 0.68);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .detail-icon ion-icon {
        font-size: 1.05rem;
      }

      .detail-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .detail-copy span {
        color: rgba(3, 23, 63, 0.58);
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .detail-copy strong {
        margin-top: 0.2rem;
        color: #03173f;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .profile-section {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
      }

      .profile-section__title {
        margin: 0 0 0 0.15rem;
        color: rgba(3, 23, 63, 0.68);
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .action-card {
        overflow: hidden;
      }

      .action-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 1rem 1.05rem;
        background: transparent;
        border: 0;
        border-bottom: 1px solid rgba(3, 23, 63, 0.08);
        text-align: left;
      }

      .action-row--last {
        border-bottom: 0;
      }

      .action-icon {
        width: 40px;
        height: 40px;
        border-radius: 14px;
        background: #eef2fd;
        color: #425ea6;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .action-icon ion-icon {
        font-size: 1.1rem;
      }

      .action-copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.18rem;
      }

      .action-copy strong {
        color: #03173f;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.25;
      }

      .action-copy small {
        color: rgba(3, 23, 63, 0.55);
        font-size: 0.86rem;
        line-height: 1.35;
      }

      .action-meta {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        color: rgba(3, 23, 63, 0.42);
        flex-shrink: 0;
      }

      .action-meta ion-icon {
        font-size: 1rem;
      }

      .soon-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 46px;
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        background: #f4f5fa;
        color: rgba(3, 23, 63, 0.4);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .logout-button {
        --border-color: rgba(220, 53, 69, 0.18);
        --border-radius: 18px;
        --color: #df3f4d;
        --padding-top: 0.95rem;
        --padding-bottom: 0.95rem;
        margin-top: 0.2rem;
      }

      .give-now-button {
        --background: #f5b628;
        --background-hover: #f5b628;
        --background-activated: #d79d1f;
        --border-radius: 999px;
        --box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
        --color: #0b1d73;
        min-height: 52px;
        font-weight: 700;
        margin-top: 0.15rem;
      }

      .logout-button::part(native) {
        box-shadow: none;
        background: rgba(255, 255, 255, 0.7);
      }

      .profile-footer {
        margin: 0.3rem 0 0;
        text-align: center;
        color: rgba(55, 73, 109, 0.76);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      .state-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.8rem;
      }

      .loading-state {
        padding: 1.5rem 1.25rem;
      }

      .loading-state ion-spinner {
        color: #0b1d73;
        transform: scale(1.05);
      }

      .state-copy {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .state-copy h2,
      .state-copy p {
        margin: 0;
      }

      .state-copy h2 {
        color: #03173f;
        font-size: 1.05rem;
        font-weight: 700;
      }

      .state-copy p {
        color: rgba(3, 23, 63, 0.65);
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .state-button {
        --background: #0b1d73;
        --background-hover: #0b1d73;
        --background-activated: #09175c;
        --border-radius: 16px;
        --box-shadow: 0 12px 22px rgba(11, 29, 115, 0.2);
        font-weight: 600;
      }

      @media (max-height: 760px) {
        .profile-hero {
          padding-bottom: 1.85rem;
        }

        .profile-surface {
          padding-top: 1.1rem;
        }
      }
    `,
  ],
})
export class ProfilePage implements OnInit {
  profile: MemberProfile | null = null;
  loading = true;
  errorMessage = '';

  readonly quickActions: QuickAction[] = [
    {
      title: 'My Donations',
      subtitle: 'View your giving history',
      icon: 'heart-outline',
      soon: true,
    },
    {
      title: 'Saved Churches',
      subtitle: 'Quick access to your churches',
      icon: 'bookmark-outline',
      soon: true,
    },
    {
      title: 'Annual Giving Statement',
      subtitle: 'Download yearly summary',
      icon: 'document-text-outline',
      soon: true,
    },
    {
      title: 'Recurring Donations',
      subtitle: 'Manage scheduled gifts',
      icon: 'repeat-outline',
      soon: true,
    },
  ];

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  get initials(): string {
    const first = this.profile?.first_name?.trim()?.charAt(0) ?? '';
    const last = this.profile?.last_name?.trim()?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'ME';
  }

  get fullName(): string {
    const firstName = this.profile?.first_name?.trim() ?? '';
    const lastName = this.profile?.last_name?.trim() ?? '';
    return `${firstName} ${lastName}`.trim() || 'Your account';
  }

  get memberSinceYear(): string {
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

  ngOnInit(): void {
    this.profile = this.authService.currentUserSnapshot;
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.getCurrentUser().subscribe({
      next: profile => {
        this.profile = profile;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Please check your connection and try again.';
      },
    });
  }

  openQuickAction(action: QuickAction): void {
    if (action.route) {
      void this.router.navigate([action.route]);
      return;
    }

    console.info(`[ProfilePage] ${action.title} is not implemented yet.`);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/home']);
  }

  goToDonationFlow(): void {
    void this.router.navigate(['/branches']);
  }

  goHome(): void {
    void this.router.navigate(['/home']);
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
