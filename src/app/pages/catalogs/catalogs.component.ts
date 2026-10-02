import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, Type } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ThemeService } from 'src/app/services/theme.service';
import { CatalogsPageConfig } from 'src/app/themes';
import { environment } from 'src/environments/environment';
import { CataloguesDirectorySourceFactory } from './catalogues-directory-source.factory';
import { CataloguesDirectoryCard, CataloguesDirectorySource } from './catalogues-directory.model';

@Component({
  selector: 'app-catalogs',
  templateUrl: './catalogs.component.html',
  styleUrl: './catalogs.component.css'
})
export class CatalogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private allProviders: CataloguesDirectoryCard[] = [];
  private nextProviders: CataloguesDirectoryCard[] = [];
  private providersRequestSeq = 0;
  private paginationToken: string | null = null;
  private hasMoreAfterNextPage = false;
  private directorySource: CataloguesDirectorySource;
  providers: CataloguesDirectoryCard[] = [];
  totalCount = 0;
  page = 0;
  readonly CATALOG_LIMIT = 12;
  loading = false;
  loading_more = false;
  hasPrefetchedPage = true;
  filter: string | undefined;
  searchField = new FormControl();
  searchEnabled = environment.SEARCH_ENABLED;

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
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService,
    private directorySourceFactory: CataloguesDirectorySourceFactory
  ) {
    this.directorySource = this.directorySourceFactory.getSource();
  }

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
    const replaceDefaultLogo = (card: CataloguesDirectoryCard) => {
      if (!card.logo || card.logo === previousDefaultLogoUrl) {
        card.logo = nextDefaultLogoUrl;
      }
    };

    this.allProviders.forEach(replaceDefaultLogo);
    this.providers.forEach(replaceDefaultLogo);
  }

  async getProviders(next = false) {
    if (next && (!this.hasPrefetchedPage || this.loading_more)) {
      return;
    }

    const requestSeq = ++this.providersRequestSeq;

    if (next) {
      this.loading_more = true;
    } else {
      this.loading = true;
      this.page = 0;
      this.nextProviders = [];
      this.allProviders = [];
      this.providers = [];
      this.hasPrefetchedPage = true;
      this.hasMoreAfterNextPage = false;
      this.clearPaginationToken();
    }

    try {
      let loadedProviders: CataloguesDirectoryCard[] = [];
      let page = this.page;
      let paginationToken = this.paginationToken;

      if (next) {
        loadedProviders = [...this.nextProviders];
        const visibleProviders = [...this.allProviders, ...loadedProviders];
        let bufferedProviders: CataloguesDirectoryCard[] = [];

        if (this.hasMoreAfterNextPage) {
          const prefetched = await this.loadDirectoryPage(page, paginationToken);
          page += this.CATALOG_LIMIT;
          paginationToken = prefetched.continuationToken ?? null;
          if (requestSeq !== this.providersRequestSeq) {
            return;
          }
          bufferedProviders = prefetched.items;
          this.hasMoreAfterNextPage = prefetched.hasMore;
        } else {
          this.hasMoreAfterNextPage = false;
        }

        this.allProviders = visibleProviders;
        this.nextProviders = bufferedProviders;
        this.hasPrefetchedPage = this.nextProviders.length > 0;
      } else {
        page = 0;
        paginationToken = null;
        const current = await this.loadDirectoryPage(page, paginationToken);
        page += this.CATALOG_LIMIT;
        paginationToken = current.continuationToken ?? null;
        if (requestSeq !== this.providersRequestSeq) {
          return;
        }

        loadedProviders = current.items;
        this.allProviders = loadedProviders;
        this.hasPrefetchedPage = current.hasMore;

        if (this.hasPrefetchedPage) {
          const prefetched = await this.loadDirectoryPage(page, paginationToken);
          page += this.CATALOG_LIMIT;
          paginationToken = prefetched.continuationToken ?? null;
          if (requestSeq !== this.providersRequestSeq) {
            return;
          }
          this.nextProviders = prefetched.items;
          this.hasMoreAfterNextPage = prefetched.hasMore;
          this.hasPrefetchedPage = this.nextProviders.length > 0;
        } else {
          this.hasMoreAfterNextPage = false;
        }
      }

      this.page = page;
      this.paginationToken = paginationToken;
      this.applyView();
    } catch (err) {
      console.error('Error loading catalogues directory:', err);
    } finally {
      if (requestSeq === this.providersRequestSeq) {
        this.loading = false;
        this.loading_more = false;
        this.cdr.detectChanges();
      }
    }
  }

  private loadDirectoryPage(page: number, continuationToken: string | null) {
    return this.directorySource.loadPage({
      offset: page,
      limit: this.CATALOG_LIMIT,
      keyword: this.searchEnabled ? this.filter : undefined,
      continuationToken,
      fallbackLogoUrl: this.defaultCatalogLogoUrl
    });
  }

  private clearPaginationToken(): void {
    this.paginationToken = null;
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
    this.filter = this.searchEnabled ? value || undefined : undefined;
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
    this.getProviders(false);
  }

  next(): Promise<void> {
    return this.getProviders(true);
  }

  goToProvider(card: CataloguesDirectoryCard) {
    this.router.navigate(this.directorySource.routeFor(card));
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
