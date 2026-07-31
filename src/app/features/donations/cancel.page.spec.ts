import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

import { AnalyticsService } from '../../core/services/analytics.service';
import { DonationAnalyticsContextService } from '../../core/services/donation-analytics-context.service';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { DonateCancelPage } from './cancel.page';

describe('DonateCancelPage', () => {
  let fixture: ComponentFixture<DonateCancelPage>;
  let page: DonateCancelPage;
  let router: jasmine.SpyObj<Router>;

  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DonateCancelPage],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: DonationFlowStateService,
          useValue: {
            consumeStoredSummary: jasmine.createSpy().and.returnValue(null),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            trackDonationPaymentCancelled: jasmine.createSpy().and.resolveTo(),
            getAmountBucket: jasmine.createSpy().and.returnValue('0-99'),
            getUserType: jasmine.createSpy().and.returnValue('guest'),
          },
        },
        {
          provide: DonationAnalyticsContextService,
          useValue: {
            consumeContext: jasmine.createSpy().and.returnValue(null),
          },
        },
        {
          provide: NavController,
          useValue: jasmine.createSpyObj<NavController>('NavController', ['navigateBack']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DonateCancelPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
  });

  it('renders a standard back header with Donate as the fallback tab', async () => {
    await createComponent();

    const header = fixture.debugElement.query(By.directive(MobileHeaderComponent))?.componentInstance as MobileHeaderComponent;

    expect(header.fallbackRoute).toBe('/tabs/donate');
    expect(header.showBack).toBeTrue();
    expect(fixture.nativeElement.querySelector('.app-header__back')).not.toBeNull();
  });

  it('keeps the cancel actions unchanged', async () => {
    await createComponent();

    page.goToBranches();
    page.goHome();

    expect(router.navigate.calls.allArgs()).toEqual([
      [['/tabs/donate'], { replaceUrl: true }],
      [['/tabs/home'], { replaceUrl: true }],
    ]);
  });
});
