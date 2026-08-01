import { Injectable, inject } from '@angular/core';
import { Animation, ToastController, createAnimation } from '@ionic/angular';

export type AppToastTone = 'success' | 'error' | 'warning' | 'info';

interface AppToastOptions {
  duration?: number;
}

const DEFAULT_DURATIONS: Record<AppToastTone, number> = {
  success: 2500,
  info: 2500,
  warning: 3000,
  error: 3000,
};

const DEFAULT_ICONS: Record<AppToastTone, string> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

function resolveToastTarget(baseEl: HTMLElement): HTMLElement {
  const shadowRoot = baseEl.shadowRoot;
  if (!shadowRoot) {
    return baseEl;
  }

  return (
    (shadowRoot.querySelector('.toast-wrapper') as HTMLElement | null) ??
    (shadowRoot.querySelector('[part="container"]') as HTMLElement | null) ??
    baseEl
  );
}

function buildToastEnterAnimation(baseEl: HTMLElement): Animation {
  return createAnimation()
    .addElement(resolveToastTarget(baseEl))
    .duration(180)
    .easing('cubic-bezier(0.2, 0.8, 0.2, 1)')
    .fromTo('opacity', '0', '1')
    .fromTo('transform', 'translateY(12px)', 'translateY(0)');
}

function buildToastLeaveAnimation(baseEl: HTMLElement): Animation {
  return createAnimation()
    .addElement(resolveToastTarget(baseEl))
    .duration(140)
    .easing('ease-out')
    .fromTo('opacity', '1', '0');
}

@Injectable({ providedIn: 'root' })
export class AppToastService {
  private readonly toastController = inject(ToastController);

  async success(message: string, options?: AppToastOptions): Promise<void> {
    await this.show(message, 'success', options);
  }

  async error(message: string, options?: AppToastOptions): Promise<void> {
    await this.show(message, 'error', options);
  }

  async warning(message: string, options?: AppToastOptions): Promise<void> {
    await this.show(message, 'warning', options);
  }

  async info(message: string, options?: AppToastOptions): Promise<void> {
    await this.show(message, 'info', options);
  }

  async show(message: string, tone: AppToastTone, options?: AppToastOptions): Promise<void> {
    try {
      const activeToast =
        typeof this.toastController.getTop === 'function'
          ? await this.toastController.getTop()
          : null;
      if (activeToast) {
        await activeToast.dismiss();
      }

      const positionAnchor =
        (document.querySelector('[data-testid="tabs-bar"]') as HTMLElement | null) ??
        (document.querySelector('ion-tab-bar.app-tabs__bar') as HTMLElement | null) ??
        undefined;

      const toast = await this.toastController.create({
        message,
        duration: options?.duration ?? DEFAULT_DURATIONS[tone],
        position: 'bottom',
        positionAnchor,
        icon: DEFAULT_ICONS[tone],
        cssClass: ['app-toast', `app-toast--${tone}`],
        enterAnimation: buildToastEnterAnimation,
        leaveAnimation: buildToastLeaveAnimation,
      });

      await toast.present();
    } catch {
      // ignore toast errors
    }
  }
}
