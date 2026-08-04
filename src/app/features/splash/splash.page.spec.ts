import { DOCUMENT } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { GuestLocaleStorageService } from '../../core/localization/guest-locale-storage.service';
import { LocaleService } from '../../core/localization/locale.service';
import { StartupSplashService } from '../../core/services/startup-splash.service';
import { SplashPage } from './splash.page';

describe('SplashPage', () => {
  let fixture: ComponentFixture<SplashPage>;
  let page: SplashPage;
  let localeService: LocaleService;
  let startupSplashService: jasmine.SpyObj<StartupSplashService>;

  beforeEach(async () => {
    startupSplashService = jasmine.createSpyObj<StartupSplashService>('StartupSplashService', [
      'markBrandedSplashMounted',
      'markBrandedSplashPaintReady',
    ]);

    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    await TestBed.configureTestingModule({
      imports: [SplashPage],
      providers: [
        LocaleService,
        {
          provide: GuestLocaleStorageService,
          useValue: {
            getGuestLocale: () => null,
            setGuestLocale: () => undefined,
            clearGuestLocale: () => undefined,
          },
        },
        {
          provide: DOCUMENT,
          useValue: document,
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigate']),
        },
        {
          provide: StartupSplashService,
          useValue: startupSplashService,
        },
      ],
    }).compileComponents();

    localeService = TestBed.inject(LocaleService);
    fixture = TestBed.createComponent(SplashPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the English tagline and COP Italy branding', () => {
    expect(page.title).toBe('COP Italy');
    expect(fixture.nativeElement.textContent).toContain('Bible Study');
    expect(fixture.nativeElement.textContent).toContain('Devotions');
    expect(fixture.nativeElement.textContent).toContain('Prayer');
    expect(fixture.nativeElement.textContent).toContain('Giving');
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('alt')).toBe('COP Italy logo');
  });

  it('renders the Italian tagline without hardcoded English fragments', async () => {
    await localeService.setLocale('it', { persistGuest: false, source: 'runtime' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Studio biblico');
    expect(fixture.nativeElement.textContent).toContain('Devozioni');
    expect(fixture.nativeElement.textContent).toContain('Preghiera');
    expect(fixture.nativeElement.textContent).toContain('Donazioni');
    expect(fixture.nativeElement.textContent).not.toContain('Prayer - Giving');
  });

  it('renders the French tagline and updates immediately when the locale changes', async () => {
    await localeService.setLocale('fr', { persistGuest: false, source: 'runtime' });
    fixture.detectChanges();

    expect(page.title).toBe('COP Italy');
    expect(fixture.nativeElement.textContent).toContain('\u00c9tude biblique');
    expect(fixture.nativeElement.textContent).toContain('D\u00e9votions');
    expect(fixture.nativeElement.textContent).toContain('Pri\u00e8re');
    expect(fixture.nativeElement.textContent).toContain('Dons');
  });
});
