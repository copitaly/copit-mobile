import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { canUseMemberApp } from '../../core/auth/member-app-access';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

type PrayerAction = {
  titleKey: string;
  descriptionKey: string;
  icon: string;
  route: string;
  accentClass: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, TranslatePipe],
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
      titleKey: 'prayer.submitActionTitle',
      descriptionKey: 'prayer.submitActionDescription',
      icon: 'heart-outline',
      route: '/tabs/prayer/submit',
      accentClass: 'prayer-action-card--primary',
    },
    {
      titleKey: 'prayer.communityActionTitle',
      descriptionKey: 'prayer.communityActionDescription',
      icon: 'people-outline',
      route: '/tabs/prayer/community',
      accentClass: 'prayer-action-card--secondary',
    },
  ];

  readonly memberAction: PrayerAction = {
    titleKey: 'prayer.myRequestsActionTitle',
    descriptionKey: 'prayer.myRequestsActionDescription',
    icon: 'document-text-outline',
    route: '/tabs/prayer/my-requests',
    accentClass: 'prayer-action-card--member',
  };

  showMemberAction = false;
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    combineLatest([this.authService.isAuthenticated$, this.authService.currentUser$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isAuthenticated, user]) => {
        this.showMemberAction = !!isAuthenticated && canUseMemberApp(user);
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
