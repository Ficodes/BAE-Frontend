import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { QuoteService } from '../../../quotes/services/quote.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { Tender, TenderAttachment } from 'src/app/models/tender.model';
import { Quote, QuoteStateType } from 'src/app/models/quote.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { QuoteDetailsModalComponent } from 'src/app/shared/quote-details-modal/quote-details-modal.component';
import { ChatModalComponent } from 'src/app/shared/chat-modal/chat-modal.component';
import { AttachmentModalComponent } from 'src/app/shared/attachment-modal/attachment-modal.component';
import { CreateTenderModalComponent } from 'src/app/shared/create-tender-modal/create-tender-modal.component';
import { UI_ROLES, API_ROLES, UiRole, toApiRole } from 'src/app/models/roles.constants';
import { QUOTE_CATEGORIES, TENDER_CATEGORIES } from 'src/app/models/quote.constants';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NotificationComponent, 
    ConfirmDialogComponent, 
    QuoteDetailsModalComponent, 
    ChatModalComponent, 
    AttachmentModalComponent,
    CreateTenderModalComponent
  ],
  template: `
    <app-notification></app-notification>
    
    <div class="w-full mx-auto px-6 py-8">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tenders Dashboard</h1>
          <a
            href="https://knowledgebase.dome-marketplace.eu/books/tailored-offering-guide"
            target="_blank"
            rel="noopener noreferrer"
            title="Click here for the Tender process guide"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
          </a>
        </div>
        <div class="flex space-x-3">
          <button
            *ngIf="selectedRole === UI_ROLES.BUYER"
            (click)="openCreateTenderModal()"
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Tender
          </button>
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
            (click)="selectRole(UI_ROLES.BUYER)"
            [class]="getRoleTabClass(UI_ROLES.BUYER)"
            class="flex-1 px-8 py-4 text-2xl font-medium rounded-md transition-colors"
          >
            <svg class="w-6 h-6 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            As Buyer
          </button>
          <button
            (click)="selectRole(UI_ROLES.SELLER)"
            [class]="getRoleTabClass(UI_ROLES.SELLER)"
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
            <option value="pending">Pending</option>
            <option value="inProgress">In Progress</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tenders found</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">No tender requests to display</p>
        </div>
        
        <!-- Provider View Header (matches Quote layout) -->
        <div *ngIf="filteredQuotes.length > 0 && selectedRole === UI_ROLES.SELLER" class="bg-gray-50 dark:bg-gray-800 px-6 py-3">
          <div class="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            <div class="col-span-2">REQUEST DATE</div>
            <div class="col-span-3">CUSTOMER</div>
            <div class="col-span-4">TITLE</div>
            <div class="col-span-1">STATUS</div>
            <div class="col-span-2">ACTIONS</div>
          </div>
        </div>

        <!-- Buyer View Header (Coordinator quotes) -->
        <div *ngIf="filteredQuotes.length > 0 && selectedRole === UI_ROLES.BUYER" class="bg-gray-50 dark:bg-gray-800 px-6 py-3">
          <div class="grid grid-cols-16 gap-4 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            <div class="col-span-1">EXPAND</div>
            <div class="col-span-3">TITLE</div>
            <div class="col-span-2">STATUS</div>
            <div class="col-span-2">TENDER START DATE</div>
            <div class="col-span-2">TENDER END DATE</div>
            <div class="col-span-2">ATTACHMENTS</div>
            <div class="col-span-4">ACTIONS</div>
          </div>
        </div>
        
        <!-- ==================== PROVIDER VIEW ROWS (matches Quote layout) ==================== -->
        <ng-container *ngIf="selectedRole === UI_ROLES.SELLER">
          <div *ngFor="let quote of filteredQuotes" class="quote-row">
            <div class="grid grid-cols-12 gap-4 items-center px-6 py-4 border-b border-gray-100 dark:border-gray-600 transition-colors"
                 [class.bg-gray-50]="isQuoteFinalized(quote)"
                 [class.dark:bg-gray-800]="isQuoteFinalized(quote)"
                 [class.hover:bg-gray-50]="!isQuoteFinalized(quote)"
                 [class.dark:hover:bg-gray-800]="!isQuoteFinalized(quote)"
                 [attr.data-quote-id]="quote.id">

              <!-- Request Date -->
              <div class="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                {{ quote.quoteDate | date:'dd-MM-yyyy' }}
              </div>

              <!-- Customer/Buyer Name -->
              <div class="col-span-3 text-sm font-medium text-gray-900 dark:text-white">
                {{ getBuyerName(quote) }}
              </div>

              <!-- Title -->
              <div class="col-span-4 text-sm text-gray-700 dark:text-gray-300" [title]="quote.description || '(no title)'">
                {{ getTruncatedTitle(quote.description) }}
              </div>

              <!-- Status -->
              <div class="col-span-1">
                <span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [ngClass]="getStateClass(getQuoteItemState(quote))">
                  {{ getQuoteItemState(quote) }}
                </span>
              </div>

              <!-- Actions (Chat + Details only - matching Quote layout) -->
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

                <!-- View Details Button (matching Quote style) -->
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
        </ng-container>

        <!-- ==================== BUYER VIEW ROWS (Coordinator quotes with expand) ==================== -->
        <ng-container *ngIf="selectedRole === UI_ROLES.BUYER">
          <div *ngFor="let quote of filteredQuotes" class="quote-row">
            <div class="grid grid-cols-16 gap-4 items-center px-6 py-4 border-b border-gray-100 dark:border-gray-600 transition-colors"
                 [class.bg-gray-50]="isQuoteFinalized(quote)"
                 [class.dark:bg-gray-800]="isQuoteFinalized(quote)"
                 [class.hover:bg-gray-50]="!isQuoteFinalized(quote)"
                 [class.dark:hover:bg-gray-800]="!isQuoteFinalized(quote)"
                 [attr.data-quote-id]="quote.id">

              <!-- Quote Details (Expand/Collapse) -->
              <div class="col-span-1 flex items-center gap-1">
                <!-- Expand/Collapse arrow for coordinator quotes -->
                <button
                  *ngIf="isCoordinatorExpandable(quote)"
                  (click)="toggleExpand(quote)"
                  class="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                  [title]="isExpanded(quote.id) ? 'Collapse related quotes' : 'Expand to view related quotes'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" [class.rotate-180]="isExpanded(quote.id)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <!-- Title -->
              <div class="col-span-3 text-sm font-medium text-gray-900 dark:text-white" [title]="quote.description || '(no title)'">
                {{ getTruncatedTitle(quote.description) }}
              </div>

              <!-- Status -->
              <div class="col-span-2">
                <span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      [ngClass]="getStateClass(getQuoteItemState(quote))">
                  {{ getQuoteItemState(quote) }}
                </span>
              </div>

              <!-- Expected Fulfillment Start Date -->
              <div class="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                {{ quote.expectedFulfillmentStartDate | date:'dd/MM/yyyy' }}
              </div>

              <!-- Effective Completion Date -->
              <div class="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                {{ quote.effectiveQuoteCompletionDate | date:'dd/MM/yyyy' }}
              </div>

              <!-- Attachments Column -->
              <div class="col-span-2 text-sm">
                <div *ngIf="hasAttachment(quote)" class="flex items-center space-x-1">
                  <button
                    [disabled]="isActionDisabled(quote, 'downloadAttachment')"
                    (click)="downloadAttachment(quote)"
                    class="flex items-center space-x-1 text-purple-600 hover:text-purple-800 disabled:text-gray-300"
                    title="Download attachment"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span class="text-xs truncate max-w-[100px]">{{ getAttachmentName(quote) }}</span>
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div class="col-span-4 flex flex-wrap items-center gap-2">
                <!-- Details Button (matching Quote style) - Always visible -->
                <button
                  (click)="viewDetails(quote)"
                  class="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-1"
                >
                  Details
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <!-- Edit (only for coordinator quotes in pending/draft status) -->
                <button
                  *ngIf="quote.category === QUOTE_CATEGORIES.COORDINATOR && !isCoordinatorExpandable(quote)"
                  (click)="editTender(quote)"
                  class="px-2 py-1 text-xs font-medium transition-colors rounded border text-green-600 hover:text-green-800 border-green-200 hover:bg-green-50"
                  title="Edit tender"
                >
                  Edit
                </button>

                <!-- Broadcast Message (only for coordinator quotes when expanded) -->
                <button
                  *ngIf="quote.category === QUOTE_CATEGORIES.COORDINATOR && isCoordinatorExpandable(quote) && isExpanded(quote.id)"
                  (click)="openBroadcastModal(quote)"
                  class="px-2 py-1 text-xs font-medium transition-colors rounded border text-fuchsia-600 hover:text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-50"
                  title="Broadcast message to all invited providers"
                >
                  Broadcast
                </button>

                <!-- Test: Start Tender (for coordinator quotes in pre-launched status) -->
                <button
                  *ngIf="quote.category === QUOTE_CATEGORIES.COORDINATOR && getPrimaryState(quote) === 'inProgress'"
                  (click)="simulateStartTender(quote)"
                  class="px-2 py-1 text-xs font-medium transition-colors rounded border text-orange-600 hover:text-orange-800 border-orange-200 hover:bg-orange-50 flex items-center gap-1"
                  title="[TEST] Start tender - updates status to 'launched'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start
                </button>

                <!-- Test: Close Tender (for coordinator quotes in launched status) -->
                <button
                  *ngIf="quote.category === QUOTE_CATEGORIES.COORDINATOR && getPrimaryState(quote) === 'approved'"
                  (click)="simulateCloseTender(quote)"
                  class="px-2 py-1 text-xs font-medium transition-colors rounded border text-purple-600 hover:text-purple-800 border-purple-200 hover:bg-purple-50 flex items-center gap-1"
                  title="[TEST] Close tender - updates status to 'closed'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Close
                </button>
              </div>
            </div>

          <!-- Expanded Related Quotes View -->
          <div *ngIf="isExpanded(quote.id)" class="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600">
            <div class="ml-8">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Related Provider Quotes</h4>
              
              <!-- Loading State -->
              <div *ngIf="isLoadingRelatedQuotes(quote.id)" class="flex items-center justify-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading related quotes...</span>
              </div>

              <!-- Related Quotes Table (matching Quote layout) -->
              <div *ngIf="!isLoadingRelatedQuotes(quote.id) && getRelatedQuotes(quote.id).length > 0" class="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                <!-- Header -->
                <div class="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                  <div class="grid grid-cols-12 gap-4 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                    <div class="col-span-4">Provider</div>
                    <div class="col-span-2">Status</div>
                    <div class="col-span-3">Attachments</div>
                    <div class="col-span-3">Actions</div>
                  </div>
                </div>

                <!-- Related Quote Rows -->
                <div *ngFor="let relatedQuote of getRelatedQuotes(quote.id); let last = last"
                     class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                     [class.border-b]="!last"
                     [class.border-gray-200]="!last"
                     [class.dark:border-gray-600]="!last">
                  <div class="grid grid-cols-12 gap-4 items-center text-sm">
                    <!-- Provider -->
                    <div class="col-span-4 text-gray-900 dark:text-white font-medium">
                      {{ getProviderName(relatedQuote) }}
                    </div>

                    <!-- Status -->
                    <div class="col-span-2">
                      <span class="status-badge px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full"
                            [ngClass]="getStateClass(getQuoteItemState(relatedQuote))">
                        {{ getQuoteItemState(relatedQuote) }}
                      </span>
                    </div>

                    <!-- Attachments -->
                    <div class="col-span-3">
                      <button
                        *ngIf="hasAttachment(relatedQuote)"
                        (click)="downloadAttachment(relatedQuote)"
                        class="flex items-center space-x-1 text-purple-600 hover:text-purple-800"
                        title="Download attachment"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span class="text-xs truncate max-w-[80px]">{{ getAttachmentName(relatedQuote) }}</span>
                      </button>
                    </div>
                    
                    <!-- Actions (matching Quote layout: Chat + Details button) -->
                    <div class="col-span-3 flex items-center gap-2">
                      <!-- Chat -->
                      <button
                        (click)="openChat(relatedQuote)"
                        class="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
                        title="Chat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>

                      <!-- View Details Button (matching Quote style) -->
                      <button
                        (click)="viewDetails(relatedQuote)"
                        class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1"
                      >
                        Details
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Related Quotes -->
              <div *ngIf="!isLoadingRelatedQuotes(quote.id) && getRelatedQuotes(quote.id).length === 0"
                   class="text-center py-6 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <svg class="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No related provider quotes found</p>
              </div>
            </div>
          </div>
        </div>
        </ng-container>
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

    <!-- Generic Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showGenericConfirm"
      [title]="genericConfirmTitle"
      [message]="genericConfirmMessage"
      [confirmText]="genericConfirmButtonText"
      [confirmButtonClass]="genericConfirmButtonClass"
      (confirm)="genericConfirmCallback && genericConfirmCallback()"
      (cancel)="showGenericConfirm = false"
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
      [currentUserRole]="getModalUserRole()"
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
    
    <!-- Broadcast Message Modal -->
    <div *ngIf="showBroadcastModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-1">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Broadcast Message</h3>
          <textarea
            [(ngModel)]="broadcastMessage"
            rows="4"
            placeholder="Type your message to all invited providers..."
            class="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          ></textarea>
          <div class="mt-4 flex justify-end space-x-3">
            <button
              (click)="closeBroadcastModal()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              (click)="sendBroadcastMessage()"
              [disabled]="!broadcastMessage || isBroadcastSending"
              class="px-4 py-2 text-sm font-medium text-white bg-fuchsia-600 border border-transparent rounded-md hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 disabled:opacity-50"
            >
              {{ isBroadcastSending ? 'Sending...' : 'Send' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Tender Modal -->
    <app-create-tender-modal
      [isOpen]="showCreateTenderModal"
      [customerId]="currentUserId || ''"
      [tenderToEdit]="tenderToEdit"
      (closeModal)="closeCreateTenderModal()"
      (tenderCreated)="onTenderCreated($event)"
      (tenderUpdated)="onTenderUpdated()"
    ></app-create-tender-modal>
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

    .status-draft {
      @apply bg-yellow-100 text-yellow-800;
    }

    .status-pre-launched {
      @apply bg-blue-100 text-blue-800;
    }

    .status-launched {
      @apply bg-green-100 text-green-800;
    }

    .status-closed {
      @apply bg-gray-100 text-gray-800;
    }

    .rotate-180 {
      transform: rotate(180deg);
    }
  `]
})
export class TenderListComponent implements OnInit {
  private router = inject(Router);
  private quoteService = inject(QuoteService);
  private localStorage = inject(LocalStorageService);
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
  selectedRole: UiRole = UI_ROLES.BUYER;
  currentUserId: string | null = null;
  
