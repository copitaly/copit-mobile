import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-mobile-content-row',
  imports: [CommonModule, IonicModule],
  template: `
    <button
      type="button"
      class="mobile-content-row ion-activatable"
      [attr.aria-label]="ariaLabel || title"
      [disabled]="disabled"
      (click)="rowClick.emit()"
    >
      <div class="mobile-content-row__thumb" [class.mobile-content-row__thumb--placeholder]="!thumbnailSrc">
        <img *ngIf="thumbnailSrc; else placeholder" [src]="thumbnailSrc" [alt]="thumbnailAlt || title" />
        <ng-template #placeholder>
          <ion-icon [name]="placeholderIcon" aria-hidden="true"></ion-icon>
        </ng-template>
      </div>

      <div class="mobile-content-row__copy">
        <h3>{{ title }}</h3>
        <p *ngIf="meta" class="mobile-content-row__meta">{{ meta }}</p>
        <p *ngIf="detail" class="mobile-content-row__detail">{{ detail }}</p>
      </div>

      <ion-icon class="mobile-content-row__chevron" name="chevron-forward" aria-hidden="true"></ion-icon>
      <ion-ripple-effect></ion-ripple-effect>
    </button>
  `,
  styles: [
    `
      .mobile-content-row{display:flex;align-items:center;gap:1rem;position:relative;width:100%;min-height:78px;padding:1rem 0;border:0;background:transparent;text-align:left;color:inherit}
      .mobile-content-row__thumb{display:flex;align-items:center;justify-content:center;flex:0 0 60px;width:60px;height:76px;border-radius:18px;overflow:hidden;background:rgba(11,29,115,.08);color:#0b1d73}
      .mobile-content-row__thumb img{width:100%;height:100%;object-fit:cover;display:block}
      .mobile-content-row__thumb--placeholder ion-icon{font-size:1.4rem}
      .mobile-content-row__copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:.28rem}
      .mobile-content-row__copy h3,.mobile-content-row__meta,.mobile-content-row__detail{margin:0}
      .mobile-content-row__copy h3{color:#05173d;font-size:1.02rem;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;-webkit-line-clamp:2}
      .mobile-content-row__meta,.mobile-content-row__detail{color:rgba(5,23,61,.64);font-size:.84rem;line-height:1.4}
      .mobile-content-row__chevron{flex:0 0 auto;align-self:center;color:rgba(5,23,61,.34);font-size:18px}
      @media (max-width:430px){.mobile-content-row{gap:.88rem}.mobile-content-row__thumb{flex-basis:56px;width:56px;height:72px}}
    `,
  ],
})
export class MobileContentRowComponent {
  @Input({ required: true }) title = '';
  @Input() meta = '';
  @Input() detail = '';
  @Input() thumbnailSrc: string | null = null;
  @Input() thumbnailAlt = '';
  @Input() ariaLabel = '';
  @Input() placeholderIcon = 'book-outline';
  @Input() disabled = false;
  @Output() readonly rowClick = new EventEmitter<void>();
}
