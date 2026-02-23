import { Component, EventEmitter, Input, Output, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProviderService, Provider } from 'src/app/services/provider.service';
import { Tender, TenderAttachment } from 'src/app/models/tender.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { API_ROLES } from 'src/app/models/roles.constants';
import { TENDER_STEP2_DESCRIPTION } from 'src/app/models/quote.constants';
import { SearchOrganizationsFilters, countryName, complianceLevelsName } from 'src/app/models/search-organizations-filters.model';
import { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-create-tender-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent],
  template: `
    <!-- Tender Creation Modal -->
    <div *ngIf="isOpen" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" (click)="closeTenderModal()">
      <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white dark:bg-gray-800" (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ editingTenderId ? 'Edit Tender' : 'Create New Tender' }}</h3>
          <button (click)="closeTenderModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Step 1: Title Only -->
        <div *ngIf="tenderCreationStep === 1">
          <div class="mb-6">
            <label for="tenderTitle" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Tender Title *
            </label>
            <input 
              type="text" 
              id="tenderTitle"
              [(ngModel)]="tenderTitle"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter tender title or description..."
              autofocus
            />
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">This will be the main description of your tender</p>
          </div>

          <!-- Actions for Step 1 -->
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              (click)="closeTenderModal()" 
              class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button 
              (click)="saveInitialTender()" 
              [disabled]="!tenderTitle.trim() || tenderLoading"
              class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ tenderLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>

        <!-- Step 2: Completion Dates -->
        <div *ngIf="tenderCreationStep === 2">
          <!-- Display Title (Read-only) -->
          <div class="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Tender Title</label>
            <p class="text-gray-900 dark:text-white font-medium break-words overflow-wrap-anywhere">{{ tenderTitle }}</p>
          </div>

          <!-- Step 2 Instructions -->
          <div class="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p class="text-sm text-yellow-800 dark:text-yellow-200">{{ TENDER_STEP2_DESCRIPTION }}</p>
          </div>

          <!-- Tender Start Date -->
          <div class="mb-6">
            <label for="requestedDate" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Tender Start Date *
            </label>
            <input
              type="date"
              id="requestedDate"
              [(ngModel)]="requestedCompletionDate"
              [min]="minDate"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Format: DD/MM/YYYY</p>
          </div>

          <!-- Tender End Date -->
          <div class="mb-6">
            <label for="expectedDate" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Tender End Date *
            </label>
            <input
              type="date"
              id="expectedDate"
              [(ngModel)]="expectedCompletionDate"
              [min]="minDate"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Format: DD/MM/YYYY</p>
          </div>

          <!-- PDF Upload -->
          <div class="mb-6">
            <label for="pdfFile" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              PDF Attachment *
            </label>

            <!-- Display existing attachment prominently -->
            <div *ngIf="existingAttachment" class="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <div>
                    <p class="text-sm font-medium text-blue-900 dark:text-blue-100">Current PDF:</p>
                    <p class="text-sm text-blue-700 dark:text-blue-300">{{ existingAttachment.name }}</p>
                  </div>
                </div>
                <span class="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Attached</span>
              </div>
              <p class="text-xs text-blue-600 dark:text-blue-400 mt-2">Upload a new file to replace the existing attachment</p>
            </div>

            <input
              type="file"
              id="pdfFile"
              accept=".pdf"
              (change)="onPdfFileSelected($any($event))"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ existingAttachment ? 'Select a new file to upload or keep the current one' : 'Only PDF files allowed' }} — Max size 10MB
            </p>
          </div>

          <!-- Actions for Step 2 -->
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              (click)="closeTenderModal()"
              class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              (click)="proceedToProviderSelection()"
              [disabled]="!isStep2Complete() || tenderLoading"
              [title]="!isStep2Complete() ? 'Fill in all fields to continue' : ''"
              class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed relative group"
            >
              {{ tenderLoading ? 'Saving...' : 'Next: Select Providers' }}
              <span
                *ngIf="!isStep2Complete()"
                class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                Fill in all fields to continue
              </span>
            </button>
          </div>
        </div>

        <!-- Step 3: Provider Selection -->
        <div *ngIf="tenderCreationStep === 3">
          <!-- Display Title (Read-only) -->
          <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Tender Title</label>
            <p class="text-gray-900 dark:text-white font-medium break-words overflow-wrap-anywhere">{{ tenderTitle }}</p>
          </div>

          <!-- Date Summary -->
          <div class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <h4 class="text-sm font-medium text-green-900 dark:text-green-100 mb-2">✓ Dates Set</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-green-700 dark:text-green-300">Effective:</span>
                <span class="ml-2 font-medium text-green-900 dark:text-green-100">{{ formatDateForDisplay(expectedCompletionDate) }}</span>
              </div>
              <div>
                <span class="text-green-700 dark:text-green-300">Expected Fulfillment:</span>
                <span class="ml-2 font-medium text-green-900 dark:text-green-100">{{ formatDateForDisplay(requestedCompletionDate) }}</span>
              </div>
            </div>
          </div>

          <!-- PDF Summary -->
          <div *ngIf="existingAttachment || pdfAttachmentSet" class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <h4 class="text-sm font-medium text-green-900 dark:text-green-100 mb-2">✓ PDF Attachment Set</h4>
            <p class="text-sm text-green-700 dark:text-green-300">{{ existingAttachment?.name || selectedPdfFile?.name }}</p>
          </div>

          <!-- Loading State -->
          <div *ngIf="tenderLoading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>

          <!-- Error State -->
          <div *ngIf="tenderError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4">
            <p class="text-sm text-red-700 dark:text-red-300">{{ tenderError }}</p>
          </div>

          <div *ngIf="!tenderLoading && !tenderError">
            <!-- Already Invited Providers Section -->
            <div *ngIf="invitedProviders.length > 0" class="mb-6">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                Already Invited Providers ({{ invitedProviders.length }})
              </label>
              
              <div class="max-h-64 overflow-y-auto border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div *ngFor="let invited of invitedProviders" 
                     class="flex items-center justify-between p-4 hover:bg-green-100 dark:hover:bg-green-900/30 border-b border-green-200 dark:border-green-700 last:border-b-0">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ invited.provider.tradingName || 'Unnamed Provider' }}
                    </p>
                    <p *ngIf="invited.provider.externalReference?.[0]?.name" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {{ invited.provider.externalReference?.[0]?.name }}
                    </p>
                  </div>
                  <button 
                    (click)="removeInvitedProvider(invited.quoteId, invited.provider.id)"
                    class="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                    title="Remove invitation"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Available Providers Selection -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                Select Providers to Invite
              </label>
              
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <!-- Responsive grid for filters -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <!-- Countries -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Countries</label>
                    <select multiple [formControl]="countriesCtrl"
                            class="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm shadow-sm
                                   focus:border-blue-500 focus:ring focus:ring-blue-200">
                      <option *ngFor="let c of countriesOptions" [value]="c" (mousedown)="toggleFromSelect(countriesCtrl, c, $event)">{{ countryName(c) }}</option>
                    </select>
                  </div>

                  <!-- Categories -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Categories</label>
                    <select multiple [formControl]="categoriesCtrl"
                            class="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm shadow-sm
                                   focus:border-blue-500 focus:ring focus:ring-blue-200">
                      <option *ngFor="let cat of categoriesOptions" [value]="cat" (mousedown)="toggleFromSelect(categoriesCtrl, cat, $event)">{{ cat }}</option>
                    </select>
                  </div>

                  <!-- Compliance Levels -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Compliance Levels</label>
                    <select multiple [formControl]="complianceLevelsCtrl"
                            class="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2 text-sm shadow-sm
                                   focus:border-blue-500 focus:ring focus:ring-blue-200">
                      <option *ngFor="let cl of complianceLevelsOptions" [value]="cl" (mousedown)="toggleFromSelect(complianceLevelsCtrl, cl, $event)">{{ complianceLevelsName(cl) }}</option>
                    </select>
                  </div>

                  <!-- Clear/Search buttons -->
                  <div class="md:col-span-2 flex justify-start gap-x-2 mb-2 mt-2 md:mt-0">
                    <button type="button"
                            (click)="clearFilters()"
                            class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                      Clear Filters
                    </button>
                    <button type="button"
                            (click)="emitFilters()"
                            class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
                      Search
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                <div *ngFor="let provider of _safeInvitedList" 
                     class="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                  <input 
                    *ngIf="provider.id"
                    type="checkbox" 
                    [id]="'provider-' + provider.id"
                    [checked]="selectedProviders.has(provider.id)"
                    (change)="toggleProviderSelection(provider.id)"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label *ngIf="provider.id" [for]="'provider-' + provider.id" class="ml-3 flex-1 cursor-pointer">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ provider.tradingName || 'Unnamed Provider' }}
                      </p>
                      <p *ngIf="provider.externalReference?.[0]?.name" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {{ provider.externalReference?.[0]?.name }}
                      </p>
                    </div>
                  </label>
                </div>
                
                <div *ngFor="let provider of availableProviders" 
                     class="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                  <input 
                    *ngIf="provider.id"
                    type="checkbox" 
                    [id]="'provider-' + provider.id"
                    [checked]="selectedProviders.has(provider.id)"
                    (change)="toggleProviderSelection(provider.id)"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label *ngIf="provider.id" [for]="'provider-' + provider.id" class="ml-3 flex-1 cursor-pointer">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ provider.tradingName || 'Unnamed Provider' }}
                      </p>
                      <p *ngIf="provider.externalReference?.[0]?.name" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {{ provider.externalReference?.[0]?.name }}
                      </p>
                    </div>
                  </label>
                </div>
                
                <div *ngIf="availableProviders.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
                  <ng-container *ngIf="!hasActiveFilters(); else filteredEmpty">
                    <p class="text-sm">
                      No more providers available. All providers have been invited.
                    </p>
                  </ng-container>
                  <ng-template #filteredEmpty>
                    <p class="text-sm">
                      No filters Selected. Adjust Countries/Categories and click <strong>Search</strong>.
                    </p>
                  </ng-template>
                </div>
              </div>

              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {{ selectedProviders.size }} provider(s) selected
              </p>
            </div>
          </div>

          <!-- Actions for Step 3 -->
          <div class="flex justify-between space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              (click)="backToStep2()" 
              class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              ← Back
            </button>
            <div class="flex space-x-3">
              <button 
                (click)="closeTenderModal()" 
                class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button 
                (click)="saveProvidersList()"
                [disabled]="selectedProviders.size === 0 || tenderLoading"
                [title]="selectedProviders.size === 0 ? 'Please select at least one provider' : ''"
                class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed relative group"
              >
                {{ tenderLoading ? 'Inviting...' : 'Save Providers List' }}
                <span 
                  *ngIf="selectedProviders.size === 0" 
                  class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  Please select at least one provider
                </span>
              </button>
              <button 
                (click)="finalizeTender()"
                [disabled]="invitedProviders.length === 0 || tenderLoading"
                [title]="invitedProviders.length === 0 ? 'Please invite at least one provider first' : ''"
                class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed relative group"
              >
                Submit Tender
                <span 
                  *ngIf="invitedProviders.length === 0" 
                  class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  Please invite at least one provider first
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

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
  `,
  styles: []
})
export class CreateTenderModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() customerId: string = '';
  @Input() tenderToEdit: Tender | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() tenderCreated = new EventEmitter<Tender>();
  @Output() tenderUpdated = new EventEmitter<void>();

  private quoteService = inject(QuoteService);
  private notificationService = inject(NotificationService);
  private localStorage = inject(LocalStorageService);
  private providerService = inject(ProviderService);
  private router = inject(Router);

  // Properties for tender creation modal
  tenderProviders: Provider[] = [];
  selectedProviders: Set<string> = new Set();
  invitedProviders: Array<{ provider: Provider; quoteId: string }> = [];
  tenderLoading = false;
  tenderError: string | null = null;

  // Generic Confirmation Dialog
  showGenericConfirm = false;
  genericConfirmTitle = '';
  genericConfirmMessage = '';
  genericConfirmButtonText = 'Confirm';
  genericConfirmButtonClass = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  genericConfirmCallback: (() => void) | null = null;
  currentUserId: string | null = null;

  // Filter options
  countriesOptions: string[] = [];
  categoriesOptions: string[] = [];
  complianceLevelsOptions: string[] = [];
  _safeInvitedList: Provider[] = [];

  // Form controls for filters
  countriesCtrl = new FormControl<string[]>([], { nonNullable: true });
  categoriesCtrl = new FormControl<string[]>([], { nonNullable: true });
  complianceLevelsCtrl = new FormControl<string[]>([], { nonNullable: true });

  // Default organization search filters
  orgFilters: SearchOrganizationsFilters = {
    categories: [],
    countries: [],
    complianceLevels: []
  };
  
  // Helper functions for display
  complianceLevelsName = complianceLevelsName;
  countryName = countryName;

  // Available providers list
  availableProviders: Provider[] = [];

  // Tender form fields - Step 1: Title only
  tenderTitle: string = '';
  
  // Step 2: Date fields and PDF upload
  expectedCompletionDate: string = '';
  requestedCompletionDate: string = '';
  expectedDateSet: boolean = false;
  requestedDateSet: boolean = false;
  selectedPdfFile: File | null = null;
  pdfAttachmentSet: boolean = false;
  
  // Edit mode
  editingTenderId: string | null = null;
  existingAttachment: TenderAttachment | null = null;
  createdQuoteId: string | null = null;
  
  // Track tender creation steps
  tenderCreationStep: number = 1; // 1 = Title, 2 = Dates, 3 = Providers

  // Expose constant to template
  readonly TENDER_STEP2_DESCRIPTION = TENDER_STEP2_DESCRIPTION;

  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  ngOnInit() {
    // Use customerId if provided from parent, otherwise get from localStorage
    if (this.customerId) {
      this.currentUserId = this.customerId;
    } else {
      const loginInfo = this.localStorage.getObject('login_items') as LoginInfo;
      if (loginInfo && loginInfo.logged_as == loginInfo.id) {
        this.currentUserId = loginInfo.partyId;
      } else if (loginInfo && loginInfo.logged_as) {
        const loggedOrg = loginInfo.organizations.find((element: { id: any; }) => element.id == loginInfo.logged_as);
        this.currentUserId = loggedOrg?.partyId;
      }
    }
    
    // Load filter options
    this.loadFilterOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Check if tenderToEdit has changed and is not null
    if (changes['tenderToEdit'] && this.tenderToEdit) {
      this.loadTenderForEdit(this.tenderToEdit);
    }
    // Also check if modal was just opened and we have a tender to edit
    if (changes['isOpen'] && this.isOpen && this.tenderToEdit) {
      this.loadTenderForEdit(this.tenderToEdit);
    }
  }

  loadTenderForEdit(tender: Tender) {
    // Set basic fields
    this.editingTenderId = tender.id || null;
    this.createdQuoteId = tender.id || null;
    this.tenderTitle = tender.tenderNote || '';
    
    // Set dates if they exist
    if (tender.expectedFulfillmentStartDate) {
      this.requestedCompletionDate = this.formatDateForInput(tender.expectedFulfillmentStartDate);
      this.requestedDateSet = true;
    }
    
    if (tender.effectiveQuoteCompletionDate) {
      this.expectedCompletionDate = this.formatDateForInput(tender.effectiveQuoteCompletionDate);
      this.expectedDateSet = true;
    }
    
    // Set attachment if exists
    if (tender.attachment) {
      this.existingAttachment = tender.attachment;
      this.pdfAttachmentSet = true;
    }
    
    // Always start at step 2 when clicking EDIT to ensure proper initialization and API calls
    this.tenderCreationStep = 2;
  }

  private formatDateForInput(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  closeTenderModal() {
    this.isOpen = false;
    this.tenderCreationStep = 1;
    this.selectedProviders.clear();
    this.invitedProviders = [];
    this.tenderProviders = [];
    this.tenderError = null;
    this.editingTenderId = null;
    this.resetTenderForm();
    this.closeModal.emit();
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

  resetTenderForm() {
    this.tenderTitle = '';
    this.expectedCompletionDate = '';
    this.requestedCompletionDate = '';
    this.expectedDateSet = false;
    this.requestedDateSet = false;
    this.existingAttachment = null;
    this.createdQuoteId = null;
    this.selectedPdfFile = null;
    this.pdfAttachmentSet = false;
    this.invitedProviders = [];
  }

  /**
   * Step 1: Save initial tender with just title
   * Calls createCoordinatorQuote API
   */
  saveInitialTender() {
    if (!this.tenderTitle.trim()) {
      this.notificationService.showError('Tender title is required');
      return;
    }

    if (!this.currentUserId) {
      this.notificationService.showError('User not logged in');
      return;
    }

    this.tenderLoading = true;
    
    this.quoteService.createCoordinatorQuote(this.currentUserId, this.tenderTitle.trim()).subscribe({
      next: (createdTender) => {
        console.log('Coordinator tender created:', createdTender);
        this.createdQuoteId = createdTender.id || null;
        this.editingTenderId = createdTender.id || null;
        this.notificationService.showSuccess('Tender created! Now set the completion dates.');
        this.tenderLoading = false;
        
        // Move to Step 2: Date fields
        this.tenderCreationStep = 2;
      },
      error: (error) => {
        console.error('Error creating tender:', error);
        this.notificationService.showError('Failed to create tender: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Convert date from YYYY-MM-DD to DD-MM-YYYY format
   */
  formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  }

  /**
   * Step 2: Set expected completion date
   */
  setExpectedDate() {
    if (!this.expectedCompletionDate || !this.createdQuoteId) {
      this.notificationService.showError('Please select a date');
      return;
    }

    this.tenderLoading = true;
    const formattedDate = this.formatDateForAPI(this.expectedCompletionDate);
    
    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedDate, 'effective').subscribe({
      next: (updatedTender: any) => {
        this.expectedDateSet = true;
        this.notificationService.showSuccess('Effective completion date set successfully!');
        this.tenderLoading = false;
        // Emit update event so parent can refresh the tender list
        this.tenderUpdated.emit();
      },
      error: (error: any) => {
        console.error('Error setting effective date:', error);
        this.notificationService.showError('Failed to set effective date: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Step 2: Set requested completion date
   */
  setRequestedDate() {
    if (!this.requestedCompletionDate || !this.createdQuoteId) {
      this.notificationService.showError('Please select a date');
      return;
    }

    this.tenderLoading = true;
    const formattedDate = this.formatDateForAPI(this.requestedCompletionDate);
    
    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedDate, 'expectedFulfillment').subscribe({
      next: (updatedTender: any) => {
        this.requestedDateSet = true;
        this.notificationService.showSuccess('Expected fulfillment start date set successfully!');
        this.tenderLoading = false;
        // Emit update event so parent can refresh the tender list
        this.tenderUpdated.emit();
      },
      error: (error: any) => {
        console.error('Error setting expected fulfillment date:', error);
        this.notificationService.showError('Failed to set expected fulfillment date: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Step 2: Handle PDF file selection
   */
  onPdfFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      if (file.type !== 'application/pdf') {
        this.notificationService.showError('Please select a valid PDF file');
        this.selectedPdfFile = null;
        target.value = '';
        return;
      }
      this.selectedPdfFile = file;
      console.log('PDF file selected:', file.name);
    } else {
      this.selectedPdfFile = null;
    }
  }

  /**
   * Step 2: Upload PDF attachment
   */
  setPdfAttachment() {
    if (!this.selectedPdfFile || !this.createdQuoteId) {
      this.notificationService.showError('Please select a PDF file');
      return;
    }

    this.tenderLoading = true;
    
    this.quoteService.addAttachmentToQuote(this.createdQuoteId, this.selectedPdfFile, '').subscribe({
      next: (updatedQuote: any) => {
        this.pdfAttachmentSet = true;
        
        // Extract attachment from quoteItem (where it's actually stored)
        if (updatedQuote.quoteItem && updatedQuote.quoteItem.length > 0) {
          const firstItem = updatedQuote.quoteItem[0];
          if (firstItem.attachment && firstItem.attachment.length > 0) {
            const att = firstItem.attachment[0];
            this.existingAttachment = {
              name: att.name || 'attachment.pdf',
              mimeType: att.mimeType || 'application/pdf',
              content: att.content || '',
              size: att.size?.amount
            };
          }
        }
        
        // Reset the file input to show the updated state
        this.selectedPdfFile = null;
        const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        
        this.notificationService.showSuccess('PDF attachment uploaded successfully!');
        this.tenderLoading = false;
      },
      error: (error: any) => {
        console.error('Error uploading PDF:', error);
        this.notificationService.showError('Failed to upload PDF: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Check if all Step 2 fields are filled (drives the Next button enabled state)
   */
  isStep2Complete(): boolean {
    const hasPdf = !!this.selectedPdfFile || !!this.existingAttachment;
    return !!this.requestedCompletionDate && !!this.expectedCompletionDate && hasPdf;
  }

  /**
   * Proceed from Step 2 to Step 3: saves all data sequentially then moves to provider selection
   */
  proceedToProviderSelection() {
    if (!this.isStep2Complete() || !this.createdQuoteId) return;

    this.tenderLoading = true;

    const formattedRequested = this.formatDateForAPI(this.requestedCompletionDate);
    const formattedExpected = this.formatDateForAPI(this.expectedCompletionDate);

    // 1. Set tender start date
    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedRequested, 'expectedFulfillment').pipe(
      // 2. Set tender end date
      switchMap(() => this.quoteService.updateQuoteDate(this.createdQuoteId!, formattedExpected, 'effective')),
      // 3. Upload PDF only if a new file was selected (skip if keeping existing)
      switchMap(() => {
        if (this.selectedPdfFile) {
          return this.quoteService.addAttachmentToQuote(this.createdQuoteId!, this.selectedPdfFile, '');
        }
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.tenderLoading = false;
        this.notificationService.showSuccess('Tender details saved successfully!');
        this.tenderCreationStep = 3;
        this.loadTenderProviders();
      },
      error: (error: any) => {
        this.tenderLoading = false;
        this.notificationService.showError('Failed to save tender details. Please try again.');
        console.error('Error saving tender step 2:', error);
      }
    });
  }

  /**
   * Load providers from the provider API
   */
  loadTenderProviders() {
    this.tenderLoading = true;
    this.tenderError = null;

    console.log('Loading providers from API...');

    this.providerService.getProvidersForTenderNew(this.orgFilters).subscribe({
      next: (providers) => {
        // If search endpoint returns empty or fails, fallback to basic endpoint
        if (!providers || providers.length === 0) {
          console.log('Search returned no providers, trying fallback endpoint...');
          this.providerService.getProvidersForTender().subscribe({
            next: (fallbackProviders) => {
              this.tenderProviders = fallbackProviders;
              console.log('Fallback loaded providers:', fallbackProviders.length);
              this.tenderLoading = false;
              this.updateAvailableProviders();

              if (this.tenderCreationStep === 3) {
                this.loadInvitedProviders();
              }
            },
            error: (fallbackErr) => {
              this.tenderError = 'Failed to load providers from both endpoints: ' + (fallbackErr.message || 'Unknown error');
              this.tenderLoading = false;
              console.error('Fallback endpoint also failed:', fallbackErr);
            }
          });
        } else {
          this.tenderProviders = providers;
          console.log('Search loaded providers:', providers.length);
          this.tenderLoading = false;
          this.updateAvailableProviders();

          // After providers are loaded, load invited providers (if in edit mode)
          if (this.tenderCreationStep === 3) {
            this.loadInvitedProviders();
          }
        }
      },
      error: (err) => {
        // Search endpoint failed completely, try fallback
        console.warn('Search endpoint failed, trying fallback...', err);
        this.providerService.getProvidersForTender().subscribe({
          next: (fallbackProviders) => {
            this.tenderProviders = fallbackProviders;
            console.log('Fallback loaded providers:', fallbackProviders.length);
            this.tenderLoading = false;
            this.updateAvailableProviders();

            if (this.tenderCreationStep === 3) {
              this.loadInvitedProviders();
            }
          },
          error: (fallbackErr) => {
            this.tenderError = 'Failed to load providers: ' + (fallbackErr.message || 'Unknown error');
            this.tenderLoading = false;
            console.error('Error loading tender providers:', fallbackErr);
          }
        });
      }
    });
  }

  /**
   * Emit filter changes and reload providers
   */
  emitFilters(): void {
    const newFilters: SearchOrganizationsFilters = {
      countries: this.countriesCtrl.value ?? [],
      categories: this.categoriesCtrl.value ?? [],
      complianceLevels: this.complianceLevelsCtrl.value ?? []
    };
    console.log(newFilters);
    this.orgFilters = newFilters;
    this.loadTenderProviders();
  }

  /**
   * Are any filters currently active?
   */
  hasActiveFilters(): boolean {
    const hasCountries = (this.orgFilters.countries?.length ?? 0) == 0;
    const hasCategories = (this.orgFilters.categories?.length ?? 0) == 0;
    const hasComplianceLevels = (this.orgFilters.complianceLevels?.length ?? 0) == 0;

    return hasCountries && hasCategories && hasComplianceLevels;
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    // Reset both controls to empty arrays (and emit change)
    this.countriesCtrl.setValue([], { emitEvent: true });
    this.categoriesCtrl.setValue([], { emitEvent: true });
    this.complianceLevelsCtrl.setValue([], { emitEvent: true });

    // If you rely on (change) only, also call emit explicitly:
    this.emitFilters();
  }

  toggleProviderSelection(providerId: string) {
    // find in local safe list (which stores { provider, quoteId })
    const idx = this._safeInvitedList.findIndex(x => x?.id === providerId);

    if (idx >= 0) {
      // UNCHECK → remove from local safe list
      this._safeInvitedList.splice(idx, 1);
    } else {
      // CHECK → add to local safe list
      const p = this.tenderProviders.find(tp => tp.id === providerId);
      if (p) {
        this._safeInvitedList.push(p);
      }
    }

    // Re-derive selectedProviders + available list in one place
    this.rebuildSelectionAndAvailable();
  }

  private rebuildSelectionAndAvailable(): Provider[] {
    // 1) selectedProviders = IDs from local safe list
    this.selectedProviders = new Set(
      this._safeInvitedList
        .map(x => x?.id)
        .filter((id): id is string => !!id)
    );

    // 2) all IDs that must be excluded from availability (server invited + locally selected)
    const excludeIds = new Set<string>([
      ...this.invitedProviders
        .map(ip => ip?.provider?.id)
        .filter((id): id is string => !!id),
      ...Array.from(this.selectedProviders),
    ]);

    // 3) compute available list
    const available = this.tenderProviders
      .filter(p => !!p?.id && !excludeIds.has(p.id!))
      .map(p => ({ ...p } as Provider));

    // keep a cached copy if you want to bind directly in template
    this.availableProviders = available;

    return available;
  }

  /**
   * Load already invited providers by fetching tendering quotes with the coordinator quote's externalId
   */
  loadInvitedProviders() {
    if (!this.createdQuoteId || !this.currentUserId) {
      console.log('No coordinator quote ID or user ID, skipping invited providers load');
      return;
    }

    console.log('Loading invited providers for externalId:', this.createdQuoteId);

    this.tenderLoading = true;
    
    this.quoteService.getTenderingQuotesByUser(this.currentUserId, API_ROLES.BUYER).subscribe({
      next: (tenders) => {
        console.log('Received tenders:', tenders);
        
        // Clear existing invited providers
        this.invitedProviders = [];
        
        // Filter tenders that match our createdQuoteId as externalId
        const matchingTenders = tenders.filter(t => t.external_id === this.createdQuoteId);
        
        // Convert to invited providers format
        matchingTenders.forEach(tender => {
          // TODO: Get proper provider info once provider service is available
          const provider: Provider = {
            id: tender.provider || undefined,
            tradingName: tender.provider || 'Unknown Provider'
          };
          
          if (tender.id) {
            this.invitedProviders.push({
              provider: provider,
              quoteId: tender.id
            });
            console.log('Added invited provider:', provider.tradingName, 'with quote ID:', tender.id);
          }
        });
        
        console.log('Total invited providers loaded:', this.invitedProviders.length);
        this.tenderLoading = false;
      },
      error: (error) => {
        console.error('Error loading invited providers:', error);
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Go back from Step 3 to Step 2
   */
  backToStep2() {
    this.tenderCreationStep = 2;
  }

  /**
   * Format date from YYYY-MM-DD to DD/MM/YYYY for display
   */
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  }

  /**
   * Update available providers list
   */
  updateAvailableProviders(): void {
    this.availableProviders = this.getAvailableProviders();
  }

  /**
   * Get available providers (excluding already invited ones)
   */
  getAvailableProviders(): Provider[] {
    // Simple and clean — everything is handled by the helper
    return this.rebuildSelectionAndAvailable();
  }

  /**
   * Step 3: Save providers list by creating tendering quotes for selected providers
   */
  saveProvidersList() {
    if (this.selectedProviders.size === 0) {
      this.notificationService.showError('Please select at least one provider');
      return;
    }

    if (!this.createdQuoteId || !this.currentUserId) {
      this.notificationService.showError('Coordinator quote not found. Please start over.');
      return;
    }

    this.tenderLoading = true;
    const providerIds = Array.from(this.selectedProviders);
    const customerMessage = this.tenderTitle;

    console.log('Creating tendering quotes for providers:', providerIds);

    // Create tendering quotes one by one to capture individual quote IDs
    const requests = providerIds.map(providerId => {
      const provider = this._safeInvitedList.find(p => p.id === providerId);

      return this.quoteService.createTenderingQuote(
        this.currentUserId!,
        providerId,
        this.createdQuoteId!,
        customerMessage
      ).toPromise().then(tender => {
        if (!tender || !tender.id || !provider) {
          throw new Error('Failed to create quote for provider');
        }
        return {
          provider: provider,
          quoteId: tender.id
        };
      });
    });

    Promise.all(requests)
      .then(results => {
        console.log('Tendering quotes created:', results);

        // Add to invited providers list
        this.invitedProviders.push(...results);

        // Clear selection and safe list
        this.selectedProviders.clear();
        this._safeInvitedList = [];

        this.notificationService.showSuccess(`${providerIds.length} provider(s) has been saved for invite`);
        this.tenderLoading = false;
      })
      .catch(error => {
        console.error('Error creating tendering quotes:', error);
        this.notificationService.showError('Failed to invite providers: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      });
  }

  /**
   * Remove an invited provider by deleting their tendering quote
   */
  removeInvitedProvider(quoteId: string, providerId: string | undefined) {
    if (!providerId) return;

    this.showConfirmation(
      'Remove Provider',
      'Are you sure you want to remove this provider invitation? This will delete the quote.',
      () => {
        this.tenderLoading = true;

        this.quoteService.deleteQuote(quoteId).subscribe({
          next: () => {
            console.log('Quote deleted for provider:', providerId);

            // Remove from invited list
            this.invitedProviders = this.invitedProviders.filter(ip => ip.quoteId !== quoteId);

            this.notificationService.showSuccess('Provider invitation removed successfully');
            this.tenderLoading = false;
          },
          error: (error) => {
            console.error('Error deleting quote:', error);
            this.notificationService.showError('Failed to remove provider invitation: ' + (error.message || 'Unknown error'));
            this.tenderLoading = false;
          }
        });
      },
      'Remove',
      'px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
    );
  }

  /**
   * Step 3: Finalize and complete tender creation
   */
  finalizeTender() {
    if (this.invitedProviders.length === 0) {
      this.notificationService.showError('Please invite at least one provider first');
      return;
    }

    if (!this.createdQuoteId) {
      this.notificationService.showError('Coordinator quote not found');
      return;
    }

    this.showConfirmation(
      'Finalize Tender',
      'Are you sure you want to finalize the tender? This will notify all invited providers.',
      () => this.executeFinalizeTender(),
      'Finalize',
      'px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
    );
  }

  private executeFinalizeTender() {
    this.tenderLoading = true;

    // Get the coordinator quote to extract the dates
    this.quoteService.getQuoteById(this.createdQuoteId!).pipe(
      switchMap(coordinatorQuote => {
        console.log('Coordinator quote retrieved:', coordinatorQuote);
        
        const formattedEffectiveDate = this.formatDateForAPI(this.expectedCompletionDate);
        const formattedExpectedFulfillmentDate = this.formatDateForAPI(this.requestedCompletionDate);
        
        console.log(`Copying dates to ${this.invitedProviders.length} provider quotes`);

        // Create array of date update observables for all invited provider quotes
        const dateUpdateObservables = this.invitedProviders.flatMap(invitedProvider => {
          const quoteId = invitedProvider.quoteId;
          
          return [
            this.quoteService.updateQuoteDate(quoteId, formattedEffectiveDate, 'expected'),
            this.quoteService.updateQuoteDate(quoteId, formattedExpectedFulfillmentDate, 'requested')
          ];
        });

        if (dateUpdateObservables.length === 0) {
          return of([]);
        }

        return forkJoin(dateUpdateObservables);
      }),
      switchMap(dateUpdateResults => {
        console.log(`Successfully updated dates for ${dateUpdateResults.length / 2} provider quotes`);
        
        // Update coordinator quote status to "inProgress"
        return this.quoteService.updateQuoteStatus(this.createdQuoteId!, 'inProgress');
      })
    ).subscribe({
      next: (updatedQuote: any) => {
        console.log('Coordinator quote status updated to inProgress:', updatedQuote);
        
        this.notificationService.showSuccess('Dates copied to all provider quotes and notifications sent to providers');
        
        this.tenderLoading = false;
        this.closeTenderModal();
        
        // Emit success - parent component will refresh the list
        this.tenderCreated.emit(updatedQuote);
      },
      error: (error: any) => {
        console.error('Error finalizing tender:', error);
        this.notificationService.showError('Failed to finalize tender: ' + (error.message || 'Unknown error'));
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Load filter options (countries, categories, compliance levels)
   */
  private loadFilterOptions(): void {
    this.clearFilters();
    this.providerService.getFilterOptions().subscribe({
      next: ({ categories, countries, complianceLevels }) => {
        this.categoriesOptions = categories ?? [];
        this.countriesOptions = countries ?? [];
        this.complianceLevelsOptions = complianceLevels ?? [];
      },
      error: (err) => {
        console.warn('Failed to load filter options', err);
      }
    });
  }

  /**
   * Toggle selection in multi-select dropdown
   */
  toggleFromSelect(ctrl: FormControl<string[]>, value: string, event: MouseEvent) {
    event.preventDefault(); // stop native multi-select behavior
    event.stopPropagation();

    const cur = ctrl.value ?? [];
    const next = cur.includes(value)
      ? cur.filter(v => v !== value)
      : [...cur, value];

    ctrl.setValue(next);
  }
}