  // Expose constants to template
  readonly UI_ROLES = UI_ROLES;
  readonly QUOTE_CATEGORIES = QUOTE_CATEGORIES;

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

  // Broadcast Message Modal
  showBroadcastModal = false;
  broadcastForCoordinatorId: string | null = null;
  broadcastMessage: string = '';

  // Generic Confirmation Dialog
  showGenericConfirm = false;
  genericConfirmTitle = '';
  genericConfirmMessage = '';
  genericConfirmButtonText = 'Confirm';
  genericConfirmButtonClass = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  genericConfirmCallback: (() => void) | null = null;
  isBroadcastSending = false;

  // Create Tender Modal
  showCreateTenderModal = false;
  tenderToEdit: Tender | null = null;

  // Expanded rows for coordinator quotes
  expandedQuoteIds: Set<string> = new Set();
  relatedQuotesMap: Map<string, Quote[]> = new Map();
  loadingRelatedQuotes: Set<string> = new Set();

  // Coordinator quote states cache
  coordinatorQuoteStatesMap: Map<string, string> = new Map();
  loadingCoordinatorStates: Set<string> = new Set();

  

  ngOnInit() {
    // Get user ID from localStorage (BAE Frontend pattern)
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux && aux.logged_as == aux.id) {
      this.currentUserId = aux.partyId;
    } else if (aux && aux.logged_as) {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
      this.currentUserId = loggedOrg?.partyId;
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

    // Use specific API endpoints based on role
    let quotesObservable: Observable<Quote[]>;
    
    if (this.selectedRole === UI_ROLES.BUYER) {
      // Buyer view: Get coordinator quotes they created
      quotesObservable = this.quoteService.getCoordinatorQuotesByUser(this.currentUserId).pipe(
        map((tenders: Tender[]) => tenders.map((t: Tender) => this.mapTenderToQuote(t)))
      );
    } else {
      // Seller/Provider view: Get tendering quotes they received  
      quotesObservable = this.quoteService.getTenderingQuotesByUser(this.currentUserId, toApiRole(this.selectedRole)).pipe(
        map((tenders: Tender[]) => tenders.map((t: Tender) => this.mapTenderToQuote(t)))
      );
    }
    
    quotesObservable.subscribe({
      next: (quotes: Quote[]) => {
        // Use quotes as-is to preserve quoteItem.state
        this.quotes = quotes;
        
        // Debug: Log quote states and externalId
        console.log(`Loaded ${this.quotes.length} quotes as ${this.selectedRole}`);
        console.log(`Current user ID: ${this.currentUserId}`);
        
        this.quotes.forEach(quote => {
          console.log(`Quote ${this.extractShortId(quote.id)}:`, {
            category: quote.category,
            state: quote.state,
            quoteItemState: this.getQuoteItemState(quote),
            externalId: quote.externalId,
            id: quote.id,
            relatedParty: quote.relatedParty
          });
          
          // For provider view, check if this quote is related to current user
          if (this.selectedRole === UI_ROLES.SELLER) {
            const isRelatedToUser = quote.relatedParty?.some(party => 
              party.id === this.currentUserId && party.role?.toLowerCase() === UI_ROLES.SELLER
            );
            console.log(`  -> Quote ${this.extractShortId(quote.id)} related to current provider? ${isRelatedToUser}`);
          }
        });
        
        // If in seller mode, load coordinator states for tendering quotes BEFORE filtering
        if (this.selectedRole === UI_ROLES.SELLER) {
          this.loadCoordinatorStatesForTenderingQuotes().subscribe({
            next: () => {
              console.log('All coordinator states loaded, filtering quotes...');
              this.filterQuotesByStatus();
              this.loading = false;
            },
            error: (error) => {
              console.error('Error loading coordinator states:', error);
              this.filterQuotesByStatus();
              this.loading = false;
            }
          });
        } else {
          this.filterQuotesByStatus();
          this.loading = false;
        }
      },
      error: (error: any) => {
        console.error('Failed to load quotes:', error);
        this.error = 'Failed to load quotes. Please try again.';
        this.loading = false;
      }
    });
  }

