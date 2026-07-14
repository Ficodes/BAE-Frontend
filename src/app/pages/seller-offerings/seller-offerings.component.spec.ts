import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
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

  it('event subscription should close feedback on CloseFeedback', () => {
    component.feedback = true;

    eventMessage.emitCloseFeedback(false);

    expect(component.feedback).toBeFalse();
  });

  it('event subscription should show feedback after product spec creation only for DOME theme', () => {
    component.feedback = false;
    component.isDomeTheme = true;
    component.userInfo = { expire: 9999999999 };

    eventMessage.emitSellerProductSpec(true);

    expect(component.feedback).toBeTrue();
  });

  it('event subscription should not show feedback for non-DOME theme', () => {
    component.feedback = false;
    component.isDomeTheme = false;
    component.userInfo = { expire: 9999999999 };

    eventMessage.emitSellerProductSpec(true);

    expect(component.feedback).toBeFalse();
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
