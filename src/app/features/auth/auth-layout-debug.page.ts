import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  standalone: true,
  selector: 'app-auth-layout-debug',
  imports: [CommonModule, IonicModule, AuthLayoutComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-page class="auth-page">
      <ion-content fullscreen class="auth-page-content">
        <app-auth-layout
          title="Auth layout debug"
          subtitle="Static projection for runtime verification"
          fallbackRoute="/login"
          [showFooter]="true"
        >
          <div class="debug-copy" data-testid="auth-layout-debug-copy">
            <h2>Projected content is visible</h2>
            <p>This isolated route proves the shared auth shell renders inside a routed Ionic page.</p>
          </div>

          <div authLayoutFooter data-testid="auth-layout-debug-footer">
            <p>Projected footer is visible</p>
          </div>
        </app-auth-layout>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-page.auth-page {
        background: #0b1d73;
      }

      ion-content.auth-page-content {
        --background: #0b1d73;
        --keyboard-offset: 0px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .auth-page-content::part(scroll) {
        flex: 1;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        background: #0b1d73;
      }

      .auth-page-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .debug-copy {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .debug-copy h2,
      .debug-copy p {
        margin: 0;
      }

      .debug-copy h2 {
        color: #0b1d73;
        font-size: 1.15rem;
        line-height: 1.25;
      }

      .debug-copy p,
      [authLayoutFooter] p {
        color: rgba(48, 68, 104, 0.82);
        line-height: 1.5;
      }

      [authLayoutFooter] p {
        margin: 0;
      }
    `,
  ],
})
export class AuthLayoutDebugPage {}