  private mapTenderToQuote(tender: Tender): Quote {
    // Build quoteItem with state and attachment (if exists)
    const quoteItem: any = { state: this.mapTenderStateToQuoteState(tender.state) };
    
    // Include attachment if present in tender
    if (tender.attachment) {
      quoteItem.attachment = [{
        name: tender.attachment.name,
        mimeType: tender.attachment.mimeType,
        content: tender.attachment.content,
        size: tender.attachment.size ? { amount: tender.attachment.size, units: 'bytes' } : undefined
      }];
    }
    
    return {
      id: tender.id,
      href: '',
      description: tender.tenderNote || '',
      quoteDate: tender.createdAt || new Date().toISOString(),
      effectiveQuoteCompletionDate: tender.effectiveQuoteCompletionDate,
      expectedFulfillmentStartDate: tender.expectedFulfillmentStartDate,
      state: this.mapTenderStateToQuoteState(tender.state),
      // Map category back: 'tendering' -> 'tender', 'coordinator' -> 'coordinator'
      category: tender.category === TENDER_CATEGORIES.TENDERING ? QUOTE_CATEGORIES.TENDER : tender.category,
      externalId: tender.external_id,
      relatedParty: tender.selectedProviders.map(id => ({
        id,
        role: 'Seller',
        name: tender.provider,
        '@referredType': 'Organization'
      })),
      // Provide a minimal quoteItem array carrying the state and attachment
      quoteItem: [quoteItem],
      note: []
    };
  }

