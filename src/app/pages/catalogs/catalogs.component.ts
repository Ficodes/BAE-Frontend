import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, Type } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ThemeService } from 'src/app/services/theme.service';
import { CatalogsPageConfig } from 'src/app/themes';
import { environment } from 'src/environments/environment';

interface ProviderCard { id: string; name: string; description: string; logo: string; }

@Component({
  selector: 'app-catalogs',
  templateUrl: './catalogs.component.html',
  styleUrl: './catalogs.component.css'
})
export class CatalogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private catalogs: any[] = [];
  private nextCatalogs: any[] = [];
  private allProviders: ProviderCard[] = [];
  private catalogLogoCache = new Map<string, string>();
  private ownerLogoCache = new Map<string, string | null>();
  private providersRequestSeq = 0;
  providers: ProviderCard[] = [];
  totalCount = 0;
  page = 0;
  readonly CATALOG_LIMIT = 12;
  loading = false;
  loading_more = false;
  page_check = true;
  filter: string | undefined;
  searchField = new FormControl();

  viewMode: 'grid' | 'list' = 'grid';
  defaultCatalogLogoUrl = '';
  isDefaultLogo(logo: string | undefined): boolean { return !!logo && logo === this.defaultCatalogLogoUrl; }
  sortOption: 'recent' | 'name_asc' | 'name_desc' = 'recent';
  showSortDropdown = false;
  sortOptions: { value: 'recent' | 'name_asc' | 'name_desc'; label: string }[] = [
    { value: 'recent', label: 'CATALOGS._sort_recent' },
    { value: 'name_asc', label: 'CATALOGS._sort_name_asc' },
    { value: 'name_desc', label: 'CATALOGS._sort_name_desc' },
  ];
  marketplaceHomeUrl = '/search';
  catalogsHeaderComponent: Type<unknown> | null = null;

  get sortLabel() { return this.sortOptions.find(o => o.value === this.sortOption)?.label ?? ''; }

  constructor(
    private router: Router,
    private accService: AccountServiceService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService,
    private paginationService: PaginationService
  ) { }

  ngOnInit() {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.marketplaceHomeUrl = theme?.links?.marketplaceHomeUrl || '/search';
        this.applyCatalogsTheme(theme?.catalogs);
      });

    this.getProviders(false);
    this.searchField.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        if (!v && this.filter !== undefined) {
          this.filter = undefined;
          this.getProviders(false);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyCatalogsTheme(catalogsConfig: CatalogsPageConfig | undefined) {
    this.catalogsHeaderComponent = catalogsConfig?.sections?.header || null;
    const previousDefaultLogoUrl = this.defaultCatalogLogoUrl;
    this.defaultCatalogLogoUrl = catalogsConfig?.cards?.fallbackLogoUrl || '';

    if (previousDefaultLogoUrl !== this.defaultCatalogLogoUrl) {
      this.updateDefaultLogos(previousDefaultLogoUrl, this.defaultCatalogLogoUrl);
    }
  }

  private updateDefaultLogos(previousDefaultLogoUrl: string, nextDefaultLogoUrl: string) {
    const replaceDefaultLogo = (card: ProviderCard) => {
      if (!card.logo || card.logo === previousDefaultLogoUrl) {
        card.logo = nextDefaultLogoUrl;
      }
    };

    this.allProviders.forEach(replaceDefaultLogo);
    this.providers.forEach(replaceDefaultLogo);
  }

  async getProviders(next = false) {
    if (next && (!this.page_check || this.loading_more)) {
      return;
    }

    const requestSeq = ++this.providersRequestSeq;
    const catalogsToLoadLogos = next ? [...this.nextCatalogs] : [];

    if (next) {
      this.loading_more = true;
    } else {
      this.loading = true;
      this.page = 0;
      this.catalogs = [];
      this.nextCatalogs = [];
      this.allProviders = [];
      this.providers = [];
      this.page_check = true;
    }

    try {
      const data = await this.paginationService.getItemsPaginated(
        this.page,
        this.CATALOG_LIMIT,
        next,
        this.catalogs,
        this.nextCatalogs,
        { keywords: this.filter },
        this.getCatalogsPage.bind(this)
      );

      if (requestSeq !== this.providersRequestSeq) {
        return;
      }

      this.page_check = data.page_check;
      this.catalogs = Array.isArray(data.items) ? data.items : [];
      this.nextCatalogs = Array.isArray(data.nextItems) ? data.nextItems : [];
      this.page = data.page;
      this.allProviders = this.catalogs.map(c => this.mapCatalog(c));
      this.applyView();
      this.fillOwnerLogos(next ? catalogsToLoadLogos : this.catalogs);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    } finally {
      if (requestSeq === this.providersRequestSeq) {
        this.loading = false;
        this.loading_more = false;
        this.cdr.detectChanges();
      }
    }
  }

  private getCatalogsPage(page: any, filter: any): Promise<any> {
    return this.api.getCatalogsWithLimit(page, filter, this.CATALOG_LIMIT);
  }

  private mapCatalog(c: any): ProviderCard {
    const id = c?.id ?? '';
    return {
      id,
      name: c?.name ?? '',
      description: c?.description ?? '',
      logo: this.catalogLogoCache.get(id) ?? this.defaultCatalogLogoUrl
    };
  }

  private fillOwnerLogos(catalogs: any[]) {
    const cardsByOwner = new Map<string, ProviderCard[]>();
    for (const c of catalogs) {
      const parties: any[] = c?.relatedParty ?? [];
      const owner = parties.find((p: any) => p?.role === environment.SELLER_ROLE)
        ?? parties.find((p: any) => p?.id && String(p.id).includes('organization'));
      const card = this.allProviders.find(p => p.id === c?.id);
      if (!owner?.id || !card || !String(owner.id).includes('organization')) continue;

      const cachedLogo = this.ownerLogoCache.get(owner.id);
      if (cachedLogo !== undefined) {
        if (cachedLogo) {
          card.logo = cachedLogo;
          this.catalogLogoCache.set(card.id, cachedLogo);
        }
        continue;
      }

      cardsByOwner.set(owner.id, [...(cardsByOwner.get(owner.id) ?? []), card]);
    }
    for (const [ownerId, cards] of cardsByOwner) {
      this.accService.getOrgInfo(ownerId).then(org => {
        const logo = (org?.partyCharacteristic ?? []).find((ch: any) => ch?.name === 'logo')?.value;
        this.ownerLogoCache.set(ownerId, logo ?? null);
        if (!logo) {
          return;
        }
        for (const card of cards) {
          card.logo = logo;
          this.catalogLogoCache.set(card.id, logo);
        }
        this.cdr.detectChanges();
      }).catch(() => {
        this.ownerLogoCache.set(ownerId, null);
      });
    }
  }

  private applyView() {
    let list = [...this.allProviders];
    if (this.sortOption === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sortOption === 'name_desc') list.sort((a, b) => b.name.localeCompare(a.name));
    this.totalCount = list.length;
    this.providers = list;
  }

  filterProviders() {
    const value = this.searchField.value?.trim();
    this.filter = value || undefined;
    this.getProviders(false);
  }

  toggleSortDropdown(e: Event) {
    e.stopPropagation();
    this.showSortDropdown = !this.showSortDropdown;
  }

  selectSort(v: 'recent' | 'name_asc' | 'name_desc', e: Event) {
    e.stopPropagation();
    this.sortOption = v;
    this.showSortDropdown = false;
    this.applyView();
  }

  next() {
    this.getProviders(true);
  }

  goToProvider(id: string) {
    this.router.navigate(['/search/catalogue', id]);
  }

  @HostListener('document:click') onClick() {
    if (this.showSortDropdown) {
      this.showSortDropdown = false;
      this.cdr.detectChanges();
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
