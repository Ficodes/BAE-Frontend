import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { NotificationService } from '../../services/notification.service';
import { Quote, Note } from '../../models/quote.model';
import { LoginInfo } from 'src/app/models/interfaces';

type QuoteNote = Note;

@Component({
  selector: 'app-chat-modal',
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
        class="relative w-full max-w-4xl rounded-2xl border border-[#EBECEE] bg-white p-6 shadow-[0_20px_50px_rgba(11,18,32,0.24)]"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold text-[#0b1220]">
            Chat for Quote {{ getShortQuoteId() }}
          </h2>
          <button
            (click)="closeModal()"
            class="rounded-lg p-2 text-[#526179] transition-colors hover:bg-[#EBF0F7] hover:text-[#1f4fbf] focus:outline-none"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>

        <!-- Chat Messages Area -->
        <div 
          #messagesContainer
          class="mb-6 h-96 overflow-y-auto rounded-2xl border border-[#EBECEE] bg-[#F7F9FD] p-4"
        >
          <!-- Loading State -->
          <div *ngIf="isLoading" class="text-center text-[#526179]">
            Loading messages...
          </div>

          <!-- Error State -->
          <div *ngIf="error" class="text-center text-[#B42318]">
            Error loading messages
          </div>

          <!-- No Messages -->
          <div *ngIf="!isLoading && !error && messages.length === 0" class="text-center text-[#526179]">
            No messages yet.
          </div>

          <!-- Messages -->
          <div *ngIf="!isLoading && !error && messages.length > 0">
            <div
              *ngFor="let message of messages"
              class="mb-3 flex"
              [ngClass]="isMyMessage(message) ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-xs rounded-lg px-3 py-2 text-sm"
                [ngClass]="isMyMessage(message) ? 'bg-[#DDE6F6] text-[#0b1220]' : 'bg-white text-[#324153] border border-[#EBECEE]'"
              >
                <div class="whitespace-pre-wrap">{{ message.text }}</div>
                <div
                  class="text-xs mt-1 opacity-60"
                  [ngClass]="isMyMessage(message) ? 'text-right' : 'text-left'"
                >
                  {{ formatMessageDate(message.date) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input Form -->
        <form (ngSubmit)="sendMessage()" #chatForm="ngForm">
          <input
            [(ngModel)]="newMessage"
            name="message"
            type="text"
            class="mb-4 h-11 w-full rounded-lg border border-[#EBECEE] bg-white px-3 text-sm text-[#0b1220] outline-none transition-colors placeholder:text-[#9AA6B8] hover:border-[#1f4fbf] focus:border-[#1f4fbf] focus:ring-2 focus:ring-[#B6CAEC]"
            placeholder="Type a message..."
            required
            [disabled]="isSending"
            (keydown.enter)="onEnterKey($event)"
          />

          <!-- Action Buttons -->
          <div class="flex justify-between border-t border-[#EBECEE] pt-4">
            <button
              type="submit"
              [disabled]="isSending || !newMessage.trim()"
              class="inline-flex h-10 items-center rounded-lg bg-[#1f4fbf] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#183f99] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSending ? 'Sending...' : 'Send' }}
            </button>
            <button
              type="button"
              (click)="closeModal()"
              class="inline-flex h-10 items-center rounded-lg border border-[#EBECEE] bg-white px-4 text-sm font-semibold text-[#324153] transition-colors hover:border-[#1f4fbf] hover:text-[#1f4fbf] focus:outline-none focus:ring-2 focus:ring-[#B6CAEC]"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ChatModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() quoteId: string | null = null;
  @Output() close = new EventEmitter<void>();

  messages: QuoteNote[] = [];
  newMessage = '';
  isLoading = false;
  error = false;
  isSending = false;
  currentUserId: string | null = null;
  
  private pollingInterval: any;

  constructor(
    private quoteService: QuoteService,
    private localStorage: LocalStorageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;

    if(aux.logged_as == aux.id){
      this.currentUserId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.currentUserId = loggedOrg.partyId
    }
    if (this.isOpen && this.quoteId) {
      this.loadMessages();
      this.startPolling();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.quoteId) {
      let aux = this.localStorage.getObject('login_items') as LoginInfo;

      if(aux.logged_as == aux.id){
        this.currentUserId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.currentUserId = loggedOrg.partyId
      }

      //this.currentUserId = this.loginService.getUserId();
      this.loadMessages();
      this.startPolling();
    } else if (!this.isOpen) {
      this.stopPolling();
      this.resetState();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  async loadMessages() {
    if (!this.quoteId) return;

    this.isLoading = true;
    this.error = false;

    try {
      const quote = await this.quoteService.getQuoteById(this.quoteId).toPromise();
      if(quote)
      this.messages = Array.isArray(quote?.note) ? quote.note : [];
      this.scrollToBottom();
    } catch (err) {
      console.error('Error loading messages:', err);
      this.error = true;
    } finally {
      this.isLoading = false;
    }
  }

  async sendMessage() {
    console.log('sendMessage called');
    console.log('newMessage:', this.newMessage);
    console.log('quoteId:', this.quoteId);
    console.log('currentUserId:', this.currentUserId);
    console.log('isSending:', this.isSending);

    if (!this.newMessage.trim() || !this.quoteId || !this.currentUserId || this.isSending) {
      console.log('Validation failed, returning early');
      return;
    }

    console.log('Starting to send message...');
    this.isSending = true;

    try {
      console.log('Calling addNoteToQuote API...');
      await this.quoteService.addNoteToQuote(this.quoteId, this.newMessage.trim(), this.currentUserId).toPromise();
      console.log('Message sent successfully');
      this.newMessage = '';
      // Reload messages after sending
      await this.loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      this.notificationService.showError('Error sending message. Please try again.');
    } finally {
      this.isSending = false;
    }
  }

  onEnterKey(event: Event) {
    event.preventDefault();
    this.sendMessage();
  }

  isMyMessage(message: QuoteNote): boolean {
    return message.author === this.currentUserId;
  }

  formatMessageDate(dateString: string | undefined): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Format: DD/MM/YYYY HH:mm
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  }

  getShortQuoteId(): string {
    if (!this.quoteId) return '';
    return this.quoteId.length > 8 ? this.quoteId.slice(-8) : this.quoteId;
  }

  closeModal() {
    this.close.emit();
  }

  private startPolling() {
    this.stopPolling(); // Clear any existing polling
    this.pollingInterval = setInterval(() => {
      if (this.isOpen && this.quoteId) {
        this.loadMessages();
      }
    }, 300000); // Poll every 5 minutes (300,000 ms)
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private resetState() {
    this.messages = [];
    this.newMessage = '';
    this.isLoading = false;
    this.error = false;
    this.isSending = false;
  }

  private scrollToBottom() {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      const container = document.querySelector('.overflow-y-auto');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
