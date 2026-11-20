import { ManagedFileComponent } from 'src/app/shared/managed-file/managed-file.component';
import { AssetType } from 'src/app/models/asset-type.model';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { OfferDescriptionComponent } from 'src/app/shared/offer-description/offer-description.component';
import { splitOfferAttachments } from 'src/app/shared/offer-description/offer-description.util';
import { getVisibleOfferDescription } from 'src/app/shared/card/offer-card-text.util';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { catchError, combineLatest, from, map, of, Subject, startWith, switchMap } from 'rxjs';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, MarkdownModule, OfferDescriptionComponent, ManagedFileComponent],
  templateUrl: './inventory-detail.component.html',
  styleUrl: './inventory-detail.component.css'
})
export class InventoryDetailComponent implements OnInit {
  kind: 'services' | 'resources' = 'services';
  entity: any;
  loading = true;
  error = false;
  activeTab: 'overview' | 'characteristics' | 'plugin' = 'overview';
  descriptionExpanded = false;
  attachments: any[] = [];
  pluginType?: AssetType;
  pluginMetadataError = false;
  private reload = new Subject<void>();
  readonly visibleDescription = getVisibleOfferDescription;

  constructor(
    private route: ActivatedRoute,
    private inventory: ProductInventoryServiceService,
    private catalog: ApiServiceService,
    private serviceSpecs: ServiceSpecServiceService,
    private resourceSpecs: ResourceSpecServiceService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit() {
    combineLatest([this.route.paramMap, this.route.data, this.route.queryParamMap, this.reload.pipe(startWith(undefined))]).pipe(
      switchMap(([params, data, query]) => {
        this.kind = data['inventoryKind'];
        this.loading = true;
        this.error = false;
        this.entity = undefined;
        this.pluginType = undefined;
        this.pluginMetadataError = false;
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
        }), switchMap(entity => {
          const typeValue = this.rawValue(this.entityCharacteristics(entity).find(c => this.isTypeCharacteristic(c)));
          if (!typeValue) return of({ entity, pluginType: undefined, pluginMetadataError: false });
          const types = this.kind === 'services' ? this.serviceSpecs.getAssetTypes() : this.resourceSpecs.getAssetTypes();
          return types.pipe(
            map(types => {
              const pluginType = types.find(type => !!type.categoryId && type.categoryId === typeValue);
              return { entity, pluginType, pluginMetadataError: false };
            }),
            catchError(() => of({ entity, pluginType: undefined, pluginMetadataError: true }))
          );
        }));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ entity, pluginType, pluginMetadataError }) => {
      this.entity = entity;
      this.pluginType = pluginType;
      this.pluginMetadataError = pluginMetadataError;
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
    if (this.isPlugin) return 'PRODUCT_INVENTORY._configuration_options';
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

  tabClass(tab: 'overview' | 'characteristics' | 'plugin'): string {
    return this.activeTab === tab
      ? 'bg-offerings-dashed-border text-secondary-500 dark:bg-secondary-200 dark:text-offerings-on-dark font-semibold'
      : 'text-secondary-500 dark:text-offerings-on-dark-body font-semibold hover:bg-secondary-50 dark:hover:bg-secondary-300';
  }

  private entityCharacteristics(entity: any): any[] {
    return entity?.serviceCharacteristic ?? entity?.resourceCharacteristic
      ?? entity?.specCharacteristic ?? entity?.serviceSpecCharacteristic ?? entity?.resourceSpecCharacteristic ?? [];
  }

  private isTypeCharacteristic(characteristic: any): boolean {
    return characteristic?.name?.toLowerCase() === (this.kind === 'services' ? 'service type' : 'resource type');
  }

  private rawValue(characteristic: any): any {
    return characteristic?.value ?? this.specificationValues(characteristic)?.[0]?.value;
  }

  private specificationValues(characteristic: any): any[] | undefined {
    return characteristic?.characteristicValueSpecification ?? characteristic?.serviceSpecCharacteristicValue
      ?? characteristic?.resourceSpecCharacteristicValue;
  }

  get isPlugin(): boolean {
    return !!this.pluginType;
  }

  private isPluginCharacteristic(characteristic: any): boolean {
    const name = characteristic.name?.toLowerCase();
    return this.isTypeCharacteristic(characteristic) || name === 'file'
      || Object.keys(this.pluginType?.form || {}).some(key => key.toLowerCase() === name);
  }

  get pluginCharacteristics(): any[] {
    return this.entityCharacteristics(this.entity).filter(c => this.isPluginCharacteristic(c) && c.name?.toLowerCase() !== 'file');
  }

  get characteristics(): any[] {
    const characteristics = this.entityCharacteristics(this.entity);
    return this.isPlugin ? characteristics.filter(c => !this.isPluginCharacteristic(c)) : characteristics;
  }

  get displayedCharacteristics(): any[] {
    return this.activeTab === 'plugin' ? this.pluginCharacteristics : this.characteristics;
  }

  get pluginFileId(): string {
    const file = this.entityCharacteristics(this.entity).find(c => c.name?.toLowerCase() === 'file');
    const value = this.rawValue(file);
    return this.isPlugin && typeof value === 'string' ? value : '';
  }

  characteristicLabel(characteristic: any): string {
    const key = Object.keys(this.pluginType?.form || {}).find(key => key.toLowerCase() === characteristic.name?.toLowerCase());
    return (key && this.pluginType?.form?.[key]?.label) || characteristic.name;
  }

  retryPluginMetadata(): void {
    this.reload.next();
  }

  characteristicValue(characteristic: any): string {
    if (this.isTypeCharacteristic(characteristic) && this.pluginType) return this.pluginType.name;
    const values = this.specificationValues(characteristic);
    if (values?.length) return values.map(value => this.characteristicValue({ ...value, name: characteristic.name })).join(', ');
    const value = characteristic.value;
    if (value !== undefined && value !== null) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return [characteristic.valueFrom, characteristic.valueTo].filter(value => value != null).join(' – ') || '—';
  }
}
