import { Injectable } from '@angular/core';

type GoogleTagManagerWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

@Injectable({
  providedIn: 'root'
})
export class GoogleTagManagerService {
  private loadedContainerId = '';

  init(containerId?: string): void {
    const trimmedContainerId = (containerId ?? '').trim();

    if (!this.isValidContainerId(trimmedContainerId) || this.loadedContainerId === trimmedContainerId) {
      return;
    }

    this.loadedContainerId = trimmedContainerId;

    const gtmWindow = window as GoogleTagManagerWindow;
    gtmWindow.dataLayer = gtmWindow.dataLayer ?? [];
    gtmWindow.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    const gtmScript = document.createElement('script');
    gtmScript.async = true;
    gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(trimmedContainerId)}`;

    document.head.insertBefore(gtmScript, document.head.firstChild);
  }

  private isValidContainerId(containerId: string): boolean {
    return /^GTM-[A-Z0-9]+$/.test(containerId);
  }
}
