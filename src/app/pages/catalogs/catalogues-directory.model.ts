export type CataloguesDirectoryMode = 'catalog' | 'provider';

export interface CataloguesDirectoryQuery {
  offset: number;
  limit: number;
  keyword?: string;
  continuationToken?: string | null;
  fallbackLogoUrl?: string;
}

export interface CataloguesDirectoryCard {
  id: string;
  name: string;
  description: string;
  logo: string;
  mode: CataloguesDirectoryMode;
}

export interface CataloguesDirectoryPage {
  items: CataloguesDirectoryCard[];
  continuationToken: string | null;
  hasMore: boolean;
}

export interface CataloguesDirectorySource {
  readonly mode: CataloguesDirectoryMode;
  loadPage(query: CataloguesDirectoryQuery): Promise<CataloguesDirectoryPage>;
  routeFor(card: CataloguesDirectoryCard): any[];
}
