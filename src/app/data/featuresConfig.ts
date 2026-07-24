import { environment } from 'src/environments/environment';

export type FeatureFlagKey =
  | 'purchaseEnabled'
  | 'quotesEnabled'
  | 'tenderingEnabled'
  | 'dataSpaceEnabled'
  | 'launchValidationEnabled'
  | 'tenderDevButtonsOpenCloseEnabled'
  | 'aiEnabled';

export type RuntimeFeatureFlagKey = FeatureFlagKey | 'searchEnabled';

export type FeaturesConfig = Partial<Record<RuntimeFeatureFlagKey, boolean>> & Record<string, boolean | undefined>;

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
    key: 'aiEnabled',
    label: 'AI search',
    description: 'Enable AI-assisted catalog search.'
  },
  {
    key: 'tenderingEnabled',
    label: 'Tendering',
    description: 'Enable tendering features.'
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

function readBoolean(source: Record<string, any>, key: RuntimeFeatureFlagKey): boolean | undefined {
  const value = source[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function readFeaturesConfig(config: any): FeaturesConfig {
  const source = isRecord(config) ? config : {};

  const result: FeaturesConfig = {};

  result.searchEnabled = readBoolean(source, 'searchEnabled');
  result.purchaseEnabled = readBoolean(source, 'purchaseEnabled');
  result.quotesEnabled = readBoolean(source, 'quotesEnabled');
  result.tenderingEnabled = readBoolean(source, 'tenderingEnabled');
  result.dataSpaceEnabled = readBoolean(source, 'dataSpaceEnabled');
  result.launchValidationEnabled = readBoolean(source, 'launchValidationEnabled');
  result.tenderDevButtonsOpenCloseEnabled = readBoolean(source, 'tenderDevButtonsOpenCloseEnabled');
  result.aiEnabled = readBoolean(source, 'aiEnabled');

  return result;
}

export function applyRuntimeFeaturesConfig(config: any): void {
  const features = readFeaturesConfig(config);

  environment.SEARCH_ENABLED = features.searchEnabled ?? environment.SEARCH_ENABLED;
  environment.PURCHASE_ENABLED = features.purchaseEnabled ?? true;
  environment.QUOTES_ENABLED = features.quotesEnabled ?? false;
  environment.TENDER_ENABLED = features.tenderingEnabled ?? false;
  environment.DATA_SPACE_ENABLED = features.dataSpaceEnabled ?? false;
  environment.LAUNCH_VALIDATION_ENABLED = features.launchValidationEnabled ?? false;
  environment.TENDER_DEV_BUTTONS_OPEN_CLOSE_ENABLED = features.tenderDevButtonsOpenCloseEnabled ?? false;
  environment.AI_SEARCH_ENABLED = features.aiEnabled ?? false;
}
