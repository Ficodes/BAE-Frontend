import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuoteService } from '../../services/quote.service';
import { LocalStorageService } from "src/app/services/local-storage.service";
import { NotificationService } from 'src/app/services/notification.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { Quote, QuoteStateType } from 'src/app/models/quote.model';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { QuoteDetailsModalComponent } from 'src/app/shared/quote-details-modal/quote-details-modal.component';
import { ChatModalComponent } from 'src/app/shared/chat-modal/chat-modal.component';
import { AttachmentModalComponent } from 'src/app/shared/attachment-modal/attachment-modal.component';
import { LoginInfo } from 'src/app/models/interfaces';
import { QUOTE_STATUSES, TAILORED_STATUSES_LABELS_CUSTOMER, TAILORED_STATUSES_LABELS_PROVIDER } from 'src/app/models/quote.constants';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent, ConfirmDialogComponent, QuoteDetailsModalComponent, ChatModalComponent, AttachmentModalComponent],
  template: `
    <app-notification></app-notification>
    
    <div class="w-full mx-auto px-6 py-8">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tailored offerings Dashboard</h1>
          <a
            href="https://knowledgebase.dome-marketplace.eu/books/tailored-offering-guide"
            target="_blank"
            rel="noopener noreferrer"
            title="Click here for the guide of the Tailored process"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
          </a>
        </div>
        <div class="flex space-x-3">
          <button
            (click)="refreshQuotes()"
            [disabled]="loading"
            class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {{ loading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <!-- Role Tabs -->
      <div class="mb-6">
        <div class="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            (click)="selectRole('customer')"
            [class]="getRoleTabClass('customer')"
            class="flex-1 px-8 py-4 text-2xl font-medium rounded-md transition-colors"
          >
            <svg class="w-6 h-6 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            As Customer
          </button>
          <button
            (click)="selectRole('seller')"
            [class]="getRoleTabClass('seller')"
            class="flex-1 px-8 py-4 text-2xl font-medium rounded-md transition-colors"
          >
            <svg class="w-6 h-6 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            As Provider
          </button>
        </div>
      </div>

      <!-- Status Filter -->
      <div class="mb-6">
        <div class="flex items-center space-x-4">
          <svg class="w-5 h-5 text-gray-500 dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-100">Filter by status</span>
          <select
            [(ngModel)]="statusFilter"
            (ngModelChange)="filterQuotesByStatus()"
            class="form-select rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option [value]="QUOTE_STATUSES.PENDING">Pending</option>
            <option [value]="QUOTE_STATUSES.IN_PROGRESS">In Progress</option>
            <option [value]="QUOTE_STATUSES.APPROVED">Approved</option>
            <option [value]="QUOTE_STATUSES.CANCELLED">Cancelled</option>
            <option [value]="QUOTE_STATUSES.ACCEPTED">Accepted</option>
          </select>
        </div>
      </div>
      
      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      
      <!-- Error State -->
      <div *ngIf="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading quotes</h3>
            <p class="mt-1 text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>
      
      <!-- Quotes List -->
      <div *ngIf="!loading && !error" class="bg-white dark:bg-gray-700 shadow-md rounded-lg overflow-hidden">
        <div *ngIf="filteredQuotes.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No quotes found</h3>
          <p class="mt-1 text-sm text-gray-500">No orders found</p>
        </div>
        
        <!-- Quotes Header -->
        <div *ngIf="filteredQuotes.length > 0" class="bg-gray-50 dark:bg-gray-800 px-6 py-3">
          <div class="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            <div class="col-span-2">REQUEST DATE</div>
            <div class="col-span-3">{{ selectedRole === 'customer' ? 'PROVIDER' : 'CUSTOMER' }}</div>
            <div class="col-span-4">PRODUCT</div>
            <div class="col-span-1">STATUS</div>
            <div class="col-span-2">ACTIONS</div>
          </div>
        </div>
        
        <!-- Quote Rows -->
        <div *ngFor="let quote of filteredQuotes" class="quote-row">
          <div class="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-gray-100 dark:border-gray-600 transition-colors"
               [class.bg-gray-50]="isQuoteFinalized(quote)"
               [class.dark:bg-gray-800]="isQuoteFinalized(quote)"
               [class.hover:bg-gray-50]="!isQuoteFinalized(quote)"
               [class.dark:hover:bg-gray-800]="!isQuoteFinalized(quote)"
               [attr.data-quote-id]="quote.id">

            <!-- Data Richiesta (Creation Date) -->
            <div class="col-span-2 text-sm text-gray-600 dark:text-gray-400">
              {{ quote.quoteDate | date:'dd-MM-yyyy' }}
            </div>

            <!-- Customer/Provider Name -->
            <div class="col-span-3 text-sm font-medium text-gray-900 dark:text-white">
              {{ getOtherPartyName(quote) }}
            </div>

            <!-- Product Name -->
            <div class="col-span-4 text-sm text-gray-700 dark:text-gray-300">
              {{ getProductName(quote) }}
            </div>

            <!-- Status -->
            <div class="col-span-1">
              <span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    [ngClass]="getStateClass(getPrimaryState(quote))">
                {{ getStatusLabel(quote) }}
              </span>
            </div>

            <!-- Actions (Chat + Details only) -->
            <div class="col-span-2 flex items-center gap-2">
              <!-- Chat -->
              <button
                [disabled]="isActionDisabled(quote, 'chat')"
                (click)="openChat(quote)"
                [class]="getIconButtonClass(quote, 'chat', 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200')"
                title="Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              <!-- View Details -->
              <button
                [disabled]="isActionDisabled(quote, 'viewDetails')"
                (click)="viewDetails(quote)"
                class="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-1"
                [class.opacity-50]="isActionDisabled(quote, 'viewDetails')"
                [class.cursor-not-allowed]="isActionDisabled(quote, 'viewDetails')"
              >
                Details
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showDeleteConfirm"
      title="Delete Quote"
      [message]="deleteConfirmMessage"
      confirmText="Delete"
      confirmButtonClass="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      (confirm)="deleteQuote()"
      (cancel)="showDeleteConfirm = false"
    ></app-confirm-dialog>

    <!-- Accept Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showAcceptConfirm"
      title="Accept Quote"
      [message]="acceptConfirmMessage"
      confirmText="Accept"
      confirmButtonClass="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      (confirm)="acceptConfirmCallback && acceptConfirmCallback()"
      (cancel)="showAcceptConfirm = false"
    ></app-confirm-dialog>

    <!-- Cancel Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showCancelConfirm"
      title="Cancel Quote"
      [message]="cancelConfirmMessage"
      confirmText="Cancel Quote"
      confirmButtonClass="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      (confirm)="cancelConfirmCallback && cancelConfirmCallback()"
      (cancel)="showCancelConfirm = false"
    ></app-confirm-dialog>

    <!-- State Update Modal -->
    <div *ngIf="showStateUpdate" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Update Quote State</h3>
          <div class="space-y-3">
            <div *ngFor="let state of availableStates" class="flex items-center">
              <input 
                [id]="'state-' + state" 
                [(ngModel)]="selectedState" 
                [value]="state" 
                type="radio" 
                class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
              >
              <label [for]="'state-' + state" class="ml-3 block text-sm font-medium text-gray-700">
                {{ getStateDisplay(state) }}
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button
              (click)="showStateUpdate = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              (click)="confirmStateUpdate()"
              [disabled]="!selectedState"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quote Details Modal -->
    <app-quote-details-modal
      [isOpen]="showQuoteDetailsModal"
      [quoteId]="selectedQuoteId"
      [currentUserRole]="selectedRole"
      [currentUserId]="currentUserId || ''"
      (close)="closeQuoteDetailsModal()"
      (quoteUpdated)="onQuoteUpdated($event)"
    ></app-quote-details-modal>

    <!-- Chat Modal -->
    <app-chat-modal
      [isOpen]="showChatModal"
      [quoteId]="selectedChatQuoteId"
      (close)="closeChatModal()"
    ></app-chat-modal>

    <!-- Attachment Modal -->
    <app-attachment-modal
      [isOpen]="showAttachmentModal"
      [quote]="selectedAttachmentQuote"
      (close)="closeAttachmentModal()"
      (uploadSuccess)="onAttachmentUploaded($event)"
    ></app-attachment-modal>

    <!-- Date Picker Modal -->
    <div *ngIf="showDatePickerModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ datePickerType === 'requested' ? 'Add Requested Completion Date' : 'Add Expected Completion Date' }}
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            {{ datePickerType === 'requested' ? 'Select when you need this quote to be completed:' : 'Select when you expect to complete this quote:' }}
          </p>
          
          <div class="mb-6">
            <label for="completion-date" class="block text-sm font-medium text-gray-700 mb-2">
              Completion Date
            </label>
            <input 
              id="completion-date"
              type="date" 
              [(ngModel)]="selectedDate"
              [min]="getTomorrowDate()"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
            <p class="text-xs text-gray-500 mt-1">Date must be in the future</p>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              (click)="closeDatePickerModal()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              (click)="confirmDateUpdate()"
              [disabled]="!selectedDate || !isDateValid()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Save Date
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .status-badge {
      @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
    }
    
    .status-pending {
      @apply bg-yellow-100 text-yellow-800;
    }
    
    .status-inProgress {
      @apply bg-blue-100 text-blue-800;
    }
    
    .status-approved {
      @apply bg-green-100 text-green-800;
    }
    
    .status-rejected {
      @apply bg-red-100 text-red-800;
    }
    
    .status-cancelled {
      @apply bg-gray-100 text-gray-800;
    }
    
    .status-accepted {
      @apply bg-emerald-100 text-emerald-800;
    }
    
    .status-unknown {
      @apply bg-gray-100 text-gray-600;
    }
  `]
})
export class QuoteListComponent implements OnInit {
  private router = inject(Router);
  private quoteService = inject(QuoteService);
  private localStorage = inject(LocalStorageService);
  private notificationService = inject(NotificationService);
  private accountService = inject(AccountServiceService);
  private productService = inject(ApiServiceService);

