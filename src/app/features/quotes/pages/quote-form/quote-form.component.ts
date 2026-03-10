import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { NotificationService } from 'src/app/services/notification.service';
import { Quote } from 'src/app/models/quote.model';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NotificationComponent, ConfirmDialogComponent],
  template: `
    <app-notification></app-notification>

    <div class="container mx-auto px-4 py-8">
      <div class="max-w-3xl mx-auto">
        <div class="bg-white shadow-md rounded-lg p-6">
          <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ isEditMode ? 'Edit Quote' : 'New Quote' }}
            </h1>
            <button
              *ngIf="isEditMode"
              (click)="confirmCancel()"
              class="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading" class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <!-- Error State -->
          <div *ngIf="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
            {{ error }}
          </div>

          <form *ngIf="!isLoading" [formGroup]="quoteForm" (ngSubmit)="onSubmit()">
            <div class="space-y-6">
              <!-- Description -->
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div class="mt-1">
                  <textarea
                    id="description"
                    formControlName="description"
                    rows="3"
                    class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter quote description"
                  ></textarea>
                </div>
              </div>

              <!-- Related Parties -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Related Parties</h3>
                <div formArrayName="relatedParty">
                  <div
                    *ngFor="let party of relatedPartyArray.controls; let i = index"
                    [formGroupName]="i"
                    class="mb-4 p-4 bg-gray-50 rounded-md"
                  >
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label [for]="'partyId' + i" class="block text-sm font-medium text-gray-700">
                          Party ID
                        </label>
                        <input
                          [id]="'partyId' + i"
                          type="text"
                          formControlName="id"
                          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label [for]="'partyType' + i" class="block text-sm font-medium text-gray-700">
                          Party Type
                        </label>
                        <input
                          [id]="'partyType' + i"
                          type="text"
                          formControlName="@type"
                          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="removeRelatedParty(i)"
                      class="mt-2 text-sm text-red-600 hover:text-red-900"
                    >
                      Remove Party
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  (click)="addRelatedParty()"
                  class="mt-2 text-sm text-blue-600 hover:text-blue-900"
                >
                  Add Related Party
                </button>
              </div>

              <!-- Quote Items -->
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Quote Items</h3>
                <div formArrayName="quoteItem">
                  <div
                    *ngFor="let item of quoteItemArray.controls; let i = index"
                    [formGroupName]="i"
                    class="mb-4 p-4 bg-gray-50 rounded-md"
                  >
                    <div>
                      <label [for]="'itemState' + i" class="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <select
                        [id]="'itemState' + i"
                        formControlName="state"
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="">Select State</option>
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      (click)="removeQuoteItem(i)"
                      class="mt-2 text-sm text-red-600 hover:text-red-900"
                    >
                      Remove Item
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  (click)="addQuoteItem()"
                  class="mt-2 text-sm text-blue-600 hover:text-blue-900"
                >
                  Add Quote Item
                </button>
              </div>

              <!-- Form Actions -->
              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  (click)="confirmCancel()"
                  class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="quoteForm.invalid || isSubmitting"
                  class="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {{ isSubmitting ? 'Saving...' : 'Save Quote' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="showCancelConfirm"
      title="Cancel Changes"
      message="Are you sure you want to cancel? Any unsaved changes will be lost."
      confirmText="Yes, Cancel"
      confirmButtonClass="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      (confirm)="cancel()"
      (cancel)="showCancelConfirm = false"
    ></app-confirm-dialog>
  `
})
export class QuoteFormComponent implements OnInit {
  quoteForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  isLoading = false;
  error: string | null = null;
  showCancelConfirm = false;

  constructor(
    private formBuilder: FormBuilder,
    private quoteService: QuoteService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {
    this.quoteForm = this.formBuilder.group({
      description: [''],
      relatedParty: this.formBuilder.array([]),
      quoteItem: this.formBuilder.array([])
    });
  }

  ngOnInit() {
    const quoteId = this.route.snapshot.paramMap.get('id');
    if (quoteId) {
      this.isEditMode = true;
      // Decode the URL-encoded ID
      const decodedId = decodeURIComponent(quoteId);
      this.loadQuote(decodedId);
    } else {
      // Add default items for new quote
      this.addRelatedParty();
      this.addQuoteItem();
    }
  }

  get relatedPartyArray(): FormArray {
    return this.quoteForm.get('relatedParty') as FormArray;
  }

  get quoteItemArray(): FormArray {
    return this.quoteForm.get('quoteItem') as FormArray;
  }

  loadQuote(id: string) {
    this.isLoading = true;
    this.error = null;

    this.quoteService.getQuoteById(id).subscribe({
      next: (quote) => {
        this.quoteForm.patchValue({
          description: quote.description
        });

        // Clear existing arrays
        while (this.relatedPartyArray.length) {
          this.relatedPartyArray.removeAt(0);
        }
        while (this.quoteItemArray.length) {
          this.quoteItemArray.removeAt(0);
        }

        // Add related parties
        quote.relatedParty?.forEach((party: { [x: string]: any; id: any; }) => {
          this.relatedPartyArray.push(
            this.formBuilder.group({
              id: [party.id],
              '@type': [party['@type']]
            })
          );
        });

        // Add quote items
        quote.quoteItem?.forEach(item => {
          this.quoteItemArray.push(
            this.formBuilder.group({
              state: [item.state]
            })
          );
        });

        this.isLoading = false;
      },
      error: (error: Error) => {
        this.error = 'Failed to load quote. Please try again.';
        this.isLoading = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  addRelatedParty() {
    this.relatedPartyArray.push(
      this.formBuilder.group({
        id: [''],
        '@type': ['']
      })
    );
  }

  removeRelatedParty(index: number) {
    this.relatedPartyArray.removeAt(index);
  }

  addQuoteItem() {
    this.quoteItemArray.push(
      this.formBuilder.group({
        state: ['']
      })
    );
  }

  removeQuoteItem(index: number) {
    this.quoteItemArray.removeAt(index);
  }

  onSubmit() {
    if (this.quoteForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const quoteData = this.quoteForm.value;

    // Add required fields
    const quote: Partial<Quote> = {
      ...quoteData,
      quoteDate: new Date().toISOString(),
      state: 'draft'
    };

    const quoteId = this.route.snapshot.paramMap.get('id');
    const operation = quoteId
      ? this.quoteService.updateQuote(decodeURIComponent(quoteId), quote)
      : this.quoteService.createQuote(quote as any);

    operation.subscribe({
      next: () => {
        this.notificationService.showSuccess(
          `Quote ${this.isEditMode ? 'updated' : 'created'} successfully`
        );
        this.router.navigate(['/quotes']);
      },
      error: (error: Error) => {
        this.error = `Failed to ${this.isEditMode ? 'update' : 'create'} quote. Please try again.`;
        this.isSubmitting = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  confirmCancel() {
    if (this.quoteForm.dirty) {
      this.showCancelConfirm = true;
    } else {
      this.cancel();
    }
  }

  cancel() {
    this.router.navigate(['/quotes']);
  }
} 