import { MatomoInitializerService } from 'ngx-matomo-client';
import { AppInitService } from './services/app-init.service'; // Adjust path as necessary
import { inject } from '@angular/core';

export function appConfigFactory(appInitService: AppInitService, matomoInitializer: MatomoInitializerService): () => Promise<any> {
  return () => {
    return appInitService.init().then(conf => {
      const matomoConfigOptions = {
        siteId: conf.matomoId,
        trackerUrl: conf.matomoUrl
      }
      matomoInitializer.initializeTracker(matomoConfigOptions)
    });
  }
}