  private mapTenderStateToQuoteState(tenderState: 'draft' | 'pre-launched' | 'pending' | 'sent' | 'closed'): QuoteStateType {
    switch (tenderState) {
      case 'draft': return 'pending';  // draft → pending → GUI shows 'draft'
      case 'pre-launched': return 'inProgress';  // pre-launched → inProgress → GUI shows 'pre-launched'
      case 'pending': return 'pending';
      case 'sent': return 'approved';  // sent → approved → GUI shows 'launched'
      case 'closed': return 'accepted';  // closed → accepted → GUI shows 'closed'
      default: return 'pending';
    }
  }

  refreshQuotes() {
    this.loadQuotes();
  }

  selectRole(role: UiRole) {
    this.selectedRole = role;
    this.loadQuotes();
  }

  getRoleTabClass(role: UiRole): string {
    return this.selectedRole === role
      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-blue-400 shadow-sm'
      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200';
  }

  filterQuotesByStatus() {
    let quotesToFilter: Quote[];

    if (!this.statusFilter) {
      quotesToFilter = [...this.quotes];
    } else {
      quotesToFilter = this.quotes.filter(quote => {
        const primaryState = this.getPrimaryState(quote);
        return primaryState === this.statusFilter;
      });
    }

    // For providers: filter out tendering quotes whose coordinator is still in draft status
    if (this.selectedRole === UI_ROLES.SELLER) {
      this.filteredQuotes = quotesToFilter.filter(quote => {
        // Only filter tendering quotes (note: backend sends 'tendering' but it's mapped to 'tender' in Quote model)
        if (quote.category !== QUOTE_CATEGORIES.TENDER) {
          console.log(`[FILTER] Quote ${this.extractShortId(quote.id)} - category: ${quote.category}, keeping (not tender)`);
          return true;
        }

        // Check if we have the coordinator state
        if (!quote.externalId) {
          console.log(`[FILTER] Tendering quote ${this.extractShortId(quote.id)} - no externalId, keeping`);
          return true; // Keep if no externalId
        }

        const coordinatorState = this.coordinatorQuoteStatesMap.get(quote.externalId);
        console.log(`[FILTER] Tendering quote ${this.extractShortId(quote.id)} - coordinator: ${this.extractShortId(quote.externalId)}, state: ${coordinatorState || 'NOT_LOADED'}`);

        // If coordinator state not loaded yet, hide it (should be loaded by loadCoordinatorStatesForTenderingQuotes)
        if (!coordinatorState) {
          console.log(`[FILTER] Coordinator state not loaded yet for ${this.extractShortId(quote.externalId)}, hiding`);
          return false;
        }

        // Filter out if coordinator is in 'pending' state (which maps to 'draft' in GUI)
        const shouldShow = coordinatorState !== 'pending';
        console.log(`[FILTER] Coordinator state is ${coordinatorState}, ${shouldShow ? 'SHOWING' : 'HIDING'} quote`);
        return shouldShow;
      });

    } else {
      this.filteredQuotes = quotesToFilter;
    }
  }


  viewDetails(quote: Quote) {
    this.selectedQuoteId = quote.id!;
    this.showQuoteDetailsModal = true;
  }

  editTender(quote: Quote) {
    // Extract attachment from quoteItem if it exists
    let attachment: TenderAttachment | undefined = undefined;
    if (Array.isArray(quote.quoteItem) && quote.quoteItem.length > 0) {
      const firstItem = quote.quoteItem[0];
      if (Array.isArray(firstItem.attachment) && firstItem.attachment.length > 0) {
        const att = firstItem.attachment[0];
        attachment = {
          name: att.name || 'attachment.pdf',
          mimeType: att.mimeType || 'application/pdf',
          content: att.content || '',
          size: att.size?.amount
        };
      }
    }

    // Convert Quote to Tender format for editing
    const primaryState = this.getPrimaryState(quote) as QuoteStateType;
    const tender: Tender = {
      id: quote.id,
      category: quote.category === QUOTE_CATEGORIES.COORDINATOR ? TENDER_CATEGORIES.COORDINATOR : TENDER_CATEGORIES.TENDERING,
      state: this.mapQuoteStateToTenderState(primaryState),
      responseDeadline: quote.expectedFulfillmentStartDate || quote.effectiveQuoteCompletionDate || new Date().toISOString(),
      tenderNote: quote.description || '',
      attachment: attachment,
      selectedProviders: quote.relatedParty?.filter(p => p.role?.toLowerCase() === 'seller').map(p => p.id) || [],
      effectiveQuoteCompletionDate: quote.effectiveQuoteCompletionDate,
      expectedFulfillmentStartDate: quote.expectedFulfillmentStartDate
    };

    // Open the Create Tender Modal in edit mode
    this.tenderToEdit = tender;
    this.showCreateTenderModal = true;
  }

  private mapQuoteStateToTenderState(quoteState: QuoteStateType | undefined): 'draft' | 'pre-launched' | 'pending' | 'sent' | 'closed' {
    if (!quoteState) return 'draft';
    
    switch (quoteState) {
      case 'pending': return 'draft';  // pending → draft
      case 'inProgress': return 'pre-launched';  // inProgress → pre-launched
      case 'approved': return 'sent';  // approved → sent (launched)
      case 'accepted':
      case 'cancelled':
      case 'rejected': return 'closed';
      default: return 'draft';
    }
  }

  viewQuote(quote: Quote) {
    this.selectedQuoteId = quote.id!;
    this.showQuoteDetailsModal = true;
  }

  closeQuoteDetailsModal() {
    this.showQuoteDetailsModal = false;
    this.selectedQuoteId = null;
  }

