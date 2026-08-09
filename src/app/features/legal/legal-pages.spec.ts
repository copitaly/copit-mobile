import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ExternalBrowserService } from '../../core/services/external-browser.service';
import { PrivacyPolicyPage } from './privacy-policy.page';
import { TermsAndConditionsPage } from './terms-and-conditions.page';

describe('mobile legal pages', () => {
  let router: jasmine.SpyObj<Router>;
  let externalBrowserService: jasmine.SpyObj<ExternalBrowserService>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['getCurrentNavigation']);
    externalBrowserService = jasmine.createSpyObj<ExternalBrowserService>('ExternalBrowserService', ['openUrl']);
    externalBrowserService.openUrl.and.returnValue(Promise.resolve());
  });

  it('renders the mobile Privacy Policy without admin login copy or admin links', async () => {
    router.getCurrentNavigation.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyPage],
      providers: [
        { provide: Router, useValue: router },
        { provide: ExternalBrowserService, useValue: externalBrowserService },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<PrivacyPolicyPage> = TestBed.createComponent(PrivacyPolicyPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Privacy Policy');
    expect(text).toContain('Your privacy and how we protect your information.');
    expect(text).not.toContain('Back to login');
    expect(text).not.toContain('This page shows the COP Italy legal document content only.');
    expect(fixture.nativeElement.innerHTML).not.toContain('admin.copitaly.org');
  });

  it('renders the mobile Terms page without admin login copy or admin links', async () => {
    router.getCurrentNavigation.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [TermsAndConditionsPage],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();

    const fixture: ComponentFixture<TermsAndConditionsPage> = TestBed.createComponent(TermsAndConditionsPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Terms & Conditions');
    expect(text).toContain('Terms governing your use of COP Italy.');
    expect(text).not.toContain('Back to login');
    expect(text).not.toContain('This page provides a public summary of the current operating terms');
    expect(fixture.nativeElement.innerHTML).not.toContain('admin.copitaly.org');
  });

  it('keeps legitimate external privacy links available through the external browser service', async () => {
    router.getCurrentNavigation.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyPage],
      providers: [
        { provide: Router, useValue: router },
        { provide: ExternalBrowserService, useValue: externalBrowserService },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<PrivacyPolicyPage> = TestBed.createComponent(PrivacyPolicyPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.openLink(new MouseEvent('click'), 'https://copitaly.org');

    expect(externalBrowserService.openUrl).toHaveBeenCalledWith('https://copitaly.org');
  });
});
