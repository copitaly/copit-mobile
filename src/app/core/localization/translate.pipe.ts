import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';

import { LocaleService, TranslationParams } from './locale.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private localeSubscription?: Subscription;

  constructor(
    private readonly localeService: LocaleService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.localeSubscription = this.localeService.locale$.subscribe(() => {
      this.changeDetectorRef.markForCheck();
    });
  }

  transform(key: string, params?: TranslationParams): string {
    return this.localeService.translate(key, params);
  }

  ngOnDestroy(): void {
    this.localeSubscription?.unsubscribe();
  }
}