  /**
   * Show generic confirmation dialog
   */
  showConfirmation(
    title: string,
    message: string,
    callback: () => void,
    buttonText: string = 'Confirm',
    buttonClass: string = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
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

  /**
   * Convert UI role to modal role format ('customer' or 'seller')
   */
  getModalUserRole(): 'customer' | 'seller' {
    return this.selectedRole === UI_ROLES.BUYER ? 'customer' : 'seller';
  }

  /**
   * Handle quote updates from the details modal
   */
  onQuoteUpdated(updatedQuote: Quote) {
    // Check if this is a related (tendering) quote inside an expanded coordinator view
    for (const [coordinatorId, relatedList] of this.relatedQuotesMap.entries()) {
      if (relatedList.some(q => q.id === updatedQuote.id)) {
        const coordinator = this.quotes.find(q => q.id === coordinatorId);
        if (coordinator) {
          this.loadRelatedQuotes(coordinator);
        }
        const shortId = this.extractShortId(updatedQuote.id);
        const state = this.getPrimaryState(updatedQuote);
        this.notificationService.showSuccess(`Quote ${shortId} has been updated to ${state}.`);
        return;
      }
    }

    // Otherwise update in the main list
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

  // =============================
  // Broadcast Message Handlers
  // =============================
  openBroadcastModal(coordinatorQuote: Quote) {
    if (!coordinatorQuote.id) return;
    this.broadcastForCoordinatorId = coordinatorQuote.id;
    this.broadcastMessage = '';
    this.showBroadcastModal = true;
  }

  closeBroadcastModal() {
    this.showBroadcastModal = false;
    this.broadcastForCoordinatorId = null;
    this.broadcastMessage = '';
    this.isBroadcastSending = false;
  }

  // Create Tender Modal Methods
  openCreateTenderModal() {
    if (!this.currentUserId) {
      this.notificationService.showError('You must be logged in to create a tender.');
      return;
    }
    this.showCreateTenderModal = true;
  }

  closeCreateTenderModal() {
    this.showCreateTenderModal = false;
    this.tenderToEdit = null;
  }

  onTenderCreated(tender: Tender) {
    console.log('Tender created successfully:', tender);
    // Refresh the quotes list to show the new tender
    this.loadQuotes();
    this.notificationService.showSuccess('Tender created successfully!');
  }

  onTenderUpdated() {
    // Refresh the quotes list to show updated tender
    this.loadQuotes();
  }

  sendBroadcastMessage() {
    if (!this.broadcastForCoordinatorId || !this.currentUserId || !this.broadcastMessage) {
      return;
    }

    this.showConfirmation(
      'Broadcast Message',
      'Are you sure you want to broadcast this message to all the invited providers?',
      () => this.executeBroadcastMessage(),
      'Send',
      'px-4 py-2 text-sm font-medium text-white bg-fuchsia-600 border border-transparent rounded-md hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500'
    );
  }

  private executeBroadcastMessage() {
    this.isBroadcastSending = true;

    // Ensure related quotes are loaded
    const related = this.getRelatedQuotes(this.broadcastForCoordinatorId!);
    if (!related || related.length === 0) {
      // Try to load if not present, then send
      const coordinator = this.quotes.find(q => q.id === this.broadcastForCoordinatorId);
      if (coordinator) {
        this.loadRelatedQuotes(coordinator);
      }
    }

    const quotesToMessage = this.getRelatedQuotes(this.broadcastForCoordinatorId!).filter(q => q.category === QUOTE_CATEGORIES.TENDER);
    if (quotesToMessage.length === 0) {
      this.notificationService.showError('No related provider quotes found to broadcast to.');
      this.isBroadcastSending = false;
      return;
    }

    const requests = quotesToMessage.map(q => this.quoteService.addNoteToQuote(q.id!, this.broadcastMessage, this.currentUserId!)) as Observable<Quote>[];
    forkJoin(requests).subscribe({
      next: () => {
        this.notificationService.showSuccess('Message broadcast sent to all invited providers.');
        this.closeBroadcastModal();
      },
      error: (error: Error) => {
        console.error('Failed to broadcast message:', error);
        this.notificationService.showError('Failed to broadcast message.');
        this.isBroadcastSending = false;
      }
    });
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
    if (this.selectedRole === UI_ROLES.SELLER && this.getPrimaryState(updatedQuote) === 'inProgress') {
      console.log('Provider uploaded PDF, updating quote status to approved:', updatedQuote.id);
      
      this.quoteService.updateQuoteStatus(updatedQuote.id!, 'approved').subscribe({
        next: (approvedQuote: Quote) => {
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
        error: (error: any) => {
          console.error('Error updating quote status to approved:', error);
          this.notificationService.showError(`Error updating quote status: ${error?.message || 'Unknown error'}`);
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
        next: (updatedQuote: Quote) => {
          const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
          if (index !== -1) {
            this.quotes[index] = updatedQuote;
            this.filterQuotesByStatus();
          }
          this.showStateUpdate = false;
          this.notificationService.showSuccess('Quote state updated successfully');
        },
        error: (error: any) => {
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
        error: (error: any) => {
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

  /**
   * Download the buyer's request PDF from the coordinator quote referenced by a tender quote
   */
  downloadCustomerRequest(tenderQuote: Quote) {
    const coordinatorId = tenderQuote.externalId || tenderQuote.id;
    if (!coordinatorId) {
      this.notificationService.showError('No coordinator reference found for this quote.');
      return;
    }

    this.quoteService.getQuoteById(coordinatorId).subscribe({
      next: (coordinator: Quote) => {
        try {
          // Reuse download logic by wrapping the attachment into a Quote-like structure
          if (!coordinator.quoteItem || coordinator.quoteItem.length === 0 ||
              !coordinator.quoteItem[0].attachment || coordinator.quoteItem[0].attachment.length === 0) {
            this.notificationService.showError(`No buyer's request attachment found on coordinator quote.`);
            return;
          }
          // Use existing helper that handles both Tender and Quote types
          this.quoteService.downloadAttachment(coordinator);
          this.notificationService.showSuccess(`Download started`);
        } catch (err: any) {
          console.error('Error downloading buyer request:', err);
          this.notificationService.showError(err.message || 'Error downloading buyer request');
        }
      },
      error: (error: Error) => {
        console.error('Failed to fetch coordinator quote for download:', error);
        this.notificationService.showError('Failed to fetch coordinator quote');
      }
    });
  }

  addAttachment(quote: Quote) {
    // Open the attachment modal
    this.selectedAttachmentQuote = quote;
    this.showAttachmentModal = true;
  }

  acceptTenderingQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);

    this.showConfirmation(
      'Accept Tender Request',
      'Are you sure you want to accept this tender request?',
      () => {
        console.log('Accepting tendering quote:', quote.id);

        this.quoteService.updateQuoteStatus(quote.id!, 'inProgress').subscribe({
          next: (updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            console.log('Tendering quote successfully accepted');
            this.notificationService.showSuccess(`Tender request ${shortId} has been accepted and is now in progress.`);
          },
          error: (error: Error) => {
            console.error('Error accepting tendering quote:', error);
            this.notificationService.showError(`Error accepting tender request: ${error.message || 'Unknown error'}`);
          }
        });
      },
      'Accept',
      'px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
    );
  }

  cancelTenderingQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);

    this.showConfirmation(
      'Cancel Tender Request',
      'Are you sure you want to cancel this tender request?\n\nThis action cannot be undone.',
      () => {
        console.log('Cancelling tendering quote:', quote.id);

        this.quoteService.updateQuoteStatus(quote.id!, 'cancelled').subscribe({
          next: (updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            console.log('Tendering quote successfully cancelled');
            this.notificationService.showSuccess(`Tender request ${shortId} has been cancelled.`);
          },
          error: (error: Error) => {
            console.error('Error cancelling tendering quote:', error);
            this.notificationService.showError(`Error cancelling tender request: ${error.message || 'Unknown error'}`);
          }
        });
      },
      'Cancel Request',
      'px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
    );
  }

  simulateStartTender(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    const todayFormatted = this.getTodayForAPI();

    this.showConfirmation(
      'Start Tender',
      `Are you sure you want to start this tender?\n\nWarning: The Tender Start Date will be updated to today (${todayFormatted}).`,
      () => {
        this.quoteService.updateQuoteStatus(quote.id!, 'approved').pipe(
          switchMap((updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            return this.quoteService.updateQuoteDate(quote.id!, todayFormatted, 'expectedFulfillment');
          })
        ).subscribe({
          next: (updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            this.notificationService.showSuccess(`Tender ${shortId} started. Start date set to today.`);
          },
          error: (error: Error) => {
            console.error('Error starting tender:', error);
            this.notificationService.showError(`Error starting tender: ${error.message || 'Unknown error'}`);
          }
        });
      },
      'Start Tender',
      'px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
    );
  }

  simulateCloseTender(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    const todayFormatted = this.getTodayForAPI();

    this.showConfirmation(
      'Close Tender',
      `Are you sure you want to close this tender?\n\nWarning: The Tender End Date will be updated to today (${todayFormatted}).`,
      () => {
        this.quoteService.updateQuoteStatus(quote.id!, 'accepted').pipe(
          switchMap((updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            return this.quoteService.updateQuoteDate(quote.id!, todayFormatted, 'effective');
          })
        ).subscribe({
          next: (updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            this.notificationService.showSuccess(`Tender ${shortId} closed. End date set to today.`);
          },
          error: (error: Error) => {
            console.error('Error closing tender:', error);
            this.notificationService.showError(`Error closing tender: ${error.message || 'Unknown error'}`);
          }
        });
      },
      'Close Tender',
      'px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
    );
  }

  private getTodayForAPI(): string {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  }

  acceptQuoteCustomer(quote: Quote) {
    const shortId = this.extractShortId(quote.id);

    this.showConfirmation(
      'Accept Quotation',
      'Are you sure you want to accept the quotation?',
      () => {
        console.log('Buyer accepting quotation:', quote.id);

        this.quoteService.updateQuoteStatus(quote.id!, 'accepted').subscribe({
          next: (updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            console.log('Quotation successfully accepted by buyer');
            this.notificationService.showSuccess(`Quotation ${shortId} has been accepted successfully.`);
          },
          error: (error: any) => {
            console.error('Error accepting quotation:', error);
            this.notificationService.showError(`Error accepting quotation: ${error?.message || 'Unknown error'}`);
          }
        });
      },
      'Accept',
      'px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
    );
  }

  acceptTenderQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);

    this.showConfirmation(
      'Accept Tender Quote',
      'Are you sure you want to accept this quote? Every other quote in this tender will be Rejected.',
      () => this.executeAcceptTenderQuote(quote, shortId),
      'Accept',
      'px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
    );
  }

  private executeAcceptTenderQuote(quote: Quote, shortId: string) {

    console.log('Buyer accepting tender:', quote.id);

    // Helper: find coordinator id (map key) that contains this related quote
    const findCoordinatorKeyForRelated = (): string | null => {
      // Prefer externalId if present
      if (quote.externalId) return quote.externalId;
      for (const [coordId, relatedList] of this.relatedQuotesMap.entries()) {
        if (relatedList.some(r => r.id === quote.id)) return coordId;
      }
      return null;
    };

    const coordinatorKey = findCoordinatorKeyForRelated();

    // First accept selected quote
    this.quoteService.updateQuoteStatus(quote.id!, 'accepted').subscribe({
      next: (acceptedQuote: Quote) => {
        // If we have a coordinator group, reject all others in parallel
        if (coordinatorKey) {
          const siblings = (this.relatedQuotesMap.get(coordinatorKey) || []).filter(q => q.id !== quote.id);
          const toReject = siblings.filter(sib => {
            const state = this.getPrimaryState(sib);
            return state !== 'accepted' && state !== 'cancelled' && state !== 'rejected';
          });

          if (toReject.length > 0) {
            const rejectCalls = toReject.map(sib => this.quoteService.updateQuoteStatus(sib.id!, 'rejected'));
            forkJoin(rejectCalls).subscribe({
              next: (rejectedQuotes: Quote[]) => {
                // Update related quotes map with returned objects
                const current = this.relatedQuotesMap.get(coordinatorKey) || [];
                const updatedList = current.map(item => {
                  if (item.id === acceptedQuote.id) return acceptedQuote;
                  const updated = rejectedQuotes.find(r => r.id === item.id);
                  return updated ? updated : item;
                });
                this.relatedQuotesMap.set(coordinatorKey, updatedList);

                // UI notify
                this.notificationService.showSuccess(`Tender ${shortId} accepted. ${rejectedQuotes.length} other quote(s) have been rejected.`);
              },
              error: (err: Error) => {
                console.error('Error rejecting sibling quotes:', err);
                this.notificationService.showError(`Accepted the selected quote, but failed rejecting other quotes: ${err.message || 'Unknown error'}`);
              }
            });
          } else {
            // No siblings to reject; still update the accepted one in the list
            const current = this.relatedQuotesMap.get(coordinatorKey) || [];
            const updatedList = current.map(item => item.id === acceptedQuote.id ? acceptedQuote : item);
            this.relatedQuotesMap.set(coordinatorKey, updatedList);
            this.notificationService.showSuccess(`Tender ${shortId} has been accepted successfully.`);
          }
        } else {
          // Not in related table context; fall back to updating main list if present
          const index = this.quotes.findIndex(q => q.id === acceptedQuote.id);
          if (index !== -1) {
            this.quotes[index] = acceptedQuote;
            this.filterQuotesByStatus();
          }
          this.notificationService.showSuccess(`Tender ${shortId} has been accepted successfully.`);
        }
      },
      error: (error: any) => {
        console.error('Error accepting tender:', error);
        this.notificationService.showError(`Error accepting tender: ${error?.message || 'Unknown error'}`);
      }
    });
  }

  rejectTenderQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);

    this.showConfirmation(
      'Reject Tender',
      'Are you sure you want to reject this tender?\n\nThis action cannot be undone.',
      () => {
        console.log('Buyer rejecting tender:', quote.id);

        this.quoteService.updateQuoteStatus(quote.id!, 'rejected').subscribe({
          next: (updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            console.log('Tender successfully rejected by buyer');
            this.notificationService.showSuccess(`Tender ${shortId} has been rejected.`);
          },
          error: (error: any) => {
            console.error('Error rejecting tender:', error);
            this.notificationService.showError(`Error rejecting tender: ${error?.message || 'Unknown error'}`);
          }
        });
      },
      'Reject',
      'px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
    );
  }

  cancelQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);

    this.showConfirmation(
      'Cancel Quote',
      `Are you sure you want to cancel quote ${shortId}?\n\nThis action cannot be undone and will disable all other quote actions.`,
      () => {
        console.log('Cancelling quote:', quote.id);

        this.quoteService.updateQuoteStatus(quote.id!, 'cancelled').subscribe({
          next: (updatedQuote: Quote) => {
            const index = this.quotes.findIndex(q => q.id === updatedQuote.id);
            if (index !== -1) {
              this.quotes[index] = updatedQuote;
              this.filterQuotesByStatus();
            }
            console.log('Quote successfully cancelled');
            this.notificationService.showSuccess(`Quote ${shortId} has been cancelled successfully.`);
          },
          error: (error: any) => {
            console.error('Error cancelling quote:', error);
            this.notificationService.showError(`Error cancelling quote: ${error?.message || 'Unknown error'}`);
          }
        });
      },
      'Cancel Quote',
      'px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
    );
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

  getQuoteItemState(quote: Quote): string {
    let state = 'unknown';
    
    if (Array.isArray(quote.quoteItem) && quote.quoteItem.length > 0) {
      // Scan all items and pick the first defined state
      for (const item of quote.quoteItem) {
        if (item && (item as any).state) {
          state = (item as any).state as string;
          break;
        }
      }
    }
    
    // Apply mapping only for coordinator quotes
    if (quote.category === QUOTE_CATEGORIES.COORDINATOR) {
      return this.mapCoordinatorStatusToGUI(state);
    }
    
    return state;
  }

  /**
   * Map coordinator quote status from backend (TMF) to frontend (GUI) display
   * Only for coordinator quotes
   */
  mapCoordinatorStatusToGUI(backendStatus: string): string {
    const mapping: { [key: string]: string } = {
      'pending': 'draft',
      'inProgress': 'pre-launched',
      'approved': 'launched',
      'accepted': 'closed',
      'cancelled': 'cancelled',
      'rejected': 'rejected'
    };
    return mapping[backendStatus] || backendStatus;
  }

  hasAttachment(quote: Quote): boolean {
    return Array.isArray(quote.quoteItem) && 
           quote.quoteItem.some(qi => qi.attachment && qi.attachment.length > 0);
  }

  getAttachmentName(quote: Quote): string {
    if (!Array.isArray(quote.quoteItem)) {
      return '';
    }
    
    for (const item of quote.quoteItem) {
      if (item.attachment && item.attachment.length > 0) {
        return item.attachment[0].name || 'attachment.pdf';
      }
    }
    
    return '';
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
        // Buyer accept button is only for buyers when quote is approved
        // It should not be disabled by finalization since it only shows when approved
        return false;
      case 'acceptTender':
      case 'rejectTender':
        // Tender accept/reject buttons are only for buyers when tender quote is approved
        // They should not be disabled by finalization since they only show when approved
        return false;
      case 'addRequestedDate':
      case 'addExpectedDate':
        return true;
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
      // Coordinator quote states (mapped)
      case 'draft':
        return 'status-draft';
      case 'pre-launched':
        return 'status-pre-launched';
      case 'launched':
        return 'status-launched';
      case 'closed':
        return 'status-closed';
      default:
        return 'status-unknown';
    }
  }

