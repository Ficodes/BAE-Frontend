import { Category } from './interfaces';
import {
  TENDER_COMPLIANCE_LEVELS,
  buildTenderProviderSearchFilters,
  complianceLevelsName,
  parseProviderCountryList,
  resolveTenderCatalogueFacetOptions,
  resolveTenderCategoryLeafNames,
  shouldUseUnfilteredProviderFallback,
} from './search-organizations-filters.model';

describe('Tender Provider Search filter helpers', () => {
  it('uses PP as the Professional+ compliance code', () => {
    expect(complianceLevelsName('PP')).toBe('Professional+');
    expect(TENDER_COMPLIANCE_LEVELS).toEqual([
      { code: 'BL', label: 'Baseline' },
      { code: 'P', label: 'Professional' },
      { code: 'PP', label: 'Professional+' },
    ]);
    expect(TENDER_COMPLIANCE_LEVELS.map(option => option.code)).not.toContain('P+');
  });

  it('parses the DOME Provider Country List into sorted ISO code options', () => {
    const options = parseProviderCountryList({
      ES: { en: 'Spain', es: 'Espana' },
      IT: { en: 'Italy', it: 'Italia' },
      FR: { it: 'Francia' },
    });

    expect(options).toEqual([
      { code: 'FR', label: 'Francia' },
      { code: 'IT', label: 'Italy' },
      { code: 'ES', label: 'Spain' },
    ]);
  });

  it('builds the final search payload by merging catalogue facet leaf names without duplicates', () => {
    const payload = buildTenderProviderSearchFilters({
      serviceCategoryLeafNames: ['Cloud services'],
      addressableSectorLeafNames: ['Health', 'Cloud services'],
      integrationFrameworkLeafNames: ['DOME Trust'],
      countryCodes: ['IT', 'FR'],
      complianceLevels: ['PP'],
    });

    expect(payload).toEqual({
      categories: ['Cloud services', 'Health', 'DOME Trust'],
      countries: ['IT', 'FR'],
      complianceLevels: ['PP'],
    });
  });

  it('returns empty arrays for an empty tender filter state', () => {
    expect(buildTenderProviderSearchFilters()).toEqual({
      categories: [],
      countries: [],
      complianceLevels: [],
    });
  });

  it('uses the unfiltered provider fallback only when no tender filters are active', () => {
    expect(shouldUseUnfilteredProviderFallback({
      categories: [],
      countries: [],
      complianceLevels: [],
    })).toBeTrue();

    expect(shouldUseUnfilteredProviderFallback({
      categories: [],
      countries: ['IT'],
      complianceLevels: [],
    })).toBeFalse();
  });

  it('expands selected parent categories recursively to leaf category names', async () => {
    const root: Category = { id: 'root', name: 'DOME Categories' };
    const childrenById: Record<string, Category[]> = {
      root: [
        { id: 'security', name: 'Security' },
        { id: 'devops', name: 'DevOps' },
      ],
      security: [
        { id: 'iam', name: 'Identity and access management' },
        { id: 'siem', name: 'SIEM' },
      ],
      devops: [],
      iam: [],
      siem: [],
    };

    const leafNames = await resolveTenderCategoryLeafNames(
      root,
      async (id) => childrenById[id] ?? []
    );

    expect(leafNames).toEqual(['Identity and access management', 'SIEM', 'DevOps']);
  });

  it('loads tender catalogue facet children using accepted facet aliases', async () => {
    const roots: Category[] = [
      { id: 'dome-root', name: 'DOME Categories' },
      { id: 'sector-root', name: 'Addressable Sectors' },
      { id: 'framework-root', name: 'Integration Framework' },
    ];
    const childrenById: Record<string, Category[]> = {
      'dome-root': [{ id: 'security', name: 'Security' }],
      'sector-root': [{ id: 'public-sector', name: 'Public sector' }],
      'framework-root': [{ id: 'fiware', name: 'FIWARE' }],
    };

    const options = await resolveTenderCatalogueFacetOptions(
      roots,
      async (id: string) => childrenById[id] ?? []
    );

    expect(options).toEqual({
      serviceCategories: [{ id: 'security', name: 'Security' }],
      addressableSectors: [{ id: 'public-sector', name: 'Public sector' }],
      integrationFrameworks: [{ id: 'fiware', name: 'FIWARE' }],
    });
  });
});
