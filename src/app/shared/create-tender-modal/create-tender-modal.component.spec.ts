import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { CreateTenderModalComponent } from './create-tender-modal.component';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProviderService } from 'src/app/services/provider.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';

describe('CreateTenderModalComponent', () => {
  let fixture: ComponentFixture<CreateTenderModalComponent>;
  let component: CreateTenderModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTenderModalComponent],
      providers: [
        { provide: QuoteService, useValue: {} },
        { provide: NotificationService, useValue: { showError: jasmine.createSpy('showError'), showSuccess: jasmine.createSpy('showSuccess') } },
        { provide: LocalStorageService, useValue: { getObject: () => ({}) } },
        { provide: ProviderService, useValue: { getProviderCountryOptions: () => of([]) } },
        { provide: ApiServiceService, useValue: {} },
        { provide: AccountServiceService, useValue: {} },
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
});