  canUpdateState(state: QuoteStateType | undefined): boolean {
    return state !== 'cancelled' && state !== 'accepted';
  }

  // ========================================
  // EXPAND/COLLAPSE RELATED QUOTES
  // ========================================

  /**
   * Check if a coordinator quote is expandable
   * (not in pending status, which displays as "draft")
   */
  isCoordinatorExpandable(quote: Quote): boolean {
    if (quote.category !== QUOTE_CATEGORIES.COORDINATOR) {
      return false;
    }
    
    const state = this.getPrimaryState(quote);
    
    // Expandable if NOT pending (backend state "pending" = GUI display "draft")
    // All other states (inProgress/pre-launched, approved/launched, etc.) are expandable
    return state !== 'pending';
  }

  /**
   * Check if a quote row is expanded
   */
  isExpanded(quoteId: string | undefined): boolean {
    return quoteId ? this.expandedQuoteIds.has(quoteId) : false;
  }

  /**
   * Toggle expand/collapse for a coordinator quote
   */
  toggleExpand(quote: Quote): void {
    if (!quote.id) return;

    const isCurrentlyExpanded = this.expandedQuoteIds.has(quote.id);

    if (isCurrentlyExpanded) {
      // Collapse
      console.log(`Collapsing quote ${this.extractShortId(quote.id)}`);
      this.expandedQuoteIds.delete(quote.id);
    } else {
      // Expand - fetch related quotes if not already loaded
      console.log(`Expanding quote ${this.extractShortId(quote.id)}, externalId: ${quote.externalId}`);
      this.expandedQuoteIds.add(quote.id);
      
      if (!this.relatedQuotesMap.has(quote.id)) {
        console.log('Fetching related quotes...');
        this.loadRelatedQuotes(quote);
      } else {
        console.log(`Using cached ${this.relatedQuotesMap.get(quote.id)?.length} related quotes`);
      }
    }
  }

