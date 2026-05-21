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
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1220]/45 px-4 font-[Blinker]"
      (click)="closeModal()"
    >
      <!-- Modal Content -->
      <div 
        class="relative w-full max-w-lg rounded-2xl border border-[#EBECEE] bg-white p-6 shadow-[0_20px_50px_rgba(11,18,32,0.24)]"
        (click)="$event.stopPropagation()"
      >
        <!-- Close Button -->
        <button
          (click)="closeModal()"
          class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#526179] transition-colors hover:bg-[#EBF0F7] hover:text-[#1f4fbf]"
          aria-label="Close"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Modal Header -->
        <h3 class="mb-4 pr-10 text-lg font-bold text-[#0b1220]">
          Add Attachment to Quote {{ getShortQuoteId() }}
        </h3>

        <!-- Warning for existing attachment -->
        <div 
          *ngIf="hasExistingAttachment" 
          class="mb-4 rounded-2xl border border-[#F2D28A] bg-[#FFF8E6] p-4"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-[#7A4D00]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-semibold text-[#7A4D00]">Warning: Existing Attachment</h3>
              <div class="mt-2 text-sm text-[#7A4D00]">
                <p>This quote already has an attachment. Uploading a new file will overwrite the existing PDF.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- File Input -->
        <div class="mb-4">
          <label for="file-input" class="mb-2 block text-sm font-semibold text-[#324153]">
            Select PDF File
          </label>
          <input 
            #fileInput
            type="file" 
            accept=".pdf" 
            (change)="onFileSelected($event)"
            class="block w-full cursor-pointer rounded-lg border border-[#EBECEE] bg-white text-sm text-[#526179] transition-colors file:mr-4 file:h-12 file:cursor-pointer file:border-0 file:bg-[#EBF0F7] file:px-4 file:text-sm file:font-semibold file:text-[#1f4fbf] hover:border-[#1f4fbf] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC]"
          />
          <p class="mt-1 text-xs text-[#526179]">Only PDF files are allowed</p>
        </div>



        <!-- Action Buttons -->
        <div class="mt-6 flex justify-between border-t border-[#EBECEE] pt-6">
          <button 
            type="button"
            (click)="uploadAttachment()"
            [disabled]="!selectedFile || isUploading"
            class="inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isUploading ? 'Uploading...' : 'Upload' }}
          </button>
          <button 
            type="button" 
            (click)="closeModal()"
            class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC]"
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