  quotes: Quote[] = [];
  filteredQuotes: Quote[] = [];
  loading = false;
  error: string | null = null;
  showDeleteConfirm = false;
  deleteConfirmMessage = '';
  quoteToDelete: Quote | null = null;

  // Confirmation dialogs
  showAcceptConfirm = false;
  acceptConfirmMessage = '';
  acceptConfirmCallback: (() => void) | null = null;
  showCancelConfirm = false;
  cancelConfirmMessage = '';
  cancelConfirmCallback: (() => void) | null = null;

  // Data enrichment maps
  organizationNames: Map<string, string> = new Map();
  productNames: Map<string, string> = new Map();

  // State update modal
  showStateUpdate = false;
  quoteToUpdate: Quote | null = null;
  selectedState: QuoteStateType | null = null;
  availableStates: QuoteStateType[] = [
    QUOTE_STATUSES.PENDING,
    QUOTE_STATUSES.IN_PROGRESS,
    QUOTE_STATUSES.APPROVED,
    QUOTE_STATUSES.REJECTED,
    QUOTE_STATUSES.CANCELLED,
    QUOTE_STATUSES.ACCEPTED
  ];

  // Expose constants to template
  readonly QUOTE_STATUSES = QUOTE_STATUSES;

  // Role management
  selectedRole: 'customer' | 'seller' = 'customer';
  currentUserId: string | null = null;

