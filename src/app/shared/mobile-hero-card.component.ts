import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-mobile-hero-card',
  imports: [CommonModule, IonicModule],
  template: `
    <button
      type="button"
      class="mobile-hero-card ion-activatable"
      [attr.aria-label]="ariaLabel || title"
      [disabled]="disabled"
      (click)="cardClick.emit()"
    >
      <div class="mobile-hero-card__media" [class.mobile-hero-card__media--placeholder]="!imageSrc">
        <img *ngIf="imageSrc; else placeholder" [src]="imageSrc" [alt]="imageAlt || title" />
        <ng-template #placeholder>
          <ion-icon [name]="placeholderIcon" aria-hidden="true"></ion-icon>
        </ng-template>
      </div>

      <div class="mobile-hero-card__body">
        <p *ngIf="eyebrow" class="mobile-hero-card__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
        <p *ngIf="meta" class="mobile-hero-card__meta">{{ meta }}</p>
        <p *ngIf="detail" class="mobile-hero-card__detail">{{ detail }}</p>

        <div *ngIf="progressPercent !== null && progressPercent !== undefined" class="mobile-hero-card__progress">
          <div class="mobile-hero-card__progress-bar" role="progressbar" [attr.aria-label]="progressAriaLabel || progressLabel || 'Reading progress'" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progressPercent">
            <span [style.width.%]="progressPercent"></span>
          </div>
          <p *ngIf="progressLabel" class="mobile-hero-card__progress-label">{{ progressLabel }}</p>
        </div>

        <span class="mobile-hero-card__cta">
          <span>{{ ctaLabel }}</span>
          <ion-icon name="arrow-forward" aria-hidden="true"></ion-icon>
        </span>
      </div>
      <ion-ripple-effect></ion-ripple-effect>
    </button>
  `,
  styles: [
    `
      .mobile-hero-card{width:100%;padding:0;border:0;border-radius:24px;overflow:hidden;background:#fff;text-align:left;color:inherit;box-shadow:0 18px 44px rgba(11,29,115,.08)}
      .mobile-hero-card__media{height:clamp(18.75rem,83vw,21.25rem);background:linear-gradient(140deg,#0b1d73,#17369b 62%,#d5a62f 140%);display:flex;align-items:center;justify-content:center;color:#fff}
      .mobile-hero-card__media img{width:100%;height:100%;object-fit:cover;object-position:center 22%;display:block}
      .mobile-hero-card__media--placeholder ion-icon{font-size:2.2rem}
      .mobile-hero-card__body{display:flex;flex-direction:column;gap:.48rem;padding:1.05rem 1.15rem 1.15rem}
      .mobile-hero-card__eyebrow,.mobile-hero-card__meta,.mobile-hero-card__detail,.mobile-hero-card__progress-label{margin:0}
      .mobile-hero-card__eyebrow{color:#d5a62f;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
      .mobile-hero-card h3{margin:0;color:#05173d;font-size:1.42rem;font-weight:700;line-height:1.12;letter-spacing:-.03em}
      .mobile-hero-card__meta,.mobile-hero-card__detail,.mobile-hero-card__progress-label{color:rgba(5,23,61,.64);font-size:.87rem;line-height:1.45}
      .mobile-hero-card__progress{display:flex;flex-direction:column;gap:.42rem;margin-top:.15rem}
      .mobile-hero-card__progress-bar{height:8px;border-radius:999px;overflow:hidden;background:rgba(11,29,115,.1)}
      .mobile-hero-card__progress-bar span{display:block;height:100%;border-radius:inherit;background:#0b1d73}
      .mobile-hero-card__cta{display:inline-flex;align-items:center;gap:.45rem;width:fit-content;margin-top:.18rem;padding:.75rem .95rem;border-radius:999px;background:#0b1d73;color:#fff;font-size:.9rem;font-weight:600}
    `,
  ],
})
export class MobileHeroCardComponent {
  @Input({ required: true }) title = '';
  @Input() eyebrow = '';
  @Input() meta = '';
  @Input() detail = '';
  @Input() ctaLabel = '';
  @Input() imageSrc: string | null = null;
  @Input() imageAlt = '';
  @Input() ariaLabel = '';
  @Input() placeholderIcon = 'book-outline';
  @Input() progressPercent: number | null = null;
  @Input() progressLabel = '';
  @Input() progressAriaLabel = '';
  @Input() disabled = false;
  @Output() readonly cardClick = new EventEmitter<void>();
}
