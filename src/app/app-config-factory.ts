import { MatomoInitializerService } from 'ngx-matomo-client';
import { AppInitService } from './services/app-init.service'; // Adjust path as necessary
import { GoogleTagManagerService } from './services/google-tag-manager.service';

export function appConfigFactory(
  appInitService: AppInitService,
  matomoInitializer: MatomoInitializerService,
  googleTagManager: GoogleTagManagerService
): () => Promise<any> {
  return () => {
    return appInitService.init().then(conf => {
      googleTagManager.init(conf.googleTagManagerId);

      const matomoConfigOptions = {
        siteId: conf.matomoId,
        trackerUrl: conf.matomoUrl
      }
      matomoInitializer.initializeTracker(matomoConfigOptions)
    });
  }
}
