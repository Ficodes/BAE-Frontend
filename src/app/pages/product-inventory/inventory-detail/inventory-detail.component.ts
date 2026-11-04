import { OfferDescriptionComponent } from 'src/app/shared/offer-description/offer-description.component';
import { splitOfferAttachments } from 'src/app/shared/offer-description/offer-description.util';
import { getVisibleOfferDescription } from 'src/app/shared/card/offer-card-text.util';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { catchError, combineLatest, from, of, switchMap } from 'rxjs';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, MarkdownModule, OfferDescriptionComponent],
  templateUrl: './inventory-detail.component.html',
  styleUrl: './inventory-detail.component.css'
})
export class InventoryDetailComponent implements OnInit {
  kind: 'services' | 'resources' = 'services';
  entity: any;
  loading = true;
  error = false;
  activeTab: 'overview' | 'characteristics' = 'overview';
  descriptionExpanded = false;
  attachments: any[] = [];
  readonly visibleDescription = getVisibleOfferDescription;

  constructor(
    private route: ActivatedRoute,
    private inventory: ProductInventoryServiceService,
    private catalog: ApiServiceService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit() {
    combineLatest([this.route.paramMap, this.route.data, this.route.queryParamMap]).pipe(
      switchMap(([params, data, query]) => {
        this.kind = data['inventoryKind'];
        this.loading = true;
        this.error = false;
        this.entity = undefined;
        this.activeTab = 'overview';
        this.descriptionExpanded = false;
        const id = params.get('id')!;
        const specification = query.get('source') === 'specification';
        const request = this.kind === 'services'
          ? (specification ? this.catalog.getServiceSpec(id) : this.inventory.getService(id))
          : (specification ? this.catalog.getResourceSpec(id) : this.inventory.getResource(id));
        return from(request).pipe(catchError(() => {
          this.error = true;
          return of(null);
        }));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(entity => {
      this.entity = entity;
      this.attachments = splitOfferAttachments(entity?.attachment).attachments;
      this.loading = false;
    });
  }

  get status(): string {
    return this.entity?.state || this.entity?.resourceStatus || this.entity?.lifecycleStatus || '';
  }

  get statusLabel(): string {
    const value = this.status.toLowerCase();
    if (value === 'feasibilitychecked') return 'PRODUCT_INVENTORY._feasibility';
    return ['reserved', 'active', 'inactive', 'terminated', 'available', 'suspended', 'created', 'standby', 'alarm', 'unknown'].includes(value)
      ? 'PRODUCT_INVENTORY._' + value : this.status;
  }

  get characteristicsLabel(): string {
    return this.kind === 'services' ? 'PRODUCT_INVENTORY._serv_chars' : 'PRODUCT_INVENTORY._res_chars';
  }

  get statusClass(): string {
    switch (this.status.toLowerCase()) {
      case 'active':
      case 'available': return 'bg-status-success-bg text-status-success-text';
      case 'created': return 'bg-status-ready-bg text-status-ready-text';
      case 'inactive':
      case 'suspended': return 'bg-status-warning-bg text-status-warning-text';
      case 'terminated': return 'bg-status-danger-bg text-status-danger-text';
      default: return 'bg-status-neutral-bg text-status-neutral-text';
    }
  }

  tabClass(tab: 'overview' | 'characteristics'): string {
    return this.activeTab === tab
      ? 'bg-offerings-dashed-border text-secondary-500 dark:bg-secondary-200 dark:text-offerings-on-dark font-semibold'
      : 'text-secondary-500 dark:text-offerings-on-dark-body font-semibold hover:bg-secondary-50 dark:hover:bg-secondary-300';
  }

  get characteristics(): any[] {
    return this.entity?.serviceCharacteristic ?? this.entity?.resourceCharacteristic
      ?? this.entity?.serviceSpecCharacteristic ?? this.entity?.resourceSpecCharacteristic ?? [];
  }

  characteristicValue(characteristic: any): string {
    const value = characteristic.value;
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return [characteristic.valueFrom, characteristic.valueTo].filter(value => value != null).join(' – ') || '—';
  }
}
