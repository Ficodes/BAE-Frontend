export interface SearchOrganizationsFilters {
  categories: string[];
  countries: string[];
  complianceLevels: string[];
}

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

  const map: Record<string, string> = {
    'BL': 'Baseline',
    'P': 'Professional',
    'P+': 'Professional+',
  };

  return map[upper] ?? upper;
}



