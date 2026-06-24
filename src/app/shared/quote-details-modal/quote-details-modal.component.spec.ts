import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { Quote } from 'src/app/models/quote.model';
import { QUOTE_CATEGORIES, QUOTE_STATUSES } from 'src/app/models/quote.constants';
import { API_ROLES } from 'src/app/models/roles.constants';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { QuoteDetailsModalComponent } from './quote-details-modal.component';

describe('QuoteDetailsModalComponent', () => {
  let fixture: ComponentFixture<QuoteDetailsModalComponent>;
  let component: QuoteDetailsModalComponent;
  let quoteService: jasmine.SpyObj<QuoteService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const coordinatorQuote: Quote = {
    id: 'coordinator-1',
    category: QUOTE_CATEGORIES.COORDINATOR,
    description: 'Coordinator tender',
    state: QUOTE_STATUSES.IN_PROGRESS,
    quoteItem: [{ state: QUOTE_STATUSES.IN_PROGRESS }],
  };

  beforeEach(async () => {
    quoteService = jasmine.createSpyObj<QuoteService>('QuoteService', [
      'addNoteToQuote',
      'broadcastMessage',
      'getQuoteById',
      'getTenderingQuotesByExternalId',
    ]);
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['showError', 'showSuccess']);

    quoteService.addNoteToQuote.and.callFake((id) => of({ id, quoteItem: [] } as Quote));
    quoteService.broadcastMessage.and.returnValue(of({}));
    quoteService.getQuoteById.and.returnValue(of(coordinatorQuote));
    quoteService.getTenderingQuotesByExternalId.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [QuoteDetailsModalComponent],
      providers: [
        { provide: QuoteService, useValue: quoteService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: LocalStorageService,
          useValue: {
            getObject: () => ({ logged_as: 'user-1', id: 'user-1', partyId: 'buyer-1', organizations: [] }),
          },
        },
        { provide: AccountServiceService, useValue: { getOrgInfo: () => Promise.resolve({ tradingName: 'Known Org' }) } },
        { provide: ApiServiceService, useValue: { getProductById: () => Promise.resolve({ name: 'Product' }) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailsModalComponent);
    component = fixture.componentInstance;
  });

  it('does not show the footer chat action for coordinator quote details', () => {
    component.isOpen = true;
    component.currentUserRole = 'customer';
    component.currentUserId = 'buyer-1';
    component.quoteId = 'coordinator-1';
    component.quote = coordinatorQuote;

    fixture.detectChanges();

    const buttonLabels = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((button) => button.textContent?.trim())
      .filter(Boolean);

    expect(buttonLabels).not.toContain('Chat');
  });

  it('uses a neutral badge palette for closed coordinator tenders', () => {
    component.quote = {
      ...coordinatorQuote,
      state: QUOTE_STATUSES.ACCEPTED,
      quoteItem: [{ state: QUOTE_STATUSES.ACCEPTED }],
    };

    expect(component.getStatusLabel()).toBe('Tender Closed');
    expect(component.getStatusBadgeClass()).toContain('border-[#CBD3DF]');
    expect(component.getStatusBadgeClass()).toContain('bg-[#F2F4F8]');
    expect(component.getStatusBadgeClass()).toContain('text-[#324153]');
  });

  it('broadcasts from coordinator quote details by adding notes to related tendering quotes', () => {
    const relatedQuotes: Quote[] = [
      { id: 'provider-quote-1', category: QUOTE_CATEGORIES.TENDER, quoteItem: [] },
      { id: 'provider-quote-2', category: QUOTE_CATEGORIES.TENDER, quoteItem: [] },
    ];
    quoteService.getTenderingQuotesByExternalId.and.returnValue(of(relatedQuotes));
    component.quote = coordinatorQuote;
    component.currentUserId = 'buyer-1';
    component.broadcastMessage = 'Hello providers';

    component.sendBroadcastMessage();
    component.confirmDialogCallback?.();

    expect(quoteService.getTenderingQuotesByExternalId)
      .toHaveBeenCalledWith('buyer-1', 'coordinator-1', API_ROLES.BUYER);
    expect(quoteService.addNoteToQuote).toHaveBeenCalledTimes(2);
    expect(quoteService.addNoteToQuote).toHaveBeenCalledWith('provider-quote-1', 'Hello providers', 'buyer-1');
    expect(quoteService.addNoteToQuote).toHaveBeenCalledWith('provider-quote-2', 'Hello providers', 'buyer-1');
    expect(quoteService.broadcastMessage).not.toHaveBeenCalled();
    expect(notificationService.showSuccess).toHaveBeenCalledWith('Message broadcast sent to all invited providers.');
  });
});
