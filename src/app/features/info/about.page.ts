import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { PUBLIC_INFO_LINKS } from '../../core/constants/public-info-links';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';

@Component({
  standalone: true,
  selector: 'app-about-page',
  imports: [CommonModule, IonicModule, FeaturePageShellComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-page>
      <ion-content fullscreen class="info-page__content cop-content--secondary">
        <app-feature-page-shell
          title="About COP Italy"
          subtitle="The Church of Pentecost Italy"
          [backFallbackRoute]="fallbackRoute"
          headerTone="editorial"
          surfaceTone="flat"
          contentMaxWidth="720px"
        >
          <section class="info-page" aria-labelledby="about-page-title">
            <div class="info-page__identity" aria-hidden="true">
              <img src="assets/img/logo.png" alt="" class="info-page__logo" />
            </div>

            <div class="info-page__intro">
              <p class="info-page__eyebrow">COP Italy</p>
              <h1 id="about-page-title" class="info-page__title">About COP Italy</h1>
              <p class="info-page__lede">
                The Church of Pentecost in Italy is a Bible-believing, Gospel-oriented and missions-advancing Church
                that is growing by leaps and bounds. As our name implies, we are led and actuated by the Holy Spirit.
              </p>
            </div>

            <section class="info-page__section">
              <h2>Our Story</h2>
              <p>
                What originally started with 6 people worshipping in a small room in 1990 has now sprouted as a giant
                tree spreading its boughs in all directions. To the glory of God, today, we are about 5,000-strong.
              </p>
              <p>
                From the length and breadth of this country, the wind of Pentecost is blowing mightily.
              </p>
            </section>

            <section class="info-page__section">
              <h2>Our Faith</h2>
              <p>
                In a time when true worship could be as rare as diamonds, and the Gospel is increasingly compromised to
                conform to ungodly tastes, we have resolved to keep our sanctuaries Scriptural and to uphold nothing
                but the message of Christ and Him crucified.
              </p>
            </section>

            <section class="info-page__section">
              <h2>Part of a Global Church</h2>
              <p>
                The Church of Pentecost Italy is a branch of the Church of Pentecost worldwide.
              </p>
            </section>

            <section class="info-page__section info-page__section--closing">
              <p>
                As you explore our app, may you be inspired, revived and set on fire for the Lord. Feel free to
                contact us and worship with us.
              </p>
              <p class="info-page__blessing">God bless you.</p>
            </section>

            <ion-button
              expand="block"
              class="info-page__cta"
              data-testid="about-contact-cta"
              (click)="openContact()"
            >
              Contact Us
            </ion-button>
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

      .info-page {
        display: flex;
        flex-direction: column;
        gap: 1.4rem;
        padding: 0.25rem 0 calc(1.5rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
      }

      .info-page__identity {
        display: flex;
        justify-content: center;
        padding-top: 0.15rem;
      }

      .info-page__logo {
        width: clamp(84px, 22vw, 112px);
        height: auto;
      }

      .info-page__intro,
      .info-page__section {
        margin: 0;
      }

      .info-page__eyebrow {
        margin: 0 0 0.45rem;
        color: #b88912;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .info-page__title,
      .info-page__section h2,
      .info-page__intro p,
      .info-page__section p {
        margin: 0;
      }

      .info-page__title {
        color: #081f5c;
        font-size: clamp(1.65rem, 5vw, 2rem);
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.03em;
      }

      .info-page__lede {
        margin-top: 0.9rem;
        color: #33486f;
        font-size: 1rem;
        line-height: 1.72;
      }

      .info-page__section {
        display: flex;
        flex-direction: column;
        gap: 0.78rem;
      }

      .info-page__section h2 {
        color: #081f5c;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: -0.01em;
      }

      .info-page__section p {
        color: #33486f;
        font-size: 0.97rem;
        line-height: 1.7;
      }

      .info-page__section--closing {
        padding-top: 0.2rem;
      }

      .info-page__blessing {
        color: #081f5c;
        font-weight: 700;
      }

      .info-page__cta {
        margin-top: 0.35rem;
        --background: #f0c23a;
        --background-hover: #e2b42a;
        --background-activated: #d6a81c;
        --color: #081f5c;
        --border-radius: 16px;
        --box-shadow: 0 18px 34px rgba(184, 137, 18, 0.18);
        font-weight: 700;
        min-height: 52px;
      }
    `,
  ],
})
export class AboutPage {
  private readonly router = inject(Router);

  get fallbackRoute(): string {
    const state = this.router.getCurrentNavigation()?.extras.state ?? window.history.state;
    return typeof state?.fallbackRoute === 'string' ? state.fallbackRoute : '/tabs/profile';
  }

  openContact(): void {
    void this.router.navigateByUrl(PUBLIC_INFO_LINKS.contact, {
      state: { fallbackRoute: PUBLIC_INFO_LINKS.about },
    });
  }
}
