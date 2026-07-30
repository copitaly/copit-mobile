import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, AuthLayoutComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-page class="auth-page">
      <ion-content fullscreen class="auth-page-content">
        <app-auth-layout
          title="Shared title"
          subtitle="Shared subtitle"
          fallbackRoute="/login"
          [showFooter]="true"
        >
          <form class="projected-form">
            <p>Projected form body</p>
          </form>

          <div authLayoutFooter>
            <p>Projected footer</p>
          </div>
        </app-auth-layout>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-page.auth-page {
        background: #0b1d73;
      }

      ion-content.auth-page-content {
        --background: #0b1d73;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .auth-page-content::part(scroll) {
        flex: 1;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        background: #0b1d73;
      }

      .auth-page-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
class HostComponent {}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, AuthLayoutComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-page class="auth-page">
      <ion-content fullscreen class="auth-page-content">
        <app-auth-layout title="Reactive title" subtitle="Reactive subtitle" fallbackRoute="/login">
          <form [formGroup]="form" class="projected-reactive-form">
            <ion-item fill="solid" class="auth-field">
              <ion-input formControlName="email" placeholder="you@example.com"></ion-input>
            </ion-item>
          </form>
        </app-auth-layout>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-page.auth-page {
        background: #0b1d73;
      }

      ion-content.auth-page-content {
        --background: #0b1d73;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .auth-page-content::part(scroll) {
        flex: 1;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        background: #0b1d73;
      }

      .auth-page-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
class ReactiveHostComponent {
  readonly form = new FormBuilder().nonNullable.group({
    email: ['member@example.com'],
  });
}

describe('AuthLayoutComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, ReactiveHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders projected content inside the shared auth card', () => {
    expect(fixture.nativeElement.textContent).toContain('Projected form body');
    expect(fixture.nativeElement.textContent).toContain('Projected footer');
  });

  it('renders the shared header copy', () => {
    expect(fixture.nativeElement.textContent).toContain('Shared title');
    expect(fixture.nativeElement.textContent).toContain('Shared subtitle');
  });

  it('keeps the routed wrapper visible with non-zero layout boxes', () => {
    const shell = fixture.nativeElement.querySelector('[data-testid="auth-layout-shell"]') as HTMLElement | null;
    const title = fixture.nativeElement.querySelector('.app-header__title') as HTMLElement | null;
    const card = fixture.nativeElement.querySelector('.auth-card') as HTMLElement | null;

    expect(shell).not.toBeNull();
    expect(title).not.toBeNull();
    expect(card).not.toBeNull();
    expect(shell!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(title!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(card!.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('keeps reactive projected content visible inside the shared auth card', async () => {
    const reactiveFixture = TestBed.createComponent(ReactiveHostComponent);
    reactiveFixture.detectChanges();
    await reactiveFixture.whenStable();
    reactiveFixture.detectChanges();

    const shell = reactiveFixture.nativeElement.querySelector('[data-testid="auth-layout-shell"]') as HTMLElement | null;
    const input = reactiveFixture.nativeElement.querySelector('ion-input') as HTMLElement | null;

    expect(shell).not.toBeNull();
    expect(input).not.toBeNull();
    expect(shell!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(input!.getBoundingClientRect().height).toBeGreaterThan(0);
  });
});
