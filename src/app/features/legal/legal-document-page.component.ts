import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output } from '@angular/core';

import { LegalDocumentContent } from './legal-documents.content';

@Component({
  standalone: true,
  selector: 'app-legal-document-page',
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="legal-page__document" aria-label="Legal document content">
      <p class="legal-page__meta">
        <span class="legal-page__meta-label">Last updated</span>
        <span class="legal-page__meta-separator" aria-hidden="true">&middot;</span>
        <span>{{ document.effectiveDate }}</span>
      </p>

      <section class="legal-page__section" *ngFor="let section of document.sections">
        <h2>{{ section.heading }}</h2>
        <h3 *ngIf="section.subheading">{{ section.subheading }}</h3>
        <p *ngIf="section.intro">{{ section.intro }}</p>
        <p *ngFor="let paragraph of section.paragraphs ?? []">{{ paragraph }}</p>
        <ul *ngIf="section.bullets?.length">
          <li *ngFor="let bullet of section.bullets">{{ bullet }}</li>
        </ul>
        <div class="legal-page__links" *ngIf="section.links?.length">
          <a
            *ngFor="let link of section.links"
            [href]="link.url"
            class="legal-page__link"
            (click)="linkSelected.emit({ event: $event, url: link.url })"
          >
            {{ link.label }}
          </a>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .legal-page__document {
        padding:
          0.2rem
          0
          calc(1.75rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
      }

      .legal-page__meta {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.28rem;
        margin: 0 0 1.2rem;
        color: rgba(8, 31, 92, 0.7);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      .legal-page__meta-label {
        color: #b88912;
        font-size: 0.73rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .legal-page__meta-separator {
        color: rgba(8, 31, 92, 0.42);
      }

      .legal-page__section + .legal-page__section {
        margin-top: 1.8rem;
      }

      .legal-page__section h2,
      .legal-page__section h3,
      .legal-page__section p,
      .legal-page__section ul {
        margin: 0;
      }

      .legal-page__section h2 {
        color: #081f5c;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: -0.01em;
        margin-bottom: 0.68rem;
      }

      .legal-page__section h3 {
        color: #163c9a;
        font-size: 0.86rem;
        font-weight: 700;
        line-height: 1.4;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .legal-page__section p,
      .legal-page__section li {
        color: #33486f;
        font-size: 0.94rem;
        line-height: 1.62;
      }

      .legal-page__section p + p,
      .legal-page__section p + ul,
      .legal-page__section ul + p,
      .legal-page__links {
        margin-top: 0.78rem;
      }

      .legal-page__section ul {
        padding-left: 1.25rem;
      }

      .legal-page__section li {
        padding-left: 0.12rem;
      }

      .legal-page__section li + li {
        margin-top: 0.52rem;
      }

      .legal-page__links {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .legal-page__link {
        color: #0b2f80;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 0.14rem;
        word-break: break-word;
      }

      .legal-page__link:focus-visible {
        outline: 2px solid rgba(11, 47, 128, 0.22);
        outline-offset: 2px;
        border-radius: 0.35rem;
      }

      @media (max-width: 360px) {
        .legal-page__meta {
          margin-bottom: 1.05rem;
          font-size: 0.86rem;
        }

        .legal-page__section + .legal-page__section {
          margin-top: 1.55rem;
        }

        .legal-page__section h2 {
          font-size: 0.98rem;
        }

        .legal-page__section p,
        .legal-page__section li {
          font-size: 0.91rem;
        }
      }
    `,
  ],
})
export class LegalDocumentPageComponent {
  @Input({ required: true }) document!: LegalDocumentContent;
  @Output() readonly linkSelected = new EventEmitter<{ event: Event; url: string }>();
}
