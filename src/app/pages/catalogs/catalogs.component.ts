import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, Type } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountServiceService } from 'src/app/services/account-service.service';
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
  private allProviders: ProviderCard[] = [];
  providers: ProviderCard[] = [];
  totalCount = 0;
  page = 0;
  readonly PAGE_SIZE = 12;
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
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.marketplaceHomeUrl = theme?.links?.marketplaceHomeUrl || '/search';
        this.applyCatalogsTheme(theme?.catalogs);
      });

    this.getProviders();
    this.searchField.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { if (!v) { this.filter = undefined; this.page = 0; this.applyView(); } });
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

  async getProviders() {
    this.loading = true;
    const catalogs: any[] = [];
    let offset = 0;
    try {
      while (offset < 10000) {
        const batch = await this.api.getCatalogs(offset, undefined);
        const items = Array.isArray(batch) ? batch : [];
        catalogs.push(...items);
        if (items.length < environment.CATALOG_LIMIT) break;
        offset += items.length;
      }
    } catch (err) {
      console.error('Error loading catalogs:', err);
    }
    // Only surface catalogs that have at least one launched (published) offer.
    // Serialized on purpose: the dev gateway crosses concurrent productOffering
    // responses, so each check must run in isolation.
    const published: any[] = [];
    for (const c of catalogs) {
      if (await this.api.catalogHasLaunchedOffers(c?.id)) {
        published.push(c);
      }
    }
    this.allProviders = published.map(c => this.mapCatalog(c));
    this.page = 0;
    this.applyView();
    this.loading = false;
    this.fillOwnerLogos(published);
  }

  private mapCatalog(c: any): ProviderCard {
    return { id: c?.id, name: c?.name ?? '', description: c?.description ?? '', logo: this.defaultCatalogLogoUrl };
  }

  private fillOwnerLogos(catalogs: any[]) {
    const cardsByOwner = new Map<string, ProviderCard[]>();
    for (const c of catalogs) {
      const parties: any[] = c?.relatedParty ?? [];
      const owner = parties.find((p: any) => p?.role === environment.SELLER_ROLE)
        ?? parties.find((p: any) => p?.id && String(p.id).includes('organization'));
      const card = this.allProviders.find(p => p.id === c?.id);
      if (!owner?.id || !card || !String(owner.id).includes('organization')) continue;
      cardsByOwner.set(owner.id, [...(cardsByOwner.get(owner.id) ?? []), card]);
    }
    for (const [ownerId, cards] of cardsByOwner) {
      this.accService.getOrgInfo(ownerId).then(org => {
        const logo = (org?.partyCharacteristic ?? []).find((ch: any) => ch?.name === 'logo')?.value;
        if (!logo) return;
        for (const card of cards) card.logo = logo;
        this.cdr.detectChanges();
      }).catch(() => { });
    }
  }

  private applyView() {
    let list = [...this.allProviders];
    if (this.filter) {
      const q = this.filter.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    if (this.sortOption === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sortOption === 'name_desc') list.sort((a, b) => b.name.localeCompare(a.name));
    this.totalCount = list.length;
    const end = (this.page + 1) * this.PAGE_SIZE;
    this.providers = list.slice(0, end);
    this.page_check = end < list.length;
    this.loading_more = false;
  }

  filterProviders() {
    this.filter = this.searchField.value;
    this.page = 0;
    this.applyView();
  }

  toggleSortDropdown(e: Event) {
    e.stopPropagation();
    this.showSortDropdown = !this.showSortDropdown;
  }

  selectSort(v: 'recent' | 'name_asc' | 'name_desc', e: Event) {
    e.stopPropagation();
    this.sortOption = v;
    this.showSortDropdown = false;
    this.page = 0;
    this.applyView();
  }

  next() {
    this.loading_more = true;
    this.page++;
    this.applyView();
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
