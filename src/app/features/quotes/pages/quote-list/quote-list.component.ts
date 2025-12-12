import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { NotificationService } from 'src/app/services/notification.service';
import { Quote, QuoteStateType } from 'src/app/models/quote.model';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { QuoteDetailsModalComponent } from 'src/app/shared/quote-details-modal/quote-details-modal.component';
import { ChatModalComponent } from 'src/app/shared/chat-modal/chat-modal.component';
import { AttachmentModalComponent } from 'src/app/shared/attachment-modal/attachment-modal.component';
import { LoginInfo } from 'src/app/models/interfaces';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent, ConfirmDialogComponent, QuoteDetailsModalComponent, ChatModalComponent, AttachmentModalComponent],
  template: `
    <app-notification></app-notification>
    
    <div class="w-full max-w-7xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Quotes</h1>
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
            class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors dark:bg-gray"
          >
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            As Customer
          </button>
          <button
            (click)="selectRole('seller')"
            [class]="getRoleTabClass('seller')"
            class="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors"
          >
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <option value="pending">Pending</option>
            <option value="inProgress">In Progress</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
            <option value="accepted">Accepted</option>
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
        <div *ngIf="filteredQuotes.length > 0" class="bg-gray-50 px-6 py-3">
          <div class="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div class="col-span-2">ORDER ID</div>
            <div class="col-span-1">STATUS</div>
            <div class="col-span-2">REQUESTED DATE</div>
            <div class="col-span-3">EXPECTED DATE</div>
            <div class="col-span-4">ACTIONS</div>
          </div>
        </div>
        
        <!-- Quote Rows -->
        <div *ngFor="let quote of filteredQuotes" class="quote-row">
          <div class="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-gray-100 transition-colors"
               [class.bg-gray-50]="isQuoteFinalized(quote)"
               [class.hover:bg-gray-50]="!isQuoteFinalized(quote)"
               [attr.data-quote-id]="quote.id">
            
            <!-- Quote ID -->
            <div class="col-span-2 text-sm font-medium text-gray-900">
              Quote {{ extractShortId(quote.id) }}
            </div>
            
            <!-- Status -->
            <div class="col-span-1">
              <span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    [ngClass]="getStateClass(getPrimaryState(quote))">
                {{ getPrimaryState(quote) }}
              </span>
            </div>
            
            <!-- Requested Date -->
            <div class="col-span-2 text-sm text-gray-600">
              {{ quote.requestedQuoteCompletionDate | date:'dd/MM/yyyy' }}
            </div>
            
            <!-- Expected Date -->
            <div class="col-span-3 text-sm text-gray-600">
              {{ quote.expectedQuoteCompletionDate | date:'dd/MM/yyyy' }}
            </div>
            
            <!-- Actions -->
            <div class="col-span-4 flex flex-wrap gap-1">
              <!-- View Details -->
              <button
                [disabled]="isActionDisabled(quote, 'viewDetails')"
                (click)="viewDetails(quote)"
                [class]="getButtonClass(quote, 'viewDetails')"
                [title]="getActionTitle(quote, 'viewDetails')"
              >
                Details
              </button>
              

              
              <!-- Chat -->
              <button
                [disabled]="isActionDisabled(quote, 'chat')"
                (click)="openChat(quote)"
                [class]="getIconButtonClass(quote, 'chat', 'text-blue-500 hover:text-blue-700')"
                title="Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              
              <!-- Download Attachment -->
              <button
                *ngIf="hasAttachment(quote)"
                [disabled]="isActionDisabled(quote, 'downloadAttachment')"
                (click)="downloadAttachment(quote)"
                [class]="getIconButtonClass(quote, 'downloadAttachment', 'text-purple-500 hover:text-purple-700')"
                title="Download attachment"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              
              <!-- Add Attachment (Provider only, when quote is inProgress or approved) -->
              <button
                *ngIf="selectedRole === 'seller' && (getPrimaryState(quote) === 'inProgress' || getPrimaryState(quote) === 'approved')"
                [disabled]="isActionDisabled(quote, 'addAttachment')"
                (click)="addAttachment(quote)"
                [class]="getIconButtonClass(quote, 'addAttachment', 'text-green-500 hover:text-green-700')"
                title="Add attachment"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <!-- Add Requested Completion Date (Customer only) -->
              <button
                *ngIf="selectedRole === 'customer' && !quote.requestedQuoteCompletionDate"
                [disabled]="isActionDisabled(quote, 'addRequestedDate')"
                (click)="addRequestedDate(quote)"
                [class]="getIconButtonClass(quote, 'addRequestedDate', 'text-indigo-500 hover:text-indigo-700')"
                title="Add requested completion date"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <!-- Add Expected Completion Date (Provider only) -->
              <button
                *ngIf="selectedRole === 'seller' && !quote.expectedQuoteCompletionDate"
                [disabled]="isActionDisabled(quote, 'addExpectedDate')"
                (click)="addExpectedDate(quote)"
                [class]="getIconButtonClass(quote, 'addExpectedDate', 'text-orange-500 hover:text-orange-700')"
                title="Add expected completion date"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              
              <!-- Accept/Cancel buttons or Finalized indicator -->
              <ng-container *ngIf="!isQuoteFinalized(quote)">
                <!-- Accept (Provider only, when quote is pending) -->
                <button
                  *ngIf="selectedRole === 'seller' && getPrimaryState(quote) === 'pending'"
                  [disabled]="isActionDisabled(quote, 'accept')"
                  (click)="acceptQuote(quote)"
                  [class]="getIconButtonClass(quote, 'accept', 'text-emerald-600 hover:text-emerald-700')"
                  title="Accept quote request"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>

                <!-- Accept (Customer only, when quote is approved) -->
                <button
                  *ngIf="selectedRole === 'customer' && getPrimaryState(quote) === 'approved'"
                  [disabled]="isActionDisabled(quote, 'acceptCustomer')"
                  (click)="acceptQuoteCustomer(quote)"
                  [class]="getIconButtonClass(quote, 'acceptCustomer', 'text-emerald-600 hover:text-emerald-700')"
                  title="Accept quotation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                
                <!-- Cancel -->
                <button
                  [disabled]="isActionDisabled(quote, 'cancel')"
                  (click)="cancelQuote(quote)"
                  [class]="getIconButtonClass(quote, 'cancel', 'text-red-500 hover:text-red-700')"
                  title="Cancel quote"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </ng-container>
              
              <!-- Finalized status indicator -->
              <ng-container *ngIf="isQuoteFinalized(quote)">
                <button
                  class="p-2 text-xs text-gray-400 cursor-not-allowed"
                  [title]="'Quote is already ' + (isQuoteCancelled(quote) ? 'cancelled' : 'accepted')"
                  disabled
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          [attr.d]="isQuoteCancelled(quote) ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'" />
                  </svg>
                </button>
              </ng-container>
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
      (close)="closeQuoteDetailsModal()"
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
  private localStorage = inject(LocalStorageService,);
  private notificationService = inject(NotificationService);

  quotes: Quote[] = [];
  filteredQuotes: Quote[] = [];
  loading = false;
  error: string | null = null;
  showDeleteConfirm = false;
  deleteConfirmMessage = '';
  quoteToDelete: Quote | null = null;

  // State update modal
  showStateUpdate = false;
  quoteToUpdate: Quote | null = null;
  selectedState: QuoteStateType | null = null;
  availableStates: QuoteStateType[] = ['pending', 'inProgress', 'approved', 'rejected', 'cancelled', 'accepted'];

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
        
        // Debug: Log quote states
        console.log('Loaded quotes:', quotes.length);
        quotes.forEach(quote => {
          console.log(`Quote ${this.extractShortId(quote.id)}: main state = "${quote.state}", primary state = "${this.getPrimaryState(quote)}"`);
        });
        
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
    if (this.selectedRole === 'seller' && this.getPrimaryState(updatedQuote) === 'inProgress') {
      console.log('Provider uploaded PDF, updating quote status to approved:', updatedQuote.id);
      
      this.quoteService.updateQuoteStatus(updatedQuote.id!, 'approved').subscribe({
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
    const confirmAccept = confirm(`Are you sure you want to accept this request?`);
    
    if (!confirmAccept) {
      return;
    }

    console.log('Accepting quote request:', quote.id);
    
    this.quoteService.updateQuoteStatus(quote.id!, 'inProgress').subscribe({
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
  }

  acceptQuoteCustomer(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    const confirmAccept = confirm(`Are you sure you want to accept the quotation?`);
    
    if (!confirmAccept) {
      return;
    }

    console.log('Customer accepting quotation:', quote.id);
    
    this.quoteService.updateQuoteStatus(quote.id!, 'accepted').subscribe({
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
    const confirmCancel = confirm(`Are you sure you want to cancel quote ${shortId}?\n\nThis action cannot be undone and will disable all other quote actions.`);
    
    if (!confirmCancel) {
      return;
    }

    console.log('Cancelling quote:', quote.id);
    
    this.quoteService.updateQuoteStatus(quote.id!, 'cancelled').subscribe({
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
  }

  // Utility methods (migrated from QuoteRow.js)
  extractShortId(id: string | undefined): string {
    if (!id) return 'N/A';
    // Extract last 8 characters or return full ID if shorter
    return id.length > 8 ? id.slice(-8) : id;
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

  hasAttachment(quote: Quote): boolean {
    return Array.isArray(quote.quoteItem) && 
           quote.quoteItem.some(qi => qi.attachment && qi.attachment.length > 0);
  }

  isQuoteCancelled(quote: Quote): boolean {
    // Check quoteItem state first (this is where the actual state is stored)
    if (quote.quoteItem?.some(item => item.state === 'cancelled')) {
      return true;
    }
    
    // Fallback to main quote state
    return quote.state === 'cancelled';
  }

  isQuoteAccepted(quote: Quote): boolean {
    // Check quoteItem state first (this is where the actual state is stored)
    if (quote.quoteItem?.some(item => item.state === 'accepted')) {
      return true;
    }
    
    // Fallback to main quote state
    return quote.state === 'accepted';
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
      'pending': 'Pending',
      'inProgress': 'In Progress',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'cancelled': 'Cancelled',
      'accepted': 'Accepted'
    };
    
    return stateMap[state] || state;
  }

  getStateClass(state: string): string {
    switch (state) {
      case 'pending':
        return 'status-pending';
      case 'inProgress':
        return 'status-inProgress';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'cancelled':
        return 'status-cancelled';
      case 'accepted':
        return 'status-accepted';
      default:
        return 'status-unknown';
    }
  }

  canUpdateState(state: QuoteStateType | undefined): boolean {
    return state !== 'cancelled' && state !== 'accepted';
  }
} 