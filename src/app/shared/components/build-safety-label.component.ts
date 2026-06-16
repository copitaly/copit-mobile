import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { environment } from 'src/environments/environment';

export function shouldShowBuildSafetyLabel(): boolean {
  if (!environment.production) {
    return false;
  }

  const apiBaseUrl = (environment.apiBaseUrl ?? '').toLowerCase();
  const appOrigin = (environment.appOrigin ?? '').toLowerCase();
  const stripePublishableKey = (environment.stripePublishableKey ?? '').trim().toLowerCase();

  return (
    apiBaseUrl.includes('staging') ||
    appOrigin.includes('staging') ||
    stripePublishableKey.startsWith('pk_test')
  );
}

@Component({
  selector: 'app-build-safety-label',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showLabel" class="build-safety-label" aria-label="Pre-production build label">
      Internal Preview
    </div>
  `,
  styles: [`
    .build-safety-label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: rgba(120, 82, 0, 0.85);
      color: #fff7d1;
      border: 1px solid rgba(255, 232, 165, 0.38);
      box-shadow: 0 8px 20px rgba(26, 18, 0, 0.18);
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      opacity: 0.85;
      backdrop-filter: blur(6px);
    }
  `],
})
export class BuildSafetyLabelComponent {
  readonly showLabel = shouldShowBuildSafetyLabel();
}