  // Filtering
  statusFilter: string = '';

  // Quote Details Modal
  showQuoteDetailsModal = false;
  selectedQuoteId: string | null = null;

  // Chat Modal
  showChatModal = false;
  selectedChatQuoteId: string | null = null;

  // Attachment Modal
  showAttachmentModal = false;
  selectedAttachmentQuote: Quote | null = null;

  // Date Picker Modal
  showDatePickerModal = false;
  selectedDateQuote: Quote | null = null;
  datePickerType: 'requested' | 'expected' | null = null;
  selectedDate: string = '';

  ngOnInit() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;

    if(aux.logged_as == aux.id){
      this.currentUserId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.currentUserId = loggedOrg.partyId
    }

    if (this.currentUserId) {
      this.loadQuotes();
    } else {
      this.error = 'User not authenticated';
    }
  }

  loadQuotes() {
    if (!this.currentUserId) {
      this.error = 'User not authenticated';
      return;
    }

    this.loading = true;
    this.error = null;

    this.quoteService.getQuotesByUserAndRole(this.currentUserId, this.selectedRole).subscribe({
      next: (quotes) => {
        this.quotes = quotes;


        // Enrich quote data with organization and product names
        this.enrichQuoteData(quotes);

        this.filterQuotesByStatus();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load quotes:', error);
        this.error = 'Failed to load quotes. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Check if an ID is an organization URN that can be fetched from the API
   */
  private isOrganizationId(id: string): boolean {
    return id.startsWith('urn:ngsi-ld:organization:');
  }

  /**
   * Enrich quote data by fetching organization names and product names
   */
  private enrichQuoteData(quotes: Quote[]) {
    // Collect unique organization IDs and product offering IDs
    const orgIds = new Set<string>();
    const productIds = new Set<string>();

    quotes.forEach(quote => {
      // Collect organization IDs from relatedParty (only valid organization URNs)
      quote.relatedParty?.forEach(party => {
        if (party.id && !this.organizationNames.has(party.id) && this.isOrganizationId(party.id)) {
          orgIds.add(party.id);
        }
      });

      // Collect product offering IDs from quoteItems
      quote.quoteItem?.forEach(item => {
        if (item.productOffering?.id && !this.productNames.has(item.productOffering.id)) {
          productIds.add(item.productOffering.id);
        }
      });
    });

    // Fetch organization names in parallel
    if (orgIds.size > 0) {
      const orgRequests = Array.from(orgIds).map(id => {
        return this.accountService.getOrgInfo(id).then(
          (org: any) => ({ id, name: org?.tradingName || org?.name || id }),
          () => ({ id, name: id }) // Fallback to ID on error
        );
      });

      Promise.all(orgRequests).then(results => {
        results.forEach(({ id, name }) => {
          this.organizationNames.set(id, name);
        });
        // Trigger change detection by reassigning filteredQuotes
        this.filteredQuotes = [...this.filteredQuotes];
      });
    }

    // Fetch product names in parallel
    console.log('Product IDs to fetch:', Array.from(productIds));
    if (productIds.size > 0) {
      const productRequests = Array.from(productIds).map(id => {
        console.log('Fetching product:', id);
        return this.productService.getProductById(id).then(
          (product: any) => {
            console.log('Product fetched:', id, product?.name);
            return { id, name: product?.name || 'Product Name Unavailable' };
          },
          (error) => {
            console.error('Product fetch error:', id, error);
            return { id, name: 'Product Name Unavailable' }; // Fallback to placeholder on error
          }
        );
      });

      Promise.all(productRequests).then(results => {
        results.forEach(({ id, name }) => {
          this.productNames.set(id, name);
        });
        console.log('Product names map:', Array.from(this.productNames.entries()));
        // Trigger change detection by reassigning filteredQuotes
        this.filteredQuotes = [...this.filteredQuotes];
      });
    }
  }

  refreshQuotes() {
    this.loadQuotes();
  }

  selectRole(role: 'customer' | 'seller') {
    this.selectedRole = role;
    this.loadQuotes();
  }

  getRoleTabClass(role: 'customer' | 'seller'): string {
    return this.selectedRole === role
      ? 'bg-white dark:bg-gray-600 text-blue-400 shadow-sm'
      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200';
  }

  filterQuotesByStatus() {
    if (!this.statusFilter) {
      this.filteredQuotes = [...this.quotes];
    } else {
      this.filteredQuotes = this.quotes.filter(quote => {
        const primaryState = this.getPrimaryState(quote);
        return primaryState === this.statusFilter;
      });
    }

    // Sort by quoteDate descending (newest first)
    this.filteredQuotes.sort((a, b) => {
      const dateA = a.quoteDate ? new Date(a.quoteDate).getTime() : 0;
      const dateB = b.quoteDate ? new Date(b.quoteDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  createQuote() {
    this.router.navigate(['/quotes/new']);
  }

  viewDetails(quote: Quote) {
    this.selectedQuoteId = quote.id!;
    this.showQuoteDetailsModal = true;
  }

  viewQuote(quote: Quote) {
    this.selectedQuoteId = quote.id!;
    this.showQuoteDetailsModal = true;
  }

  closeQuoteDetailsModal() {
    this.showQuoteDetailsModal = false;
    this.selectedQuoteId = null;
  }

  onQuoteUpdated(updatedQuote: Quote) {
    // Update the quote in the list
    const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
    if (index !== -1) {
      this.quotes[index] = updatedQuote;
      this.filterQuotesByStatus();
    }

    const shortId = this.extractShortId(updatedQuote.id);
    const state = this.getPrimaryState(updatedQuote);
    this.notificationService.showSuccess(`Quote ${shortId} has been updated to ${state}.`);
  }

  closeChatModal() {
    this.showChatModal = false;
    this.selectedChatQuoteId = null;
  }

  closeAttachmentModal() {
    this.showAttachmentModal = false;
    this.selectedAttachmentQuote = null;
  }

  onAttachmentUploaded(updatedQuote: Quote) {
    // Update the quote in the list
    const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
    if (index !== -1) {
      this.quotes[index] = updatedQuote;
      this.filterQuotesByStatus();
    }

    // If the current user is a provider (seller) and the quote is in progress,
    // automatically update the status to 'approved' after successful PDF upload
    if (this.selectedRole === 'seller' && this.getPrimaryState(updatedQuote) === QUOTE_STATUSES.IN_PROGRESS) {
      console.log('Provider uploaded PDF, updating quote status to approved:', updatedQuote.id);

      this.quoteService.updateQuoteStatus(updatedQuote.id!, QUOTE_STATUSES.APPROVED).subscribe({
        next: (approvedQuote) => {
          // Update the quote again with the new status
          const approvedIndex = this.quotes.findIndex(q => q.id === approvedQuote.id);
          if (approvedIndex !== -1) {
            this.quotes[approvedIndex] = approvedQuote;
            this.filterQuotesByStatus();
          }
          
          const shortId = this.extractShortId(updatedQuote.id);
          console.log('Quote status automatically updated to approved after PDF upload');
          this.notificationService.showSuccess(`Quote ${shortId} has been approved after PDF upload.`);
        },
        error: (error) => {
          console.error('Error updating quote status to approved:', error);
          this.notificationService.showError(`Error updating quote status: ${error.message || 'Unknown error'}`);
        }
      });
    }
  }







  updateQuoteState(quote: Quote) {
    this.quoteToUpdate = quote;
    this.selectedState = quote.state || null;
    this.showStateUpdate = true;
  }

  confirmStateUpdate() {
    if (this.quoteToUpdate && this.selectedState) {
      this.quoteService.updateQuoteState(this.quoteToUpdate.id!, this.selectedState).subscribe({
        next: (updatedQuote) => {
          const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
          if (index !== -1) {
            this.quotes[index] = updatedQuote;
            this.filterQuotesByStatus();
          }
          this.showStateUpdate = false;
          this.notificationService.showSuccess('Quote state updated successfully');
        },
        error: (error) => {
          console.error('Failed to update quote state:', error);
          this.notificationService.showError('Failed to update quote state');
        }
      });
    }
  }

  confirmDelete(quote: Quote) {
    this.quoteToDelete = quote;
    this.deleteConfirmMessage = `Are you sure you want to delete Quote ${this.extractShortId(quote.id)}? This action cannot be undone.`;
    this.showDeleteConfirm = true;
  }

  deleteQuote() {
    if (this.quoteToDelete) {
      this.quoteService.deleteQuote(this.quoteToDelete.id!).subscribe({
        next: () => {
          this.quotes = this.quotes.filter(q => q.id !== this.quoteToDelete!.id);
          this.filterQuotesByStatus();
          this.showDeleteConfirm = false;
          this.notificationService.showSuccess('Quote deleted successfully');
        },
        error: (error) => {
          console.error('Failed to delete quote:', error);
          this.notificationService.showError('Failed to delete quote');
        }
      });
    }
  }

  // Quote action methods (migrated from QuoteRow.js)
  openChat(quote: Quote) {
    // Open chat modal for messaging
    this.selectedChatQuoteId = quote.id!;
    this.showChatModal = true;
  }

  downloadAttachment(quote: Quote) {
    try {
      this.quoteService.downloadAttachment(quote);
      this.notificationService.showSuccess('Download started');
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      this.notificationService.showError(error.message || 'Error downloading attachment');
    }
  }

  addAttachment(quote: Quote) {
    // Open the attachment modal
    this.selectedAttachmentQuote = quote;
    this.showAttachmentModal = true;
  }

  acceptQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    this.acceptConfirmMessage = 'Are you sure you want to accept this request?';
    this.acceptConfirmCallback = () => {
      console.log('Accepting quote request:', quote.id);

      this.quoteService.updateQuoteStatus(quote.id!, QUOTE_STATUSES.IN_PROGRESS).subscribe({
        next: (updatedQuote) => {
          const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
          if (index !== -1) {
            this.quotes[index] = updatedQuote;
            this.filterQuotesByStatus();
          }
          console.log('Quote request successfully accepted');
          this.notificationService.showSuccess(`Quote request ${shortId} has been accepted and is now in progress.`);
        },
        error: (error) => {
          console.error('Error accepting quote request:', error);
          this.notificationService.showError(`Error accepting quote request: ${error.message || 'Unknown error'}`);
        }
      });
      this.showAcceptConfirm = false;
    };
    this.showAcceptConfirm = true;
  }

  acceptQuoteCustomer(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    this.acceptConfirmMessage = 'Are you sure you want to accept the quotation?';
    this.acceptConfirmCallback = () => {
      console.log('Customer accepting quotation:', quote.id);

      this.quoteService.updateQuoteStatus(quote.id!, QUOTE_STATUSES.ACCEPTED).subscribe({
        next: (updatedQuote) => {
          const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
          if (index !== -1) {
            this.quotes[index] = updatedQuote;
            this.filterQuotesByStatus();
          }
          console.log('Quotation successfully accepted by customer');
          this.notificationService.showSuccess(`Quotation ${shortId} has been accepted successfully.`);
        },
        error: (error) => {
          console.error('Error accepting quotation:', error);
          this.notificationService.showError(`Error accepting quotation: ${error.message || 'Unknown error'}`);
        }
      });
      this.showAcceptConfirm = false;
    };
    this.showAcceptConfirm = true;
  }

  // Date picker methods
  addRequestedDate(quote: Quote) {
    this.selectedDateQuote = quote;
    this.datePickerType = 'requested';
    this.selectedDate = '';
    this.showDatePickerModal = true;
  }

  addExpectedDate(quote: Quote) {
    this.selectedDateQuote = quote;
    this.datePickerType = 'expected';
    this.selectedDate = '';
    this.showDatePickerModal = true;
  }

  closeDatePickerModal() {
    this.showDatePickerModal = false;
    this.selectedDateQuote = null;
    this.datePickerType = null;
    this.selectedDate = '';
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  isDateValid(): boolean {
    if (!this.selectedDate) return false;
    const selectedDateObj = new Date(this.selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDateObj > today;
  }

  confirmDateUpdate() {
    if (!this.selectedDateQuote || !this.datePickerType || !this.selectedDate || !this.isDateValid()) {
      return;
    }

    const shortId = this.extractShortId(this.selectedDateQuote.id);
    const dateType = this.datePickerType;
    
    // Format date as DD-MM-YYYY as required by the API
    const dateObj = new Date(this.selectedDate);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;
    
    console.log(`Setting ${dateType} completion date for quote:`, this.selectedDateQuote.id, 'Date:', formattedDate);
    
    this.quoteService.updateQuoteDate(this.selectedDateQuote.id!, formattedDate, dateType).subscribe({
      next: (updatedQuote) => {
        const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
        if (index !== -1) {
          this.quotes[index] = updatedQuote;
          this.filterQuotesByStatus();
        }
        console.log(`${dateType} completion date successfully updated`);
        this.notificationService.showSuccess(`${dateType === 'requested' ? 'Requested' : 'Expected'} completion date for quote ${shortId} has been set successfully.`);
        this.closeDatePickerModal();
      },
      error: (error) => {
        console.error(`Error setting ${dateType} completion date:`, error);
        this.notificationService.showError(`Error setting ${dateType} completion date: ${error.message || 'Unknown error'}`);
      }
    });
  }

  cancelQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    this.cancelConfirmMessage = `Are you sure you want to cancel quote ${shortId}? This action cannot be undone and will disable all other quote actions.`;
    this.cancelConfirmCallback = () => {
      console.log('Cancelling quote:', quote.id);

      this.quoteService.updateQuoteStatus(quote.id!, QUOTE_STATUSES.CANCELLED).subscribe({
        next: (updatedQuote) => {
          const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
          if (index !== -1) {
            this.quotes[index] = updatedQuote;
            this.filterQuotesByStatus();
          }
          console.log('Quote successfully cancelled');
          this.notificationService.showSuccess(`Quote ${shortId} has been cancelled successfully.`);
        },
        error: (error) => {
          console.error('Error cancelling quote:', error);
          this.notificationService.showError(`Error cancelling quote: ${error.message || 'Unknown error'}`);
        }
      });
      this.showCancelConfirm = false;
    };
    this.showCancelConfirm = true;
  }

  createOffer(quote: Quote) {
    // we send the current quote ID to open the proper from
    this.router.navigate(['/my-offerings'], { state: {
      quoteId: quote.id
    } });
  }

  // Utility methods (migrated from QuoteRow.js)
  extractShortId(id: string | undefined): string {
    if (!id) return 'N/A';
    // Extract last 8 characters or return full ID if shorter
    return id.length > 8 ? id.slice(-8) : id;
  }

  /**
   * Get the name of the other party based on the current role view.
   * If viewing "as Customer" → show Provider/Seller name
   * If viewing "as Provider" → show Buyer name
   */
  getOtherPartyName(quote: Quote): string {
    if (!quote.relatedParty || quote.relatedParty.length === 0) {
      return 'Unknown';
    }

    // Determine which role to look for based on current view
    // Use environment roles: BUYER_ROLE = 'Buyer', SELLER_ROLE = 'Seller'
    const targetRole = this.selectedRole === 'customer'
      ? environment.SELLER_ROLE
      : environment.BUYER_ROLE;

    // Find the party with the target role (case-insensitive)
    const party = quote.relatedParty.find(p =>
      p.role?.toLowerCase() === targetRole.toLowerCase()
    );

    if (!party?.id) {
      return 'Unknown';
    }

    // Look up the name from the enriched data map
    const enrichedName = this.organizationNames.get(party.id);
    if (enrichedName && enrichedName !== party.id) {
      return enrichedName;
    }

    // Fallback: show loading indicator or shortened ID
    return 'Loading...';
  }

  /**
   * Get the product name from the quote's first quote item.
   */
  getProductName(quote: Quote): string {
    if (!quote.quoteItem || quote.quoteItem.length === 0) {
      return 'Unknown Product';
    }

    const firstItem = quote.quoteItem[0];
    const productId = firstItem.productOffering?.id;

    // Try to get name from productOffering if available (inline in quote data)
    if (firstItem.productOffering?.name) {
      return firstItem.productOffering.name;
    }

    // Look up the name from the enriched data map
    if (productId) {
      const enrichedName = this.productNames.get(productId);
      if (enrichedName) {
        return enrichedName;
      }
      // Still loading
      return 'Loading...';
    }

    // Fallback to product name
    if (firstItem.product?.name) {
      return firstItem.product.name;
    }

    return 'Unknown Product';
  }

  getPrimaryState(quote: Quote): string {
    // First try quoteItem state (this is where the actual state is stored)
    if (Array.isArray(quote.quoteItem) && quote.quoteItem.length > 0) {
      return quote.quoteItem[0].state || 'unknown';
    }

    // Fallback to main quote state if quoteItem state is not available
    if (quote.state) {
      return quote.state;
    }

    return 'unknown';
  }

  /**
   * Get user-friendly status label for a quote based on role
   */
  getStatusLabel(quote: Quote): string {
    const state = this.getPrimaryState(quote);

    // Use appropriate label based on user role
    const labels = this.selectedRole === 'customer'
      ? TAILORED_STATUSES_LABELS_CUSTOMER
      : TAILORED_STATUSES_LABELS_PROVIDER;

    // Map status to label
    switch (state) {
      case QUOTE_STATUSES.PENDING:
        return labels.PENDING;
      case QUOTE_STATUSES.IN_PROGRESS:
        return labels.IN_PROGRESS;
      case QUOTE_STATUSES.APPROVED:
        return labels.APPROVED;
      case QUOTE_STATUSES.ACCEPTED:
        return labels.ACCEPTED;
      case QUOTE_STATUSES.CANCELLED:
        return labels.CANCELLED;
      case QUOTE_STATUSES.REJECTED:
        return labels.REJECTED;
      default:
        return state;
    }
  }

  hasAttachment(quote: Quote): boolean {
    return Array.isArray(quote.quoteItem) && 
           quote.quoteItem.some(qi => qi.attachment && qi.attachment.length > 0);
  }

  isQuoteCancelled(quote: Quote): boolean {
    // Only check quoteItem state (this is the source of truth)
    return quote.quoteItem?.some(item => item.state === QUOTE_STATUSES.CANCELLED) || false;
  }

  isQuoteAccepted(quote: Quote): boolean {
    // Only check quoteItem state (this is the source of truth)
    return quote.quoteItem?.some(item => item.state === QUOTE_STATUSES.ACCEPTED) || false;
  }

  isQuoteFinalized(quote: Quote): boolean {
    return this.isQuoteCancelled(quote) || this.isQuoteAccepted(quote);
  }

  isActionDisabled(quote: Quote, actionType: string): boolean {
    const isCancelled = this.isQuoteCancelled(quote);
    const isAccepted = this.isQuoteAccepted(quote);
    const isFinalized = this.isQuoteFinalized(quote);

    switch (actionType) {
      case 'viewDetails':
      case 'chat':
        return isCancelled; // Only disabled for cancelled quotes
      case 'addAttachment':
      case 'cancel':
        return isFinalized; // Disabled for both accepted and cancelled
      case 'downloadAttachment':
        return isCancelled; // Only disabled for cancelled quotes, customers can download when accepted
      case 'accept':
        // Accept button is only for providers when quote is pending
        // It should not be disabled by finalization since it only shows when pending
        return false;
      case 'acceptCustomer':
        // Customer accept button is only for customers when quote is approved
        // It should not be disabled by finalization since it only shows when approved
        return false;
      case 'addRequestedDate':
      case 'addExpectedDate':
        // Date picker buttons should not be disabled
        return false;
      default:
        return false;
    }
  }

  getButtonClass(quote: Quote, actionType: string): string {
    const baseClass = 'px-2 py-1 text-xs font-medium transition-colors rounded border';
    
    if (this.isActionDisabled(quote, actionType)) {
      return `${baseClass} text-gray-400 cursor-not-allowed border-gray-200`;
    }

    switch (actionType) {
      case 'viewDetails':
        return `${baseClass} text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50`;
      default:
        return `${baseClass} text-indigo-600 hover:text-indigo-800 border-indigo-200 hover:bg-indigo-50`;
    }
  }

  getIconButtonClass(quote: Quote, actionType: string, normalColor: string): string {
    const baseClass = 'p-1.5 text-xs cursor-pointer rounded hover:bg-gray-100 transition-colors';
    
    if (this.isActionDisabled(quote, actionType)) {
      return `${baseClass} text-gray-400 cursor-not-allowed hover:bg-transparent`;
    }
    
    return `${baseClass} ${normalColor}`;
  }

  getActionTitle(quote: Quote, actionType: string): string {
    if (this.isActionDisabled(quote, actionType)) {
      const status = this.isQuoteCancelled(quote) ? 'cancelled' : 'accepted';
      return `Action disabled - quote is ${status}`;
    }
    return '';
  }

  getStateDisplay(state: QuoteStateType | undefined): string {
    if (!state) return 'Unknown';

    const stateMap: Record<QuoteStateType, string> = {
      [QUOTE_STATUSES.PENDING]: 'Pending',
      [QUOTE_STATUSES.IN_PROGRESS]: 'In Progress',
      [QUOTE_STATUSES.APPROVED]: 'Approved',
      [QUOTE_STATUSES.REJECTED]: 'Rejected',
      [QUOTE_STATUSES.CANCELLED]: 'Cancelled',
      [QUOTE_STATUSES.ACCEPTED]: 'Accepted'
    };

    return stateMap[state] || state;
  }

  getStateClass(state: string): string {
    switch (state) {
      case QUOTE_STATUSES.PENDING:
        return 'status-pending';
      case QUOTE_STATUSES.IN_PROGRESS:
        return 'status-inProgress';
      case QUOTE_STATUSES.APPROVED:
        return 'status-approved';
      case QUOTE_STATUSES.REJECTED:
        return 'status-rejected';
      case QUOTE_STATUSES.CANCELLED:
        return 'status-cancelled';
      case QUOTE_STATUSES.ACCEPTED:
        return 'status-accepted';
      default:
        return 'status-unknown';
    }
  }

  canUpdateState(state: QuoteStateType | undefined): boolean {
    return state !== QUOTE_STATUSES.CANCELLED && state !== QUOTE_STATUSES.ACCEPTED;
  }
} 