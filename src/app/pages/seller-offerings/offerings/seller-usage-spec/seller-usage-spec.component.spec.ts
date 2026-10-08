import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { UsageServiceService } from 'src/app/services/usage-service.service';

import { SellerUsageSpecComponent } from './seller-usage-spec.component';

describe('SellerUsageSpecComponent', () => {
  let component: SellerUsageSpecComponent;
  let fixture: ComponentFixture<SellerUsageSpecComponent>;
  let eventMessage: EventMessageService;
  let usageService: jasmine.SpyObj<UsageServiceService>;
  let paginationService: jasmine.SpyObj<PaginationService>;
  let api: jasmine.SpyObj<ApiServiceService>;

  async function flushPromises(times = 6): Promise<void> {
    for (let i = 0; i < times; i++) {
      await Promise.resolve();
    }
  }

  function providerStatsFixture(usageSpecification: any) {
    const empty = { Active: 0, Launched: 0, Retired: 0, Obsolete: 0 };
    return {
      productOffering: { ...empty },
      catalog: { ...empty },
      productSpecification: { ...empty },
      serviceSpecification: { ...empty },
      resourceSpecification: { ...empty },
      usageSpecification: { ...empty, ...usageSpecification }
    };
  }

  beforeEach(async () => {
    usageService = jasmine.createSpyObj('UsageServiceService', ['getUsageSpecs', 'updateUsageSpec']);
    paginationService = jasmine.createSpyObj('PaginationService', ['getItemsPaginated']);
    api = jasmine.createSpyObj('ApiServiceService', [
      'getOfferingPricesByUsageSpecId',
      'getOfferingPricesByBundledPopRelationshipId',
      'getProductOfferingsByPricePlanId'
    ]);

    await TestBed.configureTestingModule({
      declarations: [SellerUsageSpecComponent],
      imports: [TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        EventMessageService,
        { provide: UsageServiceService, useValue: usageService },
        { provide: PaginationService, useValue: paginationService },
        { provide: ApiServiceService, useValue: api },
        {
          provide: LocalStorageService,
          useValue: {
            getObject: () => ({
              id: 'user-1',
              logged_as: 'user-1',
              partyId: 'party-1',
              expire: Math.floor(Date.now() / 1000) + 3600
            })
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellerUsageSpecComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);

    paginationService.getItemsPaginated.and.resolveTo({
      page_check: false,
      items: [],
      nextItems: [],
      page: 6
    });
    usageService.getUsageSpecs.and.resolveTo([]);
    api.getOfferingPricesByUsageSpecId.and.resolveTo([]);
    api.getOfferingPricesByBundledPopRelationshipId.and.resolveTo([]);
    api.getProductOfferingsByPricePlanId.and.resolveTo([]);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should move counters locally and refresh only the current tab after validation succeeds', () => {
    const usageSpec = { id: 'usage-1', lifecycleStatus: 'Active' };
    usageService.updateUsageSpec.and.returnValue(of({}) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    const transitionSpy = spyOn(eventMessage, 'emitProviderStatsTransition').and.callThrough();
    const loadCountsSpy = spyOn(component, 'loadStatusCounts');
    const getUsageSpecsSpy = spyOn(component, 'getUsageSpecs').and.resolveTo(undefined);
    eventMessage.emitProviderStatsLoaded(providerStatsFixture({ Active: 2, Launched: 1 }));

    component.validateUsageSpec(usageSpec);

    expect(usageService.updateUsageSpec).toHaveBeenCalledOnceWith({ lifecycleStatus: 'Launched' }, 'usage-1');
    expect(component.statusCounts).toEqual({ Draft: 1, Validated: 2, Deleted: 0 });
    expect(transitionSpy).toHaveBeenCalledOnceWith({
      entity: 'usageSpecification',
      previousLifecycleStatus: 'Active',
      nextLifecycleStatus: 'Launched'
    });
    expect(getUsageSpecsSpy).toHaveBeenCalledOnceWith(false);
    expect(loadCountsSpy).not.toHaveBeenCalled();
  });

  it('should move counters locally and refresh only the current tab after deleting a validated usage spec succeeds', async () => {
    const usageSpec = { id: 'usage-2', lifecycleStatus: 'Launched' };
    usageService.updateUsageSpec.and.returnValue(of({}) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    const transitionSpy = spyOn(eventMessage, 'emitProviderStatsTransition').and.callThrough();
    const loadCountsSpy = spyOn(component, 'loadStatusCounts');
    const getUsageSpecsSpy = spyOn(component, 'getUsageSpecs').and.resolveTo(undefined);
    eventMessage.emitProviderStatsLoaded(providerStatsFixture({ Active: 1, Launched: 3, Retired: 1 }));

    component.deleteUsageSpec(usageSpec);
    await flushPromises();
    component.confirmDeleteUsageSpec();

    expect(usageService.updateUsageSpec).toHaveBeenCalledOnceWith({ lifecycleStatus: 'Retired' }, 'usage-2');
    expect(component.statusCounts).toEqual({ Draft: 1, Validated: 2, Deleted: 2 });
    expect(transitionSpy).toHaveBeenCalledOnceWith({
      entity: 'usageSpecification',
      previousLifecycleStatus: 'Launched',
      nextLifecycleStatus: 'Retired'
    });
    expect(component.deleteConfirmation).toBeNull();
    expect(component.deleteLoading).toBeFalse();
    expect(getUsageSpecsSpy).toHaveBeenCalledOnceWith(false);
    expect(loadCountsSpy).not.toHaveBeenCalled();
  });

  it('should not update counters or refresh the current tab when delete fails', async () => {
    const usageSpec = { id: 'usage-3', lifecycleStatus: 'Launched' };
    usageService.updateUsageSpec.and.returnValue(throwError(() => ({ error: { error: 'In use' } })) as any);
    spyOn(eventMessage, 'emitSpecCreated');
    const transitionSpy = spyOn(eventMessage, 'emitProviderStatsTransition').and.callThrough();
    const getUsageSpecsSpy = spyOn(component, 'getUsageSpecs').and.resolveTo(undefined);
    eventMessage.emitProviderStatsLoaded(providerStatsFixture({ Active: 1, Launched: 3, Retired: 1 }));

    component.deleteUsageSpec(usageSpec);
    await flushPromises();
    component.confirmDeleteUsageSpec();

    expect(component.statusCounts).toEqual({ Draft: 1, Validated: 3, Deleted: 1 });
    expect(transitionSpy).not.toHaveBeenCalled();
    expect(component.deleteConfirmation).toBeNull();
    expect(component.deleteLoading).toBeFalse();
    expect(getUsageSpecsSpy).not.toHaveBeenCalled();
  });

  it('should disable delete when the usage spec is used by an active or launched offer', async () => {
    const usageSpec = { id: 'usage-blocked', lifecycleStatus: 'Launched' };
    api.getOfferingPricesByUsageSpecId.and.resolveTo([{ id: 'component-1' }]);
    api.getOfferingPricesByBundledPopRelationshipId.and.resolveTo([{ id: 'plan-1' }]);
    api.getProductOfferingsByPricePlanId.and.resolveTo([
      { id: 'offer-1', name: 'Live Offer', lifecycleStatus: 'lAuNcHeD' }
    ]);

    component.deleteUsageSpec(usageSpec);
    await flushPromises();
    component.confirmDeleteUsageSpec();

    expect(component.deleteBlockingOffers).toEqual([
      jasmine.objectContaining({ id: 'offer-1', name: 'Live Offer' })
    ]);
    expect(component.canConfirmDeleteUsageSpec).toBeFalse();
    expect(usageService.updateUsageSpec).not.toHaveBeenCalled();
  });

  it('should enable delete when all linked offers are retired or obsolete regardless of case', async () => {
    const usageSpec = { id: 'usage-allowed', lifecycleStatus: 'Launched' };
    api.getOfferingPricesByUsageSpecId.and.resolveTo([{ id: 'component-1' }]);
    api.getOfferingPricesByBundledPopRelationshipId.and.resolveTo([{ id: 'plan-1' }]);
    api.getProductOfferingsByPricePlanId.and.resolveTo([
      { id: 'offer-1', name: 'Retired Offer', lifecycleStatus: 'rEtIrEd' },
      { id: 'offer-2', name: 'Obsolete Offer', lifecycleStatus: 'OBSOLETE' }
    ]);

    component.deleteUsageSpec(usageSpec);
    await flushPromises();

    expect(component.deleteBlockingOffers).toEqual([]);
    expect(component.canConfirmDeleteUsageSpec).toBeTrue();
  });

  it('should increment Draft after create even when another tab is selected without refreshing that tab', () => {
    const getUsageSpecsSpy = spyOn(component, 'getUsageSpecs').and.resolveTo(undefined);
    component.selectedTab = 'Validated';
    eventMessage.emitProviderStatsLoaded(providerStatsFixture({ Active: 4, Launched: 2, Retired: 1 }));

    eventMessage.emitProviderStatsTransition({
      entity: 'usageSpecification',
      previousLifecycleStatus: null,
      nextLifecycleStatus: 'Active'
    });

    expect(component.statusCounts).toEqual({ Draft: 5, Validated: 2, Deleted: 1 });
    expect(getUsageSpecsSpy).not.toHaveBeenCalled();
  });

  it('should increment Draft and refresh the current tab after create when Draft is selected', () => {
    const getUsageSpecsSpy = spyOn(component, 'getUsageSpecs').and.resolveTo(undefined);
    component.selectedTab = 'Draft';
    eventMessage.emitProviderStatsLoaded(providerStatsFixture({ Active: 4, Launched: 2, Retired: 1 }));

    eventMessage.emitProviderStatsTransition({
      entity: 'usageSpecification',
      previousLifecycleStatus: null,
      nextLifecycleStatus: 'Active'
    });

    expect(component.statusCounts).toEqual({ Draft: 5, Validated: 2, Deleted: 1 });
    expect(getUsageSpecsSpy).toHaveBeenCalledOnceWith(false);
  });
});
