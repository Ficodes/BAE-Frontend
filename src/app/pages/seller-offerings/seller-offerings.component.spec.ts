import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventMessageService } from '../../services/event-message.service';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';

import { SellerOfferingsComponent } from './seller-offerings.component';

describe('SellerOfferingsComponent', () => {
  let component: SellerOfferingsComponent;
  let fixture: ComponentFixture<SellerOfferingsComponent>;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SellerOfferingsComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        {
          provide: QuoteService,
          useValue: jasmine.createSpyObj<QuoteService>('QuoteService', ['getQuoteById']),
        },
        {
          provide: ApiServiceService,
          useValue: jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getProductById']),
        },
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SellerOfferingsComponent);
    component = fixture.componentInstance;
    eventMessage = TestBed.inject(EventMessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function renderUsageSpecsCount(count: number): jasmine.Spy {
    const loadCountsSpy = spyOn(component, 'loadCounts').and.resolveTo(undefined);
    component.goToUsageSpec();
    eventMessage.emitProviderStatsLoaded(providerStatsFixture({
      usageSpecification: { Active: count }
    }));
    fixture.detectChanges();
    loadCountsSpy.calls.reset();
    return loadCountsSpy;
  }

  function sidebarUsageSpecsCount(): string {
    return fixture.nativeElement.querySelector('[data-cy="usageSpecSection"] span:last-child').textContent.trim();
  }

  function providerStatsFixture(overrides: any = {}) {
    const empty = { Active: 0, Launched: 0, Retired: 0, Obsolete: 0 };
    return {
      productOffering: { ...empty, ...(overrides.productOffering || {}) },
      catalog: { ...empty, ...(overrides.catalog || {}) },
      productSpecification: { ...empty, ...(overrides.productSpecification || {}) },
      serviceSpecification: { ...empty, ...(overrides.serviceSpecification || {}) },
      resourceSpecification: { ...empty, ...(overrides.resourceSpecification || {}) },
      usageSpecification: { ...empty, ...(overrides.usageSpecification || {}) }
    };
  }

  it('should increment the sidebar count after creating a usage spec without reloading counts', () => {
    const loadCountsSpy = renderUsageSpecsCount(3);
    component.goToCreateUsage();

    eventMessage.emitProviderStatsTransition({
      entity: 'usageSpecification',
      previousLifecycleStatus: null,
      nextLifecycleStatus: 'Active'
    });
    eventMessage.emitUsageSpecList(true);

    expect(sidebarUsageSpecsCount()).toBe('4');
    expect(loadCountsSpy).not.toHaveBeenCalled();
  });

  it('should keep usage spec list mounted but hidden while creating a usage spec', () => {
    renderUsageSpecsCount(3);
    component.goToCreateUsage();
    fixture.detectChanges();

    const usageWrapper = fixture.nativeElement.querySelector('seller-usage-spec')?.parentElement as HTMLElement;

    expect(component.activeSection).toBe('usagespec');
    expect(component.show_create_usage).toBeTrue();
    expect(fixture.nativeElement.querySelector('seller-usage-spec')).not.toBeNull();
    expect(usageWrapper.style.display).toBe('none');
  });

  for (const [previousStatus, nextStatus] of [['Active', 'Obsolete'], ['Launched', 'Retired']]) {
    it(`should decrement the sidebar count after deleting a ${previousStatus} usage spec`, fakeAsync(() => {
      const loadCountsSpy = renderUsageSpecsCount(3);
      eventMessage.emitProviderStatsLoaded(providerStatsFixture({
        usageSpecification: { [previousStatus]: 3 }
      }));

      eventMessage.emitSpecCreated('Metric deleted', 'success', false);
      eventMessage.emitProviderStatsTransition({
        entity: 'usageSpecification',
        previousLifecycleStatus: previousStatus as any,
        nextLifecycleStatus: nextStatus as any
      });

      expect(sidebarUsageSpecsCount()).toBe('2');
      expect(loadCountsSpy).not.toHaveBeenCalled();
      tick(4000);
    }));
  }

  it('should preserve the sidebar count when validating or editing a usage spec', () => {
    const loadCountsSpy = renderUsageSpecsCount(3);

    for (const previousStatus of ['Active', 'Launched']) {
      eventMessage.emitProviderStatsTransition({
        entity: 'usageSpecification',
        previousLifecycleStatus: previousStatus as any,
        nextLifecycleStatus: 'Launched'
      });
      expect(sidebarUsageSpecsCount()).toBe('3');
    }
    expect(loadCountsSpy).not.toHaveBeenCalled();
  });

  it('should preserve the sidebar count when a usage spec delete fails', fakeAsync(() => {
    const loadCountsSpy = renderUsageSpecsCount(3);

    eventMessage.emitSpecCreated('Metric is in use', 'error', false);
    fixture.detectChanges();

    expect(sidebarUsageSpecsCount()).toBe('3');
    expect(component.toastType).toBe('error');
    expect(loadCountsSpy).not.toHaveBeenCalled();
    tick(4000);
  }));

  it('should update other workspace counts without reloading stats while viewing usage specs', fakeAsync(() => {
    const loadCountsSpy = renderUsageSpecsCount(3);

    eventMessage.emitProviderStatsTransition({
      entity: 'productSpecification',
      previousLifecycleStatus: null,
      nextLifecycleStatus: 'Active'
    });

    expect(component.productSpecsCount).toBe(1);
    expect(loadCountsSpy).not.toHaveBeenCalled();
    tick(4000);
  }));

  it('should not refetch or replay transitions emitted before the initial stats response', fakeAsync(() => {
    component.userInfo = { id: 'user-1', logged_as: 'user-1', partyId: 'party-1' };
    component.goToUsageSpec();
    const http = TestBed.inject(HttpTestingController);

    component.loadCounts();
    const initialRequest = http.expectOne(`${environment.BASE_URL}/stats/provider/party-1`);
    eventMessage.emitProviderStatsTransition({
      entity: 'usageSpecification',
      previousLifecycleStatus: null,
      nextLifecycleStatus: 'Active'
    });

    initialRequest.flush(providerStatsFixture({
      usageSpecification: { Active: 2, Launched: 1, Retired: 0, Obsolete: 0 }
    }));
    flushMicrotasks();

    expect(sidebarUsageSpecsCount()).toBe('3');
    http.verify();
  }));

  it('setActiveSection should update section and persist it', () => {
    const setItemSpy = spyOn(localStorage, 'setItem');

    component.setActiveSection('offers');

    expect(component.activeSection).toBe('offers');
    expect(setItemSpy).toHaveBeenCalledWith('activeSection', 'offers');
  });

  it('goToCatalogs should activate catalogs section and reset others', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.goToCatalogs();

    expect(component.activeView).toBe('catalogs');
    expect(component.show_catalogs).toBeTrue();
    expect(component.show_offers).toBeFalse();
    expect(component.show_prod_specs).toBeFalse();
    expect(component.showWorkspaceNav).toBeTrue();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('goToCreateOffer should show create offer view', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.goToCreateOffer();

    expect(component.activeView).toBe('createOffer');
    expect(component.show_create_offer).toBeTrue();
    expect(component.show_catalogs).toBeFalse();
    expect(component.show_offers).toBeFalse();
    expect(component.showWorkspaceNav).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('typed activeView should only expose one active view getter', () => {
    component.goToOffers();
    expect([
      component.show_catalogs,
      component.show_offers,
      component.show_prod_specs,
      component.show_service_specs,
      component.show_resource_specs,
      component.show_usage_specs,
      component.show_create_offer,
      component.show_update_offer,
    ].filter(Boolean).length).toBe(1);

    component.goToUpdateOffer();
    expect([
      component.show_catalogs,
      component.show_offers,
      component.show_prod_specs,
      component.show_service_specs,
      component.show_resource_specs,
      component.show_usage_specs,
      component.show_create_offer,
      component.show_update_offer,
    ].filter(Boolean).length).toBe(1);
  });

  it('event subscription should route to update offer and store payload', () => {
    const goToUpdateOfferSpy = spyOn(component, 'goToUpdateOffer');
    const offer = { id: 'offer-1' };

    eventMessage.emitSellerUpdateOffer(offer);

    expect(component.offer_to_update).toEqual(offer);
    expect(goToUpdateOfferSpy).toHaveBeenCalled();
  });

  it('event subscription should route to product specs after product spec creation', () => {
    const goToProdSpecSpy = spyOn(component, 'goToProdSpec');

    eventMessage.emitSellerProductSpec(true);

    expect(goToProdSpecSpy).toHaveBeenCalled();
  });

  it('should hide workspace help box when theme does not configure it', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="sellerWorkspaceHelp"]')).toBeNull();
  });

  it('should show workspace help box when theme configures it', () => {
    fixture.detectChanges();

    component.workspaceHelpAction = {
      title: 'OFFERINGS._need_help',
      description: 'OFFERINGS._explore_guidelines',
      actionLabel: 'OFFERINGS._view_kb'
    };
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="sellerWorkspaceHelp"]')).not.toBeNull();
  });

  it('goToResources should open configured knowledge base URL', () => {
    const openSpy = spyOn(window, 'open');
    const fallbackUrl = environment.KNOWLEDGE_BASE_URL || environment.KB_GUIDELNES_URL;

    component.goToResources();

    expect(openSpy).toHaveBeenCalledWith(fallbackUrl, '_blank', 'noopener');
  });

});
