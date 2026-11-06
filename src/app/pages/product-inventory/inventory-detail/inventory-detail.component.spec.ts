import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { AssetType } from 'src/app/models/asset-type.model';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { InventoryDetailComponent } from './inventory-detail.component';

describe('InventoryDetailComponent', () => {
  let inventory: jasmine.SpyObj<ProductInventoryServiceService>;
  let catalog: jasmine.SpyObj<ApiServiceService>;

  let serviceSpecs: jasmine.SpyObj<ServiceSpecServiceService>;
  let resourceSpecs: jasmine.SpyObj<ResourceSpecServiceService>;
  let attachments: jasmine.SpyObj<AttachmentServiceService>;
  const plugin: AssetType = {
    id: 'plugin-id', href: '/charging/api/assetManagement/assetTypes/plugin-id', categoryId: 'plugin-category', name: 'Example plugin', author: 'Provider',
    version: '1', mediaTypes: [], requiresFile: true, overrides: [],
    form: { enabled: { type: 'checkbox', label: 'Plugin enabled' }, region: { type: 'text', label: 'Region' } }
  };

  beforeEach(() => {
    serviceSpecs = jasmine.createSpyObj('serviceSpecs', ['getAssetTypes']);
    resourceSpecs = jasmine.createSpyObj('resourceSpecs', ['getAssetTypes']);
    serviceSpecs.getAssetTypes.and.returnValue(of([plugin]));
    resourceSpecs.getAssetTypes.and.returnValue(of([plugin]));
    attachments = jasmine.createSpyObj('attachments', ['getFileInfo', 'downloadManagedFile']);
    attachments.getFileInfo.and.returnValue(of({
      id: 'private-file', contentType: 'application/pdf',
      location: 'http://proxy.docker:8004/charging/media/assets/document.pdf'
    }));
    attachments.downloadManagedFile.and.returnValue(of(new Blob(['pdf'])));
    inventory = jasmine.createSpyObj('inventory', ['getService', 'getResource']);
    catalog = jasmine.createSpyObj('catalog', ['getServiceSpec', 'getResourceSpec']);
    inventory.getService.and.resolveTo({ id: 'instance-id', name: 'Owned service' });
    inventory.getResource.and.resolveTo({ id: 'instance-id', name: 'Owned resource' });
    catalog.getServiceSpec.and.resolveTo({ id: 'spec-id', name: 'Service specification' });
    catalog.getResourceSpec.and.resolveTo({ id: 'spec-id', name: 'Resource specification' });
  });

  function create(kind: 'services' | 'resources', source?: string) {
    const params = new BehaviorSubject(convertToParamMap({ id: 'instance-id' }));
    TestBed.configureTestingModule({
      imports: [InventoryDetailComponent, TranslateModule.forRoot(), MarkdownModule.forRoot()],
      providers: [
        { provide: ServiceSpecServiceService, useValue: serviceSpecs },
        { provide: ResourceSpecServiceService, useValue: resourceSpecs },
        { provide: AttachmentServiceService, useValue: attachments },
        { provide: ProductInventoryServiceService, useValue: inventory },
        { provide: ApiServiceService, useValue: catalog },
        { provide: ActivatedRoute, useValue: {
          paramMap: params,
          data: of({ inventoryKind: kind }),
          queryParamMap: of(convertToParamMap(source ? { source } : {}))
        } }
      ]
    });
    const fixture = TestBed.createComponent(InventoryDetailComponent);
    fixture.detectChanges();
    return { fixture, params };
  }

  for (const kind of ['services', 'resources'] as const) {
    it(`loads ${kind} directly by inventory ID without relying on table data`, async () => {
      const { fixture } = create(kind);
      await fixture.whenStable();
      fixture.detectChanges();
      const request = kind === 'services' ? inventory.getService : inventory.getResource;
      expect(request).toHaveBeenCalledOnceWith('instance-id');
      expect(catalog.getServiceSpec).not.toHaveBeenCalled();
      expect(catalog.getResourceSpec).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Owned');
      expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    });

    it(`loads catalog data only for related ${kind} specification links`, async () => {
      const { fixture } = create(kind, 'specification');
      await fixture.whenStable();
      const request = kind === 'services' ? catalog.getServiceSpec : catalog.getResourceSpec;
      expect(request).toHaveBeenCalledOnceWith('instance-id');
      expect(inventory.getService).not.toHaveBeenCalled();
      expect(inventory.getResource).not.toHaveBeenCalled();
    });
  }

  it('shows an error when a directly opened inventory item cannot be loaded', async () => {
    inventory.getService.and.rejectWith(new Error('Not found'));
    const { fixture } = create('services');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.componentInstance.loading).toBeFalse();
  });

  it('ignores a late response after navigating to another item', async () => {
    let resolveFirst!: (value: any) => void;
    inventory.getService.and.returnValue(new Promise(resolve => { resolveFirst = resolve; }));
    const { fixture, params } = create('services');
    inventory.getService.and.resolveTo({ id: 'second-id', name: 'Second' });
    params.next(convertToParamMap({ id: 'second-id' }));
    await fixture.whenStable();
    resolveFirst({ id: 'first-id', name: 'First' });
    await fixture.whenStable();
    expect(fixture.componentInstance.entity.id).toBe('second-id');
  });
  for (const kind of ['services', 'resources'] as const) {
    it(`shows the recorded ${kind} characteristics in product-style tabs`, async () => {
      const request = kind === 'services' ? inventory.getService : inventory.getResource;
      const field = kind === 'services' ? 'serviceCharacteristic' : 'resourceCharacteristic';
      request.and.resolveTo({ id: 'instance-id', name: 'Owned item', [field]: [
        { name: 'Capacity', value: 0, unitOfMeasure: 'GB' },
        { name: 'Enabled', value: false },
        { name: 'Range', valueFrom: 0, valueTo: 10 }
      ] });
      const { fixture } = create(kind);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.activeTab).toBe('overview');
      expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityFile"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityOverview"]')).not.toBeNull();
      fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-characteristics"]').click();
      fixture.detectChanges();
      const cards = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[data-cy="inventoryEntityCharacteristic"]'));
      expect(cards.length).toBe(3);
      expect(cards[0].textContent).toContain('0 GB');
      expect(cards[1].textContent).toContain('false');
      expect(cards[2].textContent).toContain('0 – 10');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it(`shows the ${kind} status badge and an empty characteristics state`, async () => {
      const request = kind === 'services' ? inventory.getService : inventory.getResource;
      request.and.resolveTo({ id: 'instance-id', name: 'Owned item', state: kind === 'services' ? 'active' : undefined, resourceStatus: kind === 'resources' ? 'available' : undefined });
      const { fixture } = create(kind);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityStatus"]').textContent).toContain(kind === 'services' ? '_active' : '_available');
      fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-characteristics"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('PRODUCT_DETAILS._no_chars');
    });
  }

  for (const kind of ['services', 'resources'] as const) {
    for (const specification of [false, true]) {
      it(`separates plugin metadata and options for ${kind} ${specification ? 'specifications' : 'instances'} and downloads private files`, async () => {
        const request = specification
          ? (kind === 'services' ? catalog.getServiceSpec : catalog.getResourceSpec)
          : (kind === 'services' ? inventory.getService : inventory.getResource);
        const field = specification
          ? (kind === 'services' ? 'specCharacteristic' : 'resourceSpecCharacteristic')
          : (kind === 'services' ? 'serviceCharacteristic' : 'resourceCharacteristic');
        const valueField = kind === 'services' ? 'characteristicValueSpecification' : 'resourceSpecCharacteristicValue';
        const characteristic = (name: string, value: any) => specification
          ? { name, [valueField]: [{ value }] } : { name, value };
        request.and.resolveTo({ id: 'instance-id', [field]: [
          characteristic(kind === 'services' ? 'Service Type' : 'Resource type', plugin.categoryId),
          characteristic('File', 'private-file'), characteristic('enabled', false),
          characteristic('region', 'eu'), characteristic('Capacity', 0)
        ] });
        const { fixture } = create(kind, specification ? 'specification' : undefined);
        await fixture.whenStable();
        fixture.detectChanges();
        const typeService = kind === 'services' ? serviceSpecs : resourceSpecs;
        expect(typeService.getAssetTypes).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.activeTab).toBe('overview');
        const mainFile = fixture.nativeElement.querySelector('[data-cy="inventoryEntityFile"]');
        expect(mainFile.textContent).toContain('document.pdf');
        expect(mainFile.closest('[data-cy="inventoryEntityOverview"]')).toBeNull();
        fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-plugin"]').click();
        fixture.detectChanges();
        const panel = fixture.nativeElement.querySelector('[data-cy="inventoryEntityPlugin"]');
        expect(panel.textContent).toContain('Example plugin');
        expect(panel.textContent).toContain('Plugin enabled');
        expect(panel.textContent).toContain('false');
        expect(panel.textContent).toContain('eu');
        expect(panel.textContent).not.toContain('Capacity');
        expect(panel.querySelector('app-managed-file')).toBeNull();
        expect(panel.textContent).not.toContain('File');
        expect(panel.textContent).not.toContain('private-file');
        spyOn(URL, 'createObjectURL').and.returnValue('blob:private-file');
        const revoke = spyOn(URL, 'revokeObjectURL');
        const click = spyOn(HTMLAnchorElement.prototype, 'click');
        mainFile.querySelector('app-managed-file button').click();
        expect(attachments.downloadManagedFile).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalled();
        fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-characteristics"]').click();
        fixture.detectChanges();
        const options = fixture.nativeElement.querySelector('[data-cy="inventoryEntityCharacteristics"]');
        expect(options.textContent).toContain('Capacity');
        expect(options.textContent).toContain('0');
        expect(options.textContent).not.toContain('Plugin enabled');
        expect(options.querySelectorAll('[data-cy="inventoryEntityCharacteristic"]').length).toBe(1);
        expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityFile"]')).toBe(mainFile);
        expect(attachments.getFileInfo).toHaveBeenCalledTimes(1);
        expect(revoke).not.toHaveBeenCalled();
        fixture.destroy();
        expect(revoke).toHaveBeenCalledWith('blob:private-file');
      });
    }

    it(`keeps ${kind} characteristics accessible but hides plugin controls until a failed definition lookup is retried`, async () => {
      const request = kind === 'services' ? inventory.getService : inventory.getResource;
      const typeService = kind === 'services' ? serviceSpecs : resourceSpecs;
      const field = kind === 'services' ? 'serviceCharacteristic' : 'resourceCharacteristic';
      request.and.resolveTo({ id: 'instance-id', [field]: [
        { name: kind === 'services' ? 'Service type' : 'Resource type', value: plugin.categoryId },
        { name: 'File', value: 'private-file' }, { name: 'enabled', value: false }
      ] });
      typeService.getAssetTypes.and.returnValue(throwError(() => new Error('Unavailable')));
      const { fixture } = create(kind);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.error).toBeFalse();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(fixture.componentInstance.characteristics.map(c => c.name)).toContain('enabled');
      expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-plugin"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-managed-file')).toBeNull();
      expect(attachments.getFileInfo).not.toHaveBeenCalled();
      typeService.getAssetTypes.and.returnValue(of([plugin]));
      fixture.nativeElement.querySelector('[role="alert"] button').click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.pluginMetadataError).toBeFalse();
      expect(fixture.componentInstance.pluginCharacteristics.map(c => c.name)).toContain('enabled');
      expect(fixture.componentInstance.characteristics.length).toBe(0);
      expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-plugin"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityFile"] button')).not.toBeNull();
    });
  }

  for (const kind of ['services', 'resources'] as const) {
    for (const typeValue of [undefined, '', 'ordinary-category']) {
      it(`hides plugin and download controls for ${kind} without an associated plugin (type=${typeValue})`, async () => {
        const request = kind === 'services' ? inventory.getService : inventory.getResource;
        const field = kind === 'services' ? 'serviceCharacteristic' : 'resourceCharacteristic';
        const characteristics = [
          { name: 'File', value: 'private-file' }, { name: 'Capacity', value: 10 },
          ...(typeValue === undefined ? [] : [{ name: kind === 'services' ? 'Service type' : 'Resource type', value: typeValue }])
        ];
        request.and.resolveTo({ id: 'instance-id', [field]: characteristics });
        const { fixture } = create(kind);
        await fixture.whenStable();
        fixture.detectChanges();
        expect(fixture.componentInstance.isPlugin).toBeFalse();
        expect(fixture.componentInstance.pluginMetadataError).toBeFalse();
        expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-plugin"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityFile"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('app-managed-file')).toBeNull();
        expect(attachments.getFileInfo).not.toHaveBeenCalled();
        expect(attachments.downloadManagedFile).not.toHaveBeenCalled();
        fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-characteristics"]').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('[data-cy="inventoryEntityCharacteristic"]').length).toBe(characteristics.length);
      });
    }

    it(`shows the plugin tab without a download for ${kind} with a plugin but no file`, async () => {
      const request = kind === 'services' ? inventory.getService : inventory.getResource;
      const field = kind === 'services' ? 'serviceCharacteristic' : 'resourceCharacteristic';
      request.and.resolveTo({ id: 'instance-id', [field]: [
        { name: kind === 'services' ? 'Service type' : 'Resource type', value: plugin.categoryId }
      ] });
      const { fixture } = create(kind);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-cy="inventoryEntityTab-plugin"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-managed-file')).toBeNull();
      expect(attachments.getFileInfo).not.toHaveBeenCalled();
    });
  }

  it('cancels a pending plugin definition when navigating to a different item', async () => {
    const pending = new Subject<AssetType[]>();
    serviceSpecs.getAssetTypes.and.returnValue(pending);
    inventory.getService.and.resolveTo({ id: 'first', serviceCharacteristic: [{ name: 'Service type', value: plugin.categoryId }] });
    const { fixture, params } = create('services');
    await fixture.whenStable();
    inventory.getService.and.resolveTo({ id: 'second' });
    params.next(convertToParamMap({ id: 'second' }));
    await fixture.whenStable();
    pending.next([plugin]);
    expect(fixture.componentInstance.entity.id).toBe('second');
    expect(fixture.componentInstance.pluginType).toBeUndefined();
    expect(fixture.componentInstance.isPlugin).toBeFalse();
  });

  it('resets to Overview when another item opens and keeps the header as the back control', async () => {
    const { fixture, params } = create('services');
    await fixture.whenStable();
    fixture.componentInstance.activeTab = 'characteristics';
    fixture.ngZone!.run(() => params.next(convertToParamMap({ id: 'second-id' })));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab).toBe('overview');
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('uses the shared offer description and attachment renderer in Overview', async () => {
    inventory.getService.and.resolveTo({ id: 'instance-id', name: 'Owned service', description: 'Service description', attachment: [{ id: 'manual', name: 'Service manual', url: '/service.pdf' }] });
    const { fixture } = create('services');
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-offer-description').textContent).toContain('Service description');
    const open = spyOn(window, 'open');
    fixture.nativeElement.querySelector('[data-cy="offerAttachmentDownload"]').click();
    expect(open).toHaveBeenCalledOnceWith('/service.pdf', '_blank', 'noopener,noreferrer');
  });
});