  /**
   * Load related tendering quotes for a coordinator quote
   */
  private loadRelatedQuotes(coordinatorQuote: Quote): void {
    if (!coordinatorQuote.id || !this.currentUserId) {
      console.error('Cannot load related quotes: missing id or userId', {
        id: coordinatorQuote.id,
        userId: this.currentUserId
      });
      return;
    }

    // For coordinator quotes, use the quote's own ID as the externalId
    // because tendering quotes are created with the coordinator quote ID as their externalId
    const externalIdToUse = coordinatorQuote.externalId || coordinatorQuote.id;

    console.log(`Loading related quotes for coordinator ${this.extractShortId(coordinatorQuote.id)}:`, {
      userId: this.currentUserId,
      role: API_ROLES.BUYER,
      externalId: externalIdToUse,
      coordinatorId: coordinatorQuote.id
    });

    this.loadingRelatedQuotes.add(coordinatorQuote.id);

    // Fetch tendering quotes using the coordinator quote's ID as externalId
    this.quoteService.getTenderingQuotesByExternalId(
      this.currentUserId,
      externalIdToUse,
      API_ROLES.BUYER
    ).subscribe({
      next: (relatedQuotes: Quote[]) => {
        this.relatedQuotesMap.set(coordinatorQuote.id!, relatedQuotes);
        this.loadingRelatedQuotes.delete(coordinatorQuote.id!);
        console.log(`âœ… Successfully loaded ${relatedQuotes.length} related quotes for coordinator ${this.extractShortId(coordinatorQuote.id)}`);
        if (relatedQuotes.length > 0) {
          console.log('Related quotes:', relatedQuotes.map(q => ({
            id: this.extractShortId(q.id),
            provider: this.getProviderName(q),
            state: this.getQuoteItemState(q)
          })));
        }
      },
      error: (error: Error) => {
        console.error('âŒ Failed to load related quotes:', error);
        this.loadingRelatedQuotes.delete(coordinatorQuote.id!);
        this.notificationService.showError('Failed to load related quotes');
      }
    });
  }

  /**
   * Get related quotes for a coordinator quote
   */
  getRelatedQuotes(quoteId: string | undefined): Quote[] {
    if (!quoteId) return [];
    return this.relatedQuotesMap.get(quoteId) || [];
  }

  /**
   * Check if related quotes are loading
   */
  isLoadingRelatedQuotes(quoteId: string | undefined): boolean {
    return quoteId ? this.loadingRelatedQuotes.has(quoteId) : false;
  }

