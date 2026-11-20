import { splitOfferAttachments } from 'src/app/shared/offer-description/offer-description.util';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, from, of, switchMap } from 'rxjs';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { getVisibleOfferDescription } from 'src/app/shared/card/offer-card-text.util';

type InventoryTab = 'overview' | 'pricing' | 'related';

interface SelectedPlan {
  key: string;
  name: string;
  description: string;
  metadataUnavailable: boolean;
  charges: any[];
}

@Component({
  selector: 'app-product-inv-detail',
  templateUrl: './product-inv-detail.component.html',
  styleUrl: './product-inv-detail.component.css'
})
export class ProductInvDetailComponent implements OnInit {
  id = '';
  prod: any = {};
  productOff: any = {};
  prodSpec: any = {};
  selectedPlans: SelectedPlan[] = [];
  selectedCharacteristics: any[] = [];
  attachments: any[] = [];
  loading = true;
  error = false;
  metadataIncomplete = false;
  activeTab: InventoryTab = 'overview';
  offerDescriptionExpanded = false;
  readonly tabs: { id: InventoryTab; label: string }[] = [
    { id: 'overview', label: 'PRODUCT_DETAILS._tab_overview' },
    { id: 'pricing', label: 'PRODUCT_DETAILS._tab_pricing' },
    { id: 'related', label: 'PRODUCT_INVENTORY._services_resources' }
  ];
  readonly visibleDescription = getVisibleOfferDescription;

  constructor(
    private route: ActivatedRoute,
    private api: ApiServiceService,
    private router: Router,
    private inventory: ProductInventoryServiceService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.loading = true;
        this.error = false;
        this.activeTab = 'overview';
        this.offerDescriptionExpanded = false;
        return from(this.loadProduct(params.get('id'))).pipe(catchError(() => {
          this.error = true;
          return of(null);
        }));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      if (data) {
        this.id = data.prod.id;
        this.prod = data.prod;
        this.productOff = data.offering;
        this.prodSpec = data.specification;
        this.selectedPlans = data.plans;
        this.metadataIncomplete = data.metadataIncomplete;
        this.selectedCharacteristics = this.enrichCharacteristics(data.prod.productCharacteristic ?? [], data.specification);
        const media = splitOfferAttachments(data.specification.attachment ?? data.offering.attachment ?? data.prod.attachment);
        this.attachments = media.attachments;
        this.images = media.images;
      }
      this.loading = false;
    });
  }

  get selectedPlanNames(): string {
    return this.selectedPlans.map(plan => plan.name).filter(Boolean).join(' · ');
  }

  hasLongWord(value: string | undefined, threshold = 20): boolean {
    return !!value?.split(/\s+/).some(word => word.length > threshold);
  }

  private images: any[] = [];

  private async loadProduct(id: string | null) {
    if (!id) throw new Error('Missing inventory product ID');
    const prod = await this.inventory.getProduct(id);
    let metadataIncomplete = false;
    const optional = async (request: () => Promise<any>, fallback: any) => {
      try { return await request(); }
      catch { metadataIncomplete = true; return fallback; }
    };
    const offering = prod.productOffering?.id
      ? await optional(() => this.api.getProductById(prod.productOffering.id), prod.productOffering)
      : {};
    const specificationRef = prod.productSpecification ?? offering.productSpecification;
    const specification = specificationRef?.id
      ? await optional(() => this.api.getProductSpecification(specificationRef.id), specificationRef)
      : {};

    // Resolve only price plans recorded on this product, never the offering's available plans.
    const charges: any[] = prod.productPrice ?? [];
    const planIds = [...new Set<string>(charges.map(charge => charge.productOfferingPrice?.id).filter(Boolean))];
    const metadata = new Map(await Promise.all(planIds.map(async planId => {
      const plan = await optional(() => this.api.getOfferingPrice(planId), null);
      return [planId, plan] as const;
    })));
    const plans = new Map<string, SelectedPlan>();
    charges.forEach((charge, index) => {
      const ref = charge.productOfferingPrice;
      const key = ref?.id ?? `charge-${index}`;
      const catalogPlan = ref?.id ? metadata.get(ref.id) : null;
      if (!plans.has(key)) {
        plans.set(key, {
          key,
          name: ref?.name || catalogPlan?.name || charge.name || ref?.id || '',
          description: getVisibleOfferDescription(catalogPlan?.description),
          metadataUnavailable: !!ref?.id && !catalogPlan,
          charges: []
        });
      }
      plans.get(key)!.charges.push(charge);
    });
    return { prod, offering, specification, plans: [...plans.values()], metadataIncomplete };
  }

  private enrichCharacteristics(selected: any[], specification: any): any[] {
    return selected.map(characteristic => {
      const definitions: any[] = specification.productSpecCharacteristic ?? [];
      const definition = definitions.find(item => characteristic.id && item.id === characteristic.id)
        ?? definitions.find(item => item.name === characteristic.name);
      const values: any[] = definition?.productSpecCharacteristicValue ?? [];
      const match = values.find(item => item.value === characteristic.value);
      const units = [...new Set(values.map(item => item.unitOfMeasure).filter(Boolean))];
      return {
        ...characteristic,
        name: characteristic.name || definition?.name || characteristic.id,
        unitOfMeasure: characteristic.unitOfMeasure ?? match?.unitOfMeasure ?? (units.length === 1 ? units[0] : undefined)
      };
    });
  }

  characteristicValue(characteristic: any): string {
    if (characteristic.value !== undefined && characteristic.value !== null) {
      return typeof characteristic.value === 'object' ? JSON.stringify(characteristic.value) : String(characteristic.value);
    }
    return [characteristic.valueFrom, characteristic.valueTo].filter(value => value != null).join(' – ') || '—';
  }

  recordedAmount(charge: any): { value: number; unit?: string } | null {
    const amount = charge.price?.taxIncludedAmount ?? charge.price?.dutyFreeAmount ?? charge.price;
    if (amount?.value === undefined || amount.value === null || amount.value === '') return null;
    const value = Number(amount.value);
    return Number.isFinite(value) ? { value, unit: amount.unit } : null;
  }

  tabClass(tab: InventoryTab): string {
    return this.activeTab === tab
      ? 'bg-offerings-dashed-border text-secondary-500 dark:bg-secondary-200 dark:text-offerings-on-dark font-semibold'
      : 'text-secondary-500 dark:text-offerings-on-dark-body font-semibold hover:bg-secondary-50 dark:hover:bg-secondary-300';
  }

  getProductImage(): string {
    return (this.images.find(image => image.name === 'Profile Picture') ?? this.images[0])?.url || 'https://placehold.co/600x400/svg';
  }

  openRelatedDetails(kind: 'services' | 'resources', id: string) {
    return this.router.navigate(['/product-inventory', kind, id], {
      queryParams: {
        productId: this.id,
        view: this.route.snapshot.queryParamMap.get('view')
      }
    });
  }
}
