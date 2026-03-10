import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from '../../services/notification.service';
import { Quote } from '../../models/quote.model';

@Component({
  selector: 'app-attachment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal Backdrop -->
    <div 
      *ngIf="isOpen" 
      class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      (click)="closeModal()"
    >
      <!-- Modal Content -->
      <div 
        class="bg-white rounded-lg shadow-lg w-full max-w-lg p-8 relative"
        (click)="$event.stopPropagation()"
      >
        <!-- Close Button -->
        <button
          (click)="closeModal()"
          class="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
          aria-label="Close"
        >
          &times;
        </button>

        <!-- Modal Header -->
        <h3 class="text-lg font-semibold mb-4">
          Add Attachment to Quote {{ getShortQuoteId() }}
        </h3>

        <!-- Warning for existing attachment -->
        <div 
          *ngIf="hasExistingAttachment" 
          class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-yellow-800">Warning: Existing Attachment</h3>
              <div class="mt-2 text-sm text-yellow-700">
                <p>This quote already has an attachment. Uploading a new file will overwrite the existing PDF.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- File Input -->
        <div class="mb-4">
          <label for="file-input" class="block text-sm font-medium text-gray-700 mb-2">
            Select PDF File
          </label>
          <input 
            #fileInput
            type="file" 
            accept=".pdf" 
            (change)="onFileSelected($event)"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          />
          <p class="text-xs text-gray-500 mt-1">Only PDF files are allowed</p>
        </div>



        <!-- Action Buttons -->
        <div class="flex justify-between pt-6 mt-6 border-t border-gray-200">
          <button 
            type="button"
            (click)="uploadAttachment()"
            [disabled]="!selectedFile || isUploading"
            class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isUploading ? 'Uploading...' : 'Upload' }}
          </button>
          <button 
            type="button" 
            (click)="closeModal()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `
})
export class AttachmentModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() quote: Quote | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() uploadSuccess = new EventEmitter<Quote>();

  selectedFile: File | null = null;
  isUploading = false;
  hasExistingAttachment = false;

  constructor(
    private quoteService: QuoteService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    if (this.quote) {
      this.checkForExistingAttachment();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.quote) {
      this.checkForExistingAttachment();
      this.resetForm();
    }
  }

  checkForExistingAttachment() {
    if (!this.quote) return;
    
    this.hasExistingAttachment = Array.isArray(this.quote.quoteItem) && 
      this.quote.quoteItem.some(qi => qi.attachment && qi.attachment.length > 0);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.notificationService.showError('Please select a valid PDF file.');
        this.selectedFile = null;
        event.target.value = '';
        return;
      }
      this.selectedFile = file;
    } else {
      this.selectedFile = null;
    }
  }

  async uploadAttachment() {
    if (!this.selectedFile || !this.quote?.id || this.isUploading) {
      return;
    }

    this.isUploading = true;

    try {
      const updatedQuote = await this.quoteService.addAttachmentToQuote(
        this.quote.id, 
        this.selectedFile, 
        ''
      ).toPromise();

      this.notificationService.showSuccess('Attachment uploaded successfully!');
      this.uploadSuccess.emit(updatedQuote);
      this.closeModal();
    } catch (error) {
      console.error('Error uploading attachment:', error);
      this.notificationService.showError('Error uploading attachment. Please try again.');
    } finally {
      this.isUploading = false;
    }
  }

  getShortQuoteId(): string {
    if (!this.quote?.id) return '';
    return this.quote.id.length > 8 ? this.quote.id.slice(-8) : this.quote.id;
  }

  closeModal() {
    this.resetForm();
    this.close.emit();
  }

  private resetForm() {
    this.selectedFile = null;
    this.isUploading = false;
  }
} 