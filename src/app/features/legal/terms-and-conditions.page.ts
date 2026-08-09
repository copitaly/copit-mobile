import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';
import { LegalDocumentPageComponent } from './legal-document-page.component';
import { MOBILE_TERMS_AND_CONDITIONS_CONTENT } from './legal-documents.content';

@Component({
  standalone: true,
  selector: 'app-mobile-terms-and-conditions-page',
  imports: [CommonModule, IonicModule, FeaturePageShellComponent, LegalDocumentPageComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-page>
      <ion-content fullscreen class="legal-page__content cop-content--secondary">
        <app-feature-page-shell
          [title]="document.title"
          [subtitle]="document.subtitle"
          [backFallbackRoute]="fallbackRoute"
          headerTone="editorial"
          surfaceTone="flat"
          contentMaxWidth="720px"
        >
          <app-legal-document-page [document]="document"></app-legal-document-page>
        </app-feature-page-shell>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-page,
      ion-content.legal-page__content {
        background: #f7f6f2;
        --background: #f7f6f2;
        --keyboard-offset: 0px;
      }
    `,
  ],
})
export class TermsAndConditionsPage {
  private readonly router = inject(Router);

  readonly document = MOBILE_TERMS_AND_CONDITIONS_CONTENT;

  get fallbackRoute(): string {
    const state = this.router.getCurrentNavigation()?.extras.state ?? window.history.state;
    return typeof state?.fallbackRoute === 'string' ? state.fallbackRoute : '/login';
  }
}
