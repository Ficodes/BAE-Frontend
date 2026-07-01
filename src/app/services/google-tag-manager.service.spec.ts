import { TestBed } from '@angular/core/testing';
import { GoogleTagManagerService } from './google-tag-manager.service';

describe('GoogleTagManagerService', () => {
  let service: GoogleTagManagerService;
  let originalDataLayer: unknown;

  beforeEach(() => {
    originalDataLayer = (window as any).dataLayer;

    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleTagManagerService);
  });

  afterEach(() => {
    document.querySelectorAll('script[src^="https://www.googletagmanager.com/gtm.js"]').forEach(script => script.remove());

    if (originalDataLayer === undefined) {
      delete (window as any).dataLayer;
    } else {
      (window as any).dataLayer = originalDataLayer;
    }
  });

  it('inserts the Google Tag Manager script as the first head element', () => {
    service.init('GTM-WPKH4HCS');

    const firstHeadElement = document.head.firstElementChild as HTMLScriptElement;

    expect(firstHeadElement.tagName).toBe('SCRIPT');
    expect(firstHeadElement.src).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-WPKH4HCS');
    expect((window as any).dataLayer[0].event).toBe('gtm.js');
  });

  it('does not load a script when no valid container id is provided', () => {
    service.init('');
    service.init('not-a-gtm-id');

    expect(document.querySelector('script[src^="https://www.googletagmanager.com/gtm.js"]')).toBeNull();
  });
});
