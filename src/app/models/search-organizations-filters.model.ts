import { Category } from './interfaces';

export interface SearchOrganizationsFilters {
  categories: string[];
  countries: string[];
  complianceLevels: string[];
}

export interface ComplianceLevelOption {
  code: string;
  label: string;
}

export interface ProviderCountryOption {
  code: string;
  label: string;
}

export type ProviderCountryListResponse = Record<string, Record<string, string>>;

export interface TenderProviderFilterState {
  serviceCategoryLeafNames?: string[];
  addressableSectorLeafNames?: string[];
  integrationFrameworkLeafNames?: string[];
  countryCodes?: string[];
  complianceLevels?: string[];
}

export const PROVIDER_COUNTRY_LIST_URL =
  'https://raw.githubusercontent.com/DOME-Marketplace/eu-eea-countries/refs/heads/main/countries.json';

export const TENDER_COMPLIANCE_LEVELS: ComplianceLevelOption[] = [
  { code: 'BL', label: 'Baseline' },
  { code: 'P', label: 'Professional' },
  { code: 'PP', label: 'Professional+' },
];

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const codeAliases: Record<string, string> = {
  EL: 'GR', // Greece
  UK: 'GB', // United Kingdom
};

export function countryName(code: string | null | undefined): string {
  if( code?.length !== 2 ) return code ?? '';
  if (!code) return '';
  const upper = code.toUpperCase();
  const normalized = codeAliases?.[upper] ?? upper;
  return regionNames.of(normalized) ?? upper;
}

export function complianceLevelsName(code: string | null | undefined): string {
  if (!code) return '';

  const upper = code.toUpperCase();
  const match = TENDER_COMPLIANCE_LEVELS.find(option => option.code === upper);

  return match?.label ?? upper;
}

export function parseProviderCountryList(
  response: ProviderCountryListResponse | null | undefined,
  locale = 'en'
): ProviderCountryOption[] {
  return Object.entries(response ?? {})
    .map(([code, labels]) => ({
      code: code.toUpperCase(),
      label: labels?.[locale] ?? labels?.['en'] ?? Object.values(labels ?? {})[0] ?? code.toUpperCase(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildTenderProviderSearchFilters(
  state: TenderProviderFilterState = {}
): SearchOrganizationsFilters {
  return {
    categories: unique([
      ...(state.serviceCategoryLeafNames ?? []),
      ...(state.addressableSectorLeafNames ?? []),
      ...(state.integrationFrameworkLeafNames ?? []),
    ]),
    countries: unique(state.countryCodes ?? []),
    complianceLevels: unique(state.complianceLevels ?? []),
  };
}

export async function resolveTenderCategoryLeafNames(
  category: Category,
  loadChildren: (id: string) => Promise<Category[]>
): Promise<string[]> {
  if (!category.id) return [category.name];

  const children = await loadChildren(category.id);
  const childList = Array.isArray(children) ? children : [];

  if (childList.length === 0) return [category.name];

  const nested = await Promise.all(
    childList.map(child => resolveTenderCategoryLeafNames(child, loadChildren))
  );

  return nested.flat();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

