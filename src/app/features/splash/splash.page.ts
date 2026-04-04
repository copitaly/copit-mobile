import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

const APP_TITLE = 'COP Italy';
const TAGLINE = 'Giving • Prayer • Events • Devotionals';
const SPLASH_DURATION_MS = 20000;

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
  private timer?: ReturnType<typeof setTimeout>;
  private navigationStarted = false;

  constructor(private readonly router: Router) {}

  ionViewDidEnter(): void {
    if (this.navigationStarted) {
      return;
    }

    this.navigationStarted = true;
    this.timer = setTimeout(() => {
      this.router.navigate(['/home'], { replaceUrl: true });
    }, SPLASH_DURATION_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.navigationStarted = false;
  }
}
