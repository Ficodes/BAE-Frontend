import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { QuoteDetailsModalComponent } from './quote-details-modal.component';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from 'src/app/services/notification.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { QUOTE_CATEGORIES, QUOTE_STATUSES } from 'src/app/models/quote.constants';

describe('QuoteDetailsModalComponent', () => {
  let fixture: ComponentFixture<QuoteDetailsModalComponent>;
  let component: QuoteDetailsModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteDetailsModalComponent],
      providers: [
        {
          provide: QuoteService,
          useValue: {
            getQuoteById: () => of({ quoteItem: [] }),
            downloadAttachment: jasmine.createSpy('downloadAttachment'),
          },
        },
        { provide: NotificationService, useValue: { showError: jasmine.createSpy('showError'), showSuccess: jasmine.createSpy('showSuccess') } },
        { provide: AccountServiceService, useValue: { getOrgInfo: () => Promise.resolve({}) } },
        { provide: ApiServiceService, useValue: { getProductById: () => Promise.resolve({}) } },
        {
          provide: LocalStorageService,
          useValue: {
            getObject: () => ({
              id: 'user-1',
              logged_as: 'user-1',
              partyId: 'party-1',
              organizations: [],
            }),
          },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailsModalComponent);
    component = fixture.componentInstance;
  });

  it('keeps the quote details modal within the viewport without a fixed body height', () => {
    component.isOpen = true;
    component.currentUserRole = 'customer';
    component.quote = {
      category: QUOTE_CATEGORIES.TENDER,
      description: 'Test ASD',
      expectedFulfillmentStartDate: '2026-05-22',
      effectiveQuoteCompletionDate: '2026-05-30',
      quoteItem: [{ state: QUOTE_STATUSES.PENDING }],
      relatedParty: [],
    };

    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('[data-testid="quote-details-modal-backdrop"]');
    const shell = fixture.nativeElement.querySelector('[data-testid="quote-details-modal-shell"]');
    const body = fixture.nativeElement.querySelector('[data-testid="quote-details-modal-body"]');
    const footer = fixture.nativeElement.querySelector('[data-testid="quote-details-modal-footer"]');

    expect(backdrop).not.toBeNull();
    expect(backdrop.className).toContain('overflow-hidden');
    expect(shell).not.toBeNull();
    expect(shell.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(shell.className).toContain('overflow-hidden');
    expect(body).not.toBeNull();
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('flex-1');
    expect(body.className).toContain('overflow-y-auto');
    expect(body.className).not.toContain('max-h-[70vh]');
    expect(footer).not.toBeNull();
    expect(footer.className).toContain('shrink-0');
  });
});
