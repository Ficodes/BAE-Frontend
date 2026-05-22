import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from '../../services/notification.service';
import { AccountServiceService } from '../../services/account-service.service';
import { ApiServiceService } from '../../services/product-service.service';
import { Quote } from '../../models/quote.model';
import { QUOTE_STATUS_MESSAGES, TENDERING_STATUS_MESSAGES, COORDINATOR_STATUS_MESSAGES, QUOTE_CHAT_MESSAGES, QUOTE_ACTION_BUTTON_TEXTS, QUOTE_CATEGORIES, QUOTE_STATUSES, TAILORED_STATUSES_LABELS_CUSTOMER, TAILORED_STATUSES_LABELS_PROVIDER, TENDER_COORDINATOR_STATUSES_LABELS, TENDER_RELATED_QUOTES_LABELS_CUSTOMER, TENDER_RELATED_QUOTES_LABELS_PROVIDER } from '../../models/quote.constants';
import { API_ROLES } from '../../models/roles.constants';
import { NotificationComponent } from '../notification/notification.component';
import { ChatModalComponent } from '../chat-modal/chat-modal.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { environment } from 'src/environments/environment';
import { TenderDateFieldComponent } from '../tender-date-field/tender-date-field.component';

@Component({
  selector: 'app-quote-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationComponent, ChatModalComponent, ConfirmDialogComponent, TenderDateFieldComponent],
  template: `
    <!-- Modal Backdrop -->
    <div
      *ngIf="isOpen"
      data-testid="quote-details-modal-backdrop"
      class="fixed inset-0 z-50 flex h-dvh w-full items-center justify-center overflow-hidden bg-[#0b1220]/45 p-4 font-[Blinker]"
      (click)="closeModal()"
    >
      <!-- Modal Content -->
      <div
        data-testid="quote-details-modal-shell"
        class="relative mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#EBECEE] bg-[#F7F9FD] p-6 shadow-[0_20px_50px_rgba(11,18,32,0.24)]"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="mb-5 flex shrink-0 items-center justify-between">
          <h2 class="text-[24px] font-bold text-[#0b1220]">{{ getModalTitle() }}</h2>
          <button
            (click)="closeModal()"
            class="rounded-lg p-2 text-[#526179] transition-colors hover:bg-[#EBF0F7] hover:text-[#1f4fbf] focus:outline-none"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
          {{ error }}
        </div>

        <!-- Quote Content -->
        <div
          *ngIf="!isLoading && !error && quote"
          data-testid="quote-details-modal-body"
          class="min-h-0 flex-1 space-y-5 overflow-y-auto pr-2"
        >

          <!-- Buyer Section (hidden for coordinator quotes) -->
          <div *ngIf="getQuoteCategory() !== QUOTE_CATEGORIES.COORDINATOR" class="rounded-2xl border border-[#EBECEE] bg-white p-4 shadow-sm">
            <p class="mb-3 text-sm font-semibold text-[#324153]">Buyer Information</p>
            <div class="grid grid-cols-2 gap-4">
              <!-- Buyer -->
              <div>
                <p class="text-xs text-[#526179]">Buyer:</p>
                <p class="text-sm font-semibold text-[#0b1220]">{{ buyerName }}</p>
                <p class="text-xs text-[#526179]">VAT ID: {{ buyerVatId }}</p>
              </div>
              <!-- Buyer Operator -->
              <div>
                <p class="text-xs text-[#526179]">Buyer Operator:</p>
                <p class="text-sm font-semibold text-[#0b1220]">{{ buyerOperatorName }}</p>
                <p class="text-xs text-[#526179]">VAT ID: {{ buyerOperatorVatId }}</p>
              </div>
            </div>
          </div>

          <!-- Seller Section (hidden for coordinator quotes) -->
          <div *ngIf="getQuoteCategory() !== QUOTE_CATEGORIES.COORDINATOR" class="rounded-2xl border border-[#EBECEE] bg-white p-4 shadow-sm">
            <p class="mb-3 text-sm font-semibold text-[#324153]">Seller Information</p>
            <div class="grid grid-cols-2 gap-4">
              <!-- Seller -->
              <div>
                <p class="text-xs text-[#526179]">Seller:</p>
                <p class="text-sm font-semibold text-[#0b1220]">{{ sellerName }}</p>
                <p class="text-xs text-[#526179]">VAT ID: {{ sellerVatId }}</p>
              </div>
              <!-- Seller Operator -->
              <div>
                <p class="text-xs text-[#526179]">Seller Operator:</p>
                <p class="text-sm font-semibold text-[#0b1220]">{{ sellerOperatorName }}</p>
                <p class="text-xs text-[#526179]">VAT ID: {{ sellerOperatorVatId }}</p>
              </div>
            </div>
          </div>

          <!-- Product Info (only for tailored quotes) -->
          <div *ngIf="getQuoteCategory() === QUOTE_CATEGORIES.TAILORED">
            <p class="text-sm text-[#526179]">Product:</p>
            <p class="text-base font-semibold text-[#0b1220]">{{ productName }}</p>
          </div>

          <!-- Request Message -->
          <div>
            <p class="mb-2 text-sm font-semibold text-[#324153]">Request:</p>
            <div class="overflow-hidden rounded-2xl border border-[#EBECEE] bg-white p-4 shadow-sm">
              <p class="break-words text-[#0b1220] whitespace-pre-wrap overflow-wrap-anywhere">{{ quote.description || 'No message provided' }}</p>
            </div>
          </div>

          <!-- Dates (TAILORED quotes) -->
          <div *ngIf="getQuoteCategory() === QUOTE_CATEGORIES.TAILORED" class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-[#526179]">Requested Date:</p>
              <p class="text-base font-semibold text-[#0b1220]">
                {{ quote.requestedQuoteCompletionDate ? (quote.requestedQuoteCompletionDate | date:'dd-MM-yyyy') : '--' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-[#526179]">Expected Date:</p>
              <div class="flex items-center gap-2">
                <p class="text-base font-semibold text-[#0b1220]">
                  {{ quote.expectedQuoteCompletionDate ? (quote.expectedQuoteCompletionDate | date:'dd-MM-yyyy') : '--' }}
                </p>
                <!-- Edit Expected Date Button (Provider only, when allowed) -->
                <button
                  *ngIf="canEditExpectedDate()"
                  (click)="showExpectedDatePicker = true"
                  class="rounded-lg p-1 text-[#1f4fbf] transition-colors hover:bg-[#EBF0F7]"
                  title="Set expected date"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Dates (TENDERING and COORDINATOR quotes) -->
          <div *ngIf="getQuoteCategory() === QUOTE_CATEGORIES.TENDER || getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR" class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-[#526179]">Tender Start Date:</p>
              <p class="text-base font-semibold text-[#0b1220]">
                {{ getTenderStartDate() }}
              </p>
            </div>
            <div>
              <p class="text-sm text-[#526179]">Tender End Date:</p>
              <p class="text-base font-semibold text-[#0b1220]">
                {{ getTenderEndDate() }}
              </p>
            </div>
          </div>

          <!-- Status Section -->
          <div class="border-t border-[#EBECEE] pt-4">
            <div class="flex items-center gap-2 mb-3">
              <p class="text-sm text-[#324153]">The quote is in status:</p>
              <span class="px-3 py-1 text-sm font-semibold rounded-full"
                    [ngClass]="getStatusBadgeClass()">
                {{ getStatusLabel() }}
              </span>
            </div>
            <p class="mb-2 text-sm text-[#526179]">{{ getStatusExplanation() }}</p>
            <p class="text-sm italic text-[#526179]">{{ getAvailableActionsText() }}</p>
          </div>

          <!-- Attachments Section -->
          <div *ngIf="hasAttachment() || canUploadAttachment() || hasCoordinatorAttachment()" class="border-t border-[#EBECEE] pt-4">
            <p class="mb-3 text-sm font-semibold text-[#324153]">Attachments</p>

            <!-- Download Coordinator Attachment (Customer Request) - for tendering quotes -->
            <div *ngIf="hasCoordinatorAttachment()" class="flex items-center gap-3 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#1f4fbf]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-[#324153]">Customer Request: {{ getCoordinatorAttachmentName() }}</span>
              <button
                (click)="downloadCoordinatorAttachment()"
                class="text-sm font-semibold text-[#1f4fbf] hover:text-[#183f99]"
              >
                Download
              </button>
            </div>

            <!-- Download Attachment (Provider Response) -->
            <div *ngIf="hasAttachment()" class="flex items-center gap-3 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-[#324153]">{{ getAttachmentName() }}</span>
              <button
                (click)="downloadAttachment()"
                class="text-sm font-semibold text-[#1f4fbf] hover:text-[#183f99]"
              >
                Download
              </button>
            </div>

            <!-- Upload Attachment (Provider only) -->
            <div *ngIf="canUploadAttachment()" class="mt-3">
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#B6CAEC] px-3 py-2 text-sm font-semibold text-[#1f4fbf] transition-colors hover:bg-[#EBF0F7]">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Upload PDF attachment</span>
                <input
                  type="file"
                  accept=".pdf"
                  class="hidden"
                  (change)="onFileSelected($event)"
                />
              </label>
              <p class="mt-1 text-xs text-[#526179]">Maximum file size: 10MB</p>
              <p *ngIf="isUploading" class="mt-2 text-sm text-[#526179]">Uploading...</p>
            </div>
          </div>

          <!-- Action Buttons Section (TAILORED and TENDERING categories) -->
          <div *ngIf="hasActionButtons() && getQuoteCategory() !== QUOTE_CATEGORIES.COORDINATOR" class="border-t border-[#EBECEE] pt-4">
            <div class="space-y-3">
              <!-- Provider: Accept Tender Invite (when pending, only while coordinator is in inProgress) -->
              <div *ngIf="currentUserRole === 'seller' && getPrimaryState() === QUOTE_STATUSES.PENDING && (getQuoteCategory() !== QUOTE_CATEGORIES.TENDER || getCoordinatorState() === QUOTE_STATUSES.IN_PROGRESS)" class="flex items-center justify-between">
                <p class="text-sm text-[#526179]">
                  {{ getQuoteCategory() === QUOTE_CATEGORIES.TENDER ? ACTION_TEXTS.ACCEPT_TENDER_INVITE : ACTION_TEXTS.ACCEPT_QUOTE_PROVIDER }}
                </p>
                <button
                  (click)="acceptQuote()"
                  [disabled]="isProcessing || !canAcceptQuote()"
                  [title]="getAcceptButtonTooltip()"
                  class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ getQuoteCategory() === QUOTE_CATEGORIES.TENDER ? 'Accept Invite' : 'Accept Quote' }}
                </button>
              </div>

              <!-- Customer: Accept Proposal (tailored: when approved; tender: only when coordinator is 'accepted'/closed) -->
              <div *ngIf="currentUserRole === 'customer' && getPrimaryState() === QUOTE_STATUSES.APPROVED && (getQuoteCategory() !== QUOTE_CATEGORIES.TENDER || getCoordinatorState() === QUOTE_STATUSES.ACCEPTED)" class="flex items-center justify-between">
                <p class="text-sm text-[#526179]">{{ ACTION_TEXTS.ACCEPT_PROPOSAL_CUSTOMER }}</p>
                <button
                  (click)="acceptProposal()"
                  [disabled]="isProcessing"
                  class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Accept Quote
                </button>
              </div>
            </div>
          </div>

          <!-- Action Buttons Section (COORDINATOR category) -->
          <div *ngIf="getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR" class="border-t border-[#EBECEE] pt-4">
            <div class="space-y-3">
              <!-- Broadcast Message Button (hidden while tender is still in pending/draft) -->
              <div *ngIf="currentUserRole === 'customer' && getPrimaryState() !== QUOTE_STATUSES.PENDING" class="flex items-center justify-between">
                <p class="text-sm text-[#526179]">Send a message to all invited providers in this tender</p>
                <button
                  (click)="openBroadcastMessage()"
                  [disabled]="isProcessing"
                  class="inline-flex h-10 items-center gap-2 rounded-lg border border-[#B6CAEC] bg-white px-4 text-sm font-semibold text-[#1f4fbf] transition-colors hover:bg-[#EBF0F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  Broadcast Message
                </button>
              </div>
            </div>
          </div>

          <!-- Cancel Quote (Always Available except when Accepted) -->
          <div *ngIf="getPrimaryState() !== QUOTE_STATUSES.ACCEPTED && getPrimaryState() !== QUOTE_STATUSES.CANCELLED" class="border-t border-[#EBECEE] pt-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-[#526179]">
                {{ getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR ? 'Cancel this tender and all the related quotes / invites' : (getQuoteCategory() === QUOTE_CATEGORIES.TENDER && currentUserRole === 'seller' && getPrimaryState() === QUOTE_STATUSES.PENDING ? ACTION_TEXTS.DECLINE_TENDER_INVITE : ACTION_TEXTS.CANCEL_QUOTE_PROVIDER) }}
              </p>
              <button
                (click)="cancelQuote()"
                [disabled]="isProcessing"
                class="inline-flex h-10 items-center gap-2 rounded-lg border border-[#F4C7C7] bg-white px-4 text-sm font-semibold text-[#B42318] transition-colors hover:bg-[#FFF1F1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {{ getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR ? 'Cancel Tender' : 'Cancel Quote' }}
              </button>
            </div>
          </div>

          <!-- Create Offer Button (Provider only, when quote is accepted) -->
          <div *ngIf="currentUserRole === 'seller' && getPrimaryState() === QUOTE_STATUSES.ACCEPTED" class="border-t border-[#EBECEE] pt-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-[#526179]">{{ ACTION_TEXTS.CREATE_OFFER }}</p>
              <button
                (click)="createOffer()"
                class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Offer
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div data-testid="quote-details-modal-footer" class="mt-5 flex shrink-0 justify-between border-t border-[#EBECEE] pt-4">
          <!-- Chat Button -->
          <button
            (click)="openChat()"
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
          <button
            (click)="closeModal()"
            class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf]"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Chat Modal -->
    <app-chat-modal
      [isOpen]="showChatModal"
      [quoteId]="quoteId"
      (close)="closeChatModal()"
    ></app-chat-modal>

    <!-- Expected Date Picker Modal -->
    <div *ngIf="showExpectedDatePicker" class="fixed inset-0 z-[60] flex h-full w-full items-center justify-center overflow-y-auto bg-[#0b1220]/45 px-4">
      <div class="w-full max-w-sm rounded-2xl border border-[#EBECEE] bg-white p-6 shadow-[0_20px_50px_rgba(11,18,32,0.24)]">
        <h3 class="mb-4 text-lg font-bold text-[#0b1220]">Set Expected Completion Date</h3>
        <p class="mb-4 text-sm text-[#526179]">Select when you expect to complete this quote:</p>
        <div class="mb-4">
          <app-tender-date-field
            [(value)]="selectedExpectedDate"
            [min]="minDate"
          ></app-tender-date-field>
        </div>
        <div class="flex justify-end gap-3 border-t border-[#EBECEE] pt-4">
          <button
            (click)="showExpectedDatePicker = false"
            class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf]"
          >
            Cancel
          </button>
          <button
            (click)="saveExpectedDate()"
            [disabled]="!selectedExpectedDate"
            class="inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Broadcast Message Modal -->
    <div *ngIf="showBroadcastModal" class="fixed inset-0 z-[60] flex h-full w-full items-center justify-center overflow-y-auto bg-[#0b1220]/45 px-4">
      <div class="w-full max-w-md rounded-2xl border border-[#EBECEE] bg-white p-6 shadow-[0_20px_50px_rgba(11,18,32,0.24)]">
        <h3 class="mb-4 text-lg font-bold text-[#0b1220]">Broadcast Message</h3>
        <p class="mb-4 text-sm text-[#526179]">This message will be sent to all invited providers in this tender:</p>
        <textarea
          [(ngModel)]="broadcastMessage"
          rows="4"
          placeholder="Type your message to all invited providers..."
          class="mb-4 w-full rounded-lg border border-[#EBECEE] bg-white px-3 py-2 text-sm text-[#0b1220] outline-none transition-colors placeholder:text-[#9AA6B8] hover:border-[#1f4fbf] focus:border-[#1f4fbf] focus:ring-2 focus:ring-[#B6CAEC]"
        ></textarea>
        <div class="flex justify-end gap-3 border-t border-[#EBECEE] pt-4">
          <button
            (click)="closeBroadcastModal()"
            class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf]"
          >
            Cancel
          </button>
          <button
            (click)="sendBroadcastMessage()"
            [disabled]="!broadcastMessage || isBroadcastSending"
            class="inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isBroadcastSending ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showConfirmDialog"
      [title]="confirmDialogTitle"
      [message]="confirmDialogMessage"
      [confirmText]="confirmDialogButtonText"
      [confirmButtonClass]="confirmDialogButtonClass"
      (confirm)="confirmDialogCallback && confirmDialogCallback()"
      (cancel)="showConfirmDialog = false"
    ></app-confirm-dialog>
  `
})
export class QuoteDetailsModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() quoteId: string | null = null;
  @Input() currentUserRole: 'customer' | 'seller' = 'customer';
  @Input() currentUserId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() quoteUpdated = new EventEmitter<Quote>();

  quote: Quote | null = null;
  coordinatorQuote: Quote | null = null; // For tendering quotes, store the coordinator quote
  isLoading = false;
  error: string | null = null;
  isProcessing = false;
  isUploading = false;

  // Confirmation dialogs
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogCallback: (() => void) | null = null;
  confirmDialogButtonText = 'Confirm';
  confirmDialogButtonClass = 'inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50';

  // Data enrichment
  buyerName = 'Loading...';
  buyerVatId = 'N/A';
  buyerOperatorName = 'Loading...';
  buyerOperatorVatId = 'N/A';
  sellerName = 'Loading...';
  sellerVatId = 'N/A';
  sellerOperatorName = 'Loading...';
  sellerOperatorVatId = 'N/A';
  productName = 'Loading...';

  // Expected date picker
  showExpectedDatePicker = false;
  selectedExpectedDate = '';

  // Chat modal
  showChatModal = false;

  // Broadcast message modal
  showBroadcastModal = false;
  broadcastMessage = '';
  isBroadcastSending = false;

  // Expose constants to template
  readonly ACTION_TEXTS = QUOTE_ACTION_BUTTON_TEXTS;
  readonly QUOTE_CATEGORIES = QUOTE_CATEGORIES;
  readonly QUOTE_STATUSES = QUOTE_STATUSES;

  // Services
  private quoteService = inject(QuoteService);
  private notificationService = inject(NotificationService);
  private accountService = inject(AccountServiceService);
  private productService = inject(ApiServiceService);
  private router = inject(Router);

  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  ngOnInit() {
    if (this.isOpen && this.quoteId) {
      this.loadQuote(this.quoteId);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isOpen && this.quoteId) {
      this.loadQuote(this.quoteId);
    } else if (!this.isOpen) {
      this.resetState();
    }
  }

  private resetState() {
    this.quote = null;
    this.coordinatorQuote = null;
    this.error = null;
    this.buyerName = 'Loading...';
    this.buyerVatId = 'N/A';
    this.buyerOperatorName = 'Loading...';
    this.buyerOperatorVatId = 'N/A';
    this.sellerName = 'Loading...';
    this.sellerVatId = 'N/A';
    this.sellerOperatorName = 'Loading...';
    this.sellerOperatorVatId = 'N/A';
    this.productName = 'Loading...';
    this.showExpectedDatePicker = false;
    this.selectedExpectedDate = '';
  }

  loadQuote(id: string) {
    this.isLoading = true;
    this.error = null;

    this.quoteService.getQuoteById(id).subscribe({
      next: (quote) => {
        this.quote = quote;

        // If this is a tendering quote and has a coordinator (externalId), load the coordinator quote
        if (quote.category === QUOTE_CATEGORIES.TENDER && quote.externalId) {
          this.quoteService.getQuoteById(quote.externalId).subscribe({
            next: (coordinatorQuote) => {
              this.coordinatorQuote = coordinatorQuote;
              console.log('Loaded coordinator quote:', coordinatorQuote);
              this.isLoading = false;
              this.enrichQuoteData();
            },
            error: (error: Error) => {
              console.error('Failed to load coordinator quote:', error);
              // Continue without coordinator quote
              this.isLoading = false;
              this.enrichQuoteData();
            }
          });
        } else {
          this.isLoading = false;
          this.enrichQuoteData();
        }
      },
      error: (error: Error) => {
        this.error = 'Failed to load quote. Please try again.';
        this.isLoading = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  /**
   * Check if an ID is an organization URN that can be fetched from the API
   */
  private isOrganizationId(id: string | undefined): boolean {
    return !!id && id.startsWith('urn:ngsi-ld:organization:');
  }

  /**
   * Fetch party name from API if it's an organization ID, otherwise use the ID as-is
   */
  private fetchPartyName(
    partyId: string | undefined,
    onSuccess: (name: string) => void,
    fallbackValue: string = 'N/A'
  ) {
    if (!partyId) {
      onSuccess(fallbackValue);
      return;
    }

    if (this.isOrganizationId(partyId)) {
      this.accountService.getOrgInfo(partyId).then(
        (org: any) => {
          onSuccess(org?.tradingName || org?.name || partyId);
        },
        () => {
          onSuccess(partyId);
        }
      );
    } else {
      // Not an organization ID, use the ID value directly
      onSuccess(partyId);
    }
  }

  private enrichQuoteData() {
    if (!this.quote) return;

    // Extract all 4 parties from relatedParty
    const buyer = this.quote.relatedParty?.find(p =>
      p.role?.toLowerCase() === 'buyer'
    );
    const buyerOperator = this.quote.relatedParty?.find(p =>
      p.role?.toLowerCase() === 'buyeroperator'
    );
    const seller = this.quote.relatedParty?.find(p =>
      p.role?.toLowerCase() === 'seller'
    );
    const sellerOperator = this.quote.relatedParty?.find(p =>
      p.role?.toLowerCase() === 'selleroperator'
    );

    // Helper function to clean IDs by removing URN and did:elsi prefixes
    const cleanId = (id: string | undefined): string => {
      if (!id) return 'N/A';
      // Remove urn:ngsi-ld:organization: prefix
      let cleaned = id.replace(/^urn:ngsi-ld:organization:/, '');
      // Remove did:elsi: prefix
      cleaned = cleaned.replace(/^did:elsi:/, '');
      return cleaned;
    };

    // Helper function to strip "did:elsi:" prefix from VAT IDs
    const cleanVatId = (vatId: string | undefined): string => {
      if (!vatId) return 'N/A';
      return vatId.replace(/^did:elsi:/, '');
    };



    // Get VAT IDs from relatedParty name field and clean them
    this.buyerVatId = cleanVatId(buyer?.name);
    this.buyerOperatorVatId = cleanVatId(buyerOperator?.name);
    this.sellerVatId = cleanVatId(seller?.name);
    this.sellerOperatorVatId = cleanVatId(sellerOperator?.name);

    // Fetch party names (only calls API for organization IDs)
    // For operators without org IDs, name stays as 'N/A'
    this.fetchPartyName(buyer?.id, (name) => this.buyerName = name, 'N/A');
    if (this.isOrganizationId(buyerOperator?.id)) {
      this.fetchPartyName(buyerOperator?.id, (name) => this.buyerOperatorName = name, 'N/A');
    }
    this.fetchPartyName(seller?.id, (name) => this.sellerName = name, 'N/A');
    if (this.isOrganizationId(sellerOperator?.id)) {
      this.fetchPartyName(sellerOperator?.id, (name) => this.sellerOperatorName = name, 'N/A');
    }

    // Fetch product info
    const productOfferingId = this.quote.quoteItem?.[0]?.productOffering?.id;
    if (productOfferingId) {
      // First check if name is already in the quote data
      const existingName = this.quote.quoteItem?.[0]?.productOffering?.name;
      if (existingName) {
        this.productName = existingName;
      } else {
        this.productService.getProductById(productOfferingId).then(
          (product: any) => {
            this.productName = product?.name || productOfferingId;
          },
          () => {
            this.productName = productOfferingId;
          }
        );
      }
    }
  }

  getPrimaryState(): string {
    if (!this.quote) return 'unknown';
    if (Array.isArray(this.quote.quoteItem) && this.quote.quoteItem.length > 0) {
      return this.quote.quoteItem[0].state || 'unknown';
    }
    return this.quote.state || 'unknown';
  }

  /**
   * Get user-friendly status label based on quote category and user role
   */
  getStatusLabel(): string {
    const state = this.getPrimaryState();
    if (!this.quote) return state;

    // Determine which label set to use based on category and role
    let labels: any;

    if (this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR) {
      // Coordinator quotes use their own label set
      labels = TENDER_COORDINATOR_STATUSES_LABELS;
    } else if (this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER) {
      // Tender child quotes use labels based on user role
      labels = this.currentUserRole === 'customer'
        ? TENDER_RELATED_QUOTES_LABELS_CUSTOMER
        : TENDER_RELATED_QUOTES_LABELS_PROVIDER;
    } else {
      // Tailored quotes use labels based on user role
      labels = this.currentUserRole === 'customer'
        ? TAILORED_STATUSES_LABELS_CUSTOMER
        : TAILORED_STATUSES_LABELS_PROVIDER;
    }

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

  // Returns the state of the coordinator quote (for tendering quotes)
  getCoordinatorState(): string | null {
    if (!this.coordinatorQuote) return null;
    if (Array.isArray(this.coordinatorQuote.quoteItem) && this.coordinatorQuote.quoteItem.length > 0) {
      return this.coordinatorQuote.quoteItem[0].state || null;
    }
    return this.coordinatorQuote.state || null;
  }

  getStatusBadgeClass(): string {
    const state = this.getPrimaryState();
    const classes: Record<string, string> = {
      [QUOTE_STATUSES.PENDING]: 'bg-yellow-100 text-yellow-800',
      [QUOTE_STATUSES.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [QUOTE_STATUSES.APPROVED]: 'bg-green-100 text-green-800',
      [QUOTE_STATUSES.ACCEPTED]: 'bg-emerald-100 text-emerald-800',
      [QUOTE_STATUSES.REJECTED]: 'bg-red-100 text-red-800',
      [QUOTE_STATUSES.CANCELLED]: 'bg-gray-100 text-gray-800'
    };
    return classes[state] || 'bg-gray-100 text-gray-600';
  }

  getQuoteCategory(): string {
    return this.quote?.category || 'tailored';
  }

  getModalTitle(): string {
    const category = this.getQuoteCategory();
    return category === QUOTE_CATEGORIES.COORDINATOR ? 'Tender Details' : 'Quote Details';
  }

  getStatusExplanation(): string {
    const state = this.getPrimaryState();
    const role = this.currentUserRole === 'customer' ? 'buyer' : 'provider';
    const category = this.getQuoteCategory();

    let messages;
    if (category === QUOTE_CATEGORIES.COORDINATOR) {
      messages = COORDINATOR_STATUS_MESSAGES;
    } else if (category === QUOTE_CATEGORIES.TENDER) {
      messages = TENDERING_STATUS_MESSAGES;
    } else {
      messages = QUOTE_STATUS_MESSAGES; // tailored or default
    }

    return messages[state]?.[role]?.explanation || 'Status information unavailable.';
  }

  getAvailableActionsText(): string {
    const state = this.getPrimaryState();
    const role = this.currentUserRole === 'customer' ? 'buyer' : 'provider';
    const category = this.getQuoteCategory();

    let messages;
    if (category === QUOTE_CATEGORIES.COORDINATOR) {
      messages = COORDINATOR_STATUS_MESSAGES;
    } else if (category === QUOTE_CATEGORIES.TENDER) {
      messages = TENDERING_STATUS_MESSAGES;
    } else {
      messages = QUOTE_STATUS_MESSAGES; // tailored or default
    }

    return messages[state]?.[role]?.availableActions || '';
  }

  isQuoteFinalized(): boolean {
    const state = this.getPrimaryState();
    return state === QUOTE_STATUSES.CANCELLED || state === QUOTE_STATUSES.ACCEPTED || state === QUOTE_STATUSES.REJECTED;
  }

  hasAttachment(): boolean {
    return this.quote?.quoteItem?.some(qi => qi.attachment && qi.attachment.length > 0) || false;
  }

  getAttachmentName(): string {
    const attachment = this.quote?.quoteItem?.[0]?.attachment?.[0];
    return attachment?.name || 'attachment.pdf';
  }

  hasCoordinatorAttachment(): boolean {
    // Only show coordinator attachment for tendering quotes from provider side
    if (this.getQuoteCategory() !== QUOTE_CATEGORIES.TENDER) return false;
    return this.coordinatorQuote?.quoteItem?.some(qi => qi.attachment && qi.attachment.length > 0) || false;
  }

  getCoordinatorAttachmentName(): string {
    const attachment = this.coordinatorQuote?.quoteItem?.[0]?.attachment?.[0];
    return attachment?.name || 'tender-request.pdf';
  }

  getTenderStartDate(): string {
    // For tender quotes, use coordinator quote dates if available
    if (this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER && this.coordinatorQuote) {
      const date = this.coordinatorQuote.expectedFulfillmentStartDate;
      return date ? new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-') : '--';
    }
    // For coordinator quotes, use own dates
    const date = this.quote?.expectedFulfillmentStartDate;
    return date ? new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-') : '--';
  }

  getTenderEndDate(): string {
    // For tender quotes, use coordinator quote dates if available
    if (this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER && this.coordinatorQuote) {
      const date = this.coordinatorQuote.effectiveQuoteCompletionDate;
      return date ? new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-') : '--';
    }
    // For coordinator quotes, use own dates
    const date = this.quote?.effectiveQuoteCompletionDate;
    return date ? new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-') : '--';
  }

  canUploadAttachment(): boolean {
    if (this.currentUserRole !== 'seller') return false;
    // For tendering quotes, only allow upload when the coordinator is in 'approved' (launched) state
    if (this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER) {
      return this.getCoordinatorState() === QUOTE_STATUSES.APPROVED;
    }
    const state = this.getPrimaryState();
    return state === QUOTE_STATUSES.IN_PROGRESS || state === QUOTE_STATUSES.APPROVED;
  }

  canEditExpectedDate(): boolean {
    if (this.currentUserRole !== 'seller') return false;
    const state = this.getPrimaryState();
    return !this.isQuoteFinalized() && (state === QUOTE_STATUSES.PENDING || state === QUOTE_STATUSES.IN_PROGRESS || state === QUOTE_STATUSES.APPROVED);
  }

  canRejectOrCancel(): boolean {
    const state = this.getPrimaryState();
    if (this.currentUserRole === 'seller') {
      // Sellers can cancel quotes in pending, inProgress, or approved states
      return state === QUOTE_STATUSES.PENDING || state === QUOTE_STATUSES.IN_PROGRESS || state === QUOTE_STATUSES.APPROVED;
    } else {
      // Customers can reject quotes only in approved state
      return state === QUOTE_STATUSES.APPROVED;
    }
  }

  canAcceptQuote(): boolean {
    // Provider can only accept if expected date is set
    if (this.currentUserRole === 'seller') {
      return !!this.quote?.expectedQuoteCompletionDate;
    }
    return true;
  }

  getAcceptButtonTooltip(): string {
    if (this.currentUserRole === 'seller' && !this.quote?.expectedQuoteCompletionDate) {
      return this.ACTION_TEXTS.EXPECTED_DATE_REQUIRED;
    }
    return '';
  }

  hasActionButtons(): boolean {
    // Check if there are any action buttons to display
    const state = this.getPrimaryState();

    // Provider: Accept Quote (when pending)
    if (this.currentUserRole === 'seller' && state === QUOTE_STATUSES.PENDING) {
      return true;
    }

    // Customer: Accept Proposal (when approved)
    if (this.currentUserRole === 'customer' && state === QUOTE_STATUSES.APPROVED) {
      return true;
    }

    return false;
  }

  downloadAttachment() {
    if (!this.quote) return;
    try {
      this.quoteService.downloadAttachment(this.quote);
      this.notificationService.showSuccess('Download started');
    } catch (error: any) {
      this.notificationService.showError(error.message || 'Error downloading attachment');
    }
  }

  downloadCoordinatorAttachment() {
    if (!this.coordinatorQuote) return;
    try {
      this.quoteService.downloadAttachment(this.coordinatorQuote);
      this.notificationService.showSuccess('Download started');
    } catch (error: any) {
      this.notificationService.showError(error.message || 'Error downloading customer request');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.quote?.id) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.notificationService.showError('Only PDF files are allowed');
      return;
    }

    // Check file size (10MB = 10 * 1024 * 1024 bytes)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.notificationService.showError('File size exceeds the maximum limit of 10MB');
      return;
    }

    this.isUploading = true;
    const fileName = file.name;
    const quoteId = this.quote.id;

    this.quoteService.addAttachmentToQuote(quoteId, file).pipe(
      // Add note for attachment upload
      switchMap((updatedQuote) => {
        this.quote = updatedQuote;
        return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.ATTACHMENT_UPLOADED(fileName), this.currentUserId).pipe(
          switchMap(() => {
            // Auto-approve if in progress
            if (this.getPrimaryState() === QUOTE_STATUSES.IN_PROGRESS) {
              return this.quoteService.updateQuoteStatus(quoteId, QUOTE_STATUSES.APPROVED).pipe(
                switchMap((approvedQuote) => {
                  this.quote = approvedQuote;
                  return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(QUOTE_STATUSES.APPROVED), this.currentUserId);
                })
              );
            }
            return [updatedQuote];
          })
        );
      })
    ).subscribe({
      next: () => {
        this.isUploading = false;
        this.notificationService.showSuccess('Attachment uploaded successfully');
        if (this.getPrimaryState() === QUOTE_STATUSES.APPROVED) {
          this.notificationService.showSuccess('Quote has been approved and sent to customer');
        }
        this.quoteUpdated.emit(this.quote!);
      },
      error: (error) => {
        this.isUploading = false;
        this.notificationService.showError('Failed to upload attachment');
      }
    });
  }

  acceptQuote() {
    if (!this.quote?.id || this.isProcessing) return;

    this.confirmDialogTitle = 'Accept Quote Request';
    this.confirmDialogMessage = 'Are you sure you want to accept this quote request?';
    this.confirmDialogButtonText = 'Accept';
    this.confirmDialogButtonClass = 'inline-flex h-10 items-center rounded-lg bg-[#006B4A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00523A] focus:outline-none focus:ring-2 focus:ring-[#B8E6D1] disabled:cursor-not-allowed disabled:opacity-50';
    this.confirmDialogCallback = () => {
      this.isProcessing = true;
      const quoteId = this.quote!.id!;

      this.quoteService.updateQuoteStatus(quoteId, QUOTE_STATUSES.IN_PROGRESS).pipe(
        switchMap((updatedQuote) => {
          this.quote = updatedQuote;
          return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(QUOTE_STATUSES.IN_PROGRESS), this.currentUserId);
        })
      ).subscribe({
        next: () => {
          this.isProcessing = false;
          this.notificationService.showSuccess('Quote request accepted');
          this.quoteUpdated.emit(this.quote!);
        },
        error: (error) => {
          this.isProcessing = false;
          this.notificationService.showError('Failed to accept quote');
        }
      });
      this.showConfirmDialog = false;
    };
    this.showConfirmDialog = true;
  }

  acceptProposal() {
    if (!this.quote?.id || this.isProcessing) return;

    this.confirmDialogTitle = 'Accept Quote Proposal';
    this.confirmDialogMessage = 'Are you sure you want to accept this quote proposal?';
    this.confirmDialogButtonText = 'Accept';
    this.confirmDialogButtonClass = 'inline-flex h-10 items-center rounded-lg bg-[#006B4A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00523A] focus:outline-none focus:ring-2 focus:ring-[#B8E6D1] disabled:cursor-not-allowed disabled:opacity-50';
    this.confirmDialogCallback = () => {
      this.isProcessing = true;
      const quoteId = this.quote!.id!;

      this.quoteService.updateQuoteStatus(quoteId, QUOTE_STATUSES.ACCEPTED).pipe(
        switchMap((updatedQuote) => {
          this.quote = updatedQuote;
          return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(QUOTE_STATUSES.ACCEPTED), this.currentUserId);
        })
      ).subscribe({
        next: () => {
          this.isProcessing = false;
          this.notificationService.showSuccess('Quote proposal accepted');
          this.quoteUpdated.emit(this.quote!);
        },
        error: (error) => {
          this.isProcessing = false;
          this.notificationService.showError('Failed to accept proposal');
        }
      });
      this.showConfirmDialog = false;
    };
    this.showConfirmDialog = true;
  }

  cancelQuote() {
    if (!this.quote?.id || this.isProcessing) return;

    const isCoordinator = this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR;

    this.confirmDialogTitle = isCoordinator ? 'Cancel Tender' : 'Cancel Quote';
    this.confirmDialogMessage = isCoordinator
      ? 'Are you sure you want to cancel this tender? This will also cancel all related provider invites.'
      : 'Are you sure you want to cancel this quote?';
    this.confirmDialogButtonText = isCoordinator ? 'Cancel Tender' : 'Cancel Quote';
    this.confirmDialogButtonClass = 'inline-flex h-10 items-center rounded-lg border border-[#F4C7C7] bg-white px-4 text-sm font-semibold text-[#B42318] transition-colors hover:bg-[#FFF1F1] focus:outline-none focus:ring-2 focus:ring-[#F4C7C7] disabled:cursor-not-allowed disabled:opacity-50';
    this.confirmDialogCallback = () => {
      this.isProcessing = true;
      this.showConfirmDialog = false;

      if (isCoordinator) {
        this.cancelCoordinatorWithCascade();
      } else {
        this.cancelSingleQuote(this.quote!.id!);
      }
    };
    this.showConfirmDialog = true;
  }

  private cancelSingleQuote(quoteId: string) {
    const newStatus = QUOTE_STATUSES.CANCELLED;
    this.quoteService.updateQuoteStatus(quoteId, newStatus).pipe(
      switchMap((updatedQuote) => {
        this.quote = updatedQuote;
        return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(newStatus), this.currentUserId);
      })
    ).subscribe({
      next: () => {
        this.isProcessing = false;
        this.notificationService.showSuccess('Quote cancelled');
        this.quoteUpdated.emit(this.quote!);
        this.closeModal();
      },
      error: () => {
        this.isProcessing = false;
        this.notificationService.showError('Failed to cancel quote');
      }
    });
  }

  private cancelCoordinatorWithCascade() {
    const coordinatorId = this.quote!.id!;
    const newStatus = QUOTE_STATUSES.CANCELLED;

    // Step 1: Fetch all related tendering quotes for this coordinator
    this.quoteService.getTenderingQuotesByExternalId(this.currentUserId, coordinatorId, API_ROLES.BUYER).subscribe({
      next: (relatedQuotes) => {
        console.log(`Found ${relatedQuotes.length} related tendering quotes to cancel`);

        // Step 2: Cancel all related tendering quotes in parallel
        const cancelRelatedObservables = relatedQuotes.map(relatedQuote =>
          this.quoteService.updateQuoteStatus(relatedQuote.id!, newStatus)
        );

        const cancelAll$ = cancelRelatedObservables.length > 0
          ? forkJoin(cancelRelatedObservables)
          : of([]);

        cancelAll$.pipe(
          // Step 3: Once all related quotes are cancelled, cancel the coordinator itself
          switchMap(() => this.quoteService.updateQuoteStatus(coordinatorId, newStatus)),
          switchMap((updatedCoordinator) => {
            this.quote = updatedCoordinator;
            return this.quoteService.addNoteToQuote(coordinatorId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(newStatus), this.currentUserId);
          })
        ).subscribe({
          next: () => {
            this.isProcessing = false;
            this.notificationService.showSuccess(`Tender and ${relatedQuotes.length} related quote(s) cancelled`);
            this.quoteUpdated.emit(this.quote!);
            this.closeModal();
          },
          error: () => {
            this.isProcessing = false;
            this.notificationService.showError('Failed to cancel tender. Some quotes may not have been cancelled.');
          }
        });
      },
      error: () => {
        this.isProcessing = false;
        this.notificationService.showError('Failed to fetch related quotes for cancellation');
      }
    });
  }

  saveExpectedDate() {
    if (!this.quote?.id || !this.selectedExpectedDate) return;

    const dateObj = new Date(this.selectedExpectedDate);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

    this.quoteService.updateQuoteDate(this.quote.id, formattedDate, 'expected').subscribe({
      next: (updatedQuote) => {
        this.quote = updatedQuote;
        this.showExpectedDatePicker = false;
        this.selectedExpectedDate = '';
        this.notificationService.showSuccess('Expected date updated');
        this.quoteUpdated.emit(updatedQuote);
      },
      error: (error) => {
        this.notificationService.showError('Failed to update expected date');
      }
    });
  }

  createOffer() {
    if (!this.quote?.id) return;
    this.closeModal();
    this.router.navigate(['/my-offerings'], { state: { quoteId: this.quote.id } });
  }

  // Coordinator-specific actions
  openBroadcastMessage() {
    if (!this.quote?.id) return;
    this.broadcastMessage = '';
    this.showBroadcastModal = true;
  }

  closeBroadcastModal() {
    this.showBroadcastModal = false;
    this.broadcastMessage = '';
    this.isBroadcastSending = false;
  }

  sendBroadcastMessage() {
    if (!this.quote?.id || !this.currentUserId || !this.broadcastMessage) {
      return;
    }

    this.confirmDialogTitle = 'Broadcast Message';
    this.confirmDialogMessage = 'Are you sure you want to broadcast this message to all the invited providers?';
    this.confirmDialogButtonText = 'Send';
    this.confirmDialogButtonClass = 'inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50';

    this.confirmDialogCallback = () => {
      this.executeBroadcastMessage();
      this.showConfirmDialog = false;
    };
    this.showConfirmDialog = true;
  }

  private executeBroadcastMessage() {
    if (!this.quote?.id || !this.currentUserId || !this.broadcastMessage) return;

    this.isBroadcastSending = true;

    this.quoteService.broadcastMessage(this.quote.id, this.currentUserId, this.broadcastMessage).subscribe({
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

  closeModal() {
    this.close.emit();
  }

  openChat() {
    this.showChatModal = true;
  }

  closeChatModal() {
    this.showChatModal = false;
  }
}
