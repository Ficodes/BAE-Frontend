import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { Category, LoginInfo } from 'src/app/models/interfaces';
import { TENDER_STEP2_DESCRIPTION } from 'src/app/models/quote.constants';
import { API_ROLES } from 'src/app/models/roles.constants';
import {
  ProviderCountryOption,
  SearchOrganizationsFilters,
  TENDER_COMPLIANCE_LEVELS,
  buildTenderProviderSearchFilters,
  hasTenderProviderSearchFilters,
  resolveTenderCatalogueFacetOptions,
  resolveTenderCategoryLeafNames,
  shouldUseUnfilteredProviderFallback,
} from 'src/app/models/search-organizations-filters.model';
import { Tender, TenderAttachment } from 'src/app/models/tender.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { Provider, ProviderService } from 'src/app/services/provider.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { TenderDateFieldComponent } from '../tender-date-field/tender-date-field.component';
import {
  TenderProviderCandidate,
  buildStableProviderCandidates,
} from './tender-provider-selection.model';

@Component({
  selector: 'app-create-tender-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, TenderDateFieldComponent, TranslateModule],
  templateUrl: 'create-tender-modal.component.html',
  styles: []
})
export class CreateTenderModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() customerId: string = '';
  @Input() tenderToEdit: Tender | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() tenderCreated = new EventEmitter<Tender>();
  @Output() tenderUpdated = new EventEmitter<void>();

  private quoteService = inject(QuoteService);
  private notificationService = inject(NotificationService);
  private localStorage = inject(LocalStorageService);
  private providerService = inject(ProviderService);
  private api = inject(ApiServiceService);
  private accountService = inject(AccountServiceService);
  private router = inject(Router);

  // Properties for tender creation modal
  tenderProviders: Provider[] = [];
  selectedProviders: Set<string> = new Set();
  invitedProviders: Array<{ provider: Provider; quoteId: string }> = [];
  tenderLoading = false;
  providerSearchLoading = false;
  providerInviteSaving = false;
  tenderError: string | null = null;
  providerSearchWarning: string | null = null;

  // Generic Confirmation Dialog
  showGenericConfirm = false;
  genericConfirmTitle = '';
  genericConfirmMessage = '';
  genericConfirmButtonText = 'Confirm';
  genericConfirmButtonClass = 'inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50';
  genericConfirmCallback: (() => void) | null = null;
  currentUserId: string | null = null;

  // Tender Provider Search filters
  countryOptions: ProviderCountryOption[] = [];
  serviceCategoryOptions: Category[] = [];
  addressableSectorOptions: Category[] = [];
  integrationFrameworkOptions: Category[] = [];
  countryOptionsLoading = false;
  catalogueOptionsLoading = false;
  readonly complianceLevelOptions = TENDER_COMPLIANCE_LEVELS;

  showServiceCategoryDropdown = false;
  showComplianceDropdown = false;
  showSectorDropdown = false;
  showCountryDropdown = false;
  showFrameworkDropdown = false;

  selectedServiceCategory: Category | null = null;
  selectedServiceCategoryLeafNames: string[] = [];
  selectedComplianceLevels: string[] = [];
  selectedCountryCodes: string[] = [];
  selectedSectorIds: string[] = [];
  selectedSectorLeafNames: string[] = [];
  selectedFrameworkIds: string[] = [];
  selectedFrameworkLeafNames: string[] = [];

  private leafNameCache = new Map<string, string[]>();
  private providerLoadSequence = 0;
  private serviceCategoryResolutionSequence = 0;
  private sectorResolutionSequence = 0;
  private frameworkResolutionSequence = 0;
  _safeInvitedList: Provider[] = [];

  // Default organization search filters
  orgFilters: SearchOrganizationsFilters = {
    categories: [],
    countries: [],
    complianceLevels: []
  };
  // Available providers list
  availableProviders: TenderProviderCandidate[] = [];

  // Tender form fields - Step 1: Title only
  tenderTitle: string = '';

  // Step 2: Date fields and PDF upload
  expectedCompletionDate: string = '';
  requestedCompletionDate: string = '';
  expectedDateSet: boolean = false;
  requestedDateSet: boolean = false;
  selectedPdfFile: File | null = null;
  pdfAttachmentSet: boolean = false;

  // Edit mode
  editingTenderId: string | null = null;
  existingAttachment: TenderAttachment | null = null;
  createdQuoteId: string | null = null;

  // Track tender creation steps
  tenderCreationStep: number = 1; // 1 = Title, 2 = Dates, 3 = Providers

  // Expose constant to template
  readonly TENDER_STEP2_DESCRIPTION = TENDER_STEP2_DESCRIPTION;

  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  ngOnInit() {
    // Use customerId if provided from parent, otherwise get from localStorage
    if (this.customerId) {
      this.currentUserId = this.customerId;
    } else {
      const loginInfo = this.localStorage.getObject('login_items') as LoginInfo;
      if (loginInfo && loginInfo.logged_as == loginInfo.id) {
        this.currentUserId = loginInfo.partyId;
      } else if (loginInfo && loginInfo.logged_as) {
        const loggedOrg = loginInfo.organizations.find((element: { id: any; }) => element.id == loginInfo.logged_as);
        this.currentUserId = loggedOrg?.partyId;
      }
    }

    // Filter options (categories, countries, compliance levels) and the provider list
    // are loaded lazily in proceedToProviderSelection() when the user enters step 3.
  }

  ngOnChanges(changes: SimpleChanges) {
    // Check if tenderToEdit has changed and is not null
    if (changes['tenderToEdit'] && this.tenderToEdit) {
      this.loadTenderForEdit(this.tenderToEdit);
    }
    // Also check if modal was just opened and we have a tender to edit
    if (changes['isOpen'] && this.isOpen && this.tenderToEdit) {
      this.loadTenderForEdit(this.tenderToEdit);
    }
  }

  loadTenderForEdit(tender: Tender) {
    // Set basic fields
    this.editingTenderId = tender.id || null;
    this.createdQuoteId = tender.id || null;
    this.tenderTitle = tender.tenderNote || '';

    // Set dates if they exist
    if (tender.expectedFulfillmentStartDate) {
      this.requestedCompletionDate = this.formatDateForInput(tender.expectedFulfillmentStartDate);
      this.requestedDateSet = true;
    }

    if (tender.effectiveQuoteCompletionDate) {
      this.expectedCompletionDate = this.formatDateForInput(tender.effectiveQuoteCompletionDate);
      this.expectedDateSet = true;
    }

    // Set attachment if exists
    if (tender.attachment) {
      this.existingAttachment = tender.attachment;
      this.pdfAttachmentSet = true;
    }

    // Always start at step 2 when clicking EDIT to ensure proper initialization and API calls
    this.tenderCreationStep = 2;
  }

  private formatDateForInput(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  closeTenderModal() {
    this.isOpen = false;
    this.tenderCreationStep = 1;
    this.selectedProviders.clear();
    this.invitedProviders = [];
    this.tenderProviders = [];
    this.tenderError = null;
    this.providerSearchLoading = false;
    this.providerInviteSaving = false;
    this.editingTenderId = null;
    this.resetTenderForm();
    this.closeModal.emit();
  }

  /**
   * Show generic confirmation dialog
   */
  showConfirmation(
    title: string,
    message: string,
    callback: () => void,
    buttonText: string = 'Confirm',
    buttonClass: string = 'inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50'
  ) {
    this.genericConfirmTitle = title;
    this.genericConfirmMessage = message;
    this.genericConfirmButtonText = buttonText;
    this.genericConfirmButtonClass = buttonClass;
    this.genericConfirmCallback = () => {
      callback();
      this.showGenericConfirm = false;
    };
    this.showGenericConfirm = true;
  }

  resetTenderForm() {
    this.tenderTitle = '';
    this.expectedCompletionDate = '';
    this.requestedCompletionDate = '';
    this.expectedDateSet = false;
    this.requestedDateSet = false;
    this.existingAttachment = null;
    this.createdQuoteId = null;
    this.selectedPdfFile = null;
    this.pdfAttachmentSet = false;
    this.invitedProviders = [];
    this.providerSearchLoading = false;
    this.providerInviteSaving = false;
  }

  /**
   * Step 1: Save initial tender with just title
   * Calls createCoordinatorQuote API
   */
  saveInitialTender() {
    if (!this.tenderTitle.trim()) {
      this.notificationService.showError('Tender title is required');
      return;
    }

    if (!this.currentUserId) {
      this.notificationService.showError('User not logged in');
      return;
    }

    this.tenderLoading = true;

    this.quoteService.createCoordinatorQuote(this.currentUserId, this.tenderTitle.trim()).subscribe({
      next: (createdTender) => {
        console.log('Coordinator tender created:', createdTender);
        this.createdQuoteId = createdTender.id || null;
        this.editingTenderId = createdTender.id || null;
        this.notificationService.showSuccess('Tender created! Now set the completion dates.');
        this.tenderLoading = false;

        // Move to Step 2: Date fields
        this.tenderCreationStep = 2;
        // Notify the parent dashboard so the new tender appears in the list immediately
        this.tenderUpdated.emit();
      },
      error: (error) => {
        console.error('Error creating tender:', error);
        this.notificationService.showError('Failed to create tender: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Convert date from YYYY-MM-DD to DD-MM-YYYY format
   */
  formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  }

  /**
   * Step 2: Set expected completion date
   */
  setExpectedDate() {
    if (!this.expectedCompletionDate || !this.createdQuoteId) {
      this.notificationService.showError('Please select a date');
      return;
    }

    this.tenderLoading = true;
    const formattedDate = this.formatDateForAPI(this.expectedCompletionDate);

    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedDate, 'effective').subscribe({
      next: (updatedTender: any) => {
        this.expectedDateSet = true;
        this.notificationService.showSuccess('Effective completion date set successfully!');
        this.tenderLoading = false;
        // Emit update event so parent can refresh the tender list
        this.tenderUpdated.emit();
      },
      error: (error: any) => {
        console.error('Error setting effective date:', error);
        this.notificationService.showError('Failed to set effective date: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Step 2: Set requested completion date
   */
  setRequestedDate() {
    if (!this.requestedCompletionDate || !this.createdQuoteId) {
      this.notificationService.showError('Please select a date');
      return;
    }

    this.tenderLoading = true;
    const formattedDate = this.formatDateForAPI(this.requestedCompletionDate);

    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedDate, 'expectedFulfillment').subscribe({
      next: (updatedTender: any) => {
        this.requestedDateSet = true;
        this.notificationService.showSuccess('Expected fulfillment start date set successfully!');
        this.tenderLoading = false;
        // Emit update event so parent can refresh the tender list
        this.tenderUpdated.emit();
      },
      error: (error: any) => {
        console.error('Error setting expected fulfillment date:', error);
        this.notificationService.showError('Failed to set expected fulfillment date: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Step 2: Handle PDF file selection
   */
  onPdfFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      if (file.type !== 'application/pdf') {
        this.notificationService.showError('Please select a valid PDF file');
        this.selectedPdfFile = null;
        target.value = '';
        return;
      }
      this.selectedPdfFile = file;
      console.log('PDF file selected:', file.name);
    } else {
      this.selectedPdfFile = null;
    }
  }

  /**
   * Step 2: Upload PDF attachment
   */
  setPdfAttachment() {
    if (!this.selectedPdfFile || !this.createdQuoteId) {
      this.notificationService.showError('Please select a PDF file');
      return;
    }

    this.tenderLoading = true;

    this.quoteService.addAttachmentToQuote(this.createdQuoteId, this.selectedPdfFile, '').subscribe({
      next: (updatedQuote: any) => {
        this.setAttachmentFromQuoteOrFile(updatedQuote, this.selectedPdfFile);

        // Reset the file input to show the updated state
        this.selectedPdfFile = null;
        const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }

        this.notificationService.showSuccess('PDF attachment uploaded successfully!');
        this.tenderLoading = false;
      },
      error: (error: any) => {
        console.error('Error uploading PDF:', error);
        this.notificationService.showError('Failed to upload PDF: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  private setAttachmentFromQuoteOrFile(updatedQuote: any, fallbackFile: File | null): void {
    const attachment = updatedQuote?.quoteItem
      ?.flatMap((item: any) => item?.attachment ?? [])
      ?.find((item: any) => item);

    if (attachment) {
      this.existingAttachment = {
        name: attachment.name || fallbackFile?.name || 'attachment.pdf',
        mimeType: attachment.mimeType || fallbackFile?.type || 'application/pdf',
        content: attachment.content,
        url: attachment.url,
        href: attachment.href,
        path: attachment.path,
        size: attachment.size?.amount ?? fallbackFile?.size
      };
    } else if (fallbackFile) {
      this.existingAttachment = {
        name: fallbackFile.name,
        mimeType: fallbackFile.type || 'application/pdf',
        size: fallbackFile.size
      };
    }

    this.pdfAttachmentSet = Boolean(this.existingAttachment);
  }

  /**
   * Check if all Step 2 fields are filled (drives the Next button enabled state)
   */
  get step2ValidationError(): string {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 10;

    if (this.requestedCompletionDate) {
      const startYear = new Date(this.requestedCompletionDate).getFullYear();
      if (startYear < currentYear || startYear > maxYear) {
        return `Start date year must be between ${currentYear} and ${maxYear}.`;
      }
    }

    if (this.expectedCompletionDate) {
      const endYear = new Date(this.expectedCompletionDate).getFullYear();
      if (endYear < currentYear || endYear > maxYear) {
        return `End date year must be between ${currentYear} and ${maxYear}.`;
      }
    }

    if (this.requestedCompletionDate && this.expectedCompletionDate) {
      if (new Date(this.expectedCompletionDate) <= new Date(this.requestedCompletionDate)) {
        return 'Tender End Date must be after the Tender Start Date.';
      }
    }

    if (!this.requestedCompletionDate || !this.expectedCompletionDate) {
      return 'Both start and end dates are required.';
    }

    if (!this.selectedPdfFile && !this.existingAttachment) {
      return 'A PDF attachment is required.';
    }

    return '';
  }

  isStep2Complete(): boolean {
    return this.step2ValidationError === '';
  }

  /**
   * Proceed from Step 2 to Step 3: saves all data sequentially then moves to provider selection
   */
  proceedToProviderSelection() {
    if (!this.isStep2Complete() || !this.createdQuoteId) return;

    this.tenderLoading = true;
    const pendingPdfFile = this.selectedPdfFile;

    const formattedRequested = this.formatDateForAPI(this.requestedCompletionDate);
    const formattedExpected = this.formatDateForAPI(this.expectedCompletionDate);

    // 1. Set tender start date
    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedRequested, 'expectedFulfillment').pipe(
      // 2. Set tender end date
      switchMap(() => this.quoteService.updateQuoteDate(this.createdQuoteId!, formattedExpected, 'effective')),
      // 3. Upload PDF only if a new file was selected (skip if keeping existing)
      switchMap(() => {
        if (pendingPdfFile) {
          return this.quoteService.addAttachmentToQuote(this.createdQuoteId!, pendingPdfFile, '');
        }
        return of(null);
      })
    ).subscribe({
      next: (updatedQuote: any) => {
        if (pendingPdfFile) {
          this.setAttachmentFromQuoteOrFile(updatedQuote, pendingPdfFile);
          this.selectedPdfFile = null;
        }

        this.tenderLoading = false;
        this.notificationService.showSuccess('Tender details saved successfully!');
        this.tenderCreationStep = 3;

        // Notify parent so the list reflects the saved dates and PDF immediately
        this.tenderUpdated.emit();

        this.resetTenderFilters();
        this.loadFilterOptions();
        this.loadTenderProviders();
      },
      error: (error: any) => {
        this.tenderLoading = false;
        this.notificationService.showError('Failed to save tender details. Please try again.');
        console.error('Error saving tender step 2:', error);
      }
    });
  }

  /**
   * Load providers from the search API.
   * An empty result set is valid (no providers match the active filters).
   * Only falls back to the full party-organisation list when the search
   * endpoint returns an actual HTTP error.
   */
  loadTenderProviders() {
    const loadSequence = ++this.providerLoadSequence;
    this.providerSearchLoading = true;
    this.tenderError = null;
    this.providerSearchWarning = null;

    this.providerService.getProvidersForTenderNew(this.orgFilters).subscribe({
      next: (providers) => {
        if (!this.isCurrentProviderLoad(loadSequence)) return;

        this.tenderProviders = providers ?? [];
        console.log('Search loaded providers:', this.tenderProviders.length);
        this.updateAvailableProviders();

        if (this.tenderCreationStep === 3) {
          this.loadInvitedProviders();
        } else {
          this.providerSearchLoading = false;
        }
      },
      error: (err) => {
        if (!this.isCurrentProviderLoad(loadSequence)) return;

        if (!shouldUseUnfilteredProviderFallback(this.orgFilters)) {
          console.warn('Filtered search endpoint returned an error:', err);
          this.providerSearchWarning = 'Unable to apply the selected filters. Provider candidates were cleared to avoid showing unfiltered results.';
          this.tenderProviders = [];
          this.providerSearchLoading = false;
          this.updateAvailableProviders();
          return;
        }

        // HTTP error from the search endpoint — fall back to the full organisation list
        console.warn('Search endpoint returned an error, falling back to full provider list:', err);
        this.providerService.getProvidersForTender().subscribe({
          next: (fallbackProviders) => {
            if (!this.isCurrentProviderLoad(loadSequence)) return;

            this.tenderProviders = fallbackProviders;
            console.log('Fallback loaded providers:', fallbackProviders.length);
            this.updateAvailableProviders();

            if (this.tenderCreationStep === 3) {
              this.loadInvitedProviders();
            } else {
              this.providerSearchLoading = false;
            }
          },
          error: (fallbackErr) => {
            if (!this.isCurrentProviderLoad(loadSequence)) return;

            this.tenderError = 'Failed to load providers: ' + (fallbackErr.message || 'Unknown error');
            this.providerSearchLoading = false;
            console.error('Fallback endpoint also failed:', fallbackErr);
          }
        });
      }
    });
  }

  private isCurrentProviderLoad(sequence: number): boolean {
    return sequence === this.providerLoadSequence;
  }

  /**
   * Emit filter changes and reload providers
   */
  emitFilters(): void {
    this.orgFilters = buildTenderProviderSearchFilters({
      serviceCategoryLeafNames: this.selectedServiceCategoryLeafNames,
      addressableSectorLeafNames: this.selectedSectorLeafNames,
      integrationFrameworkLeafNames: this.selectedFrameworkLeafNames,
      countryCodes: this.selectedCountryCodes,
      complianceLevels: this.selectedComplianceLevels,
    });
    this.loadTenderProviders();
  }

  /**
   * Are any filters currently active?
   */
  hasActiveFilters(): boolean {
    return hasTenderProviderSearchFilters(this.orgFilters);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.resetTenderFilters();
    this.emitFilters();
  }

  private resetTenderFilters(): void {
    this.serviceCategoryResolutionSequence++;
    this.sectorResolutionSequence++;
    this.frameworkResolutionSequence++;
    this.orgFilters = { categories: [], countries: [], complianceLevels: [] };
    this.selectedServiceCategory = null;
    this.selectedServiceCategoryLeafNames = [];
    this.selectedComplianceLevels = [];
    this.selectedCountryCodes = [];
    this.selectedSectorIds = [];
    this.selectedSectorLeafNames = [];
    this.selectedFrameworkIds = [];
    this.selectedFrameworkLeafNames = [];
    this.closeTenderFilterDropdowns();
  }

  async selectServiceCategory(category: Category | null, event?: Event): Promise<void> {
    event?.stopPropagation();
    const resolutionSequence = ++this.serviceCategoryResolutionSequence;
    this.selectedServiceCategory = category;
    const leafNames = category ? await this.resolveLeafNames(category) : [];

    if (resolutionSequence !== this.serviceCategoryResolutionSequence) return;

    this.selectedServiceCategoryLeafNames = leafNames;
    this.showServiceCategoryDropdown = false;
    this.emitFilters();
  }

  toggleComplianceLevel(code: string, event: Event): void {
    event.stopPropagation();
    this.selectedComplianceLevels = this.toggleValue(this.selectedComplianceLevels, code);
    this.emitFilters();
  }

  toggleCountry(code: string, event: Event): void {
    event.stopPropagation();
    this.selectedCountryCodes = this.toggleValue(this.selectedCountryCodes, code);
    this.emitFilters();
  }

  async toggleAddressableSector(option: Category, event: Event): Promise<void> {
    event.stopPropagation();
    const resolutionSequence = ++this.sectorResolutionSequence;
    const id = option.id ?? option.name;
    this.selectedSectorIds = this.toggleValue(this.selectedSectorIds, id);
    const leafNames = await this.resolveSelectedLeafNames(
      this.addressableSectorOptions,
      this.selectedSectorIds
    );

    if (resolutionSequence !== this.sectorResolutionSequence) return;

    this.selectedSectorLeafNames = leafNames;
    this.emitFilters();
  }

  async toggleIntegrationFramework(option: Category, event: Event): Promise<void> {
    event.stopPropagation();
    const resolutionSequence = ++this.frameworkResolutionSequence;
    const id = option.id ?? option.name;
    this.selectedFrameworkIds = this.toggleValue(this.selectedFrameworkIds, id);
    const leafNames = await this.resolveSelectedLeafNames(
      this.integrationFrameworkOptions,
      this.selectedFrameworkIds
    );

    if (resolutionSequence !== this.frameworkResolutionSequence) return;

    this.selectedFrameworkLeafNames = leafNames;
    this.emitFilters();
  }

  isComplianceSelected(code: string): boolean {
    return this.selectedComplianceLevels.includes(code);
  }

  isCountrySelected(code: string): boolean {
    return this.selectedCountryCodes.includes(code);
  }

  isSectorSelected(option: Category): boolean {
    return this.selectedSectorIds.includes(option.id ?? option.name);
  }

  isFrameworkSelected(option: Category): boolean {
    return this.selectedFrameworkIds.includes(option.id ?? option.name);
  }

  toggleTenderFilterDropdown(
    name: 'serviceCategory' | 'compliance' | 'sector' | 'country' | 'framework',
    event: Event
  ): void {
    event.stopPropagation();
    this.showServiceCategoryDropdown = name === 'serviceCategory' ? !this.showServiceCategoryDropdown : false;
    this.showComplianceDropdown = name === 'compliance' ? !this.showComplianceDropdown : false;
    this.showSectorDropdown = name === 'sector' ? !this.showSectorDropdown : false;
    this.showCountryDropdown = name === 'country' ? !this.showCountryDropdown : false;
    this.showFrameworkDropdown = name === 'framework' ? !this.showFrameworkDropdown : false;
  }

  closeTenderFilterDropdowns(): void {
    this.showServiceCategoryDropdown = false;
    this.showComplianceDropdown = false;
    this.showSectorDropdown = false;
    this.showCountryDropdown = false;
    this.showFrameworkDropdown = false;
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value)
      ? values.filter(current => current !== value)
      : [...values, value];
  }

  private async resolveSelectedLeafNames(options: Category[], selectedIds: string[]): Promise<string[]> {
    const selected = options.filter(option => selectedIds.includes(option.id ?? option.name));
    const nested = await Promise.all(selected.map(option => this.resolveLeafNames(option)));
    return Array.from(new Set(nested.flat()));
  }

  private async resolveLeafNames(category: Category): Promise<string[]> {
    const cacheKey = category.id ?? category.name;
    const cached = this.leafNameCache.get(cacheKey);
    if (cached) return cached;

    const leafNames = await resolveTenderCategoryLeafNames(category, async (id) => {
      const children = await this.api.getCategoriesByParentId(id).catch(() => []);
      return Array.isArray(children) ? children : [];
    });

    this.leafNameCache.set(cacheKey, leafNames);
    return leafNames;
  }

  toggleProviderSelection(providerId: string) {
    // find in local safe list (which stores { provider, quoteId })
    const idx = this._safeInvitedList.findIndex(x => x?.id === providerId);

    if (idx >= 0) {
      // UNCHECK → remove from local safe list
      this._safeInvitedList.splice(idx, 1);
    } else {
      // CHECK → add to local safe list
      const p = this.tenderProviders.find(tp => tp.id === providerId);
      if (p) {
        this._safeInvitedList.push(p);
      }
    }

    // Re-derive selectedProviders + available list in one place
    this.rebuildSelectionAndAvailable();
  }

  private rebuildSelectionAndAvailable(): TenderProviderCandidate[] {
    // 1) selectedProviders = IDs from local safe list
    this.selectedProviders = new Set(
      this._safeInvitedList
        .map(x => x?.id)
        .filter((id): id is string => !!id)
    );

    const invitedProviderIds = new Set(
      this.invitedProviders
        .map(ip => ip?.provider?.id)
        .filter((id): id is string => !!id)
    );

    this.availableProviders = buildStableProviderCandidates({
      tenderProviders: this.tenderProviders,
      invitedProviderIds,
      selectedProviderIds: this.selectedProviders,
    });

    return this.availableProviders;
  }

  /**
   * Load already invited providers by fetching tendering quotes with the coordinator quote's externalId.
   *
   * Name resolution priority:
   *  1. Match the provider's org URN (tender.selectedProviders[0]) against the already-loaded
   *     tenderProviders list — this covers the common case with no extra API calls.
   *  2. Fall back to AccountServiceService.getOrgInfo() for providers not in the cached list
   *     (e.g. when reopening the modal without navigating to the provider-search step first).
   */
  loadInvitedProviders() {
    if (!this.createdQuoteId || !this.currentUserId) {
      console.log('No coordinator quote ID or user ID, skipping invited providers load');
      this.providerSearchLoading = false;
      return;
    }

    console.log('Loading invited providers for externalId:', this.createdQuoteId);

    this.providerSearchLoading = true;

    this.quoteService.getTenderingQuotesByUser(this.currentUserId, API_ROLES.BUYER).subscribe({
      next: async (tenders) => {
        console.log('Received tenders:', tenders);

        // Filter tenders that match our coordinator quote as their parent
        const matchingTenders = tenders.filter(t => t.external_id === this.createdQuoteId && !!t.id);

        // Resolve provider display names, then populate invitedProviders
        const entries = await Promise.all(
          matchingTenders.map(async (tender) => {
            // The org URN lives in selectedProviders[0] (mapped from relatedParty[Seller].id)
            const providerOrgUrn = tender.selectedProviders?.[0];

            // 1. Try the already-loaded provider list first (no extra network call)
            const knownProvider = providerOrgUrn
              ? this.tenderProviders.find(p => p.id === providerOrgUrn)
              : undefined;

            if (knownProvider) {
              return { provider: knownProvider, quoteId: tender.id! };
            }

            // 2. Fall back to account service to get the trading name by org URN
            let tradingName = providerOrgUrn || 'Unknown Provider';
            if (providerOrgUrn) {
              try {
                const org = await this.accountService.getOrgInfo(providerOrgUrn);
                tradingName = org?.tradingName || org?.name || providerOrgUrn;
              } catch {
                // Network error — keep the URN as a recognisable fallback
              }
            }

            const provider: Provider = { id: providerOrgUrn, tradingName };
            return { provider, quoteId: tender.id! };
          })
        );

        this.invitedProviders = entries;
        this.rebuildSelectionAndAvailable();
        console.log('Total invited providers loaded:', this.invitedProviders.length);
        this.providerSearchLoading = false;
      },
      error: (error) => {
        console.error('Error loading invited providers:', error);
        this.providerSearchLoading = false;
      }
    });
  }

  /**
   * Go back from Step 3 to Step 2
   */
  backToStep2() {
    this.tenderCreationStep = 2;
  }

  /**
   * Format date from YYYY-MM-DD to DD/MM/YYYY for display
   */
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  }

  /**
   * Update available providers list
   */
  updateAvailableProviders(): void {
    this.availableProviders = this.getAvailableProviders();
  }

  /**
   * Get available providers (excluding already invited ones)
   */
  getAvailableProviders(): TenderProviderCandidate[] {
    return this.rebuildSelectionAndAvailable();
  }

  /**
   * Step 3: Save providers list by creating tendering quotes for selected providers
   */
  saveProvidersList() {
    if (this.selectedProviders.size === 0) {
      this.notificationService.showError('Please select at least one provider');
      return;
    }

    if (!this.createdQuoteId || !this.currentUserId) {
      this.notificationService.showError('Coordinator quote not found. Please start over.');
      return;
    }

    this.providerInviteSaving = true;
    const providerIds = Array.from(this.selectedProviders);
    const customerMessage = this.tenderTitle;

    console.log('Creating tendering quotes for providers:', providerIds);

    // Create tendering quotes one by one to capture individual quote IDs
    const requests = providerIds.map(providerId => {
      const provider = this._safeInvitedList.find(p => p.id === providerId);

      return this.quoteService.createTenderingQuote(
        this.currentUserId!,
        providerId,
        this.createdQuoteId!,
        customerMessage
      ).toPromise().then(tender => {
        if (!tender || !tender.id || !provider) {
          throw new Error('Failed to create quote for provider');
        }
        return {
          provider: provider,
          quoteId: tender.id
        };
      });
    });

    Promise.all(requests)
      .then(results => {
        console.log('Tendering quotes created:', results);

        // Add to invited providers list
        this.invitedProviders.push(...results);

        // Clear selection and safe list
        this.selectedProviders.clear();
        this._safeInvitedList = [];
        this.rebuildSelectionAndAvailable();

        this.notificationService.showSuccess(`${providerIds.length} provider(s) has been saved for invite`);
        this.tenderUpdated.emit();
        this.providerInviteSaving = false;
      })
      .catch(error => {
        console.error('Error creating tendering quotes:', error);
        this.notificationService.showError('Failed to invite providers: ' + (error.message || 'Unknown error'));
        this.providerInviteSaving = false;
      });
  }

  /**
   * Remove an invited provider by deleting their tendering quote
   */
  removeInvitedProvider(quoteId: string, providerId: string | undefined) {
    if (!quoteId) return;

    this.showConfirmation(
      'Remove Provider',
      'Are you sure you want to remove this provider invitation? This will delete the quote.',
      () => {
        this.providerInviteSaving = true;

        this.quoteService.deleteQuote(quoteId).subscribe({
          next: () => {
            console.log('Quote deleted for provider:', providerId);

            this.completeInvitedProviderRemoval(quoteId, providerId);

            this.notificationService.showSuccess('Provider invitation removed successfully');
            this.providerInviteSaving = false;
          },
          error: (error) => {
            // TEMPORARY WORKAROUND — sandbox environment issue:
            // The TMForum/BAE backend can delete the quote and then return an error when a
            // downstream notification hop times out or is unreachable. In that case, the
            // frontend receives the error after the useful delete side effect already happened.
            //
            // Treat known false-positive delete errors as success so the UI stays consistent with
            // the backend state and does not show a failure for a removed invitation.
            //
            // TODO: Remove this workaround once the sandbox downstream service is reachable
            // and the BAE no longer returns errors on successful quote deletion.
            const isKnownFalsePositive = this.isKnownDeleteQuoteFalsePositive(error);

            if (isKnownFalsePositive) {
              console.warn(
                '[WORKAROUND] deleteQuote returned a false-positive error for quoteId:', quoteId,
                '— removing from UI anyway.'
              );
              this.completeInvitedProviderRemoval(quoteId, providerId);
              this.notificationService.showSuccess('Provider invitation removed successfully');
            } else {
              console.error('Error deleting quote:', error);
              this.notificationService.showError('Failed to remove provider invitation: ' + (error.message || 'Unknown error'));
            }
            this.providerInviteSaving = false;
          }
        });
      },
      'Remove',
      'inline-flex h-10 items-center rounded-lg border border-[#F4C7C7] bg-white px-4 text-sm font-semibold text-[#B42318] transition-colors hover:bg-[#FFF1F1] focus:outline-none focus:ring-2 focus:ring-[#F4C7C7] disabled:cursor-not-allowed disabled:opacity-50'
    );
  }

  private completeInvitedProviderRemoval(quoteId: string, providerId?: string): void {
    const resolvedProviderId = providerId ?? this.invitedProviders.find(ip => ip.quoteId === quoteId)?.provider?.id;

    this.invitedProviders = this.invitedProviders.filter(ip => ip.quoteId !== quoteId);

    if (resolvedProviderId) {
      this.selectedProviders.delete(resolvedProviderId);
      this._safeInvitedList = this._safeInvitedList.filter(provider => provider.id !== resolvedProviderId);
    }

    this.rebuildSelectionAndAvailable();
  }

  private isKnownDeleteQuoteFalsePositive(error: any): boolean {
    return error?.status === 404 ||
      error?.status === 504 ||
      (error?.status === 500 && error?.error?.error === 'Service unreachable');
  }

  /**
   * Step 3: Finalize and complete tender creation
   */
  finalizeTender() {
    if (this.invitedProviders.length === 0) {
      this.notificationService.showError('Please invite at least one provider first');
      return;
    }

    if (!this.createdQuoteId) {
      this.notificationService.showError('Coordinator quote not found');
      return;
    }

    this.showConfirmation(
      'Finalize Tender',
      'Are you sure you want to finalize the tender? This will notify all invited providers.',
      () => this.executeFinalizeTender(),
      'Finalize',
      'inline-flex h-10 items-center rounded-lg bg-[#006B4A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00523A] focus:outline-none focus:ring-2 focus:ring-[#B8E6D1] disabled:cursor-not-allowed disabled:opacity-50'
    );
  }

  private executeFinalizeTender() {
    this.tenderLoading = true;

    // Get the coordinator quote to extract the dates
    this.quoteService.getQuoteById(this.createdQuoteId!).pipe(
      switchMap(coordinatorQuote => {
        console.log('Coordinator quote retrieved:', coordinatorQuote);

        const formattedEffectiveDate = this.formatDateForAPI(this.expectedCompletionDate);
        const formattedExpectedFulfillmentDate = this.formatDateForAPI(this.requestedCompletionDate);

        console.log(`Copying dates to ${this.invitedProviders.length} provider quotes`);

        // Create array of date update observables for all invited provider quotes
        const dateUpdateObservables = this.invitedProviders.flatMap(invitedProvider => {
          const quoteId = invitedProvider.quoteId;

          return [
            this.quoteService.updateQuoteDate(quoteId, formattedEffectiveDate, 'expected'),
            this.quoteService.updateQuoteDate(quoteId, formattedExpectedFulfillmentDate, 'requested')
          ];
        });

        if (dateUpdateObservables.length === 0) {
          return of([]);
        }

        return forkJoin(dateUpdateObservables);
      }),
      switchMap(dateUpdateResults => {
        console.log(`Successfully updated dates for ${dateUpdateResults.length / 2} provider quotes`);

        // Update coordinator quote status to "inProgress"
        return this.quoteService.updateQuoteStatus(this.createdQuoteId!, 'inProgress');
      })
    ).subscribe({
      next: (updatedQuote: any) => {
        console.log('Coordinator quote status updated to inProgress:', updatedQuote);

        this.notificationService.showSuccess('Dates copied to all provider quotes and notifications sent to providers');

        this.tenderLoading = false;
        this.closeTenderModal();

        // Emit success - parent component will refresh the list
        this.tenderCreated.emit(updatedQuote);
      },
      error: (error: any) => {
        console.error('Error finalizing tender:', error);
        this.notificationService.showError('Failed to finalize tender: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Load filter options for Tender Provider Search.
   * Only fetches the option lists — does NOT reset selected filter values
   * or trigger a provider reload.
   */
  private loadFilterOptions(): void {
    this.countryOptionsLoading = true;
    this.providerService.getProviderCountryOptions().subscribe({
      next: (options) => {
        this.countryOptions = options;
        this.countryOptionsLoading = false;
      },
      error: (err) => {
        console.warn('Failed to load provider countries', err);
        this.countryOptions = [];
        this.countryOptionsLoading = false;
      }
    });

    this.loadCatalogueFacetOptions();
  }

  private async loadCatalogueFacetOptions(): Promise<void> {
    this.catalogueOptionsLoading = true;
    try {
      const roots = await this.api.getDefaultCategories();
      const options = await resolveTenderCatalogueFacetOptions(
        Array.isArray(roots) ? roots : [],
        (id) => this.api.getCategoriesByParentId(id)
      );

      this.serviceCategoryOptions = options.serviceCategories;
      this.addressableSectorOptions = options.addressableSectors;
      this.integrationFrameworkOptions = options.integrationFrameworks;
    } catch (error) {
      console.warn('Tender catalogue filters failed:', error);
      this.serviceCategoryOptions = [];
      this.addressableSectorOptions = [];
      this.integrationFrameworkOptions = [];
    } finally {
      this.catalogueOptionsLoading = false;
    }
  }
}

