import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { StartupSplashService } from '../../core/services/startup-splash.service';

const LOADING_INDICATOR_DELAY_MS = 1000;
const SPLASH_DURATION_MS = 5000;
const SUPPORTING_COPY_REVEAL_DELAY_MS = 120;

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, TranslatePipe],
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SplashPage implements AfterViewInit, OnDestroy {
  showLoadingIndicator = false;
  showSupportingCopy = false;

  private readonly startupSplash = inject(StartupSplashService);
  private readonly localeService = inject(LocaleService);
  private timer?: ReturnType<typeof setTimeout>;
  private loadingIndicatorTimer?: ReturnType<typeof setTimeout>;
  private supportingCopyTimer?: ReturnType<typeof setTimeout>;
  private navigationStarted = false;

  constructor(private readonly router: Router) {}

  get title(): string {
    return this.localeService.translate('app.name');
  }

  ngAfterViewInit(): void {
    this.startupSplash.markBrandedSplashMounted();
    this.waitForFirstPaint();
  }

  ionViewDidEnter(): void {
    if (this.navigationStarted) {
      return;
    }

    this.navigationStarted = true;
    this.showLoadingIndicator = false;
    this.showSupportingCopy = false;

    this.supportingCopyTimer = setTimeout(() => {
      this.showSupportingCopy = true;
    }, SUPPORTING_COPY_REVEAL_DELAY_MS);

    this.loadingIndicatorTimer = setTimeout(() => {
      this.showLoadingIndicator = true;
    }, LOADING_INDICATOR_DELAY_MS);

    this.timer = setTimeout(() => {
      this.router.navigate(['/tabs/home'], { replaceUrl: true });
    }, SPLASH_DURATION_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    if (this.loadingIndicatorTimer) {
      clearTimeout(this.loadingIndicatorTimer);
    }

    if (this.supportingCopyTimer) {
      clearTimeout(this.supportingCopyTimer);
    }

    this.navigationStarted = false;
    this.showLoadingIndicator = false;
    this.showSupportingCopy = false;
  }

  private waitForFirstPaint(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.startupSplash.markBrandedSplashPaintReady();
      });
    });
  }
}