  /**
   * Get provider name from related party
   */
  getProviderName(quote: Quote): string {
    console.log('Getting provider name for quote:', quote.id);
    console.log('RelatedParty array:', quote.relatedParty);
    
    if (!quote.relatedParty || quote.relatedParty.length === 0) {
      console.warn('No relatedParty found in quote:', quote.id);
      return 'Unknown Provider';
    }
    
    // Log all parties to see what roles exist
    quote.relatedParty.forEach(party => {
      console.log('Party:', party.id, 'Role:', party.role, 'Name:', party.name);
    });
    
    const provider = quote.relatedParty?.find(party => party.role?.toLowerCase() === 'seller');
    
    if (!provider) {
      console.warn('No seller found in relatedParty for quote:', quote.id);
      console.log('Available roles:', quote.relatedParty.map(p => p.role).join(', '));
    }
    
    return provider?.name || provider?.id || 'Unknown Provider';
  }

  /**
   * Get buyer name from related party (for Provider view)
   */
  getBuyerName(quote: Quote): string {
    if (!quote.relatedParty || quote.relatedParty.length === 0) {
      return 'Unknown Customer';
    }

    const buyer = quote.relatedParty?.find(party => party.role?.toLowerCase() === 'buyer');
    return buyer?.name || buyer?.id || 'Unknown Customer';
  }

  /**
   * Check if the coordinator quote allows accepting tendering quotes
   * Returns true if the coordinator quote is in 'inProgress' state
   */
  canAcceptTenderingQuote(tenderingQuote: Quote): boolean {
    if (!tenderingQuote.externalId) {
      console.warn('Tendering quote has no externalId, cannot check coordinator state');
      return false;
    }

    // Check if we have the coordinator state cached
    const coordinatorState = this.coordinatorQuoteStatesMap.get(tenderingQuote.externalId);
    
    if (!coordinatorState) {
      // State not loaded yet, load it
      this.loadCoordinatorQuoteState(tenderingQuote.externalId);
      return false; // Don't show button until state is loaded
    }

    // Allow accept only if coordinator is in 'inProgress' state
    return coordinatorState === 'inProgress';
  }

  /**
   * Check if the coordinator quote allows adding attachments to tendering quotes
   * Returns true if the coordinator quote is in 'approved' state
   */
  canAddAttachmentToTenderingQuote(tenderingQuote: Quote): boolean {
    if (!tenderingQuote.externalId) {
      console.warn('Tendering quote has no externalId, cannot check coordinator state');
      return false;
    }

    // Check if we have the coordinator state cached
    const coordinatorState = this.coordinatorQuoteStatesMap.get(tenderingQuote.externalId);
    
    if (!coordinatorState) {
      // State not loaded yet, load it
      this.loadCoordinatorQuoteState(tenderingQuote.externalId);
      return false; // Don't show button until state is loaded
    }

    // Allow add attachment only if coordinator is in 'approved' state
    return coordinatorState === 'approved';
  }

  /**
   * Load the state of a coordinator quote
   */
  private loadCoordinatorQuoteState(coordinatorQuoteId: string): void {
    if (this.loadingCoordinatorStates.has(coordinatorQuoteId) ||
        this.coordinatorQuoteStatesMap.has(coordinatorQuoteId)) {
      return; // Already loading or loaded
    }

    console.log(`Loading coordinator quote state for: ${this.extractShortId(coordinatorQuoteId)}`);
    this.loadingCoordinatorStates.add(coordinatorQuoteId);

    this.quoteService.getQuoteById(coordinatorQuoteId).subscribe({
      next: (coordinatorQuote: Quote) => {
        // Get the state from quoteItem
        const state = this.getQuoteItemState(coordinatorQuote);

        // Store the actual backend state (not the mapped GUI state)
        const backendState = this.getPrimaryState(coordinatorQuote);
        this.coordinatorQuoteStatesMap.set(coordinatorQuoteId, backendState);

        this.loadingCoordinatorStates.delete(coordinatorQuoteId);

        console.log(`Coordinator quote ${this.extractShortId(coordinatorQuoteId)} state: ${backendState} (GUI: ${state})`);

        // Note: We don't call filterQuotesByStatus() here anymore since coordinator states
        // are preloaded in parallel. This method is only used as a fallback for button permission checks.
      },
      error: (error: Error) => {
        console.error(`Failed to load coordinator quote state for ${this.extractShortId(coordinatorQuoteId)}:`, error);
        this.loadingCoordinatorStates.delete(coordinatorQuoteId);
        // Set to unknown state to prevent repeated failed attempts
        this.coordinatorQuoteStatesMap.set(coordinatorQuoteId, 'unknown');
      }
    });
  }

  /**
   * Load coordinator states for all tendering quotes in parallel
   * Returns an observable that completes when all states are loaded
   */
  private loadCoordinatorStatesForTenderingQuotes(): Observable<void> {
    const externalIds = new Set<string>();

    // Collect unique externalIds from tendering quotes (mapped to 'tender' category in Quote model)
    this.quotes.forEach(quote => {
      if (quote.category === QUOTE_CATEGORIES.TENDER && quote.externalId) {
        externalIds.add(quote.externalId);
      }
    });

    // If no tendering quotes, return completed observable
    if (externalIds.size === 0) {
      return of(void 0);
    }

    // Create an array of observables for each coordinator quote
    const loadObservables = Array.from(externalIds).map(externalId => {
      // Skip if already loaded or loading
      if (this.coordinatorQuoteStatesMap.has(externalId)) {
        return of(void 0);
      }

      console.log(`Loading coordinator quote state for: ${this.extractShortId(externalId)}`);
      this.loadingCoordinatorStates.add(externalId);

      return this.quoteService.getQuoteById(externalId).pipe(
        map((coordinatorQuote: Quote) => {
          const backendState = this.getPrimaryState(coordinatorQuote);
          this.coordinatorQuoteStatesMap.set(externalId, backendState);
          this.loadingCoordinatorStates.delete(externalId);
          console.log(`Coordinator quote ${this.extractShortId(externalId)} state: ${backendState}`);
        }),
        catchError((error: Error) => {
          console.error(`Failed to load coordinator quote state for ${this.extractShortId(externalId)}:`, error);
          this.loadingCoordinatorStates.delete(externalId);
          // Set to unknown state to prevent repeated failed attempts
          this.coordinatorQuoteStatesMap.set(externalId, 'unknown');
          return of(void 0); // Continue even if one fails
        })
      );
    });

    // Wait for all coordinator states to load in parallel
    return forkJoin(loadObservables).pipe(
      map(() => void 0)
    );
  }

  /**
   * Truncate title if longer than 50 characters
   * @param title The title to potentially truncate
   * @returns Truncated title with ellipsis if over 50 chars, or original title
   */
  getTruncatedTitle(title: string | undefined): string {
    if (!title) return '(no title)';
    const maxLength = 50;
    if (title.length > maxLength) {
      return title.substring(0, maxLength) + '...';
    }
    return title;
  }
} 

