import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faChevronLeft, faChevronRight } from '@fortawesome/pro-solid-svg-icons';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { Category } from 'src/app/models/interfaces';
import { iconForCategory } from 'src/app/data/categoryIcons';
import { searchCategoriesConfig } from 'src/app/data/availableFilters';

interface PopularOffer {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, FontAwesomeModule],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.css',
})
export class BrowseComponent implements OnInit {
  categories: Category[] = [];
  searchQuery = '';
  loading = true;
  faArrowRight = faArrowRight;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  iconForCategory = iconForCategory;

  private readonly POPULAR_PER_PAGE = 3;
  private readonly POPULAR_TOTAL = 9;
  private popularCandidates: PopularOffer[] = [];
  popularLoading = true;
  popularPage = 0;
  popularDirection: 'init' | 'next' | 'prev' = 'init';

  get popularOffers(): PopularOffer[] {
    return this.popularCandidates.slice(0, this.POPULAR_TOTAL);
  }


  get popularPages(): PopularOffer[][] {
    const pages: PopularOffer[][] = [];
    for (let i = 0; i < this.popularOffers.length; i += this.POPULAR_PER_PAGE) {
      pages.push(this.popularOffers.slice(i, i + this.POPULAR_PER_PAGE));
    }
    return pages;
  }

  get popularPageCount(): number {
    return this.popularPages.length;
  }

  constructor(
    private api: ApiServiceService,
    private router: Router,
    private localStorage: LocalStorageService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadPopularOffers();
  }

  private async loadCategories(): Promise<void> {
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];
      if (searchCategoriesConfig.primaryCategoriesMode === 'catalogFirstLevel') {
        this.categories = list;
      } else {
        const primaryRoot = list.find((c: any) => c?.name === searchCategoriesConfig.primaryRootName);
        if (primaryRoot?.id) {
          const children = await this.api.getCategoriesByParentId(primaryRoot.id);
          this.categories = Array.isArray(children) ? children : [];
        } else {
          this.categories = [];
        }
      }
    } catch (e) {
      console.error('Error loading categories:', e);
    } finally {
      this.loading = false;
    }
  }

  private async loadPopularOffers(): Promise<void> {
    try {
      const offsets = [0, 6, 12, 18, 24, 30, 36, 42];
      const batches = await Promise.all(
        offsets.map(o => this.api.getProducts(o, undefined).catch(() => [])),
      );

      const seen = new Set<string>();
      const pool: any[] = [];
      for (const batch of batches) {
        if (!Array.isArray(batch)) continue;
        for (const o of batch) {
          const id = o?.id;
          if (id && !seen.has(id)) {
            seen.add(id);
            pool.push(o);
          }
        }
      }

      const detailed = await this.api.getProductsDetails(pool);

      const candidates: PopularOffer[] = detailed
        .map(offer => {
          const attachments = (offer as any)?.attachment ?? [];
          const profile = attachments.find((a: any) => a?.name === 'Profile Picture');
          const picture = profile ?? attachments.find((a: any) => {
            const type = (a?.attachmentType ?? '').toLowerCase();
            return type === 'picture' || type.startsWith('image/');
          });
          return {
            id: (offer as any).id,
            name: (offer as any).name ?? '',
            description: (offer as any).description ?? '',
            imageUrl: picture?.url ?? '',
          };
        })
        .filter(o => !!o.id && !!o.imageUrl);

      const validated = await Promise.all(
        candidates.map(async o => ((await this.imageLoads(o.imageUrl)) ? o : null)),
      );
      const valid = validated.filter((o): o is PopularOffer => o !== null);
      for (let i = valid.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [valid[i], valid[j]] = [valid[j], valid[i]];
      }
      this.popularCandidates = valid;
    } catch (e) {
      console.error('Error loading popular offers:', e);
      this.popularCandidates = [];
    } finally {
      this.popularLoading = false;
    }
  }

  private imageLoads(url: string): Promise<boolean> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  nextPopularPage(): void {
    if (this.popularPageCount === 0) return;
    this.popularDirection = 'next';
    this.popularPage = (this.popularPage + 1) % this.popularPageCount;
  }

  prevPopularPage(): void {
    if (this.popularPageCount === 0) return;
    this.popularDirection = 'prev';
    this.popularPage = (this.popularPage - 1 + this.popularPageCount) % this.popularPageCount;
  }

  setPopularPage(index: number): void {
    if (index >= 0 && index < this.popularPageCount && index !== this.popularPage) {
      this.popularDirection = index > this.popularPage ? 'next' : 'prev';
      this.popularPage = index;
    }
  }

  goToOffer(offer: PopularOffer): void {
    this.router.navigate(['/search', offer.id]);
  }

  onSearch(event: Event) {
    event.preventDefault();
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search', { keywords: this.searchQuery.trim() }]);
    } else {
      this.router.navigate(['/search']);
    }
  }

  onCategoryClick(category: Category) {
    localStorage.removeItem('selected_categories');
    this.localStorage.addCategoryFilter(category);
    this.router.navigate(['/search']);
  }

  onShowAll() {
    localStorage.removeItem('selected_categories');
    this.router.navigate(['/search']);
  }
}
