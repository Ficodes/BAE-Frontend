import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { TenderListComponent } from './tender-list.component';
import { QuoteService } from '../../../quotes/services/quote.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ProviderService } from 'src/app/services/provider.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { QUOTE_CATEGORIES, QUOTE_STATUSES } from 'src/app/models/quote.constants';
import { UI_ROLES } from 'src/app/models/roles.constants';
import { Quote } from 'src/app/models/quote.model';

describe('TenderListComponent', () => {
  let fixture: ComponentFixture<TenderListComponent>;
  let component: TenderListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenderListComponent],
      providers: [
        {
          provide: QuoteService,
          useValue: {
            getCoordinatorQuotesByUser: () => of([]),
            getTenderingQuotesByUser: () => of([]),
          },
        },
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
        { provide: NotificationService, useValue: { showError: jasmine.createSpy('showError'), showSuccess: jasmine.createSpy('showSuccess') } },
        { provide: AccountServiceService, useValue: {} },
        { provide: ProviderService, useValue: { getProviderCountryOptions: () => of([]) } },
        { provide: ApiServiceService, useValue: {} },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TenderListComponent);
    component = fixture.componentInstance;
  });

  it('renders tender status badges with a bordered surface so they remain distinct in tables', () => {
    fixture.detectChanges();

    component.selectedRole = UI_ROLES.BUYER;
    component.loading = false;
    component.error = null;
    component.filteredQuotes = [
      {
        id: 'quote-1',
        category: QUOTE_CATEGORIES.COORDINATOR,
        description: 'Tender with closed state',
        quoteItem: [{ state: QUOTE_STATUSES.ACCEPTED }],
      } as Quote,
    ];

    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;

    expect(badge).not.toBeNull();

    const computedStyle = getComputedStyle(badge);

    expect(computedStyle.borderStyle).not.toBe('none');
    expect(computedStyle.borderWidth).not.toBe('0px');
  });

  it('shows tender status filter options with user friendly labels', () => {
    component.selectedRole = UI_ROLES.BUYER;

    const labels = component.filterStatusOptions.map(option => option.label);

    expect(labels).toContain('Not Yet Submitted');
    expect(labels).toContain('Invites Sent, Waiting Acceptance');
    expect(labels).toContain('Tender Started');
    expect(labels).toContain('Tender Closed');
    expect(labels.some(label => label.includes('-'))).toBeFalse();
  });

  it('renders tender status badges with user friendly text', () => {
    fixture.detectChanges();

    component.selectedRole = UI_ROLES.BUYER;
    component.loading = false;
    component.error = null;
    component.filteredQuotes = [
      {
        id: 'quote-1',
        category: QUOTE_CATEGORIES.COORDINATOR,
        description: 'Tender with closed state',
        quoteItem: [{ state: QUOTE_STATUSES.ACCEPTED }],
      } as Quote,
    ];

    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;

    expect(badge.textContent?.trim()).toBe('Tender Closed');
  });

  it('keeps provider tender status badges readable in the table row', () => {
    fixture.detectChanges();

    component.selectedRole = UI_ROLES.SELLER;
    component.loading = false;
    component.error = null;
    component.filteredQuotes = [
      {
        id: 'quote-1',
        category: QUOTE_CATEGORIES.TENDER,
        description: 'Provider invite',
        quoteDate: '2026-05-22T00:00:00.000Z',
        quoteItem: [{ state: QUOTE_STATUSES.PENDING }],
        relatedParty: [],
      } as Quote,
    ];

    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge') as HTMLElement;
    const row = fixture.nativeElement.querySelector('[data-quote-id="quote-1"]') as HTMLElement;
    const statusCell = row.querySelector('[data-testid="provider-tender-status-cell"]') as HTMLElement;

    expect(badge.textContent?.trim()).toBe('Invite Received');
    expect(badge.className).toContain('max-w-full');
    expect(badge.className).toContain('truncate');
    expect(row.className).toContain('grid-cols-12');
    expect(statusCell.className).toContain('col-span-2');
    expect(statusCell.className).toContain('min-w-0');
  });
});
