import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { CreateTenderModalComponent } from './create-tender-modal.component';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { Provider, ProviderService } from 'src/app/services/provider.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';

describe('CreateTenderModalComponent', () => {
  let fixture: ComponentFixture<CreateTenderModalComponent>;
  let component: CreateTenderModalComponent;
  let quoteService: jasmine.SpyObj<QuoteService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let providerService: jasmine.SpyObj<ProviderService>;

  beforeEach(async () => {
    quoteService = jasmine.createSpyObj<QuoteService>('QuoteService', [
      'addAttachmentToQuote',
      'createTenderingQuote',
      'deleteQuote',
      'getTenderingQuotesByUser',
      'updateQuoteDate',
    ]);
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['showError', 'showSuccess']);
    providerService = jasmine.createSpyObj<ProviderService>('ProviderService', [
      'getProviderCountryOptions',
      'getProvidersForTender',
      'getProvidersForTenderNew',
    ]);

    quoteService.getTenderingQuotesByUser.and.returnValue(of([]));
    providerService.getProviderCountryOptions.and.returnValue(of([]));
    providerService.getProvidersForTenderNew.and.returnValue(of([]));
    providerService.getProvidersForTender.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CreateTenderModalComponent],
      providers: [
        { provide: QuoteService, useValue: quoteService },
        { provide: NotificationService, useValue: notificationService },
        { provide: LocalStorageService, useValue: { getObject: () => ({}) } },
        { provide: ProviderService, useValue: providerService },
        { provide: ApiServiceService, useValue: { getDefaultCategories: () => Promise.resolve([]), getCategoriesByParentId: () => Promise.resolve([]) } },
        { provide: AccountServiceService, useValue: { getOrgInfo: () => Promise.resolve({ tradingName: 'Known Provider' }) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTenderModalComponent);
    component = fixture.componentInstance;
  });

  it('shows a compact tender setup summary in the provider selection step', () => {
    component.isOpen = true;
    component.customerId = 'customer-1';
    component.tenderCreationStep = 3;
    component.tenderTitle = 'Test ASD';
    component.expectedCompletionDate = '2026-05-30';
    component.requestedCompletionDate = '2026-05-23';
    component.existingAttachment = { name: 'test-file-pdf.pdf' } as any;

    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector('[aria-label="Tender setup summary"]');

    expect(summary).not.toBeNull();
    expect(summary.querySelectorAll('[data-summary-item]').length).toBe(3);
    expect(summary.textContent).toContain('Test ASD');
    expect(summary.textContent).toContain('test-file-pdf.pdf');
  });

  it('keeps the provider step layout from creating horizontal overflow', () => {
    component.isOpen = true;
    component.customerId = 'customer-1';
    component.tenderCreationStep = 3;

    fixture.detectChanges();

    const body = fixture.nativeElement.querySelector('[data-testid="tender-modal-body"]');
    const footer = fixture.nativeElement.querySelector('[data-testid="tender-modal-provider-footer"]');

    expect(body).not.toBeNull();
    expect(body.className).toContain('overflow-x-hidden');
    expect(footer).not.toBeNull();
    expect(footer.className).not.toContain('-mx-6');
  });

  it('closes filter dropdowns when clicking elsewhere in the modal', () => {
    component.isOpen = true;
    component.customerId = 'customer-1';
    component.tenderCreationStep = 3;
    component.showCountryDropdown = true;

    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector('[aria-label="Tender setup summary"]');
    summary.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();

    expect(component.showCountryDropdown).toBeFalse();
  });

  it('marks selected provider candidates with a distinct active row surface', () => {
    component.isOpen = true;
    component.customerId = 'customer-1';
    component.tenderCreationStep = 3;
    component.availableProviders = [
      {
        selected: true,
        provider: {
          id: 'provider-1',
          tradingName: 'SELLER ORG',
          externalReference: [{ name: '56b80389-eb92-490a-9c92-c06dde069924' }],
        },
      },
    ];

    fixture.detectChanges();

    const selectedRow = fixture.nativeElement.querySelector('[data-testid="tender-provider-candidate"]');

    expect(selectedRow).not.toBeNull();
    expect(selectedRow.className).toContain('bg-[#EBF0F7]');
    expect(selectedRow.className).toContain('border-l-[#1f4fbf]');
  });

  it('shows the uploaded PDF in the provider step summary immediately after step 2 is saved', fakeAsync(() => {
    const selectedFile = new File(['pdf'], 'Tender-request.pdf', { type: 'application/pdf' });
    quoteService.updateQuoteDate.and.returnValue(of({ id: 'coordinator-1' } as any));
    quoteService.addAttachmentToQuote.and.returnValue(of({
      id: 'coordinator-1',
      quoteItem: [{
        attachment: [{
          name: 'Tender-request.pdf',
          mimeType: 'application/pdf',
          content: 'cGRm',
          size: { amount: 3 },
        }],
      }],
    } as any));

    component.isOpen = true;
    component.customerId = 'customer-1';
    component.createdQuoteId = 'coordinator-1';
    component.tenderTitle = 'Tender with attachment';
    component.requestedCompletionDate = '2026-06-01';
    component.expectedCompletionDate = '2026-06-10';
    component.selectedPdfFile = selectedFile;

    component.proceedToProviderSelection();
    flushMicrotasks();
    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector('[aria-label="Tender setup summary"]');

    expect(component.tenderCreationStep).toBe(3);
    expect(component.pdfAttachmentSet).toBeTrue();
    expect(component.existingAttachment?.name).toBe('Tender-request.pdf');
    expect(summary.textContent).toContain('Tender-request.pdf');
  }));

  it('reloads provider candidates on filter changes without entering the invite-saving state', () => {
    const providers$ = new Subject<Provider[]>();
    providerService.getProvidersForTenderNew.and.returnValue(providers$);
    component.isOpen = true;
    component.customerId = 'customer-1';
    component.currentUserId = 'customer-1';
    component.createdQuoteId = 'coordinator-1';
    component.tenderCreationStep = 3;

    component.emitFilters();

    expect(component.tenderLoading).toBeFalse();
    expect(component.providerInviteSaving).toBeFalse();
    expect(quoteService.createTenderingQuote).not.toHaveBeenCalled();

    providers$.next([]);
    providers$.complete();
  });

  it('removes saved providers from the candidate list after manual invite', fakeAsync(() => {
    const selectedProvider = { id: 'provider-1', tradingName: 'Provider One' } as Provider;
    const otherProvider = { id: 'provider-2', tradingName: 'Provider Two' } as Provider;
    spyOn(component.tenderUpdated, 'emit');
    quoteService.createTenderingQuote.and.returnValue(of({ id: 'quote-1' } as any));
    component.currentUserId = 'customer-1';
    component.createdQuoteId = 'coordinator-1';
    component.tenderProviders = [selectedProvider, otherProvider];
    component._safeInvitedList = [selectedProvider];
    component.selectedProviders = new Set(['provider-1']);
    component.availableProviders = [
      { provider: selectedProvider, selected: true },
      { provider: otherProvider, selected: false },
    ];

    component.saveProvidersList();
    flushMicrotasks();

    expect(component.invitedProviders.map(invited => invited.provider.id)).toEqual(['provider-1']);
    expect(component.selectedProviders.size).toBe(0);
    expect(component.availableProviders.map(candidate => candidate.provider.id)).toEqual(['provider-2']);
    expect(component.tenderUpdated.emit).toHaveBeenCalled();
  }));

  it('treats a gateway timeout while removing an invited provider as a completed delete and refreshes candidates', () => {
    const provider = { id: 'provider-1', tradingName: 'Provider One' } as Provider;
    quoteService.deleteQuote.and.returnValue(throwError(() => ({ status: 504, statusText: 'OK' })));
    component.currentUserId = 'customer-1';
    component.createdQuoteId = 'coordinator-1';
    component.invitedProviders = [{ provider, quoteId: 'quote-1' }];
    component.tenderProviders = [provider];
    component.availableProviders = [];

    component.removeInvitedProvider('quote-1', 'provider-1');
    component.genericConfirmCallback?.();

    expect(component.invitedProviders).toEqual([]);
    expect(component.availableProviders.map(candidate => candidate.provider.id)).toEqual(['provider-1']);
    expect(notificationService.showSuccess).toHaveBeenCalledWith('Provider invitation removed successfully');
    expect(notificationService.showError).not.toHaveBeenCalled();
  });
});
