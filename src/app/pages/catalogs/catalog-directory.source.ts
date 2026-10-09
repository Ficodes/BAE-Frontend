import { Injectable } from '@angular/core';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import {
  CataloguesDirectoryCard,
  CataloguesDirectoryPage,
  CataloguesDirectoryQuery,
  CataloguesDirectorySource
} from './catalogues-directory.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogDirectorySource implements CataloguesDirectorySource {
  readonly mode = 'catalog' as const;
  private logoCache = new Map<string, string>();
  private ownerLogoCache = new Map<string, string | null>();

  constructor(
    private api: ApiServiceService,
    private accountService: AccountServiceService
  ) {}

  async loadPage(query: CataloguesDirectoryQuery): Promise<CataloguesDirectoryPage> {
    const response = await this.api.getLaunchedCatalogsPage(
      query.offset,
      query.keyword,
      query.limit,
      query.continuationToken
    );

    const catalogs = Array.isArray(response.items) ? response.items : [];
    const items = catalogs.map(catalog => this.mapCatalog(catalog, query.fallbackLogoUrl ?? ''));
    await this.fillOwnerLogos(catalogs, items);

    const continuationToken = response.filteredPaginationToken ?? null;
    return {
      items,
      continuationToken,
      hasMore: query.continuationToken
        ? Boolean(continuationToken)
        : Boolean(continuationToken) || items.length === query.limit
    };
  }

  routeFor(card: CataloguesDirectoryCard): any[] {
    return ['/search/catalogue', card.id];
  }

  private mapCatalog(catalog: any, fallbackLogoUrl: string): CataloguesDirectoryCard {
    const id = catalog?.id ?? '';
    return {
      id,
      name: catalog?.name ?? '',
      description: catalog?.description ?? '',
      logo: this.logoCache.get(id) ?? fallbackLogoUrl,
      mode: this.mode
    };
  }

  private async fillOwnerLogos(catalogs: any[], cards: CataloguesDirectoryCard[]): Promise<void> {
    const cardsByOwner = new Map<string, CataloguesDirectoryCard[]>();

    for (const catalog of catalogs) {
      const parties: any[] = catalog?.relatedParty ?? [];
      const owner = parties.find((party: any) => party?.role === environment.SELLER_ROLE)
        ?? parties.find((party: any) => party?.id && String(party.id).includes('organization'));
      const card = cards.find(item => item.id === catalog?.id);

      if (!owner?.id || !card || !String(owner.id).includes('organization')) {
        continue;
      }

      const cachedLogo = this.ownerLogoCache.get(owner.id);
      if (cachedLogo !== undefined) {
        if (cachedLogo) {
          card.logo = cachedLogo;
          this.logoCache.set(card.id, cachedLogo);
        }
        continue;
      }

      cardsByOwner.set(owner.id, [...(cardsByOwner.get(owner.id) ?? []), card]);
    }

    await Promise.all(
      Array.from(cardsByOwner.entries()).map(async ([ownerId, ownerCards]) => {
        try {
          const org = await this.accountService.getOrgInfo(ownerId);
          const logo = (org?.partyCharacteristic ?? []).find((ch: any) => ch?.name === 'logo')?.value;
          this.ownerLogoCache.set(ownerId, logo ?? null);
          if (!logo) {
            return;
          }
          for (const card of ownerCards) {
            card.logo = logo;
            this.logoCache.set(card.id, logo);
          }
        } catch {
          this.ownerLogoCache.set(ownerId, null);
        }
      })
    );
  }
}
