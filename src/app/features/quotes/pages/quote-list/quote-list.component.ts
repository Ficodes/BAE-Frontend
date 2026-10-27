import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuoteService } from '../../services/quote.service';
import { LocalStorageService } from "src/app/services/local-storage.service";
import { NotificationService } from 'src/app/services/notification.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { Quote, QuoteStateType } from 'src/app/models/quote.model';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { QuoteDetailsModalComponent } from 'src/app/shared/quote-details-modal/quote-details-modal.component';
import { ChatModalComponent } from 'src/app/shared/chat-modal/chat-modal.component';
import { AttachmentModalComponent } from 'src/app/shared/attachment-modal/attachment-modal.component';
import { LoginInfo } from 'src/app/models/interfaces';
import { QUOTE_STATUSES } from 'src/app/models/quote.constants';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ConfirmDialogComponent, QuoteDetailsModalComponent, ChatModalComponent, AttachmentModalComponent],
  template: `
    <div class="min-h-screen bg-offerings-page font-body dark:bg-tertiary-50">
      <div class="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 lg:px-20 xl:px-[160px]">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-offerings-icon-bg text-offerings-link dark:bg-secondary-100 dark:text-primary-50">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414A1 1 0 0 1 19 9.414V19a2 2 0 0 1-2 2Z" />
              </svg>
            </div>
            <h1 class="min-w-0 text-[28px] font-bold leading-tight text-offerings-title dark:text-offerings-on-dark">{{ 'QUOTE_DASHBOARD._title' | translate }}</h1>
            <a
              href="https://knowledgebase.dome-marketplace.eu/books/tailored-offering-guide"
              target="_blank"
              rel="noopener noreferrer"
              [title]="'QUOTE_DASHBOARD._guide' | translate"
              [attr.aria-label]="'QUOTE_DASHBOARD._guide' | translate"
              class="shrink-0 rounded-lg p-1 text-offerings-muted-text transition-colors hover:bg-offerings-table-header hover:text-offerings-link focus:outline-none focus:ring-2 focus:ring-offerings-active-chip dark:text-offerings-on-dark-body dark:hover:bg-secondary-100 dark:hover:text-primary-50"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button
              (click)="refreshQuotes()"
              [disabled]="loading"
              class="inline-flex h-10 items-center rounded-lg border border-offerings-border bg-offerings-surface px-4 text-sm font-semibold text-offerings-heading transition-colors hover:border-offerings-link hover:text-offerings-link focus:outline-none focus:ring-2 focus:ring-offerings-active-chip disabled:cursor-not-allowed disabled:opacity-50 dark:border-secondary-400 dark:bg-tertiary-100 dark:text-offerings-on-dark-body dark:hover:border-primary-50 dark:hover:text-primary-50"
            >
              {{ (loading ? 'QUOTE_DASHBOARD._loading' : 'QUOTE_DASHBOARD._refresh') | translate }}
            </button>
          </div>
        </div>

        <!-- Role Tabs -->
        <div class="mb-6">
          <div class="inline-flex max-w-full flex-wrap rounded-2xl border border-offerings-border bg-offerings-surface p-1 shadow-sm dark:border-secondary-400 dark:bg-tertiary-100" role="group" [attr.aria-label]="'QUOTE_DASHBOARD._role' | translate">
            <button
              (click)="selectRole('customer')"
              [class]="getRoleTabClass('customer')"
              [attr.aria-pressed]="selectedRole === 'customer'"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {{ 'QUOTE_DASHBOARD._as_customer' | translate }}
            </button>
            <button
              (click)="selectRole('seller')"
              [class]="getRoleTabClass('seller')"
              [attr.aria-pressed]="selectedRole === 'seller'"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {{ 'QUOTE_DASHBOARD._as_provider' | translate }}
            </button>
          </div>
        </div>

        <!-- Status Filter -->
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-offerings-border bg-offerings-surface p-3 shadow-sm dark:border-secondary-400 dark:bg-tertiary-100">
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-offerings-muted-text dark:text-offerings-on-dark-body" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <label for="quote-status-filter" class="text-sm font-medium text-offerings-muted-text dark:text-offerings-on-dark-body">{{ 'QUOTE_DASHBOARD._status' | translate }}</label>
          </div>
          <div class="w-full sm:w-auto sm:max-w-full">
            <select
              id="quote-status-filter"
              [(ngModel)]="statusFilter"
              (ngModelChange)="filterQuotesByStatus()"
              [ngClass]="statusFilter ? 'border-offerings-link bg-offerings-table-header text-offerings-link dark:border-primary-50 dark:bg-secondary-100 dark:text-primary-50' : 'border-offerings-border bg-offerings-surface text-offerings-heading dark:border-secondary-400 dark:bg-tertiary-100 dark:text-offerings-on-dark-body'"
              class="h-10 w-full min-w-0 max-w-full truncate rounded-lg border py-0 pl-4 pr-10 text-[15px] font-semibold transition-colors hover:border-offerings-link focus:border-offerings-link focus:outline-none focus:ring-2 focus:ring-offerings-active-chip sm:min-w-[240px] dark:hover:border-primary-50"
            >
              <option value="">{{ 'QUOTE_DASHBOARD._all_statuses' | translate }}</option>
              <option *ngFor="let opt of filterStatusOptions" [value]="opt.value">{{ opt.label | translate }}</option>
            </select>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="flex items-center justify-center py-8" role="status">
          <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-offerings-link dark:border-primary-50" aria-hidden="true"></div>
          <span class="sr-only">{{ 'QUOTE_DASHBOARD._loading_quotes' | translate }}</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="relative mb-4 rounded-xl border border-quotes-danger-border bg-quotes-danger-bg px-4 py-3 text-quotes-danger-text" role="alert">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-quotes-danger-text" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-semibold">{{ 'QUOTE_DASHBOARD._load_error_title' | translate }}</h3>
              <p class="mt-1 text-sm">{{ error | translate }}</p>
            </div>
          </div>
        </div>

        <!-- Quotes List -->
        <div *ngIf="!loading && !error" class="overflow-hidden rounded-2xl border border-offerings-border bg-offerings-surface shadow-sm dark:border-secondary-400 dark:bg-tertiary-100">
          <div *ngIf="filteredQuotes.length === 0" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-offerings-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-semibold text-offerings-title dark:text-offerings-on-dark">{{ 'QUOTE_DASHBOARD._empty_title' | translate }}</h3>
            <p class="mt-1 text-sm text-offerings-muted-text dark:text-offerings-on-dark-body">{{ 'QUOTE_DASHBOARD._empty_description' | translate }}</p>
          </div>

          <div *ngIf="filteredQuotes.length > 0" class="overflow-x-auto" role="region" [attr.aria-label]="'QUOTE_DASHBOARD._quotes' | translate" tabindex="0">
            <div class="min-w-[900px]">
              <!-- Quotes Header -->
              <div class="border-b border-offerings-border bg-offerings-table-header px-6 py-3 dark:border-secondary-400 dark:bg-secondary-100">
                <div class="grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-wider text-offerings-muted-text dark:text-offerings-on-dark-body">
                  <div class="col-span-2">{{ 'QUOTE_DASHBOARD._request_date' | translate }}</div>
                  <div class="col-span-3">{{ (selectedRole === 'customer' ? 'QUOTE_DASHBOARD._provider' : 'QUOTE_DASHBOARD._customer') | translate }}</div>
                  <div class="col-span-3">{{ 'QUOTE_DASHBOARD._product' | translate }}</div>
                  <div class="col-span-2">{{ 'QUOTE_DASHBOARD._status' | translate }}</div>
                  <div class="col-span-2">{{ 'QUOTE_DASHBOARD._actions' | translate }}</div>
                </div>
              </div>

              <!-- Quote Rows -->
              <div *ngFor="let quote of filteredQuotes" class="quote-row">
                <div class="grid grid-cols-12 items-center gap-4 border-b border-offerings-border px-6 py-4 transition-colors dark:border-secondary-400"
                     [ngClass]="isQuoteFinalized(quote) ? 'bg-offerings-page dark:bg-secondary-100' : 'bg-offerings-surface hover:bg-offerings-table-header dark:bg-tertiary-100 dark:hover:bg-secondary-100'"
                     [attr.data-quote-id]="quote.id">

                  <!-- Data Richiesta (Creation Date) -->
                  <div class="col-span-2 text-sm text-offerings-muted-text dark:text-offerings-on-dark-body">
                    {{ quote.quoteDate | date:'dd-MM-yyyy' }}
                  </div>

                  <!-- Customer/Provider Name -->
                  <div class="col-span-3 min-w-0 break-words text-sm font-semibold text-offerings-title dark:text-offerings-on-dark">
                    {{ getOtherPartyName(quote) }}
                  </div>

                  <!-- Product Name -->
                  <div class="col-span-3 min-w-0 break-words text-sm text-offerings-heading dark:text-offerings-on-dark-body">
                    {{ getProductName(quote) }}
                  </div>

                  <!-- Status -->
                  <div class="col-span-2 min-w-0">
                    <span class="status-badge max-w-full truncate"
                          [title]="getStatusLabel(quote) | translate"
                          [ngClass]="getStateClass(getPrimaryState(quote))">
                      {{ getStatusLabel(quote) | translate }}
                    </span>
                  </div>

                  <!-- Actions (Chat + Details only) -->
                  <div class="col-span-2 flex flex-wrap items-center gap-2">
                    <!-- Chat -->
                    <button
                      [disabled]="isActionDisabled(quote, 'chat')"
                      (click)="openChat(quote)"
                      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-offerings-muted-text transition-colors hover:bg-offerings-table-header hover:text-offerings-link focus:outline-none focus:ring-2 focus:ring-offerings-active-chip disabled:cursor-not-allowed disabled:opacity-50 dark:text-offerings-on-dark-body dark:hover:bg-secondary-100 dark:hover:text-primary-50"
                      [title]="'QUOTE_DASHBOARD._chat' | translate"
                      [attr.aria-label]="'QUOTE_DASHBOARD._chat' | translate"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>

                    <!-- View Details -->
                    <button
                      [disabled]="isActionDisabled(quote, 'viewDetails')"
                      (click)="viewDetails(quote)"
                      class="inline-flex items-center gap-1 rounded-lg border border-offerings-active-chip px-3 py-1.5 text-sm font-semibold text-offerings-link transition-colors hover:bg-offerings-table-header focus:outline-none focus:ring-2 focus:ring-offerings-active-chip disabled:cursor-not-allowed disabled:opacity-50 dark:border-secondary-400 dark:text-primary-50 dark:hover:bg-secondary-100"
                    >
                      {{ 'QUOTE_DASHBOARD._details' | translate }}
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showDeleteConfirm"
      [title]="'QUOTE_DASHBOARD._delete_title' | translate"
      [message]="deleteConfirmMessage"
      [confirmText]="'QUOTE_DASHBOARD._delete' | translate"
      confirmButtonClass="px-4 py-2 text-sm font-medium text-quotes-danger-text bg-quotes-danger-bg border border-quotes-danger-border rounded-md hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-quotes-danger-border"
      (confirm)="deleteQuote()"
      (cancel)="showDeleteConfirm = false"
    ></app-confirm-dialog>

    <!-- Accept Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showAcceptConfirm"
      [title]="'QUOTE_DASHBOARD._accept_title' | translate"
      [message]="acceptConfirmMessage"
      [confirmText]="'QUOTE_DASHBOARD._accept' | translate"
      confirmButtonClass="px-4 py-2 text-sm font-medium text-quotes-success-text bg-quotes-success-bg border border-quotes-success-border rounded-md hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-quotes-success-border"
      (confirm)="acceptConfirmCallback && acceptConfirmCallback()"
      (cancel)="showAcceptConfirm = false"
    ></app-confirm-dialog>

    <!-- Cancel Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showCancelConfirm"
      [title]="'QUOTE_DASHBOARD._cancel_title' | translate"
      [message]="cancelConfirmMessage"
      [confirmText]="'QUOTE_DASHBOARD._cancel_quote' | translate"
      confirmButtonClass="px-4 py-2 text-sm font-medium text-quotes-danger-text bg-quotes-danger-bg border border-quotes-danger-border rounded-md hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-quotes-danger-border"
      (confirm)="cancelConfirmCallback && cancelConfirmCallback()"
      (cancel)="showCancelConfirm = false"
    ></app-confirm-dialog>

    <!-- State Update Modal -->
    <div *ngIf="showStateUpdate" class="fixed inset-0 bg-offerings-overlay bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-offerings-surface">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-offerings-title mb-4">{{ 'QUOTE_DASHBOARD._update_state' | translate }}</h3>
          <div class="space-y-3">
            <div *ngFor="let state of availableStates" class="flex items-center">
              <input
                [id]="'state-' + state"
                [(ngModel)]="selectedState"
                [value]="state"
                type="radio"
                class="focus:ring-offerings-active-chip h-4 w-4 text-offerings-link border-offerings-border-strong"
              >
              <label [for]="'state-' + state" class="ml-3 block text-sm font-medium text-offerings-heading">
                {{ getStateDisplay(state) | translate }}
              </label>
            </div>
          </div>
          <div class="mt-6 flex justify-end space-x-3">
            <button
              (click)="showStateUpdate = false"
              class="px-4 py-2 text-sm font-medium text-offerings-heading bg-offerings-surface border border-offerings-border-strong rounded-md hover:bg-offerings-page focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offerings-active-chip"
            >
              {{ 'QUOTE_DASHBOARD._cancel' | translate }}
            </button>
            <button
              (click)="confirmStateUpdate()"
              [disabled]="!selectedState"
              class="px-4 py-2 text-sm font-medium text-offerings-on-dark bg-offerings-link border border-transparent rounded-md hover:bg-offerings-link-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offerings-active-chip disabled:opacity-50"
            >
              {{ 'QUOTE_DASHBOARD._update' | translate }}
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
    <div *ngIf="showDatePickerModal" class="fixed inset-0 bg-offerings-overlay bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-offerings-surface">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-offerings-title mb-4">
            {{ (datePickerType === 'requested' ? 'QUOTE_DASHBOARD._requested_date_title' : 'QUOTE_DASHBOARD._expected_date_title') | translate }}
          </h3>
          <p class="text-sm text-offerings-muted-text mb-4">
            {{ (datePickerType === 'requested' ? 'QUOTE_DASHBOARD._requested_date_description' : 'QUOTE_DASHBOARD._expected_date_description') | translate }}
          </p>

          <div class="mb-6">
            <label for="completion-date" class="block text-sm font-medium text-offerings-heading mb-2">
              {{ 'QUOTE_DASHBOARD._completion_date' | translate }}
            </label>
            <input
              id="completion-date"
              type="date"
              [(ngModel)]="selectedDate"
              [min]="getTomorrowDate()"
              class="w-full border border-offerings-border-strong rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offerings-active-chip focus:border-offerings-link"
            />
            <p class="text-xs text-offerings-muted-text mt-1">{{ 'QUOTE_DASHBOARD._future_date' | translate }}</p>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              (click)="closeDatePickerModal()"
              class="px-4 py-2 text-sm font-medium text-offerings-heading bg-offerings-surface border border-offerings-border-strong rounded-md hover:bg-offerings-page focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offerings-active-chip"
            >
              {{ 'QUOTE_DASHBOARD._cancel' | translate }}
            </button>
            <button
              (click)="confirmDateUpdate()"
              [disabled]="!selectedDate || !isDateValid()"
              class="px-4 py-2 text-sm font-medium text-offerings-on-dark bg-offerings-link border border-transparent rounded-md hover:bg-offerings-link-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offerings-active-chip disabled:opacity-50"
            >
              {{ 'QUOTE_DASHBOARD._save_date' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .status-badge {
      @apply inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5;
    }

    .status-pending {
      @apply border-quotes-warning-border bg-quotes-warning-bg text-quotes-warning-text;
    }

    .status-inProgress {
      @apply border-quotes-info-border bg-quotes-info-bg text-quotes-info-text;
    }

    .status-approved, .status-accepted {
      @apply border-quotes-success-border bg-quotes-success-bg text-quotes-success-text;
    }

    .status-rejected {
      @apply border-quotes-danger-border bg-quotes-danger-bg text-quotes-danger-text;
    }

    .status-cancelled, .status-unknown {
      @apply border-quotes-neutral-border bg-quotes-neutral-bg text-quotes-neutral-text;
    }
  `]
})
export class QuoteListComponent implements OnInit {
  private translate = inject(TranslateService);
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
  productNames: Map<string, string | null> = new Map();

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
      this.error = 'QUOTE_DASHBOARD._unauthenticated';
    }
  }

  loadQuotes() {
    if (!this.currentUserId) {
      this.error = 'QUOTE_DASHBOARD._unauthenticated';
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
        this.error = 'QUOTE_DASHBOARD._load_error';
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
            return { id, name: product?.name || null };
          },
          (error) => {
            console.error('Product fetch error:', id, error);
            return { id, name: null }; // Fallback to placeholder on error
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
    const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offerings-active-chip';
    return this.selectedRole === role
      ? `${base} bg-offerings-table-header text-offerings-link dark:bg-secondary-100 dark:text-primary-50`
      : `${base} text-offerings-muted-text hover:bg-offerings-page hover:text-offerings-link dark:text-offerings-on-dark-body dark:hover:bg-secondary-100 dark:hover:text-primary-50`;
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

  get filterStatusOptions(): { value: string; label: string }[] {
    return [
      QUOTE_STATUSES.PENDING,
      QUOTE_STATUSES.IN_PROGRESS,
      QUOTE_STATUSES.APPROVED,
      QUOTE_STATUSES.ACCEPTED,
      QUOTE_STATUSES.CANCELLED,
      QUOTE_STATUSES.REJECTED,
    ].map(state => ({ value: state, label: this.getStatusTranslationKey(state) }));
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
    this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._updated', { id: shortId, status: this.translate.instant(this.getStateDisplay(state as QuoteStateType)) }));
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
          this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._approved_after_upload', { id: shortId }));
        },
        error: (error) => {
          console.error('Error updating quote status to approved:', error);
          this.notificationService.showError(this.translate.instant('QUOTE_DASHBOARD._status_update_error', { reason: error.message || this.translate.instant('QUOTE_DASHBOARD._unknown_error') }));
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
          this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._state_updated'));
        },
        error: (error) => {
          console.error('Failed to update quote state:', error);
          this.notificationService.showError(this.translate.instant('QUOTE_DASHBOARD._state_update_error'));
        }
      });
    }
  }

  confirmDelete(quote: Quote) {
    this.quoteToDelete = quote;
    this.deleteConfirmMessage = this.translate.instant('QUOTE_DASHBOARD._delete_confirmation', { id: this.extractShortId(quote.id) });
    this.showDeleteConfirm = true;
  }

  deleteQuote() {
    if (this.quoteToDelete) {
      this.quoteService.deleteQuote(this.quoteToDelete.id!).subscribe({
        next: () => {
          this.quotes = this.quotes.filter(q => q.id !== this.quoteToDelete!.id);
          this.filterQuotesByStatus();
          this.showDeleteConfirm = false;
          this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._deleted'));
        },
        error: (error) => {
          console.error('Failed to delete quote:', error);
          this.notificationService.showError(this.translate.instant('QUOTE_DASHBOARD._delete_error'));
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
    this.quoteService.downloadAttachment(quote).subscribe({
      next: () => this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._download_started')),
      error: (error: any) => {
        console.error('Error downloading attachment:', error);
        this.notificationService.showError(error.message || this.translate.instant('QUOTE_DASHBOARD._download_error'));
      }
    });
  }

  addAttachment(quote: Quote) {
    // Open the attachment modal
    this.selectedAttachmentQuote = quote;
    this.showAttachmentModal = true;
  }

  acceptQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    this.acceptConfirmMessage = this.translate.instant('QUOTE_DASHBOARD._accept_request_confirmation');
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
          this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._request_accepted', { id: shortId }));
        },
        error: (error) => {
          console.error('Error accepting quote request:', error);
          this.notificationService.showError(this.translate.instant('QUOTE_DASHBOARD._accept_request_error', { reason: error.message || this.translate.instant('QUOTE_DASHBOARD._unknown_error') }));
        }
      });
      this.showAcceptConfirm = false;
    };
    this.showAcceptConfirm = true;
  }

  acceptQuoteCustomer(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    this.acceptConfirmMessage = this.translate.instant('QUOTE_DASHBOARD._accept_proposal_confirmation');
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
          this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._proposal_accepted', { id: shortId }));
        },
        error: (error) => {
          console.error('Error accepting quotation:', error);
          this.notificationService.showError(this.translate.instant('QUOTE_DASHBOARD._accept_proposal_error', { reason: error.message || this.translate.instant('QUOTE_DASHBOARD._unknown_error') }));
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
        this.notificationService.showSuccess(this.translate.instant(dateType === 'requested' ? 'QUOTE_DASHBOARD._requested_date_saved' : 'QUOTE_DASHBOARD._expected_date_saved', { id: shortId }));
        this.closeDatePickerModal();
      },
      error: (error) => {
        console.error(`Error setting ${dateType} completion date:`, error);
        this.notificationService.showError(this.translate.instant(dateType === 'requested' ? 'QUOTE_DASHBOARD._requested_date_error' : 'QUOTE_DASHBOARD._expected_date_error', { reason: error.message || this.translate.instant('QUOTE_DASHBOARD._unknown_error') }));
      }
    });
  }

  cancelQuote(quote: Quote) {
    const shortId = this.extractShortId(quote.id);
    this.cancelConfirmMessage = this.translate.instant('QUOTE_DASHBOARD._cancel_confirmation', { id: shortId });
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
          this.notificationService.showSuccess(this.translate.instant('QUOTE_DASHBOARD._cancelled', { id: shortId }));
        },
        error: (error) => {
          console.error('Error cancelling quote:', error);
          this.notificationService.showError(this.translate.instant('QUOTE_DASHBOARD._cancel_error', { reason: error.message || this.translate.instant('QUOTE_DASHBOARD._unknown_error') }));
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
    if (!id) return this.translate.instant('QUOTE_DASHBOARD._not_available');
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
      return this.translate.instant('QUOTE_DASHBOARD._unknown');
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
      return this.translate.instant('QUOTE_DASHBOARD._unknown');
    }

    // Look up the name from the enriched data map
    const enrichedName = this.organizationNames.get(party.id);
    if (enrichedName && enrichedName !== party.id) {
      return enrichedName;
    }

    // Fallback: show loading indicator or shortened ID
    return this.translate.instant('QUOTE_DASHBOARD._loading');
  }

  /**
   * Get the product name from the quote's first quote item.
   */
  getProductName(quote: Quote): string {
    if (!quote.quoteItem || quote.quoteItem.length === 0) {
      return this.translate.instant('QUOTE_DASHBOARD._unknown_product');
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
      if (this.productNames.has(productId)) {
        return enrichedName || this.translate.instant('QUOTE_DASHBOARD._product_unavailable');
      }
      // Still loading
      return this.translate.instant('QUOTE_DASHBOARD._loading');
    }

    // Fallback to product name
    if (firstItem.product?.name) {
      return firstItem.product.name;
    }

    return this.translate.instant('QUOTE_DASHBOARD._unknown_product');
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
    return this.getStatusTranslationKey(this.getPrimaryState(quote));
  }

  private getStatusTranslationKey(state: string): string {
    if (!this.availableStates.includes(state as QuoteStateType)) {
      return 'QUOTE_DASHBOARD._unknown';
    }
    const role = this.selectedRole === 'customer' ? 'customer' : 'provider';
    return `QUOTE_DASHBOARD.statuses.${role}.${state}`;
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
        return isCancelled; // Only disabled for cancelled quotes
      case 'chat':
        return false; // Chat is always available — users should be able to communicate regardless of quote status
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
      return `${baseClass} text-offerings-disabled cursor-not-allowed border-offerings-border`;
    }

    switch (actionType) {
      case 'viewDetails':
        return `${baseClass} text-offerings-link hover:text-offerings-link-hover border-offerings-active-chip hover:bg-offerings-table-header`;
      default:
        return `${baseClass} text-offerings-link hover:text-offerings-link-hover border-offerings-active-chip hover:bg-offerings-table-header`;
    }
  }

  getIconButtonClass(quote: Quote, actionType: string, normalColor: string): string {
    const baseClass = 'p-1.5 text-xs cursor-pointer rounded hover:bg-offerings-page transition-colors';

    if (this.isActionDisabled(quote, actionType)) {
      return `${baseClass} text-offerings-disabled cursor-not-allowed hover:bg-transparent`;
    }

    return `${baseClass} ${normalColor}`;
  }

  getActionTitle(quote: Quote, actionType: string): string {
    if (this.isActionDisabled(quote, actionType)) {
      const status = this.isQuoteCancelled(quote) ? 'cancelled' : 'accepted';
      return this.translate.instant('QUOTE_DASHBOARD._action_disabled', { status: this.translate.instant(this.getStateDisplay(status)) });
    }
    return '';
  }

  getStateDisplay(state: QuoteStateType | undefined): string {
    return state && this.availableStates.includes(state)
      ? `QUOTE_DASHBOARD.states.${state}`
      : 'QUOTE_DASHBOARD._unknown';
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
