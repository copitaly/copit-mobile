import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ExternalBrowserService } from '../../core/services/external-browser.service';
import { AboutPage } from './about.page';
import { ContactPage } from './contact.page';

describe('public info pages', () => {
  let router: jasmine.SpyObj<Router>;
  let externalBrowserService: jasmine.SpyObj<ExternalBrowserService>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['getCurrentNavigation', 'navigateByUrl']);
    router.getCurrentNavigation.and.returnValue(null);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    externalBrowserService = jasmine.createSpyObj<ExternalBrowserService>('ExternalBrowserService', ['openUrl']);
    externalBrowserService.openUrl.and.returnValue(Promise.resolve());
  });

  it('renders the About page and links internally to Contact Us', async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();

    const fixture: ComponentFixture<AboutPage> = TestBed.createComponent(AboutPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('About COP Italy');
    expect(text).toContain('The Church of Pentecost in Italy is a Bible-believing');
    expect(text).toContain('Our Story');
    expect(text).toContain('Our Faith');
    expect(text).toContain('Part of a Global Church');

    const button = fixture.nativeElement.querySelector('[data-testid="about-contact-cta"]') as HTMLButtonElement | null;
    button?.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/contact', {
      state: { fallbackRoute: '/about' },
    });
  });

  it('renders the Contact page with tel and mailto actions', async () => {
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        { provide: Router, useValue: router },
        { provide: ExternalBrowserService, useValue: externalBrowserService },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<ContactPage> = TestBed.createComponent(ContactPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Contact Us');
    expect(text).toContain("We'd love to hear from you.");
    expect(text).toContain('Via Torino 9');
    expect(text).toContain('0225 397290');
    expect(text).toContain('info@copitaly.org');

    const phoneLink = fixture.nativeElement.querySelector('[data-testid="contact-phone"]') as HTMLAnchorElement | null;
    const emailLink = fixture.nativeElement.querySelector('[data-testid="contact-email"]') as HTMLAnchorElement | null;

    expect(phoneLink?.getAttribute('href')).toBe('tel:0225397290');
    expect(emailLink?.getAttribute('href')).toBe('mailto:info@copitaly.org');
  });

  it('opens the address with the external browser helper', async () => {
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        { provide: Router, useValue: router },
        { provide: ExternalBrowserService, useValue: externalBrowserService },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<ContactPage> = TestBed.createComponent(ContactPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.openAddress();

    expect(externalBrowserService.openUrl).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Via%20Torino%209%2C%2020093%20Cologno%20Monzese%20(MI)'
    );
  });
});
