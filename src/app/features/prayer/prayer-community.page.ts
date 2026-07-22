import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-community',
  template: `
    <ion-page>
      <ion-content fullscreen class="profile-content">
        <div class="profile-hero app-header app-header--inner">
          <app-mobile-header
            title="Community Prayers"
            subtitle="The public prayer feed will be connected in a later step."
            fallbackRoute="/prayer"
          ></app-mobile-header>
        </div>

        <div class="surface profile-surface">
          <div class="surface__content profile-surface__content">
            <div class="state-card signed-out-state">
              <div class="state-copy">
                <h2>Coming next</h2>
                <p>This page is reserved for approved community prayer requests.</p>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-page>
  `,
})
export class PrayerCommunityPage {}
