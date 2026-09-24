import { Injectable } from '@angular/core';
import { Provider, ProviderService } from 'src/app/services/provider.service';
import {
  CataloguesDirectoryCard,
  CataloguesDirectoryPage,
  CataloguesDirectoryQuery,
  CataloguesDirectorySource
} from './catalogues-directory.model';

@Injectable({
  providedIn: 'root'
})
export class ProviderDirectorySource implements CataloguesDirectorySource {
  readonly mode = 'provider' as const;

  constructor(private providerService: ProviderService) {}

  async loadPage(query: CataloguesDirectoryQuery): Promise<CataloguesDirectoryPage> {
    const providers = await this.providerService.getProviderDirectoryPage({
      offset: query.offset,
      limit: query.limit,
      keyword: query.keyword,
      filteredPaginationToken: query.continuationToken
    });

    const items = providers.items
      .filter(provider => Boolean(provider.id))
      .map(provider => this.mapProvider(provider, query.fallbackLogoUrl ?? ''));

    return {
      items,
      continuationToken: providers.filteredPaginationToken ?? null,
      hasMore: query.continuationToken
        ? Boolean(providers.filteredPaginationToken)
        : Boolean(providers.filteredPaginationToken) || items.length === query.limit
    };
  }

  routeFor(card: CataloguesDirectoryCard): any[] {
    return ['/org-details', card.id];
  }

  private mapProvider(provider: Provider, fallbackLogoUrl: string): CataloguesDirectoryCard {
    const characteristics = provider.partyCharacteristic ?? [];

    return {
      id: provider.id ?? '',
      name: provider.tradingName ?? provider.name ?? '',
      description: this.characteristicValue(characteristics, 'description'),
      logo: this.characteristicValue(characteristics, 'logo') || fallbackLogoUrl,
      mode: this.mode
    };
  }

  private characteristicValue(characteristics: Array<{ name?: string; value?: string }>, name: string): string {
    return characteristics.find(characteristic => characteristic?.name === name)?.value ?? '';
  }
}
