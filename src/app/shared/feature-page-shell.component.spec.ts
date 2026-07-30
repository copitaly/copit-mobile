import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

import { AuthService } from '../core/services/auth.service';
import { StackNavigationService } from '../core/services/stack-navigation.service';
import { FeaturePageShellComponent } from './feature-page-shell.component';
import { MobileHeaderComponent } from './mobile-header.component';

@Component({
  standalone: true,
  imports: [FeaturePageShellComponent],
  template: `
    <app-feature-page-shell title="Bible Study" subtitle="Browse manuals." backFallbackRoute="/tabs/home">
      <div class="projected-content">Body content</div>
    </app-feature-page-shell>
  `,
})
class TestHostComponent {}

@Component({
  standalone: true,
  imports: [FeaturePageShellComponent],
  template: `
    <app-feature-page-shell
      title="Devotional"
      subtitle="Read details."
      [actionIcon]="'share-social-outline'"
      actionAriaLabel="Share devotional"
      [action]="handleShare"
    >
      <div class="projected-content">Body content</div>
    </app-feature-page-shell>
  `,
})
class TestHostWithActionComponent {
  shareCount = 0;
  readonly handleShare = (): void => {
    this.shareCount += 1;
  };
}

describe('FeaturePageShellComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let router: jasmine.SpyObj<Router>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let navController: jasmine.SpyObj<NavController>;

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    navController = jasmine.createSpyObj<NavController>('NavController', ['navigateBack']);

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
        { provide: NavController, useValue: navController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('renders the shared compact page header and white content surface', () => {
    const mobileHeader = fixture.debugElement.query(By.directive(MobileHeaderComponent))
      ?.componentInstance as MobileHeaderComponent;

    expect(mobileHeader.fallbackRoute).toBe('/tabs/home');
    expect(fixture.nativeElement.querySelector('[data-testid="feature-page-surface"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Body content');
  });

  it('passes an optional header action through to the mobile header', async () => {
    await TestBed.resetTestingModule().configureTestingModule({
      imports: [TestHostWithActionComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: false } },
        { provide: NavController, useValue: navController },
      ],
    }).compileComponents();

    const actionFixture = TestBed.createComponent(TestHostWithActionComponent);
    actionFixture.detectChanges();

    const actionButton = actionFixture.nativeElement.querySelector('.app-header__action') as HTMLButtonElement | null;
    expect(actionButton?.getAttribute('aria-label')).toBe('Share devotional');

    actionButton?.click();
    actionFixture.detectChanges();

    expect(actionFixture.componentInstance.shareCount).toBe(1);
  });
});
