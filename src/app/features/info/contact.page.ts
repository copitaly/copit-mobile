import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { ExternalBrowserService } from '../../core/services/external-browser.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';

@Component({
  standalone: true,
  selector: 'app-contact-page',
  imports: [CommonModule, IonicModule, FeaturePageShellComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-page>
      <ion-content fullscreen class="info-page__content cop-content--secondary">
        <app-feature-page-shell
          title="Contact Us"
          subtitle="Get in touch with COP Italy."
          [backFallbackRoute]="fallbackRoute"
          headerTone="editorial"
          surfaceTone="flat"
          contentMaxWidth="720px"
        >
          <section class="contact-page" aria-labelledby="contact-page-title">
            <div class="contact-page__intro">
              <p class="contact-page__eyebrow">COP Italy</p>
              <h1 id="contact-page-title" class="contact-page__title">We'd love to hear from you.</h1>
              <p class="contact-page__lede">
                Contact COP Italy for general enquiries or support using the details below.
              </p>
            </div>

            <div class="contact-page__stack">
              <div class="contact-row cop-card cop-card--soft">
                <span class="contact-row__icon" aria-hidden="true">
                  <ion-icon name="location-outline"></ion-icon>
                </span>
                <div class="contact-row__copy">
                  <p class="contact-row__label">Address</p>
                  <button
                    type="button"
                    class="contact-row__action contact-row__action--text"
                    data-testid="contact-address"
                    aria-label="Open COP Italy address in maps"
                    (click)="openAddress()"
                  >
                    <span>Via Torino 9</span>
                    <span>20093 Cologno Monzese (MI)</span>
                  </button>
                </div>
              </div>

              <div class="contact-row cop-card cop-card--soft">
                <span class="contact-row__icon" aria-hidden="true">
                  <ion-icon name="call-outline"></ion-icon>
                </span>
                <div class="contact-row__copy">
                  <p class="contact-row__label">Call Us</p>
                  <a
                    class="contact-row__action"
                    data-testid="contact-phone"
                    href="tel:0225397290"
                    aria-label="Call COP Italy at 0225 397290"
                  >
                    0225 397290
                  </a>
                </div>
              </div>

              <div class="contact-row cop-card cop-card--soft">
                <span class="contact-row__icon" aria-hidden="true">
                  <ion-icon name="mail-outline"></ion-icon>
                </span>
                <div class="contact-row__copy">
                  <p class="contact-row__label">Email</p>
                  <a
                    class="contact-row__action"
                    data-testid="contact-email"
                    href="mailto:info@copitaly.org"
                    aria-label="Email COP Italy at info@copitaly.org"
                  >
                    info@copitaly.org
                  </a>
                </div>
              </div>
            </div>
          </section>
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
      ion-content.info-page__content {
        background: #f7f6f2;
        --background: #f7f6f2;
        --keyboard-offset: 0px;
      }

      .contact-page {
        display: flex;
        flex-direction: column;
        gap: 1.35rem;
        padding: 0.25rem 0 calc(1.5rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
      }

      .contact-page__eyebrow {
        margin: 0 0 0.45rem;
        color: #b88912;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .contact-page__title,
      .contact-page__lede,
      .contact-row__label {
        margin: 0;
      }

      .contact-page__title {
        color: #081f5c;
        font-size: clamp(1.55rem, 4.8vw, 1.92rem);
        font-weight: 800;
        line-height: 1.14;
        letter-spacing: -0.03em;
      }

      .contact-page__lede {
        margin-top: 0.82rem;
        color: #33486f;
        font-size: 0.98rem;
        line-height: 1.68;
      }

      .contact-page__stack {
        display: flex;
        flex-direction: column;
        gap: 0.95rem;
      }

      .contact-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.95rem;
        align-items: flex-start;
        padding: 1rem 1.05rem;
      }

      .contact-row__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.85rem;
        height: 2.85rem;
        border-radius: 999px;
        background: rgba(11, 47, 128, 0.08);
        color: #0b2f80;
        font-size: 1.2rem;
      }

      .contact-row__copy {
        min-width: 0;
      }

      .contact-row__label {
        color: #b88912;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .contact-row__action {
        display: inline-flex;
        flex-direction: column;
        gap: 0.15rem;
        margin-top: 0.42rem;
        color: #081f5c;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.55;
        text-decoration: none;
      }

      .contact-row__action--text {
        appearance: none;
        border: 0;
        background: transparent;
        padding: 0;
        align-items: flex-start;
        text-align: left;
        cursor: pointer;
      }

      .contact-row__action:focus-visible {
        outline: 2px solid rgba(11, 47, 128, 0.22);
        outline-offset: 3px;
        border-radius: 0.45rem;
      }
    `,
  ],
})
export class ContactPage {
  private readonly router = inject(Router);
  private readonly externalBrowserService = inject(ExternalBrowserService);

  get fallbackRoute(): string {
    const state = this.router.getCurrentNavigation()?.extras.state ?? window.history.state;
    return typeof state?.fallbackRoute === 'string' ? state.fallbackRoute : '/tabs/profile';
  }

  openAddress(): void {
    void this.externalBrowserService.openUrl(
      'https://www.google.com/maps/search/?api=1&query=Via%20Torino%209%2C%2020093%20Cologno%20Monzese%20(MI)'
    );
  }
}
