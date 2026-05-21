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
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { Tender, TenderAttachment } from 'src/app/models/tender.model';
import { Category, LoginInfo } from 'src/app/models/interfaces';
import { API_ROLES } from 'src/app/models/roles.constants';
import { TENDER_STEP2_DESCRIPTION } from 'src/app/models/quote.constants';
import {
  ProviderCountryOption,
  SearchOrganizationsFilters,
  TENDER_COMPLIANCE_LEVELS,
  buildTenderProviderSearchFilters,
  resolveTenderCatalogueFacetOptions,
  resolveTenderCategoryLeafNames,
} from 'src/app/models/search-organizations-filters.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { TenderDateFieldComponent } from '../tender-date-field/tender-date-field.component';
import {
  TenderProviderCandidate,
  buildStableProviderCandidates,
} from './tender-provider-selection.model';

@Component({
  selector: 'app-create-tender-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, TenderDateFieldComponent],
  template: `
    <!-- Tender Creation Modal -->
    <div *ngIf="isOpen" class="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-[#0b1220]/45 px-4 py-8 font-[Blinker]" (click)="closeTenderModal()">
      <div class="relative mx-auto w-full max-w-[1280px] rounded-2xl border border-[#EBECEE] bg-[#F7F9FD] p-6 shadow-[0_20px_50px_rgba(11,18,32,0.24)]" (click)="$event.stopPropagation()">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-[24px] font-bold text-[#0b1220]">{{ editingTenderId ? 'Edit Tender' : 'Create New Tender' }}</h3>
          <button (click)="closeTenderModal()" class="rounded-lg p-2 text-[#526179] transition-colors hover:bg-[#EBF0F7] hover:text-[#1f4fbf]" aria-label="Close tender modal">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Step 1: Title Only -->
        <div *ngIf="tenderCreationStep === 1">
          <div class="mb-6">
            <label for="tenderTitle" class="mb-2 block text-sm font-semibold text-[#324153]">
              Tender Title *
            </label>
            <input 
              type="text" 
              id="tenderTitle"
              [(ngModel)]="tenderTitle"
              class="h-12 w-full rounded-lg border border-[#EBECEE] bg-white px-4 text-[15px] text-[#0b1220] outline-none transition-colors placeholder:text-[#9AA6B8] hover:border-[#1f4fbf] focus:border-[#1f4fbf] focus:ring-2 focus:ring-[#B6CAEC]"
              placeholder="Enter tender title or description..."
              autofocus
            />
            <p class="mt-2 text-sm text-[#526179]">This will be the main description of your tender</p>
          </div>

          <!-- Actions for Step 1 -->
          <div class="mt-6 flex justify-end gap-3 border-t border-[#EBECEE] pt-4">
            <button 
              (click)="closeTenderModal()" 
              class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf]"
            >
              Cancel
            </button>
            <button 
              (click)="saveInitialTender()" 
              [disabled]="!tenderTitle.trim() || tenderLoading"
              class="inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ tenderLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>

        <!-- Step 2: Completion Dates -->
        <div *ngIf="tenderCreationStep === 2">
          <!-- Display Title (Read-only) -->
          <div class="mb-4 rounded-2xl border border-[#EBECEE] bg-white p-4 shadow-sm">
            <label class="mb-2 block text-sm font-semibold text-[#526179]">Tender Title</label>
            <p class="break-words text-[16px] font-semibold text-[#0b1220] overflow-wrap-anywhere">{{ tenderTitle }}</p>
          </div>

          <!-- Step 2 Instructions -->
          <div class="mb-6 rounded-2xl border border-[#F2D28A] bg-[#FFF8E6] p-4">
            <p class="text-sm font-semibold text-[#7A4D00]">{{ TENDER_STEP2_DESCRIPTION }}</p>
          </div>

          <!-- Tender Start Date -->
          <div class="mb-6">
            <label for="requestedDate" class="mb-2 block text-sm font-semibold text-[#324153]">
              Tender Start Date *
            </label>
            <app-tender-date-field
              id="requestedDate"
              [(value)]="requestedCompletionDate"
              [min]="minDate"
            ></app-tender-date-field>
            <p class="mt-1 text-xs text-[#526179]">Format: DD/MM/YYYY</p>
            <p
              *ngIf="requestedCompletionDate && step2ValidationError && step2ValidationError.includes('Start date')"
              class="mt-1 text-xs text-[#B42318]"
            >{{ step2ValidationError }}</p>
          </div>

          <!-- Tender End Date -->
          <div class="mb-6">
            <label for="expectedDate" class="mb-2 block text-sm font-semibold text-[#324153]">
              Tender End Date *
            </label>
            <app-tender-date-field
              id="expectedDate"
              [(value)]="expectedCompletionDate"
              [min]="minDate"
            ></app-tender-date-field>
            <p class="mt-1 text-xs text-[#526179]">Format: DD/MM/YYYY</p>
            <p
              *ngIf="expectedCompletionDate && step2ValidationError && (step2ValidationError.includes('End date') || step2ValidationError.includes('End Date must be after'))"
              class="mt-1 text-xs text-[#B42318]"
            >{{ step2ValidationError }}</p>
          </div>

          <!-- PDF Upload -->
          <div class="mb-6">
            <label for="pdfFile" class="mb-2 block text-sm font-semibold text-[#324153]">
              PDF Attachment *
            </label>

            <!-- Display existing attachment prominently -->
            <div *ngIf="existingAttachment" class="mb-3 rounded-2xl border border-[#B6CAEC] bg-[#EBF0F7] p-4">
              <div class="flex items-center justify-between">
                <div class="flex min-w-0 items-center gap-3">
                  <svg class="h-5 w-5 shrink-0 text-[#1f4fbf]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-[#0b1220]">Current PDF</p>
                    <p class="truncate text-sm text-[#526179]">{{ existingAttachment.name }}</p>
                  </div>
                </div>
                <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#1f4fbf]">Attached</span>
              </div>
              <p class="mt-2 text-xs text-[#526179]">Upload a new file to replace the existing attachment</p>
            </div>

            <input
              type="file"
              id="pdfFile"
              accept=".pdf"
              (change)="onPdfFileSelected($any($event))"
              class="block w-full cursor-pointer rounded-lg border border-[#EBECEE] bg-white text-sm text-[#526179] transition-colors file:mr-4 file:h-12 file:cursor-pointer file:border-0 file:bg-[#EBF0F7] file:px-4 file:text-sm file:font-semibold file:text-[#1f4fbf] hover:border-[#1f4fbf] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC]"
            />
            <p class="mt-1 text-xs text-[#526179]">
              {{ existingAttachment ? 'Select a new file to upload or keep the current one' : 'Only PDF files allowed' }} — Max size 10MB
            </p>
          </div>

          <!-- Actions for Step 2 -->
          <div class="mt-6 flex justify-end gap-3 border-t border-[#EBECEE] pt-4">
            <button
              (click)="closeTenderModal()"
              class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf]"
            >
              Cancel
            </button>
            <button
              (click)="proceedToProviderSelection()"
              [disabled]="!isStep2Complete() || tenderLoading"
              [title]="step2ValidationError"
              class="group relative inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ tenderLoading ? 'Saving...' : 'Next: Select Providers' }}
              <span
                *ngIf="!isStep2Complete()"
                class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                {{ step2ValidationError }}
              </span>
            </button>
          </div>
        </div>

        <!-- Step 3: Provider Selection -->
        <div *ngIf="tenderCreationStep === 3">
          <!-- Display Title (Read-only) -->
          <div class="mb-6 rounded-2xl border border-[#EBECEE] bg-white p-4 shadow-sm">
            <label class="mb-2 block text-sm font-semibold text-[#526179]">Tender Title</label>
            <p class="break-words text-[16px] font-semibold text-[#0b1220] overflow-wrap-anywhere">{{ tenderTitle }}</p>
          </div>

          <!-- Date Summary -->
          <div class="mb-6 rounded-2xl border border-[#CBEADB] bg-[#F0FBF6] p-4">
            <h4 class="mb-2 text-sm font-semibold text-[#006B4A]">Dates Set</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-[#526179]">Effective:</span>
                <span class="ml-2 font-semibold text-[#0b1220]">{{ formatDateForDisplay(expectedCompletionDate) }}</span>
              </div>
              <div>
                <span class="text-[#526179]">Expected Fulfillment:</span>
                <span class="ml-2 font-semibold text-[#0b1220]">{{ formatDateForDisplay(requestedCompletionDate) }}</span>
              </div>
            </div>
          </div>

          <!-- PDF Summary -->
          <div *ngIf="existingAttachment || pdfAttachmentSet" class="mb-6 rounded-2xl border border-[#CBEADB] bg-[#F0FBF6] p-4">
            <h4 class="mb-2 text-sm font-semibold text-[#006B4A]">PDF Attachment Set</h4>
            <p class="text-sm font-semibold text-[#0b1220]">{{ existingAttachment?.name || selectedPdfFile?.name }}</p>
          </div>

          <!-- Loading State -->
          <div *ngIf="tenderLoading" class="flex justify-center py-8">
            <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-[#1f4fbf]"></div>
          </div>

          <!-- Error State -->
          <div *ngIf="tenderError" class="mb-4 rounded-2xl border border-[#F4C7C7] bg-[#FFF1F1] p-4">
            <p class="text-sm font-semibold text-[#B42318]">{{ tenderError }}</p>
          </div>

          <div *ngIf="!tenderLoading && !tenderError">
            <!-- Already Invited Providers Section -->
            <div *ngIf="invitedProviders.length > 0" class="mb-6">
              <label class="mb-3 block text-sm font-semibold text-[#324153]">
                Already Invited Providers ({{ invitedProviders.length }})
              </label>
              
              <div class="max-h-64 overflow-y-auto rounded-2xl border border-[#CBEADB] bg-[#F0FBF6]">
                <div *ngFor="let invited of invitedProviders" 
                     class="flex items-center justify-between border-b border-[#CBEADB] p-4 transition-colors last:border-b-0 hover:bg-white">
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-[#0b1220]">
                      {{ invited.provider.tradingName || 'Unnamed Provider' }}
                    </p>
                    <p *ngIf="invited.provider.externalReference?.[0]?.name" class="mt-1 text-xs text-[#526179]">
                      {{ invited.provider.externalReference?.[0]?.name }}
                    </p>
                  </div>
                  <button 
                    (click)="removeInvitedProvider(invited.quoteId, invited.provider.id)"
                    class="ml-4 rounded-lg p-2 text-[#B42318] transition-colors hover:bg-[#FFF1F1]"
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
              <label class="mb-3 block text-sm font-semibold text-[#324153]">
                Select Providers to Invite
              </label>
              
              <div class="rounded-2xl border border-[#EBECEE] bg-white p-3 shadow-sm">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="relative shrink-0">
                    <button
                      type="button"
                      (click)="toggleTenderFilterDropdown('serviceCategory', $event)"
                      [ngClass]="selectedServiceCategory ? 'border-[#1f4fbf] bg-[#EBF0F7] text-[#1f4fbf]' : 'border-[#EBECEE] text-[#324153] hover:border-[#1f4fbf] hover:text-[#1f4fbf]'"
                      class="flex h-10 max-w-[240px] items-center gap-2 rounded-lg border pl-4 pr-3 text-[16px] transition-colors"
                    >
                      <span class="truncate">{{ selectedServiceCategory?.name || 'All Categories' }}</span>
                      <svg class="h-4 w-4 shrink-0 transition-transform" [ngClass]="showServiceCategoryDropdown ? 'rotate-180' : ''" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <div *ngIf="showServiceCategoryDropdown" (click)="$event.stopPropagation()" class="absolute left-0 top-full z-[70] mt-2 max-h-[360px] w-[280px] overflow-y-auto rounded-xl bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                      <div *ngIf="catalogueOptionsLoading" class="px-3 py-2.5 text-[14px] text-[#526179]">Loading categories...</div>
                      <button type="button" (click)="selectServiceCategory(null, $event)" [ngClass]="!selectedServiceCategory ? 'bg-[#DDE6F6]' : 'hover:bg-[#EBF0F7]'" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#0b1220] transition-colors">
                        <span class="min-w-0 flex-1">All Categories</span>
                        <svg *ngIf="!selectedServiceCategory" class="h-4 w-4 text-[#1f4fbf]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                      <button *ngFor="let option of serviceCategoryOptions" type="button" (click)="selectServiceCategory(option, $event)" [ngClass]="selectedServiceCategory?.id === option.id ? 'bg-[#DDE6F6]' : 'hover:bg-[#EBF0F7]'" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#0b1220] transition-colors">
                        <span class="min-w-0 flex-1 truncate">{{ option.name }}</span>
                      </button>
                      <div *ngIf="!catalogueOptionsLoading && serviceCategoryOptions.length === 0" class="px-3 py-2.5 text-[14px] text-[#526179]">No category options available</div>
                    </div>
                  </div>

                  <div class="relative shrink-0">
                    <button type="button" (click)="toggleTenderFilterDropdown('compliance', $event)" [ngClass]="selectedComplianceLevels.length > 0 ? 'border-[#1f4fbf] bg-[#EBF0F7] text-[#1f4fbf]' : 'border-[#EBECEE] text-[#324153] hover:border-[#1f4fbf] hover:text-[#1f4fbf]'" class="flex h-10 items-center gap-2 rounded-lg border pl-4 pr-3 text-[16px] transition-colors">
                      Compliance Levels
                      <span *ngIf="selectedComplianceLevels.length > 0" class="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#B6CAEC] px-1.5 text-[12px] font-semibold text-[#1f4fbf]">{{ selectedComplianceLevels.length }}</span>
                      <svg class="h-4 w-4 transition-transform" [ngClass]="showComplianceDropdown ? 'rotate-180' : ''" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <div *ngIf="showComplianceDropdown" (click)="$event.stopPropagation()" class="absolute left-0 top-full z-[70] mt-2 w-[240px] rounded-xl bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                      <button *ngFor="let option of complianceLevelOptions" type="button" (click)="toggleComplianceLevel(option.code, $event)" [ngClass]="isComplianceSelected(option.code) ? 'bg-[#DDE6F6]' : 'hover:bg-[#EBF0F7]'" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#0b1220] transition-colors">
                        <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border" [ngClass]="isComplianceSelected(option.code) ? 'border-[#1f4fbf] bg-[#1f4fbf] text-white' : 'border-[#B6CAEC] bg-white'">
                          <svg *ngIf="isComplianceSelected(option.code)" class="h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                        <span>{{ option.label }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="relative shrink-0">
                    <button type="button" (click)="toggleTenderFilterDropdown('sector', $event)" [ngClass]="selectedSectorIds.length > 0 ? 'border-[#1f4fbf] bg-[#EBF0F7] text-[#1f4fbf]' : 'border-[#EBECEE] text-[#324153] hover:border-[#1f4fbf] hover:text-[#1f4fbf]'" class="flex h-10 items-center gap-2 rounded-lg border pl-4 pr-3 text-[16px] transition-colors">
                      Addressable Sectors
                      <span *ngIf="selectedSectorIds.length > 0" class="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#B6CAEC] px-1.5 text-[12px] font-semibold text-[#1f4fbf]">{{ selectedSectorIds.length }}</span>
                      <svg class="h-4 w-4 transition-transform" [ngClass]="showSectorDropdown ? 'rotate-180' : ''" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <div *ngIf="showSectorDropdown" (click)="$event.stopPropagation()" class="absolute left-0 top-full z-[70] mt-2 max-h-[360px] w-[260px] overflow-y-auto rounded-xl bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                      <div *ngIf="catalogueOptionsLoading" class="px-3 py-2.5 text-[14px] text-[#526179]">Loading sectors...</div>
                      <button *ngFor="let option of addressableSectorOptions" type="button" (click)="toggleAddressableSector(option, $event)" [ngClass]="isSectorSelected(option) ? 'bg-[#DDE6F6]' : 'hover:bg-[#EBF0F7]'" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#0b1220] transition-colors">
                        <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border" [ngClass]="isSectorSelected(option) ? 'border-[#1f4fbf] bg-[#1f4fbf] text-white' : 'border-[#B6CAEC] bg-white'">
                          <svg *ngIf="isSectorSelected(option)" class="h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                        <span class="truncate">{{ option.name }}</span>
                      </button>
                      <div *ngIf="!catalogueOptionsLoading && addressableSectorOptions.length === 0" class="px-3 py-2.5 text-[14px] text-[#526179]">No sector options available</div>
                    </div>
                  </div>

                  <div class="relative shrink-0">
                    <button type="button" (click)="toggleTenderFilterDropdown('country', $event)" [ngClass]="selectedCountryCodes.length > 0 ? 'border-[#1f4fbf] bg-[#EBF0F7] text-[#1f4fbf]' : 'border-[#EBECEE] text-[#324153] hover:border-[#1f4fbf] hover:text-[#1f4fbf]'" class="flex h-10 items-center gap-2 rounded-lg border pl-4 pr-3 text-[16px] transition-colors">
                      Country
                      <span *ngIf="selectedCountryCodes.length > 0" class="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#B6CAEC] px-1.5 text-[12px] font-semibold text-[#1f4fbf]">{{ selectedCountryCodes.length }}</span>
                      <svg class="h-4 w-4 transition-transform" [ngClass]="showCountryDropdown ? 'rotate-180' : ''" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <div *ngIf="showCountryDropdown" (click)="$event.stopPropagation()" class="absolute left-0 top-full z-[70] mt-2 max-h-[360px] w-[240px] overflow-y-auto rounded-xl bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                      <div *ngIf="countryOptionsLoading" class="px-3 py-2.5 text-[14px] text-[#526179]">Loading countries...</div>
                      <button *ngFor="let option of countryOptions" type="button" (click)="toggleCountry(option.code, $event)" [ngClass]="isCountrySelected(option.code) ? 'bg-[#DDE6F6]' : 'hover:bg-[#EBF0F7]'" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#0b1220] transition-colors">
                        <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border" [ngClass]="isCountrySelected(option.code) ? 'border-[#1f4fbf] bg-[#1f4fbf] text-white' : 'border-[#B6CAEC] bg-white'">
                          <svg *ngIf="isCountrySelected(option.code)" class="h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                        <span class="truncate">{{ option.label }}</span>
                      </button>
                      <div *ngIf="!countryOptionsLoading && countryOptions.length === 0" class="px-3 py-2.5 text-[14px] text-[#526179]">No country options available</div>
                    </div>
                  </div>

                  <div class="relative shrink-0">
                    <button type="button" (click)="toggleTenderFilterDropdown('framework', $event)" [ngClass]="selectedFrameworkIds.length > 0 ? 'border-[#1f4fbf] bg-[#EBF0F7] text-[#1f4fbf]' : 'border-[#EBECEE] text-[#324153] hover:border-[#1f4fbf] hover:text-[#1f4fbf]'" class="flex h-10 items-center gap-2 rounded-lg border pl-4 pr-3 text-[16px] transition-colors">
                      Integration Framework
                      <span *ngIf="selectedFrameworkIds.length > 0" class="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#B6CAEC] px-1.5 text-[12px] font-semibold text-[#1f4fbf]">{{ selectedFrameworkIds.length }}</span>
                      <svg class="h-4 w-4 transition-transform" [ngClass]="showFrameworkDropdown ? 'rotate-180' : ''" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <div *ngIf="showFrameworkDropdown" (click)="$event.stopPropagation()" class="absolute left-0 top-full z-[70] mt-2 max-h-[360px] w-[280px] overflow-y-auto rounded-xl bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                      <div *ngIf="catalogueOptionsLoading" class="px-3 py-2.5 text-[14px] text-[#526179]">Loading frameworks...</div>
                      <button *ngFor="let option of integrationFrameworkOptions" type="button" (click)="toggleIntegrationFramework(option, $event)" [ngClass]="isFrameworkSelected(option) ? 'bg-[#DDE6F6]' : 'hover:bg-[#EBF0F7]'" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#0b1220] transition-colors">
                        <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border" [ngClass]="isFrameworkSelected(option) ? 'border-[#1f4fbf] bg-[#1f4fbf] text-white' : 'border-[#B6CAEC] bg-white'">
                          <svg *ngIf="isFrameworkSelected(option)" class="h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                        <span class="truncate">{{ option.name }}</span>
                      </button>
                      <div *ngIf="!catalogueOptionsLoading && integrationFrameworkOptions.length === 0" class="px-3 py-2.5 text-[14px] text-[#526179]">No framework options available</div>
                    </div>
                  </div>
                </div>

                <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EBECEE] pt-3">
                  <p class="text-sm text-[#526179]">{{ availableProviders.length }} provider candidate(s)</p>
                  <button type="button" (click)="clearFilters()" class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#1f4fbf] hover:bg-[#EBF0F7]">
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M21.015 4.356v4.992m0 0h-4.992m4.993 0-3.181-3.183a8.25 8.25 0 0 0-13.803 3.7" />
                    </svg>
                    Clear all
                  </button>
                </div>
              </div>

              <div class="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-[#EBECEE] bg-white">
                <div
                  *ngFor="let candidate of availableProviders"
                  class="flex items-center gap-3 border-b border-[#EBECEE] px-4 py-3 last:border-b-0 hover:bg-[#F7F9FD]"
                  [ngClass]="candidate.selected ? 'bg-[#F7F9FD]' : ''"
                >
                  <ng-container *ngIf="candidate.provider.id as providerId">
                    <input
                      type="checkbox"
                      [id]="'provider-' + providerId"
                      [checked]="candidate.selected"
                      (change)="toggleProviderSelection(providerId)"
                      class="h-4 w-4 rounded border-[#B6CAEC] text-[#1f4fbf] focus:ring-[#B6CAEC]"
                    />
                    <label [for]="'provider-' + providerId" class="min-w-0 flex-1 cursor-pointer">
                      <p class="truncate text-sm font-semibold text-[#0b1220]">{{ candidate.provider.tradingName || 'Unnamed Provider' }}</p>
                      <p *ngIf="candidate.provider.externalReference?.[0]?.name" class="mt-0.5 truncate text-xs text-[#526179]">{{ candidate.provider.externalReference?.[0]?.name }}</p>
                    </label>
                  </ng-container>
                </div>
                
                <div *ngIf="availableProviders.length === 0" class="p-8 text-center text-[#526179]">
                  <p class="text-sm" *ngIf="hasActiveFilters(); else noMoreProviders">
                    No provider candidates match the selected filters.
                  </p>
                  <ng-template #noMoreProviders>
                    <p class="text-sm">No more providers available.</p>
                  </ng-template>
                </div>
              </div>

              <p class="mt-2 text-sm font-semibold text-[#526179]">
                {{ selectedProviders.size }} provider(s) selected
              </p>
            </div>
          </div>

          <!-- Actions for Step 3 -->
          <div class="mt-6 flex justify-between gap-3 border-t border-[#EBECEE] pt-4">
            <button 
              (click)="backToStep2()" 
              class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf]"
            >
              ← Back
            </button>
            <div class="flex gap-3">
              <button 
                (click)="closeTenderModal()" 
                class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf]"
              >
                Cancel
              </button>
              <button 
                (click)="saveProvidersList()"
                [disabled]="selectedProviders.size === 0 || tenderLoading"
                [title]="selectedProviders.size === 0 ? 'Please select at least one provider' : ''"
                class="group relative inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] disabled:cursor-not-allowed disabled:opacity-50"
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
                class="group relative inline-flex h-10 items-center rounded-lg bg-[#006B4A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00523A] disabled:cursor-not-allowed disabled:opacity-50"
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
  private api = inject(ApiServiceService);
  private accountService = inject(AccountServiceService);
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
  genericConfirmButtonClass = 'inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50';
  genericConfirmCallback: (() => void) | null = null;
  currentUserId: string | null = null;

  // Tender Provider Search filters
  countryOptions: ProviderCountryOption[] = [];
  serviceCategoryOptions: Category[] = [];
  addressableSectorOptions: Category[] = [];
  integrationFrameworkOptions: Category[] = [];
  countryOptionsLoading = false;
  catalogueOptionsLoading = false;
  readonly complianceLevelOptions = TENDER_COMPLIANCE_LEVELS;

  showServiceCategoryDropdown = false;
  showComplianceDropdown = false;
  showSectorDropdown = false;
  showCountryDropdown = false;
  showFrameworkDropdown = false;

  selectedServiceCategory: Category | null = null;
  selectedServiceCategoryLeafNames: string[] = [];
  selectedComplianceLevels: string[] = [];
  selectedCountryCodes: string[] = [];
  selectedSectorIds: string[] = [];
  selectedSectorLeafNames: string[] = [];
  selectedFrameworkIds: string[] = [];
  selectedFrameworkLeafNames: string[] = [];

  private leafNameCache = new Map<string, string[]>();
  private providerLoadSequence = 0;
  private serviceCategoryResolutionSequence = 0;
  private sectorResolutionSequence = 0;
  private frameworkResolutionSequence = 0;
  _safeInvitedList: Provider[] = [];

  // Default organization search filters
  orgFilters: SearchOrganizationsFilters = {
    categories: [],
    countries: [],
    complianceLevels: []
  };
  // Available providers list
  availableProviders: TenderProviderCandidate[] = [];

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
    
    // Filter options (categories, countries, compliance levels) and the provider list
    // are loaded lazily in proceedToProviderSelection() when the user enters step 3.
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
    buttonClass: string = 'inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50'
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
        // Notify the parent dashboard so the new tender appears in the list immediately
        this.tenderUpdated.emit();
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
  get step2ValidationError(): string {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 10;

    if (this.requestedCompletionDate) {
      const startYear = new Date(this.requestedCompletionDate).getFullYear();
      if (startYear < currentYear || startYear > maxYear) {
        return `Start date year must be between ${currentYear} and ${maxYear}.`;
      }
    }

    if (this.expectedCompletionDate) {
      const endYear = new Date(this.expectedCompletionDate).getFullYear();
      if (endYear < currentYear || endYear > maxYear) {
        return `End date year must be between ${currentYear} and ${maxYear}.`;
      }
    }

    if (this.requestedCompletionDate && this.expectedCompletionDate) {
      if (new Date(this.expectedCompletionDate) <= new Date(this.requestedCompletionDate)) {
        return 'Tender End Date must be after the Tender Start Date.';
      }
    }

    if (!this.requestedCompletionDate || !this.expectedCompletionDate) {
      return 'Both start and end dates are required.';
    }

    if (!this.selectedPdfFile && !this.existingAttachment) {
      return 'A PDF attachment is required.';
    }

    return '';
  }

  isStep2Complete(): boolean {
    return this.step2ValidationError === '';
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

        // Notify parent so the list reflects the saved dates and PDF immediately
        this.tenderUpdated.emit();

        this.resetTenderFilters();
        this.loadFilterOptions();
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
   * Load providers from the search API.
   * An empty result set is valid (no providers match the active filters).
   * Only falls back to the full party-organisation list when the search
   * endpoint returns an actual HTTP error.
   */
  loadTenderProviders() {
    const loadSequence = ++this.providerLoadSequence;
    this.tenderLoading = true;
    this.tenderError = null;

    this.providerService.getProvidersForTenderNew(this.orgFilters).subscribe({
      next: (providers) => {
        if (!this.isCurrentProviderLoad(loadSequence)) return;

        this.tenderProviders = providers ?? [];
        console.log('Search loaded providers:', this.tenderProviders.length);
        this.tenderLoading = false;
        this.updateAvailableProviders();

        if (this.tenderCreationStep === 3) {
          this.loadInvitedProviders();
        }
      },
      error: (err) => {
        if (!this.isCurrentProviderLoad(loadSequence)) return;

        // HTTP error from the search endpoint — fall back to the full organisation list
        console.warn('Search endpoint returned an error, falling back to full provider list:', err);
        this.providerService.getProvidersForTender().subscribe({
          next: (fallbackProviders) => {
            if (!this.isCurrentProviderLoad(loadSequence)) return;

            this.tenderProviders = fallbackProviders;
            console.log('Fallback loaded providers:', fallbackProviders.length);
            this.tenderLoading = false;
            this.updateAvailableProviders();

            if (this.tenderCreationStep === 3) {
              this.loadInvitedProviders();
            }
          },
          error: (fallbackErr) => {
            if (!this.isCurrentProviderLoad(loadSequence)) return;

            this.tenderError = 'Failed to load providers: ' + (fallbackErr.message || 'Unknown error');
            this.tenderLoading = false;
            console.error('Fallback endpoint also failed:', fallbackErr);
          }
        });
      }
    });
  }

  private isCurrentProviderLoad(sequence: number): boolean {
    return sequence === this.providerLoadSequence;
  }

  /**
   * Emit filter changes and reload providers
   */
  emitFilters(): void {
    this.orgFilters = buildTenderProviderSearchFilters({
      serviceCategoryLeafNames: this.selectedServiceCategoryLeafNames,
      addressableSectorLeafNames: this.selectedSectorLeafNames,
      integrationFrameworkLeafNames: this.selectedFrameworkLeafNames,
      countryCodes: this.selectedCountryCodes,
      complianceLevels: this.selectedComplianceLevels,
    });
    this.loadTenderProviders();
  }

  /**
   * Are any filters currently active?
   */
  hasActiveFilters(): boolean {
    return (this.orgFilters.countries?.length ?? 0) > 0 ||
           (this.orgFilters.categories?.length ?? 0) > 0 ||
           (this.orgFilters.complianceLevels?.length ?? 0) > 0;
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.resetTenderFilters();
    this.emitFilters();
  }

  private resetTenderFilters(): void {
    this.serviceCategoryResolutionSequence++;
    this.sectorResolutionSequence++;
    this.frameworkResolutionSequence++;
    this.orgFilters = { categories: [], countries: [], complianceLevels: [] };
    this.selectedServiceCategory = null;
    this.selectedServiceCategoryLeafNames = [];
    this.selectedComplianceLevels = [];
    this.selectedCountryCodes = [];
    this.selectedSectorIds = [];
    this.selectedSectorLeafNames = [];
    this.selectedFrameworkIds = [];
    this.selectedFrameworkLeafNames = [];
    this.closeTenderFilterDropdowns();
  }

  async selectServiceCategory(category: Category | null, event?: Event): Promise<void> {
    event?.stopPropagation();
    const resolutionSequence = ++this.serviceCategoryResolutionSequence;
    this.selectedServiceCategory = category;
    const leafNames = category ? await this.resolveLeafNames(category) : [];

    if (resolutionSequence !== this.serviceCategoryResolutionSequence) return;

    this.selectedServiceCategoryLeafNames = leafNames;
    this.showServiceCategoryDropdown = false;
    this.emitFilters();
  }

  toggleComplianceLevel(code: string, event: Event): void {
    event.stopPropagation();
    this.selectedComplianceLevels = this.toggleValue(this.selectedComplianceLevels, code);
    this.emitFilters();
  }

  toggleCountry(code: string, event: Event): void {
    event.stopPropagation();
    this.selectedCountryCodes = this.toggleValue(this.selectedCountryCodes, code);
    this.emitFilters();
  }

  async toggleAddressableSector(option: Category, event: Event): Promise<void> {
    event.stopPropagation();
    const resolutionSequence = ++this.sectorResolutionSequence;
    const id = option.id ?? option.name;
    this.selectedSectorIds = this.toggleValue(this.selectedSectorIds, id);
    const leafNames = await this.resolveSelectedLeafNames(
      this.addressableSectorOptions,
      this.selectedSectorIds
    );

    if (resolutionSequence !== this.sectorResolutionSequence) return;

    this.selectedSectorLeafNames = leafNames;
    this.emitFilters();
  }

  async toggleIntegrationFramework(option: Category, event: Event): Promise<void> {
    event.stopPropagation();
    const resolutionSequence = ++this.frameworkResolutionSequence;
    const id = option.id ?? option.name;
    this.selectedFrameworkIds = this.toggleValue(this.selectedFrameworkIds, id);
    const leafNames = await this.resolveSelectedLeafNames(
      this.integrationFrameworkOptions,
      this.selectedFrameworkIds
    );

    if (resolutionSequence !== this.frameworkResolutionSequence) return;

    this.selectedFrameworkLeafNames = leafNames;
    this.emitFilters();
  }

  isComplianceSelected(code: string): boolean {
    return this.selectedComplianceLevels.includes(code);
  }

  isCountrySelected(code: string): boolean {
    return this.selectedCountryCodes.includes(code);
  }

  isSectorSelected(option: Category): boolean {
    return this.selectedSectorIds.includes(option.id ?? option.name);
  }

  isFrameworkSelected(option: Category): boolean {
    return this.selectedFrameworkIds.includes(option.id ?? option.name);
  }

  toggleTenderFilterDropdown(
    name: 'serviceCategory' | 'compliance' | 'sector' | 'country' | 'framework',
    event: Event
  ): void {
    event.stopPropagation();
    this.showServiceCategoryDropdown = name === 'serviceCategory' ? !this.showServiceCategoryDropdown : false;
    this.showComplianceDropdown = name === 'compliance' ? !this.showComplianceDropdown : false;
    this.showSectorDropdown = name === 'sector' ? !this.showSectorDropdown : false;
    this.showCountryDropdown = name === 'country' ? !this.showCountryDropdown : false;
    this.showFrameworkDropdown = name === 'framework' ? !this.showFrameworkDropdown : false;
  }

  closeTenderFilterDropdowns(): void {
    this.showServiceCategoryDropdown = false;
    this.showComplianceDropdown = false;
    this.showSectorDropdown = false;
    this.showCountryDropdown = false;
    this.showFrameworkDropdown = false;
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value)
      ? values.filter(current => current !== value)
      : [...values, value];
  }

  private async resolveSelectedLeafNames(options: Category[], selectedIds: string[]): Promise<string[]> {
    const selected = options.filter(option => selectedIds.includes(option.id ?? option.name));
    const nested = await Promise.all(selected.map(option => this.resolveLeafNames(option)));
    return Array.from(new Set(nested.flat()));
  }

  private async resolveLeafNames(category: Category): Promise<string[]> {
    const cacheKey = category.id ?? category.name;
    const cached = this.leafNameCache.get(cacheKey);
    if (cached) return cached;

    const leafNames = await resolveTenderCategoryLeafNames(category, async (id) => {
      const children = await this.api.getCategoriesByParentId(id).catch(() => []);
      return Array.isArray(children) ? children : [];
    });

    this.leafNameCache.set(cacheKey, leafNames);
    return leafNames;
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

  private rebuildSelectionAndAvailable(): TenderProviderCandidate[] {
    // 1) selectedProviders = IDs from local safe list
    this.selectedProviders = new Set(
      this._safeInvitedList
        .map(x => x?.id)
        .filter((id): id is string => !!id)
    );

    const invitedProviderIds = new Set(
      this.invitedProviders
        .map(ip => ip?.provider?.id)
        .filter((id): id is string => !!id)
    );

    this.availableProviders = buildStableProviderCandidates({
      tenderProviders: this.tenderProviders,
      invitedProviderIds,
      selectedProviderIds: this.selectedProviders,
    });

    return this.availableProviders;
  }

  /**
   * Load already invited providers by fetching tendering quotes with the coordinator quote's externalId.
   *
   * Name resolution priority:
   *  1. Match the provider's org URN (tender.selectedProviders[0]) against the already-loaded
   *     tenderProviders list — this covers the common case with no extra API calls.
   *  2. Fall back to AccountServiceService.getOrgInfo() for providers not in the cached list
   *     (e.g. when reopening the modal without navigating to the provider-search step first).
   */
  loadInvitedProviders() {
    if (!this.createdQuoteId || !this.currentUserId) {
      console.log('No coordinator quote ID or user ID, skipping invited providers load');
      return;
    }

    console.log('Loading invited providers for externalId:', this.createdQuoteId);

    this.tenderLoading = true;

    this.quoteService.getTenderingQuotesByUser(this.currentUserId, API_ROLES.BUYER).subscribe({
      next: async (tenders) => {
        console.log('Received tenders:', tenders);

        // Filter tenders that match our coordinator quote as their parent
        const matchingTenders = tenders.filter(t => t.external_id === this.createdQuoteId && !!t.id);

        // Resolve provider display names, then populate invitedProviders
        const entries = await Promise.all(
          matchingTenders.map(async (tender) => {
            // The org URN lives in selectedProviders[0] (mapped from relatedParty[Seller].id)
            const providerOrgUrn = tender.selectedProviders?.[0];

            // 1. Try the already-loaded provider list first (no extra network call)
            const knownProvider = providerOrgUrn
              ? this.tenderProviders.find(p => p.id === providerOrgUrn)
              : undefined;

            if (knownProvider) {
              return { provider: knownProvider, quoteId: tender.id! };
            }

            // 2. Fall back to account service to get the trading name by org URN
            let tradingName = providerOrgUrn || 'Unknown Provider';
            if (providerOrgUrn) {
              try {
                const org = await this.accountService.getOrgInfo(providerOrgUrn);
                tradingName = org?.tradingName || org?.name || providerOrgUrn;
              } catch {
                // Network error — keep the URN as a recognisable fallback
              }
            }

            const provider: Provider = { id: providerOrgUrn, tradingName };
            return { provider, quoteId: tender.id! };
          })
        );

        this.invitedProviders = entries;
        this.rebuildSelectionAndAvailable();
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
  getAvailableProviders(): TenderProviderCandidate[] {
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

        // Clear selection and safe list, then recompute available so
        // just-invited providers are no longer shown as available
        this.selectedProviders.clear();
        this._safeInvitedList = [];
        this.rebuildSelectionAndAvailable();

        // Notify parent so the list reflects the new provider invites
        this.tenderUpdated.emit();

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
    if (!quoteId) return;

    this.showConfirmation(
      'Remove Provider',
      'Are you sure you want to remove this provider invitation? This will delete the quote.',
      () => {
        this.tenderLoading = true;

        this.quoteService.deleteQuote(quoteId).subscribe({
          next: () => {
            console.log('Quote deleted for provider:', providerId);

            this.invitedProviders = this.invitedProviders.filter(ip => ip.quoteId !== quoteId);
            this.rebuildSelectionAndAvailable();
            this.notificationService.showSuccess('Provider invitation removed successfully');
            this.tenderLoading = false;
          },
          error: (error) => {
            // TEMPORARY WORKAROUND — sandbox environment issue:
            // The TMForum/BAE backend successfully deletes the quote but then attempts to
            // notify a downstream microservice (charging/events) that is unreachable in sandbox.
            // This causes the BAE to return 500 {error: "Service unreachable"} AFTER the deletion
            // has already completed. As a result, the HTTP 500 reaches this error handler even
            // though the underlying operation succeeded.
            //
            // We detect this specific case (HTTP 500 + "Service unreachable" in the response body)
            // and treat it as a success so the UI stays consistent with the actual backend state.
            //
            // TODO: Remove this workaround once the sandbox downstream service is reachable
            // and the BAE no longer returns 500 on successful quote deletion.
            const isKnownFalsePositive =
              error.status === 500 &&
              (error.error?.error === 'Service unreachable' ||
               error.error?.message === 'Service unreachable' ||
               (typeof error.error === 'string' && error.error.includes('Service unreachable')));

            if (isKnownFalsePositive) {
              console.warn(
                '[WORKAROUND] deleteQuote returned 500 "Service unreachable" for quoteId:', quoteId,
                '— quote was deleted on the backend. Removing from UI anyway.'
              );
              this.invitedProviders = this.invitedProviders.filter(ip => ip.quoteId !== quoteId);
              this.rebuildSelectionAndAvailable();
              this.notificationService.showSuccess('Provider invitation removed successfully');
            } else {
              console.error('Error deleting quote:', error);
              this.notificationService.showError('Failed to remove provider invitation: ' + (error.message || 'Unknown error'));
            }
            this.tenderLoading = false;
          }
        });
      },
      'Remove',
      'inline-flex h-10 items-center rounded-lg border border-[#F4C7C7] bg-white px-4 text-sm font-semibold text-[#B42318] transition-colors hover:bg-[#FFF1F1] focus:outline-none focus:ring-2 focus:ring-[#F4C7C7] disabled:cursor-not-allowed disabled:opacity-50'
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
      'inline-flex h-10 items-center rounded-lg bg-[#006B4A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00523A] focus:outline-none focus:ring-2 focus:ring-[#B8E6D1] disabled:cursor-not-allowed disabled:opacity-50'
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
   * Load filter options for Tender Provider Search.
   * Only fetches the option lists — does NOT reset selected filter values
   * or trigger a provider reload.
   */
  private loadFilterOptions(): void {
    this.countryOptionsLoading = true;
    this.providerService.getProviderCountryOptions().subscribe({
      next: (options) => {
        this.countryOptions = options;
        this.countryOptionsLoading = false;
      },
      error: (err) => {
        console.warn('Failed to load provider countries', err);
        this.countryOptions = [];
        this.countryOptionsLoading = false;
      }
    });

    this.loadCatalogueFacetOptions();
  }

  private async loadCatalogueFacetOptions(): Promise<void> {
    this.catalogueOptionsLoading = true;
    try {
      const roots = await this.api.getDefaultCategories();
      const options = await resolveTenderCatalogueFacetOptions(
        Array.isArray(roots) ? roots : [],
        (id) => this.api.getCategoriesByParentId(id)
      );

      this.serviceCategoryOptions = options.serviceCategories;
      this.addressableSectorOptions = options.addressableSectors;
      this.integrationFrameworkOptions = options.integrationFrameworks;
    } catch (error) {
      console.warn('Tender catalogue filters failed:', error);
      this.serviceCategoryOptions = [];
      this.addressableSectorOptions = [];
      this.integrationFrameworkOptions = [];
    } finally {
      this.catalogueOptionsLoading = false;
    }
  }
}

