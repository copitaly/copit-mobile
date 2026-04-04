import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SelectedBranchService } from '../../core/services/selected-branch.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate',
  template: `
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Donate</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content fullscreen>
        <div class="donate-wrapper">
          <ng-container *ngIf="selectedBranch$ | async as branch; else noBranch">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Selected branch</ion-card-title>
                <ion-card-subtitle>{{ branch.name }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                Donations for {{ branch.name }} will continue from this flow once the checkout is ready.
              </ion-card-content>
            </ion-card>
          </ng-container>

          <ng-template #noBranch>
            <div class="empty-state">
              <p>Please choose a branch before continuing</p>
              <ion-button expand="block" (click)="goToBranches()">Choose a branch</ion-button>
            </div>
          </ng-template>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-content {
        --background: var(--ion-color-step-100, #f6f6f6);
      }

      .donate-wrapper {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .empty-state {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 2rem;
      }

      ion-card {
        border-radius: 16px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      }
    `,
  ],
})
export class DonatePage {
  readonly selectedBranch$ = this.selectedBranchService.selectedBranch$;

  constructor(
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router
  ) {}

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }
}
