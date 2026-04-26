import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MemberProfile } from '../../core/models/user.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-profile',
  template: `
    <ion-page>
      <div class="profile-hero">
        <button class="profile-back" type="button" (click)="goHome()">
          <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
          <span>Home</span>
        </button>
        <div class="profile-identity">
          <div class="profile-avatar" aria-hidden="true">{{ initials }}</div>
          <div>
            <p class="profile-kicker">Member Profile</p>
            <h1>{{ profile?.full_name || 'Your account' }}</h1>
            <p>{{ profile?.email || profile?.phone_number || 'Signed in member' }}</p>
          </div>
        </div>
      </div>

      <ion-content fullscreen class="profile-content">
        <div class="profile-card" *ngIf="profile; else loadingOrLoggedOut">
          <div class="profile-row">
            <span>Phone</span>
            <strong>{{ profile.phone_number || profile.phone || 'Not set' }}</strong>
          </div>
          <div class="profile-row">
            <span>Email</span>
            <strong>{{ profile.email || 'Not set' }}</strong>
          </div>
          <div class="profile-row">
            <span>Language</span>
            <strong>{{ profile.language || 'Not set' }}</strong>
          </div>
          <div class="profile-row">
            <span>Joined</span>
            <strong>{{ profile.date_joined || 'Available after refresh' }}</strong>
          </div>

          <div class="profile-summary">
            <h2>Giving Summary</h2>
            <p>Total paid: {{ profile.donation_summary.total_paid_amount }} {{ profile.donation_summary.currency | uppercase }}</p>
            <p>Donations: {{ profile.donation_summary.total_paid_count }}</p>
          </div>

          <ion-button expand="block" fill="outline" class="logout-button" (click)="logout()">
            Sign out
          </ion-button>
        </div>

        <ng-template #loadingOrLoggedOut>
          <div class="profile-card empty">
            <p>{{ loading ? 'Loading your profile…' : 'Sign in to access your member profile.' }}</p>
            <ion-button expand="block" (click)="goToLogin()">
              Go to Login
            </ion-button>
          </div>
        </ng-template>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .profile-hero {
        background: linear-gradient(180deg, #081b61, #0b1d73 80%);
        color: #fff;
        padding: calc(env(safe-area-inset-top) + 1.5rem) 1.25rem 1.25rem;
      }

      .profile-back {
        border: 0;
        background: transparent;
        color: rgba(255, 255, 255, 0.86);
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0;
        margin-bottom: 1rem;
        font: inherit;
      }

      .profile-identity {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .profile-identity h1,
      .profile-identity p,
      .profile-kicker {
        margin: 0;
      }

      .profile-kicker {
        opacity: 0.68;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.72rem;
        margin-bottom: 0.35rem;
      }

      .profile-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        font-weight: 700;
      }

      .profile-content {
        --background: #f4f6fb;
      }

      .profile-card {
        margin: -0.25rem 1.25rem 1.5rem;
        background: #fff;
        border-radius: 22px;
        padding: 1.25rem;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.12);
      }

      .profile-card.empty {
        text-align: center;
      }

      .profile-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 0;
        border-bottom: 1px solid rgba(3, 23, 63, 0.08);
      }

      .profile-row span {
        color: rgba(3, 23, 63, 0.62);
      }

      .profile-row strong {
        color: #03173f;
        text-align: right;
      }

      .profile-summary {
        padding-top: 1rem;
      }

      .profile-summary h2 {
        margin: 0 0 0.5rem;
        color: #03173f;
      }

      .profile-summary p {
        margin: 0.25rem 0;
        color: rgba(3, 23, 63, 0.72);
      }

      .logout-button {
        --border-radius: 999px;
        margin-top: 1rem;
      }
    `,
  ],
})
export class ProfilePage implements OnInit {
  profile: MemberProfile | null = null;
  loading = true;

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  get initials(): string {
    const first = this.profile?.first_name?.trim()?.charAt(0) ?? '';
    const last = this.profile?.last_name?.trim()?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'ME';
  }

  ngOnInit(): void {
    this.profile = this.authService.currentUserSnapshot;
    this.loading = !this.profile;
    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/home']);
  }

  goHome(): void {
    void this.router.navigate(['/home']);
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
