import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

type PrimaryTabKey = 'home' | 'bible-study' | 'devotionals' | 'donate' | 'profile';

type PrimaryTab = {
  key: PrimaryTabKey;
  label: string;
  route: string;
  activePrefix: string;
  inactiveIcon: string;
  activeIcon: string;
};

@Component({
  standalone: true,
  selector: 'app-tabs',
  imports: [CommonModule, IonicModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-tabs class="app-tabs" data-testid="tabs-shell">
      <ion-tab-bar *ngIf="showTabBar" slot="bottom" class="app-tabs__bar" data-testid="tabs-bar">
        <ion-tab-button
          *ngFor="let tab of tabs"
          class="app-tabs__button"
          [class.app-tabs__button--active]="isActiveTab(tab.key)"
          [tab]="tab.key"
          [href]="tab.route"
          [attr.aria-current]="isActiveTab(tab.key) ? 'page' : null"
          [attr.data-testid]="'tab-button-' + tab.key"
        >
          <ion-icon
            class="app-tabs__icon"
            [name]="isActiveTab(tab.key) ? tab.activeIcon : tab.inactiveIcon"
            aria-hidden="true"
          ></ion-icon>
          <ion-label>{{ tab.label }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .app-tabs__bar {
        --background: rgba(255, 255, 255, 0.98);
        --border: 1px solid rgba(3, 23, 63, 0.08);
        padding:
          0.35rem
          calc(var(--cop-safe-right, env(safe-area-inset-right, 0px)) + 0.65rem)
          max(var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)), 0.18rem)
          calc(var(--cop-safe-left, env(safe-area-inset-left, 0px)) + 0.65rem);
        border-top: 1px solid rgba(3, 23, 63, 0.08);
        box-shadow: 0 -8px 28px rgba(6, 21, 74, 0.08);
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        column-gap: 0.15rem;
      }

      .app-tabs__button {
        --color: rgba(3, 23, 63, 0.5);
        --color-selected: #0b1d73;
        --padding-top: 0.34rem;
        --padding-bottom: 0.26rem;
        min-height: 54px;
        border-radius: 16px;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        transition: background-color 160ms ease, color 160ms ease;
        flex: 1 1 0;
        min-width: 0;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
      }

      .app-tabs__button--active {
        background: rgba(11, 29, 115, 0.08);
      }

      .app-tabs__icon {
        font-size: 1.22rem;
      }
    `,
  ],
})
export class TabsPage {
  private readonly router = inject(Router);
  private readonly topLevelTabRoutes = new Set([
    '/tabs/home',
    '/tabs/bible-study',
    '/tabs/devotionals',
    '/tabs/donate',
    '/tabs/profile',
  ]);

  readonly tabs: ReadonlyArray<PrimaryTab> = [
    {
      key: 'home',
      label: 'Home',
      route: '/tabs/home',
      activePrefix: '/tabs/home',
      inactiveIcon: 'home-outline',
      activeIcon: 'home',
    },
    {
      key: 'bible-study',
      label: 'Bible Study',
      route: '/tabs/bible-study',
      activePrefix: '/tabs/bible-study',
      inactiveIcon: 'book-outline',
      activeIcon: 'book',
    },
    {
      key: 'devotionals',
      label: 'Devotionals',
      route: '/tabs/devotionals',
      activePrefix: '/tabs/devotionals',
      inactiveIcon: 'reader-outline',
      activeIcon: 'reader',
    },
    {
      key: 'donate',
      label: 'Donate',
      route: '/tabs/donate',
      activePrefix: '/tabs/donate',
      inactiveIcon: 'gift-outline',
      activeIcon: 'gift',
    },
    {
      key: 'profile',
      label: 'Profile',
      route: '/tabs/profile',
      activePrefix: '/tabs/profile',
      inactiveIcon: 'person-outline',
      activeIcon: 'person',
    },
  ];

  isActiveTab(tabKey: PrimaryTabKey): boolean {
    const url = this.router.url || '';
    const tab = this.tabs.find((item) => item.key === tabKey);
    return !!tab && url.startsWith(tab.activePrefix);
  }

  get showTabBar(): boolean {
    const normalizedUrl = (this.router.url || '').split('?')[0].split('#')[0];
    return this.topLevelTabRoutes.has(normalizedUrl);
  }
}
