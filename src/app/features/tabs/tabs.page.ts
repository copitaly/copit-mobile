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
    <ion-page>
      <ion-tabs class="app-tabs" data-testid="tabs-shell">
        <ion-router-outlet></ion-router-outlet>

        <ion-tab-bar slot="bottom" class="app-tabs__bar" data-testid="tabs-bar">
          <ion-tab-button
            *ngFor="let tab of tabs"
            class="app-tabs__button"
            [class.app-tabs__button--active]="isActiveTab(tab.key)"
            [tab]="tab.key"
            [routerLink]="tab.route"
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
    </ion-page>
  `,
  styles: [
    `
      :host,
      ion-page,
      .app-tabs {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 100%;
      }

      ion-tabs.app-tabs {
        height: 100%;
        flex: 1 1 auto;
      }

      .app-tabs ion-router-outlet {
        flex: 1 1 auto;
        min-height: 0;
      }

      .app-tabs__bar {
        --background: rgba(255, 255, 255, 0.98);
        --border: 1px solid rgba(3, 23, 63, 0.08);
        padding:
          0.45rem
          calc(env(safe-area-inset-right, 0px) + 0.55rem)
          calc(env(safe-area-inset-bottom, 0px) + 0.45rem)
          calc(env(safe-area-inset-left, 0px) + 0.55rem);
        border-top: 1px solid rgba(3, 23, 63, 0.08);
        box-shadow: 0 -8px 28px rgba(6, 21, 74, 0.08);
      }

      .app-tabs__button {
        --color: rgba(3, 23, 63, 0.5);
        --color-selected: #0b1d73;
        --padding-top: 0.42rem;
        --padding-bottom: 0.32rem;
        min-height: 58px;
        border-radius: 16px;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        transition: background-color 160ms ease, color 160ms ease;
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
}
