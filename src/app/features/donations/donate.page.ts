import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { DonationsService } from '../../core/services/donations.service';
import { PublicBranch } from '../../core/models/branch.model';
import { DonationCheckoutRequest } from '../../core/models/donation.model';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
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
          <ng-container *ngIf="branch; else missingBranch">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ branch.name }}</ion-card-title>
                <ion-card-subtitle *ngIf="branch?.branch_code">
                  {{ branch.branch_code }}
                </ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <p>Donations for {{ branch.name }} flow through this secure checkout.</p>
              </ion-card-content>
            </ion-card>

            <form [formGroup]="form" (ngSubmit)="submit()">
              <div class="field-stack">
                <label>Category</label>
                <ion-item fill="outline">
                  <ion-select formControlName="category" interface="popover">
                    <ion-select-option *ngFor="let option of categories" [value]="option.value">
                      {{ option.label }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
              </div>

              <div class="field-stack">
                <label>Amount (EUR)</label>
                <ion-item fill="outline">
                  <ion-input
                    type="number"
                    formControlName="amount"
                    min="1"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="50.00"
                  ></ion-input>
                </ion-item>
              </div>

              <div class="field-stack">
                <label>Email (optional)</label>
                <ion-item fill="outline">
                  <ion-input type="email" formControlName="donor_email"></ion-input>
                </ion-item>
              </div>

              <ion-text color="danger" *ngIf="errorMessage" class="form-error">
                {{ errorMessage }}
              </ion-text>

              <ion-button type="submit" expand="block" [disabled]="form.invalid || loading">
                <ion-spinner *ngIf="loading" name="crescent" slot="start"></ion-spinner>
                Give now
              </ion-button>
            </form>
          </ng-container>

          <ng-template #missingBranch>
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

      form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      ion-item {
        --background: #fff;
        --color: #111;
        --border-color: #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
      }

      ion-input,
      ion-select,
      ion-select-button {
        color: #111;
        --placeholder-color: #6b7280;
      }

      ion-select::part(icon) {
        color: #111;
      }

      label {
        color: #374151;
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 0.35rem;
        display: inline-block;
      }

      ion-note,
      .form-error {
        color: #dc2626;
      }

      ion-button {
        --background: var(--ion-color-primary);
        --color: #fff;
        font-weight: 600;
        margin-top: 0.5rem;
      }

      .form-error {
        margin: 0.25rem 0 0;
        display: block;
      }

      .field-stack {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
    `,
  ],
})
export class DonatePage implements OnDestroy {
  readonly categories = [
    { label: 'Tithe', value: 'tithe' },
    { label: 'Offering', value: 'offering' },
    { label: 'Missions', value: 'missions' },
    { label: 'Thanksgiving', value: 'thanksgiving' },
    { label: 'Other', value: 'other' },
  ];
  form = this.fb.group({
    category: [this.categories[0].value, Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]],
    donor_email: ['', Validators.email],
  });
  loading = false;
  errorMessage?: string;
  branch: PublicBranch | null = null;
  private branchSub: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly donationsService: DonationsService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router
  ) {
    this.branchSub = this.selectedBranchService.selectedBranch$.subscribe(branch => {
      this.branch = branch;
    });
  }

  submit(): void {
    if (!this.branch) {
      this.errorMessage = 'Please pick a branch first.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill the required fields.';
      return;
    }

    const formValue = this.form.value;
    const payload: DonationCheckoutRequest = {
      church_id: this.branch.id,
      category: formValue.category || undefined,
      amount: Number(formValue.amount),
      donor_email: formValue.donor_email || undefined,
    };

    console.log('[DonatePage] checkout payload category', payload.category);

    this.loading = true;
    this.errorMessage = undefined;

    this.donationsService
      .createCheckout(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => {
          window.location.href = response.checkout_url;
        },
        error: () => {
          this.errorMessage = 'Unable to start checkout. Please try again.';
        },
      });
  }

  ngOnDestroy(): void {
    this.branchSub.unsubscribe();
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }
}
