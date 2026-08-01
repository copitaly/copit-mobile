import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

const APP_TITLE = 'C.O.P Italy';
const TAGLINE = 'Bible Study • Devotions • Prayer • Giving';
const LOADING_INDICATOR_DELAY_MS = 1000;
const SPLASH_DURATION_MS = 5000;

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SplashPage implements OnDestroy {
  readonly title = APP_TITLE;
  readonly tagline = TAGLINE;

  showLoadingIndicator = false;

  private timer?: ReturnType<typeof setTimeout>;
  private loadingIndicatorTimer?: ReturnType<typeof setTimeout>;
  private navigationStarted = false;

  constructor(private readonly router: Router) {}

  ionViewDidEnter(): void {
    if (this.navigationStarted) {
      return;
    }

    this.navigationStarted = true;
    this.showLoadingIndicator = false;

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

    this.navigationStarted = false;
    this.showLoadingIndicator = false;
  }
}
