import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessageService } from '../../services/event-message.service';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { ApiServiceService } from 'src/app/services/product-service.service';

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
    spyOn(component, 'selectCatalogs');
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.goToCatalogs();

    expect(component.show_catalogs).toBeTrue();
    expect(component.show_offers).toBeFalse();
    expect(component.show_prod_specs).toBeFalse();
    expect(component.selectCatalogs).toHaveBeenCalled();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('goToCreateOffer should show create offer view', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.goToCreateOffer();

    expect(component.show_create_offer).toBeTrue();
    expect(component.show_catalogs).toBeFalse();
    expect(component.show_offers).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
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
});
