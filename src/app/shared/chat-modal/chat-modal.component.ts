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
      class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      (click)="closeModal()"
    >
      <!-- Modal Content -->
      <div 
        class="bg-white rounded-lg shadow-lg w-full max-w-4xl p-8 relative"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">
            Chat for Quote {{ getShortQuoteId() }}
          </h2>
          <button
            (click)="closeModal()"
            class="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>

        <!-- Chat Messages Area -->
        <div 
          #messagesContainer
          class="border rounded p-4 h-96 overflow-y-auto mb-6 bg-gray-50"
        >
          <!-- Loading State -->
          <div *ngIf="isLoading" class="text-gray-400 text-center">
            Loading messages...
          </div>

          <!-- Error State -->
          <div *ngIf="error" class="text-red-500 text-center">
            Error loading messages
          </div>

          <!-- No Messages -->
          <div *ngIf="!isLoading && !error && messages.length === 0" class="text-gray-400 text-center">
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
                class="max-w-xs px-3 py-2 rounded-lg text-sm"
                [ngClass]="isMyMessage(message) ? 'bg-blue-100 text-blue-900' : 'bg-gray-200 text-gray-800'"
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
            class="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type a message..."
            required
            [disabled]="isSending"
            (keydown.enter)="onEnterKey($event)"
          />

          <!-- Action Buttons -->
          <div class="flex justify-between pt-4 border-t border-gray-200">
            <button
              type="submit"
              [disabled]="isSending || !newMessage.trim()"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSending ? 'Sending...' : 'Send' }}
            </button>
            <button
              type="button"
              (click)="closeModal()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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