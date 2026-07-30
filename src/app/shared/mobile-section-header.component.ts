import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-mobile-section-header',
  imports: [CommonModule],
  template: `
    <div class="mobile-section-header">
      <div class="mobile-section-header__copy">
        <h2>{{ title }}</h2>
        <p *ngIf="subtitle">{{ subtitle }}</p>
      </div>

      <button
        *ngIf="actionLabel"
        type="button"
        class="mobile-section-header__action"
        [attr.aria-label]="actionAriaLabel || actionLabel"
        (click)="actionClick.emit()"
      >
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .mobile-section-header{display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem}
      .mobile-section-header__copy{min-width:0}
      .mobile-section-header h2,.mobile-section-header p{margin:0}
      .mobile-section-header h2{color:#05173d;font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
      .mobile-section-header p{margin-top:.32rem;color:rgba(5,23,61,.62);font-size:.92rem;line-height:1.45}
      .mobile-section-header__action{padding:0;border:0;background:none;color:#0b1d73;font:inherit;font-size:.88rem;font-weight:600}
    `,
  ],
})
export class MobileSectionHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() actionLabel = '';
  @Input() actionAriaLabel = '';
  @Output() readonly actionClick = new EventEmitter<void>();
}
