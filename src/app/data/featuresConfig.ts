import { environment } from 'src/environments/environment';

export type FeatureFlagKey =
  | 'searchEnabled'
  | 'purchaseEnabled'
  | 'quotesEnabled'
  | 'tenderingEnabled'
  | 'bundleEnabled'
  | 'dataSpaceEnabled'
  | 'launchValidationEnabled'
  | 'tenderDevButtonsOpenCloseEnabled'
  | 'aiSearchEnabled';

export type FeaturesConfig = Partial<Record<FeatureFlagKey, boolean>> & Record<string, boolean | undefined>;

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  label: string;
  description: string;
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: 'quotesEnabled',
    label: 'Quotes',
    description: 'Enable quote request flows and quote pages.'
  },
  {
    key: 'purchaseEnabled',
    label: 'Purchases',
    description: 'Enable shopping cart and checkout actions.'
  },
  {
    key: 'searchEnabled',
    label: 'Search',
    description: 'Enable catalog search controls.'
  },
  {
    key: 'aiSearchEnabled',
    label: 'AI search',
    description: 'Enable AI-assisted catalog search.'
  },
  {
    key: 'tenderingEnabled',
    label: 'Tendering',
    description: 'Enable tendering features.'
  },
  {
    key: 'bundleEnabled',
    label: 'Bundles',
    description: 'Enable bundle configuration in seller forms.'
  },
  {
    key: 'dataSpaceEnabled',
    label: 'Data space',
    description: 'Enable data space fields in organization and offer forms.'
  },
  {
    key: 'launchValidationEnabled',
    label: 'Launch validation',
    description: 'Enable launch validation requests for offerings.'
  },
  {
    key: 'tenderDevButtonsOpenCloseEnabled',
    label: 'Tender dev actions',
    description: 'Enable tender open and close development controls.'
  }
];

function isRecord(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstBoolean(...values: any[]): boolean | undefined {
  return values.find(value => typeof value === 'boolean');
}

export function readFeaturesConfig(config: any): FeaturesConfig {
  const source = isRecord(config) ? config : {};
  const features = isRecord(source['features']) ? source['features'] : {};
  const ai = isRecord(source['ai']) ? source['ai'] : {};

  const result: FeaturesConfig = {};

  for (const [key, value] of Object.entries(features)) {
    if (typeof value === 'boolean') {
      result[key] = value;
    }
  }

  result.searchEnabled = firstBoolean(features['searchEnabled'], source['searchEnabled']);
  result.purchaseEnabled = firstBoolean(features['purchaseEnabled'], source['purchaseEnabled']);
  result.quotesEnabled = firstBoolean(features['quotesEnabled'], features['quoteEnabled'], source['quotesEnabled'], source['quoteEnabled']);
  result.tenderingEnabled = firstBoolean(features['tenderingEnabled'], source['tenderingEnabled']);
  result.bundleEnabled = firstBoolean(features['bundleEnabled'], source['bundleEnabled']);
  result.dataSpaceEnabled = firstBoolean(features['dataSpaceEnabled'], source['dataSpaceEnabled']);
  result.launchValidationEnabled = firstBoolean(features['launchValidationEnabled'], source['launchValidationEnabled']);
  result.tenderDevButtonsOpenCloseEnabled = firstBoolean(features['tenderDevButtonsOpenCloseEnabled'], source['tenderDevButtonsOpenCloseEnabled']);
  result.aiSearchEnabled = firstBoolean(features['aiSearchEnabled'], features['aiEnabled'], ai['aiEnabled'], source['aiEnabled']);

  return result;
}

export function applyRuntimeFeaturesConfig(config: any): void {
  const features = readFeaturesConfig(config);

  environment.SEARCH_ENABLED = features.searchEnabled ?? environment.SEARCH_ENABLED;
  environment.PURCHASE_ENABLED = features.purchaseEnabled ?? true;
  environment.QUOTES_ENABLED = features.quotesEnabled ?? false;
  environment.TENDER_ENABLED = features.tenderingEnabled ?? false;
  environment.BUNDLE_ENABLED = features.bundleEnabled ?? environment.BUNDLE_ENABLED;
  environment.DATA_SPACE_ENABLED = features.dataSpaceEnabled ?? false;
  environment.LAUNCH_VALIDATION_ENABLED = features.launchValidationEnabled ?? false;
  environment.TENDER_DEV_BUTTONS_OPEN_CLOSE_ENABLED = features.tenderDevButtonsOpenCloseEnabled ?? false;
  environment.AI_SEARCH_ENABLED = features.aiSearchEnabled ?? false;
}
