import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { NotificationService } from 'src/app/services/notification.service';
import { Quote } from 'src/app/models/quote.model';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-quote-details',
  standalone: true,
  imports: [CommonModule, NotificationComponent, ConfirmDialogComponent],
  template: `
    <app-notification></app-notification>

    <div class="container mx-auto px-4 py-8" *ngIf="quote">
      <div class="bg-white shadow-md rounded-lg p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Quote Details</h1>
          <div class="flex space-x-2">
            <button
              *ngIf="!quoteService.isQuoteFinalized(quote)"
              (click)="editQuote()"
              class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Edit
            </button>
            <button
              *ngIf="!quoteService.isQuoteFinalized(quote)"
              (click)="confirmDelete()"
              class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
          {{ error }}
        </div>

        <div *ngIf="!isLoading && !error" class="grid grid-cols-2 gap-6">
          <div>
            <h2 class="text-lg font-semibold mb-4">Basic Information</h2>
            <dl class="space-y-4">
              <div>
                <dt class="text-sm font-medium text-gray-500">ID</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ quote.id }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Description</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ quote.description || '-' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Date</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ quote.quoteDate | date:'dd/MM/yyyy' }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Status</dt>
                <dd class="mt-1">
                  <span
                    [ngClass]="{
                      'px-2 inline-flex text-xs leading-5 font-semibold rounded-full': true,
                      'bg-green-100 text-green-800': !quoteService.isQuoteFinalized(quote),
                      'bg-red-100 text-red-800': quoteService.isQuoteCancelled(quote),
                      'bg-blue-100 text-blue-800': quoteService.isQuoteAccepted(quote)
                    }"
                  >
                    {{ getQuoteStatus() }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 class="text-lg font-semibold mb-4">Related Parties</h2>
            <div *ngIf="quote.relatedParty?.length; else noRelatedParties">
              <div *ngFor="let party of quote.relatedParty" class="mb-4 p-4 bg-gray-50 rounded-md">
                <div class="text-sm">
                  <span class="font-medium">ID:</span> {{ party.id || '-' }}
                </div>
                <div class="text-sm">
                  <span class="font-medium">Type:</span> {{ party['@type'] || '-' }}
                </div>
              </div>
            </div>
            <ng-template #noRelatedParties>
              <p class="text-gray-500">No related parties</p>
            </ng-template>
          </div>
        </div>

        <div *ngIf="!isLoading && !error" class="mt-8">
          <h2 class="text-lg font-semibold mb-4">Quote Items</h2>
          <div *ngIf="quote.quoteItem?.length; else noItems">
            <div *ngFor="let item of quote.quoteItem" class="mb-4 p-4 bg-gray-50 rounded-md">
              <div class="text-sm">
                <span class="font-medium">State:</span> {{ item.state || '-' }}
              </div>
              <div class="text-sm" *ngIf="item.attachment && item.attachment.length">
                <span class="font-medium">Attachments:</span> {{ item.attachment.length || 0 }}
              </div>
            </div>
          </div>
          <ng-template #noItems>
            <p class="text-gray-500">No items</p>
          </ng-template>
        </div>

        <div *ngIf="!isLoading && !error" class="mt-8">
          <h2 class="text-lg font-semibold mb-4">Notes</h2>
          <div *ngIf="quote.note?.length; else noNotes">
            <div *ngFor="let note of quote.note" class="mb-4 p-4 bg-gray-50 rounded-md">
              <div class="text-sm">
                <span class="font-medium">Author:</span> {{ note.author }}
              </div>
              <div class="text-sm mt-2">
                {{ note.text }}
              </div>
            </div>
          </div>
          <ng-template #noNotes>
            <p class="text-gray-500">No notes</p>
          </ng-template>
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
  `
})
export class QuoteDetailsComponent implements OnInit {
  quote: Quote | null = null;
  isLoading = false;
  error: string | null = null;
  showDeleteConfirm = false;
  deleteConfirmMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public quoteService: QuoteService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    const quoteId = this.route.snapshot.paramMap.get('id');
    if (quoteId) {
      // Decode the URL-encoded ID
      const decodedId = decodeURIComponent(quoteId);
      this.loadQuote(decodedId);
    }
  }

  loadQuote(id: string) {
    this.isLoading = true;
    this.error = null;

    this.quoteService.getQuoteById(id).subscribe({
      next: (quote) => {
        this.quote = quote;
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.error = 'Failed to load quote. Please try again.';
        this.isLoading = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  getQuoteStatus(): string {
    if (!this.quote) return '';
    if (this.quoteService.isQuoteCancelled(this.quote)) {
      return 'Cancelled';
    }
    if (this.quoteService.isQuoteAccepted(this.quote)) {
      return 'Accepted';
    }
    return 'Draft';
  }

  editQuote() {
    if (this.quote) {
      this.router.navigate(['/quotes', encodeURIComponent(this.quote.id!), 'edit']);
    }
  }

  confirmDelete() {
    if (this.quote) {
      this.deleteConfirmMessage = `Are you sure you want to delete quote ${this.quote.id}? This action cannot be undone.`;
      this.showDeleteConfirm = true;
    }
  }

  deleteQuote() {
    if (!this.quote?.id) return;

    this.quoteService.deleteQuote(this.quote.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Quote deleted successfully');
        this.router.navigate(['/quotes']);
      },
      error: (error: Error) => {
        this.notificationService.showError('Failed to delete quote. Please try again.');
      }
    });

    this.showDeleteConfirm = false;
  }
} 