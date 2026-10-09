import { environment } from 'src/environments/environment';

export type FeatureFlagKey =
  | 'purchaseEnabled'
  | 'quotesEnabled'
  | 'tenderingEnabled'
  | 'dataSpaceEnabled'
  | 'dspEnabled'
  | 'catalogManagementEnabled'
  | 'launchValidationEnabled'
  | 'tenderDevButtonsOpenCloseEnabled'
  | 'aiEnabled';

export type RuntimeFeatureFlagKey = FeatureFlagKey | 'searchEnabled';

export type FeaturesConfig = Partial<Record<RuntimeFeatureFlagKey, boolean>> & Record<string, boolean | undefined>;

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  labelKey: string;
  descriptionKey: string;
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: 'quotesEnabled',
    labelKey: 'ADMIN.FEATURES._quotes_label',
    descriptionKey: 'ADMIN.FEATURES._quotes_description'
  },
  {
    key: 'purchaseEnabled',
    labelKey: 'ADMIN.FEATURES._purchases_label',
    descriptionKey: 'ADMIN.FEATURES._purchases_description'
  },
  {
    key: 'aiEnabled',
    labelKey: 'ADMIN.FEATURES._ai_search_label',
    descriptionKey: 'ADMIN.FEATURES._ai_search_description'
  },
  {
    key: 'tenderingEnabled',
    labelKey: 'ADMIN.FEATURES._tendering_label',
    descriptionKey: 'ADMIN.FEATURES._tendering_description'
  },
  {
    key: 'dataSpaceEnabled',
    labelKey: 'ADMIN.FEATURES._data_space_label',
    descriptionKey: 'ADMIN.FEATURES._data_space_description'
  },
  {
    key: 'dspEnabled',
    labelKey: 'ADMIN.FEATURES._dsp_label',
    descriptionKey: 'ADMIN.FEATURES._dsp_description'
  },
  {
    key: 'catalogManagementEnabled',
    labelKey: 'ADMIN.FEATURES._catalog_management_label',
    descriptionKey: 'ADMIN.FEATURES._catalog_management_description'
  },
  {
    key: 'launchValidationEnabled',
    labelKey: 'ADMIN.FEATURES._launch_validation_label',
    descriptionKey: 'ADMIN.FEATURES._launch_validation_description'
  },
  {
    key: 'tenderDevButtonsOpenCloseEnabled',
    labelKey: 'ADMIN.FEATURES._tender_dev_actions_label',
    descriptionKey: 'ADMIN.FEATURES._tender_dev_actions_description'
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
  result.dspEnabled = readBoolean(source, 'dspEnabled');
  result.catalogManagementEnabled = readBoolean(source, 'catalogManagementEnabled');
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
  environment.DSP_ENABLED = features.dspEnabled ?? environment.DSP_ENABLED;
  environment.CATALOG_MANAGEMENT_ENABLED = features.catalogManagementEnabled ?? environment.CATALOG_MANAGEMENT_ENABLED;
  environment.LAUNCH_VALIDATION_ENABLED = features.launchValidationEnabled ?? false;
  environment.TENDER_DEV_BUTTONS_OPEN_CLOSE_ENABLED = features.tenderDevButtonsOpenCloseEnabled ?? false;
  environment.AI_SEARCH_ENABLED = features.aiEnabled ?? false;
}
