import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

type PrayerAction = {
  title: string;
  description: string;
  icon: string;
  route: string;
  accentClass: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer',
  templateUrl: './prayer.page.html',
  styleUrls: ['./prayer.page.scss'],
})
export class PrayerPage implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly primaryActions: PrayerAction[] = [
    {
      title: 'Submit a Prayer Request',
      description: 'Share a prayer need with the church. Guests do not need an account to submit.',
      icon: 'heart-outline',
      route: '/prayer/submit',
      accentClass: 'prayer-action-card--primary',
    },
    {
      title: 'Community Prayers',
      description: 'Read approved prayer requests that have been shared with the wider community.',
      icon: 'people-outline',
      route: '/prayer/community',
      accentClass: 'prayer-action-card--secondary',
    },
  ];

  readonly memberAction: PrayerAction = {
    title: 'My Prayer Requests',
    description: 'View the requests you submitted while signed in as a member.',
    icon: 'document-text-outline',
    route: '/prayer/my-requests',
    accentClass: 'prayer-action-card--member',
  };

  showMemberAction = false;
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    combineLatest([this.authService.isAuthenticated$, this.authService.currentUser$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isAuthenticated, user]) => {
        this.showMemberAction = !!isAuthenticated && user?.role === 'member';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openAction(route: string): void {
    void this.router.navigateByUrl(route);
  }
}
