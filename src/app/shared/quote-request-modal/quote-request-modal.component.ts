import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { components } from "../../models/product-catalog";
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { EventMessageService } from 'src/app/services/event-message.service';

export interface QuoteRequestData {
  customerMessage: string;
  customerIdRef: string;
  providerIdRef: string;
  productOfferingId: string;
}

@Component({
  selector: 'app-quote-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" 
         (click)="onBackdropClick($event)">
      <div class="relative bg-white dark:bg-secondary-100 rounded-lg shadow-xl max-w-2xl w-full max-h-full overflow-hidden" 
           (click)="$event.stopPropagation()">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Request Quote
          </h3>
          <button 
            type="button" 
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center" 
            (click)="onClose()">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
        
        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto" style="max-height: calc(80vh - 220px);">
          <!-- Success Message -->
          @if (showSuccessMessage) {
            <div class="flex flex-col items-center justify-center py-12">
              <svg class="w-16 h-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-lg font-medium text-gray-900 dark:text-white text-center">
                The quote has been created, you can close this window
              </p>
            </div>
          }

          <!-- Error Message -->
          @if (showErrorMessage) {
            <div class="flex flex-col items-center justify-center py-12">
              <svg class="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-lg font-medium text-red-600 dark:text-red-400 text-center">
                {{ errorMessage || 'Error during the creation of the quote' }}
              </p>
            </div>
          }

          <!-- Form Content (shown when not success/error) -->
          @if (!showSuccessMessage && !showErrorMessage) {
            <div class="space-y-5">
              <!-- Product Info Card -->
              <div class="bg-gray-50 dark:bg-secondary-200 p-4 rounded-lg border-l-4 border-blue-500">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Request for Product:</p>
                <p class="text-gray-900 dark:text-white font-medium">{{ displayProductName }}</p>
              </div>

              <!-- Provider Info Card -->
              <div class="bg-gray-50 dark:bg-secondary-200 p-4 rounded-lg border-l-4 border-blue-500">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Provider:</p>
                <p class="text-gray-900 dark:text-white font-medium">{{ displayProviderName }}</p>
              </div>

              <!-- Quote Request Form -->
              <form [formGroup]="quoteForm" (ngSubmit)="onSubmit()" class="space-y-4">
                <!-- Customer Message -->
                <div>
                  <label for="customerMessage" class="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                    Message / Requirements <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    id="customerMessage"
                    formControlName="customerMessage"
                    rows="5"
                    class="w-full px-3 py-2 border border-gray-300 dark:bg-secondary-200 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                    [class.border-red-300]="isFieldInvalid('customerMessage')"
                    placeholder="Please describe your requirements or any specific questions about this product..."
                  ></textarea>
                  @if (isFieldInvalid('customerMessage')) {
                    <p class="text-red-500 text-xs mt-1">Message is required (minimum 10 characters)</p>
                  }
                  <p class="text-xs text-gray-500 mt-1">
                    Please provide as much detail as possible to help us prepare an accurate quote.
                  </p>
                </div>

                <!-- Request Date -->
                <div>
                  <label for="requestDate" class="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                    Request Date <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="requestDate"
                    type="date"
                    formControlName="requestDate"
                    class="w-full px-3 py-2 border border-gray-300 dark:bg-secondary-200 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    [class.border-red-300]="isFieldInvalid('requestDate')"
                    [min]="minDate"
                  />
                  @if (isFieldInvalid('requestDate')) {
                    <p class="text-red-500 text-xs mt-1">Request date is required</p>
                  }
                </div>
              </form>
            </div>
          }
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 dark:bg-secondary-200 rounded-b-lg">
          <!-- Success/Error State: Only show Close button -->
          @if (showSuccessMessage || showErrorMessage) {
            <div class="flex justify-end">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-secondary-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-secondary-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                (click)="onClose()"
              >
                Close
              </button>
            </div>
          }

          <!-- Normal State: Show Cancel and Submit buttons -->
          @if (!showSuccessMessage && !showErrorMessage) {
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-secondary-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-secondary-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                (click)="onClose()"
              >
                Cancel
              </button>
              <button
                type="submit"
                (click)="onSubmit()"
                [disabled]="quoteForm.invalid || isSubmitting"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isSubmitting) {
                  <span class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                } @else {
                  Send Request
                }
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class QuoteRequestModalComponent {
  @Input() productOff: Product | undefined;
  @Input() prodSpec: ProductSpecification | {};
  @Input() orgInfo: any | undefined;
  @Input() customerId: string = '';
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() submitRequest = new EventEmitter<QuoteRequestData>();
  @Output() quoteCreated = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private quoteService = inject(QuoteService);

  quoteForm: FormGroup;
  isSubmitting = false;
  showSuccessMessage = false;
  showErrorMessage = false;
  errorMessage = '';

  constructor(private eventMessage: EventMessageService) {
    this.quoteForm = this.fb.group({
      customerMessage: ['', [Validators.required, Validators.minLength(10)]],
      requestDate: ['', [Validators.required]]
    });
  }

  get displayProductName(): string {
    return this.productOff?.name || 'Unknown Product';
  }

  get displayProviderName(): string {
    return this.orgInfo?.tradingName || this.orgInfo?.name || 'Unknown Provider';
  }

  get minDate(): string {
    // Set minimum date to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.quoteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.quoteForm.reset({
      customerMessage: '',
      requestDate: ''
    });
    this.isSubmitting = false;
    this.showSuccessMessage = false;
    this.showErrorMessage = false;
    this.errorMessage = '';
    this.eventMessage.emitCloseQuoteRequest(true);
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.quoteForm.valid && this.productOff && this.customerId && !this.isSubmitting) {
      this.isSubmitting = true;

      const formValue = this.quoteForm.value;
      const requestData: QuoteRequestData = {
        customerMessage: formValue.customerMessage,
        customerIdRef: this.customerId,
        providerIdRef: this.orgInfo?.id || '',
        productOfferingId: this.productOff.id || this.productOff?.productSpecification?.id || ''
      };

      // Format the request date as DD-MM-YYYY for the API
      const dateObj = new Date(formValue.requestDate);
      const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

      console.log('Submitting quote request with data:', requestData);
      console.log('Request date:', formattedDate);

      // Step 1: Create the quote
      this.quoteService.createQuoteFromRequest(requestData).pipe(
        // Step 2: After quote is created, update the request date
        switchMap((response: any) => {
          const quoteId = response?.id;
          console.log('Quote created successfully with ID:', quoteId);

          if (quoteId) {
            console.log('Updating quote with request date:', formattedDate);
            return this.quoteService.updateQuoteDate(quoteId, formattedDate, 'requested');
          } else {
            // If no ID returned, just return the original response
            console.warn('No quote ID returned, skipping date update');
            return [response];
          }
        })
      ).subscribe({
        next: (response: any) => {
          console.log('Quote creation and date update completed:', response);
          this.quoteCreated.emit(response);
          this.submitRequest.emit(requestData);
          this.isSubmitting = false;
          this.showSuccessMessage = true;
        },
        error: (error: any) => {
          console.error('Error creating quote or updating date:', error);
          this.isSubmitting = false;
          this.showErrorMessage = true;
          // Extract user-friendly message from backend response
          this.errorMessage = error?.error?.message || error?.message || 'Error during the creation of the quote';
        }
      });
    } else {
      // Debug information for validation failures
      console.log('Form validation failed:');
      console.log('Form valid:', this.quoteForm.valid);
      console.log('Product:', this.productOff);
      console.log('Customer ID:', this.customerId);
      console.log('Is submitting:', this.isSubmitting);

      // Mark all fields as touched to show validation errors
      Object.keys(this.quoteForm.controls).forEach(key => {
        const control = this.quoteForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });

      // Show validation message if customerId is missing
      if (!this.customerId) {
        this.showErrorMessage = true;
        this.errorMessage = 'Customer ID is required. Please log in first.';
      }
    }
  }
} 