import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { BehaviorSubject, of } from 'rxjs';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { InventoryDetailComponent } from './inventory-detail.component';

describe('InventoryDetailComponent', () => {
  let inventory: jasmine.SpyObj<ProductInventoryServiceService>;
  let catalog: jasmine.SpyObj<ApiServiceService>;

  beforeEach(() => {
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
