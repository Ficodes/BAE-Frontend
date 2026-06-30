import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { faIdCard, faSort, faSparkles, faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'seller-product-spec',
  templateUrl: './seller-product-spec.component.html',
  styleUrl: './seller-product-spec.component.css'
})
export class SellerProductSpecComponent implements OnInit, OnDestroy {
  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;
  protected readonly faSparkles = faSparkles;

  searchField = new FormControl();

  prodSpecs: any[] = [];
  nextProdSpecs: any[] = [];
  page: number = 0;
  PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;
  loading: boolean = false;
  loading_more: boolean = false;
  page_check: boolean = true;
  filter: any = undefined;
  status: any[] = ['Active'];
  selectedTab: string = 'Draft';
  tabStatusMap: { [k: string]: string[] } = {
    Draft: ['Active'],
    Validated: ['Launched'],
    Deleted: ['Retired', 'Obsolete']
  };
  statusCounts: { [k: string]: number } = { Draft: 0, Validated: 0, Deleted: 0 };
  openMenuIdx: number | null = null;
  partyId: any;
  sort: any = undefined;
  isBundle: any = undefined;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private prodSpecService: ProductSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initProdSpecs();
        }
      })
  }

  ngOnInit() {
    this.initProdSpecs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initProdSpecs() {
    this.loading = true;
    this.prodSpecs = [];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux.logged_as == aux.id) {
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    this.getProdSpecs(false);
    this.loadStatusCounts();
    let input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if (this.searchField.value == '') {
          this.filter = undefined;
          this.getProdSpecs(false);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  goToCreate() {
    this.eventMessage.emitSellerCreateProductSpec(true);
  }

  goToUpdate(prod: any) {
    this.eventMessage.emitSellerUpdateProductSpec(prod);
  }

  async getProdSpecs(next: boolean) {
    if (next == false) {
      this.loading = true;
    }

    let options = {
      "filters": this.status,
      "partyId": this.partyId,
      "sort": this.sort,
      "isBundle": this.isBundle
    }

    this.paginationService.getItemsPaginated(this.page, this.PROD_SPEC_LIMIT, next, this.prodSpecs, this.nextProdSpecs, options,
      this.prodSpecService.getProdSpecByUser.bind(this.prodSpecService)).then(data => {
        this.page_check = data.page_check;
        this.prodSpecs = data.items;
        this.nextProdSpecs = data.nextItems;
        this.page = data.page;
        this.loading = false;
        this.loading_more = false;
      })
  }

  async next() {
    await this.getProdSpecs(true);
  }

  filterInventoryByKeywords() {

  }

  onStateFilterChange(filter: string) {
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
    } else {
      this.status.push(filter)
    }
    this.getProdSpecs(false);
  }

  selectTab(tab: string) {
    if (tab === this.selectedTab) return;
    this.selectedTab = tab;
    this.status = [...this.tabStatusMap[tab]];
    this.page = 0;
    this.getProdSpecs(false);
  }

  async loadStatusCounts() {
    try {
      const all: any[] = [];
      let offset = 0;
      while (offset < 10000) {
        const page = await this.prodSpecService.getProdSpecByUser(offset, [], this.partyId);
        const items = Array.isArray(page) ? page : [];
        all.push(...items);
        if (items.length < this.PROD_SPEC_LIMIT) break;
        offset += this.PROD_SPEC_LIMIT;
      }
      const counts: { [k: string]: number } = {};
      for (const tab of Object.keys(this.tabStatusMap)) counts[tab] = 0;
      for (const item of all) {
        const status = item?.lifecycleStatus;
        for (const tab of Object.keys(this.tabStatusMap)) {
          if (this.tabStatusMap[tab].includes(status)) { counts[tab]++; break; }
        }
      }
      this.statusCounts = counts;
    } catch {
    }
    this.cdr.detectChanges();
  }

  toggleMenu(idx: number, event: Event) {
    event.stopPropagation();
    this.openMenuIdx = this.openMenuIdx === idx ? null : idx;
  }

  @HostListener('document:click')
  onDocClick() {
    if (this.openMenuIdx !== null) {
      this.openMenuIdx = null;
      this.cdr.detectChanges();
    }
  }

  rowStatusBadge(prod: any): { text: string, bg: string, color: string } {
    const hasChars = (prod?.productSpecCharacteristic && prod.productSpecCharacteristic.length > 0);
    if (prod?.lifecycleStatus === 'Launched') {
      return { text: 'Validated', bg: '#BBF7D0', color: '#052E16' };
    }
    if (prod?.lifecycleStatus === 'Retired' || prod?.lifecycleStatus === 'Obsolete') {
      return { text: 'Deleted', bg: '#FEE2E2', color: '#991B1B' };
    }
    if (hasChars) {
      return { text: 'Ready to be validated', bg: '#DCFCE7', color: '#166534' };
    }
    return { text: 'Not completed', bg: '#FEF3C7', color: '#92400E' };
  }

  validateProd(prod: any) {
    if (!prod?.id) return;
    this.prodSpecService.updateProdSpec({ lifecycleStatus: 'Launched' }, prod.id).subscribe({
      next: () => {
        this.openMenuIdx = null;
        this.eventMessage.emitSpecCreated('Product specification successfully validated');
        this.getProdSpecs(false);
        this.loadStatusCounts();
      },
      error: () => {
        this.openMenuIdx = null;
      }
    });
  }

  deleteProd(prod: any) {
    if (!prod?.id) return;
    this.openMenuIdx = null;
    const onSuccess = () => {
      this.eventMessage.emitSpecCreated('Product specification deleted');
      this.getProdSpecs(false);
      this.loadStatusCounts();
    };
    const onError = (err: any) => {
      console.error('Product spec delete failed', err);
      this.eventMessage.emitSpecCreated('Could not delete this product specification.', 'error');
    };
    if (prod.lifecycleStatus === 'Active') {
      this.prodSpecService.updateProdSpec({ lifecycleStatus: 'Launched' }, prod.id).subscribe({
        next: () => {
          this.prodSpecService.updateProdSpec({ lifecycleStatus: 'Retired' }, prod.id).subscribe({
            next: onSuccess,
            error: onError
          });
        },
        error: onError
      });
    } else {
      this.prodSpecService.updateProdSpec({ lifecycleStatus: 'Retired' }, prod.id).subscribe({
        next: onSuccess,
        error: onError
      });
    }
  }

  onSortChange(event: any) {
    if (event.target.value == 'name') {
      this.sort = 'name'
    } else {
      this.sort = undefined
    }
    this.getProdSpecs(false);
  }

  onTypeChange(event: any) {
    if (event.target.value == 'simple') {
      this.isBundle = false
    } else if (event.target.value == 'bundle') {
      this.isBundle = true
    } else {
      this.isBundle = undefined
    }
    this.getProdSpecs(false);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
