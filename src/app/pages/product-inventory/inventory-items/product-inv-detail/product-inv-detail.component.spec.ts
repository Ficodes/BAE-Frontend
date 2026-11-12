import { OfferDescriptionComponent } from 'src/app/shared/offer-description/offer-description.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownModule } from 'ngx-markdown';
import { BehaviorSubject } from 'rxjs';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductInvDetailComponent } from './product-inv-detail.component';

describe('ProductInvDetailComponent', () => {
  let fixture: ComponentFixture<ProductInvDetailComponent>;
  let component: ProductInvDetailComponent;
  let inventory: jasmine.SpyObj<ProductInventoryServiceService>;
  let catalog: jasmine.SpyObj<ApiServiceService>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let product: any;

  beforeEach(async () => {
    product = {
      id: 'owned-product', name: 'My configured product', status: 'active', startDate: '2026-01-01T00:00:00Z',
      productOffering: { id: 'offering' }, productSpecification: { id: 'spec' },
      productCharacteristic: [{ name: 'Capacity', value: 0 }, { name: 'Feature', value: false }],
      productPrice: [{ name: 'Monthly charge', priceType: 'recurring', recurringChargePeriod: 'month',
        productOfferingPrice: { id: 'selected-plan' }, price: { taxIncludedAmount: { value: 12.5, unit: 'EUR' } } }],
      realizingService: [{ id: 'owned-service', name: 'Provisioned service' }],
      realizingResource: [{ id: 'owned-resource', name: 'Provisioned resource' }]
    };
    inventory = jasmine.createSpyObj('inventory', ['getProduct']);
    inventory.getProduct.and.callFake(async () => product);
    catalog = jasmine.createSpyObj('catalog', ['getProductById', 'getProductSpecification', 'getOfferingPrice', 'getServiceSpec', 'getResourceSpec']);
    catalog.getProductById.and.resolveTo({ id: 'offering', name: 'Current catalog name', productOfferingPrice: [{ id: 'unselected-plan' }] });
    catalog.getProductSpecification.and.resolveTo({
      id: 'spec', description: 'Product description',
      productSpecCharacteristic: [
        { name: 'Capacity', productSpecCharacteristicValue: [{ value: 100, isDefault: true, unitOfMeasure: 'GB' }] },
        { name: 'Unselected default', productSpecCharacteristicValue: [{ value: 'Do not show', isDefault: true }] }
      ],
      serviceSpecification: [{ id: 'service-spec' }], resourceSpecification: [{ id: 'resource-spec' }],
      attachment: [{ name: 'Profile Picture', attachmentType: 'Picture', url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }, { name: 'Manual', url: '/manual.pdf' }]
    });
    catalog.getOfferingPrice.and.resolveTo({ id: 'selected-plan', name: 'Selected plan', description: 'Selected plan description', price: { value: 9999, unit: 'EUR' } });
    catalog.getServiceSpec.and.resolveTo({ id: 'service-spec', name: 'Service specification' });
    catalog.getResourceSpec.and.resolveTo({ id: 'resource-spec', name: 'Resource specification' });
    params = new BehaviorSubject(convertToParamMap({ id: 'owned-product' }));
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, TranslateModule.forRoot(), MarkdownModule.forRoot(), OfferDescriptionComponent],
      declarations: [ProductInvDetailComponent],
      providers: [
        { provide: ProductInventoryServiceService, useValue: inventory },
        { provide: ApiServiceService, useValue: catalog },
        { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { queryParamMap: convertToParamMap({ view: 'list' }) } } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ProductInvDetailComponent);
    component = fixture.componentInstance;
  });

  async function load() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function tab(id: string) {
    (fixture.nativeElement.querySelector(`[data-cy="inventoryTab-${id}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('opens on Overview with the offer name, inventory status and ID and no purchase actions or breadcrumb', async () => {
    await load();
    expect(component.activeTab).toBe('overview');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Current catalog name');
    expect(fixture.nativeElement.querySelector('[data-cy="inventoryOverview"]').textContent).toContain('My configured product');
    expect(fixture.nativeElement.textContent).toContain('owned-product');
    expect(fixture.nativeElement.querySelector('[data-cy="inventoryProductStatus"]').textContent).toContain('_active');
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="addToCart"]')).toBeNull();
  });

  it('shows only selected characteristics, preserving zero, false and ranges without mutating saved values', async () => {
    product.productCharacteristic.push({ name: 'Range', valueFrom: 0, valueTo: 10 });
    await load();
    tab('pricing');
    const values = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('[data-cy="selectedCharacteristic"]'));
    expect(values.length).toBe(3);
    expect(values[0].textContent).toContain('0 GB');
    expect(values[1].textContent).toContain('false');
    expect(values[2].textContent).toContain('0 – 10');
    expect(fixture.nativeElement.textContent).not.toContain('Unselected default');
    expect(product.productCharacteristic[0]).toEqual({ name: 'Capacity', value: 0 });
  });

  it('loads only the selected plan and uses the recorded charge rather than its current catalog price', async () => {
    await load();
    tab('pricing');
    expect(catalog.getOfferingPrice).toHaveBeenCalledOnceWith('selected-plan');
    expect(fixture.nativeElement.textContent).toContain('Selected plan');
    expect(fixture.nativeElement.textContent).toContain('12.50');
    expect(fixture.nativeElement.textContent).not.toContain('9999');
    expect(component.recordedAmount(product.productPrice[0])).toEqual({ value: 12.5, unit: 'EUR' });
  });

  it('shows every selected plan and charge, resolving repeated plan references only once', async () => {
    product.productPrice.push(
      { name: 'Setup', productOfferingPrice: { id: 'selected-plan' }, price: { dutyFreeAmount: { value: 0, unit: 'EUR' } } },
      { name: 'Extra plan charge', productOfferingPrice: { id: 'second-plan', name: 'Saved second plan' } }
    );
    await load();
    tab('pricing');
    expect(catalog.getOfferingPrice).toHaveBeenCalledTimes(2);
    expect(component.selectedPlans.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-cy="recordedCharge"]').length).toBe(3);
    expect(component.recordedAmount(product.productPrice[1])).toEqual({ value: 0, unit: 'EUR' });
    expect(component.recordedAmount(product.productPrice[2])).toBeNull();
  });

  it('shows Free when no selected plan is recorded', async () => {
    delete product.productPrice;
    await load();
    tab('pricing');
    expect(component.selectedPlans).toEqual([]);
    expect(catalog.getOfferingPrice).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-cy="inventoryFreePlan"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('SHOPPING_CART._free');
  });

  it('retains saved configuration and pricing when catalog metadata is unavailable', async () => {
    catalog.getProductById.and.rejectWith(new Error('Not found'));
    catalog.getProductSpecification.and.rejectWith(new Error('Not found'));
    catalog.getOfferingPrice.and.rejectWith(new Error('Not found'));
    await load();
    expect(component.error).toBeFalse();
    expect(component.metadataIncomplete).toBeTrue();
    expect(component.selectedCharacteristics[0].value).toBe(0);
    expect(component.selectedPlans[0].charges[0].price.taxIncludedAmount.value).toBe(12.5);
    tab('pricing');
    expect(fixture.nativeElement.textContent).toContain('12.50');
  });

  it('shows and opens only provisioned services and resources', async () => {
    await load();
    tab('related');
    expect(fixture.nativeElement.textContent).toContain('Provisioned service');
    expect(fixture.nativeElement.textContent).toContain('Provisioned resource');
    expect(fixture.nativeElement.textContent).not.toContain('Service specification');
    expect(fixture.nativeElement.textContent).not.toContain('Resource specification');
    expect(catalog.getServiceSpec).not.toHaveBeenCalled();
    expect(catalog.getResourceSpec).not.toHaveBeenCalled();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.openRelatedDetails('services', 'owned-service');
    expect(navigate).toHaveBeenCalledWith(['/product-inventory', 'services', 'owned-service'], {
      queryParams: { productId: 'owned-product', view: 'list' }
    });
    component.openRelatedDetails('resources', 'owned-resource');
    expect(navigate).toHaveBeenCalledWith(['/product-inventory', 'resources', 'owned-resource'], {
      queryParams: { productId: 'owned-product', view: 'list' }
    });
  });

  it('shows attachments through the offer renderer in Overview, without a Documents tab', async () => {
    await load();
    expect(component.getProductImage()).toContain('data:image/gif');
    expect(component.attachments.length).toBe(1);
    expect(fixture.nativeElement.querySelector('app-offer-description [data-cy="offerAttachmentDownload"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="inventoryTab-documents"]')).toBeNull();
    const open = spyOn(window, 'open');
    fixture.nativeElement.querySelector('[data-cy="offerAttachmentDownload"]').click();
    expect(open).toHaveBeenCalledOnceWith('/manual.pdf', '_blank', 'noopener,noreferrer');
  });

  it('shows a recoverable page error when the inventory product cannot be loaded', async () => {
    inventory.getProduct.and.rejectWith(new Error('Not found'));
    await load();
    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('resets to the first tab when another inventory product opens on the same route', async () => {
    await load();
    tab('pricing');
    product = { ...product, id: 'second-product', name: 'Another owned product' };
    fixture.ngZone!.run(() => params.next(convertToParamMap({ id: 'second-product' })));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.activeTab).toBe('overview');
    expect(component.prod.id).toBe('second-product');
  });
  it('shows Free in Overview and Pricing for an empty price plan array', async () => {
    product.productPrice = [];
    await load();
    expect(fixture.nativeElement.querySelector('[data-cy="inventoryOverview"]').textContent).toContain('SHOPPING_CART._free');
    tab('pricing');
    expect(fixture.nativeElement.querySelector('[data-cy="inventoryFreePlan"] h3').textContent).toContain('SHOPPING_CART._free');
    expect(catalog.getOfferingPrice).not.toHaveBeenCalled();
  });
  it('keeps the selected plan and configuration in the same Pricing tab', async () => {
    await load();
    tab('pricing');
    expect(fixture.nativeElement.querySelector('[data-cy="selectedPricePlan"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy="selectedCharacteristic"]')).not.toBeNull();
    expect(component.tabs.map(item => item.id)).toEqual(['overview', 'pricing', 'related']);
  });

  it('keeps the offer description in the hero when inventory has a different description', async () => {
    product.description = 'Inventory-specific description';
    catalog.getProductById.and.resolveTo({ id: 'offering', name: 'Offer name', description: 'Full offer description' });
    await load();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Offer name');
    expect(fixture.nativeElement.querySelector('markdown').textContent).toContain('Full offer description');
  });

  it('renders the same structured description sections and FAQ behaviour as the public offer', async () => {
    catalog.getProductSpecification.and.resolveTo({
      description: 'Overview text<!--dome:details:start-->' +
        '<section data-dome-section="how-it-works" data-text="How it works text"></section>' +
        '<section data-dome-section="key-features"><ul><li data-name="Feature title" data-desc="Feature body"></li></ul></section>' +
        '<section data-dome-section="business-benefits"><ul><li data-name="Benefit title" data-desc="Benefit body"></li></ul></section>' +
        '<section data-dome-section="use-cases"><ul><li data-name="Use case title" data-desc="Use case body"></li></ul></section>' +
        '<section data-dome-section="faqs"><ul><li data-q="A question" data-a="An answer"></li></ul></section><!--dome:details:end-->'
    });
    await load();
    const renderer = fixture.nativeElement.querySelector('app-offer-description');
    for (const text of ['Overview text', 'How it works text', 'Feature title', 'Benefit title', 'Use case title', 'A question']) {
      expect(renderer.textContent).toContain(text);
    }
    renderer.querySelector('.faq-question').click();
    fixture.detectChanges();
    expect(renderer.querySelector('.faq-question').getAttribute('aria-expanded')).toBe('true');
    expect(renderer.querySelector('.faq-answer--open').textContent).toContain('An answer');
  });
});
