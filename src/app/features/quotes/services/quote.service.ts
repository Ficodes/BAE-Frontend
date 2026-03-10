import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, map, forkJoin } from 'rxjs';
import { Quote, Quote_Create, Quote_Update, QuoteStateType } from 'src/app/models/quote.model';
import { Tender } from 'src/app/models/tender.model';
import { ApiRole, API_ROLES } from 'src/app/models/roles.constants';
import { QUOTE_STATUSES, QUOTE_CATEGORIES } from 'src/app/models/quote.constants';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuoteService {

  // Use getter to always get the current value (in case it's updated by app-init)
  // If quoteApi is a relative path, prepend BASE_URL
  private get apiUrl(): string {
    const quoteApi = environment.quoteApi;
    // If it's already an absolute URL, use it as-is
    if (quoteApi.startsWith('http://') || quoteApi.startsWith('https://')) {
      return quoteApi;
    }
    // Otherwise, prepend BASE_URL for relative paths
    return `${environment.BASE_URL}${quoteApi}`;
  }

  // Get HTTP headers with Bearer token for quote API calls
  private get httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
  }

  constructor(private http: HttpClient) {
    console.log('🔍 [DEBUG] QuoteService constructor - BASE_URL:', environment.BASE_URL);
  }

  // TMF 648 Quote Management API methods
  
  /**
   * Creates a new quote
   * POST /quote
   */
  createQuote(quote: Quote_Create): Observable<Quote> {
    return this.http.post<Quote>(`${this.apiUrl}/quote`, quote, this.httpOptions);
  }

  /**
   * Creates a new quote from quote request (simplified API)
   * POST /quoteManagement/createQuote
   */
  createQuoteFromRequest(requestData: {
    customerMessage: string;
    customerIdRef: string;
    providerIdRef: string;
    productOfferingId: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${environment.quoteEndpoints.createQuote}`, requestData, this.httpOptions);
  }

  /**
   * List or find Quote objects
   * GET /quote
   */
  listQuotes(fields?: string, offset?: number, limit?: number): Observable<Quote[]> {
    let params = new HttpParams();
    if (fields) params = params.set('fields', fields);
    if (offset !== undefined) params = params.set('offset', offset.toString());
    if (limit !== undefined) params = params.set('limit', limit.toString());
    
    return this.http.get<Quote[]>(`${this.apiUrl}/quote`, { params, ...this.httpOptions });
  }

  /**
   * Retrieves a Quote by ID
   * GET /quoteById/{id}
   */
  retrieveQuote(id: string, fields?: string): Observable<Quote> {
    let params = new HttpParams();
    if (fields) params = params.set('fields', fields);
    
    // URL encode the ID to handle special characters like colons
    const encodedId = encodeURIComponent(id);
    console.log('Retrieving quote with URL:', `${this.apiUrl}/quoteById/${encodedId}`);
    return this.http.get<Quote>(`${this.apiUrl}/quoteById/${encodedId}`, { params, ...this.httpOptions });
  }

  /**
   * Updates partially a Quote
   * PATCH /updateQuoteStatus/{id}
   */
  patchQuote(id: string, quote: Quote_Update): Observable<Quote> {
    const encodedId = encodeURIComponent(id);
    console.log('Updating quote with URL:', `${this.apiUrl}/updateQuoteStatus/${encodedId}`);
    return this.http.patch<Quote>(`${this.apiUrl}/updateQuoteStatus/${encodedId}`, quote, this.httpOptions);
  }

  /**
   * Deletes a Quote
   * DELETE /quote/{id}
   */
  deleteQuote(id: string): Observable<void> {
    const encodedId = encodeURIComponent(id);
    console.log('Deleting quote with URL:', `${this.apiUrl}/quote/${encodedId}`);
    return this.http.delete<void>(`${this.apiUrl}/quote/${encodedId}`, this.httpOptions);
  }

  // Convenience methods for common operations

  /**
   * Get all quotes (alias for listQuotes)
   */
  getAllQuotes(): Observable<Quote[]> {
    return this.listQuotes();
  }

  /**
   * Get quote by ID (alias for retrieveQuote)
   */
  getQuoteById(id: string): Observable<Quote> {
    return this.retrieveQuote(id);
  }

  /**
   * Update quote state
   */
  updateQuoteState(id: string, state: QuoteStateType): Observable<Quote> {
    return this.patchQuote(id, { state });
  }

  /**
   * Update quote description
   */
  updateQuoteDescription(id: string, description: string): Observable<Quote> {
    return this.patchQuote(id, { description });
  }

  /**
   * Add note to quote (for chat functionality)
   */
  addNoteToQuote(id: string, noteText: string, author?: string): Observable<Quote> {
    // Use the specific endpoint for adding notes
    let params = new HttpParams();
    params = params.set('userId', author || '');
    params = params.set('messageContent', noteText);
    
    const encodedId = encodeURIComponent(id);
    console.log('Adding note to quote with URL:', `${this.apiUrl}/addNoteToQuote/${encodedId}`);
    return this.http.patch<Quote>(`${this.apiUrl}/addNoteToQuote/${encodedId}`, null, { params, ...this.httpOptions });
  }

  /**
   * Update quote completion dates
   */
  updateQuoteCompletionDates(
    id: string, 
    expectedDate?: string, 
    requestedDate?: string
  ): Observable<Quote> {
    const updates: Partial<Quote_Update> = {};
    if (expectedDate) updates.expectedQuoteCompletionDate = expectedDate;
    if (requestedDate) updates.requestedQuoteCompletionDate = requestedDate;
    
    return this.patchQuote(id, updates);
  }

  /**
   * Get quotes by user with role filtering
   * GET /quoteByUser/{userId}?role={role}
   */
  getQuotesByUserAndRole(userId: string, role: 'customer' | 'seller'): Observable<Quote[]> {
    let params = new HttpParams();
    // API expects 'Customer' or 'Seller' (capitalized)
    const apiRole = role === 'customer' ? environment.BUYER_ROLE : environment.SELLER_ROLE;
    params = params.set('role', apiRole);

    const encodedUserId = encodeURIComponent(userId);
    console.log('Getting quotes by user with URL:', `${this.apiUrl}/quoteByUser/${encodedUserId}`);
    return this.http.get<Quote[]>(`${this.apiUrl}/quoteByUser/${encodedUserId}`, { params, ...this.httpOptions });
  }

  /**
   * Search quotes by criteria
   */
  searchQuotes(criteria: {
    state?: QuoteStateType;
    category?: string;
    externalId?: string;
    description?: string;
  }): Observable<Quote[]> {
    // This would typically be implemented with query parameters
    // For now, get all quotes and filter client-side
    return new Observable(observer => {
      this.listQuotes().subscribe({
        next: (quotes) => {
          let filtered = quotes;
          
          if (criteria.state) {
            filtered = filtered.filter(q => q.state === criteria.state);
          }
          if (criteria.category) {
            filtered = filtered.filter(q => q.category === criteria.category);
          }
          if (criteria.externalId) {
            filtered = filtered.filter(q => q.externalId === criteria.externalId);
          }
          if (criteria.description) {
            filtered = filtered.filter(q => 
              q.description?.toLowerCase().includes(criteria.description!.toLowerCase())
            );
          }
          
          observer.next(filtered);
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // Legacy methods for backward compatibility (if needed)
  
  /**
   * Update quote status using the specific updateQuoteStatus endpoint
   * PATCH /updateQuoteStatus/{id}?statusValue={status}
   */
  updateQuoteStatus(id: string, status: string): Observable<Quote> {
    let params = new HttpParams();
    params = params.set('statusValue', status);
    
    const encodedId = encodeURIComponent(id);
    console.log('Updating quote status with URL:', `${this.apiUrl}/updateQuoteStatus/${encodedId}`);
    console.log('Status value:', status);
    
    return this.http.patch<Quote>(`${this.apiUrl}/updateQuoteStatus/${encodedId}`, null, { params, ...this.httpOptions });
  }

  /**
   * Update quote completion date using the specific updateQuoteDate endpoint
   * PATCH /updateQuoteDate/{id}?date={date}&dateType={dateType}
   * 
   * Date types:
   * - 'requested' → requestedQuoteCompletionDate
   * - 'expected' → expectedQuoteCompletionDate
   * - 'effective' → effectiveQuoteCompletionDate
   * - 'expectedFulfillment' → expectedFulfillmentStartDate
   */
  updateQuoteDate(id: string, date: string, dateType: 'requested' | 'expected' | 'effective' | 'expectedFulfillment'): Observable<Quote> {
    let params = new HttpParams();
    params = params.set('date', date);
    params = params.set('dateType', dateType);
    
    const encodedId = encodeURIComponent(id);
    console.log('Updating quote date with URL:', `${this.apiUrl}/updateQuoteDate/${encodedId}`);
    console.log('Date:', date, 'DateType:', dateType);
    
    return this.http.patch<Quote>(`${this.apiUrl}/updateQuoteDate/${encodedId}`, null, { params, ...this.httpOptions });
  }

  /**
   * @deprecated Use addNoteToQuote instead
   */
  addNoteToQuoteOld(id: string, note: string): Observable<any> {
    return this.addNoteToQuote(id, note);
  }

  /**
   * Add attachment to quote (file upload)
   * PATCH /addAttachmentToQuote/{id}
   * 
   * @param id - Quote ID
   * @param file - PDF file (max 100MB)
   * @param description - Optional description of the attachment
   */
  addAttachmentToQuote(id: string, file: File, description?: string): Observable<Quote> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    const encodedId = encodeURIComponent(id);
    
    return this.http.patch<Quote>(`${this.apiUrl}/addAttachmentToQuote/${encodedId}`, formData);
  }

  /**
   * Download attachment from quote
   */
  downloadAttachment(quote: Quote): void {
    // Find the first attachment in any quote item
    let attachment = null;
    if (Array.isArray(quote.quoteItem)) {
      for (const item of quote.quoteItem) {
        if (item.attachment && item.attachment.length > 0) {
          attachment = item.attachment[0]; // Get first attachment
          break;
        }
      }
    }

    if (!attachment) {
      throw new Error('No attachment found for this quote.');
    }

    if (!attachment.content) {
      throw new Error('Attachment content not found or not embedded.');
    }

    try {
      // Decode BASE64 content
      const binaryString = atob(attachment.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob with PDF mime type
      const blob = new Blob([bytes], { type: 'application/pdf' });

      // Create download URL
      const url = URL.createObjectURL(blob);

      // Create temporary download link
      const link = document.createElement('a');
      link.href = url;

      // Generate filename
      const shortQuoteId = quote.id?.length && quote.id.length > 8 ? quote.id.slice(-8) : quote.id || 'unknown';
      const filename = attachment.name || `quote-${shortQuoteId}-attachment.pdf`;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL
      URL.revokeObjectURL(url);

      console.log(`Downloaded attachment: ${filename}`);
    } catch (decodeError) {
      console.error('Error decoding BASE64 content:', decodeError);
      throw new Error('Error decoding PDF content. The file may be corrupted.');
    }
  }

  /**
   * Get quotes by user (using related party)
   */
  getQuotesByUser(userId: string): Observable<Quote[]> {
    return new Observable(observer => {
      this.listQuotes().subscribe({
        next: (quotes) => {
          const userQuotes = quotes.filter(quote => 
            quote.relatedParty?.some(party => party.id === userId)
          );
          observer.next(userQuotes);
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // Helper methods for quote status checking
  
  isQuoteCancelled(quote: Quote): boolean {
    return quote.quoteItem?.some(item => item.state === QUOTE_STATUSES.CANCELLED) || false;
  }

  isQuoteAccepted(quote: Quote): boolean {
    return quote.quoteItem?.some(item => item.state === QUOTE_STATUSES.ACCEPTED) || false;
  }

  isQuoteFinalized(quote: Quote): boolean {
    return this.isQuoteCancelled(quote) || this.isQuoteAccepted(quote);
  }

  /**
   * Update quote (for form component)
   */
  updateQuote(id: string, quote: Partial<Quote>): Observable<Quote> {
    return this.patchQuote(id, quote as Quote_Update);
  }

  // ========================================
  // TENDERING-SPECIFIC METHODS
  // ========================================

  /**
   * Create a coordinator quote (for managing tendering processes)
   * POST /quoteManagement/tendering/createCoordinatorQuote
   */
  createCoordinatorQuote(customerIdRef: string, customerMessage: string): Observable<Tender> {
    const payload = {
      customerMessage,
      customerIdRef
    };
    
    const fullUrl = `${this.apiUrl}/tendering/createCoordinatorQuote`;
    console.log('🔍 [DEBUG] QuoteService.createCoordinatorQuote:');
    console.log('🔍 [DEBUG]   this.apiUrl:', this.apiUrl);
    console.log('🔍 [DEBUG]   Full URL being called:', fullUrl);
    console.log('🔍 [DEBUG]   environment.quoteApi:', environment.quoteApi);
    
    return this.http.post<Quote>(fullUrl, payload, this.httpOptions).pipe(
      map(quote => this.mapQuoteToTender(quote))
    );
  }

  /**
   * Create a tendering quote (child tender for specific provider)
   * POST /quoteManagement/tendering/createQuote
   */
  createTenderingQuote(
    customerIdRef: string, 
    providerIdRef: string, 
    externalId: string,
    customerMessage?: string
  ): Observable<Tender> {
    const payload = {
      customerMessage: customerMessage || '',
      customerIdRef,
      providerIdRef,
      externalId
    };
    
    return this.http.post<Quote>(`${this.apiUrl}/tendering/createQuote`, payload, this.httpOptions).pipe(
      map(quote => this.mapQuoteToTender(quote))
    );
  }

  /**
   * Create multiple tendering quotes for multiple providers
   */
  createMultipleTenderingQuotes(
    customerIdRef: string,
    providerIds: string[],
    externalId: string,
    customerMessage?: string
  ): Observable<Tender[]> {
    const requests = providerIds.map(providerId => 
      this.createTenderingQuote(customerIdRef, providerId, externalId, customerMessage)
    );
    
    return forkJoin(requests);
  }

  /**
   * Get coordinator tenders for a user
   * GET /quoteManagement/tendering/coordinatorQuotes/{userId}
   */
  getCoordinatorQuotesByUser(userId: string): Observable<Tender[]> {
    const encodedUserId = encodeURIComponent(userId);
    console.log('Getting coordinator quotes for user:', encodedUserId);
    return this.http.get<Quote[]>(`${this.apiUrl}/tendering/coordinatorQuotes/${encodedUserId}`, this.httpOptions).pipe(
      map(quotes => quotes.map(quote => this.mapQuoteToTender(quote)))
    );
  }

  /**
   * Get tendering quotes for a user by role
   * GET /quoteManagement/tendering/quotes/{userId}?role={role}&externalId={externalId}
   */
  getTenderingQuotesByUser(
    userId: string, 
    role: ApiRole = API_ROLES.SELLER,
    externalId?: string
  ): Observable<Tender[]> {
    const encodedUserId = encodeURIComponent(userId);
    let params = new HttpParams().set('role', role);
    
    if (externalId) {
      params = params.set('externalId', externalId);
    }
    
    console.log('Getting tendering quotes for user:', encodedUserId, 'role:', role, 'externalId:', externalId);
    return this.http.get<Quote[]>(`${this.apiUrl}/tendering/quotes/${encodedUserId}`, { params, ...this.httpOptions }).pipe(
      map(quotes => quotes.map(quote => this.mapQuoteToTender(quote)))
    );
  }

  /**
   * Get tendering quotes by external ID
   * GET /quoteManagement/tendering/quotes/{userId}?role={role}&externalId={externalId}
   */
  getTenderingQuotesByExternalId(userId: string, externalId: string, role: ApiRole): Observable<Quote[]> {
    const encodedUserId = encodeURIComponent(userId);
    let params = new HttpParams()
      .set('role', role)
      .set('externalId', externalId);
    
    console.log('Getting tendering quotes by external ID:', externalId);
    return this.http.get<Quote[]>(`${this.apiUrl}/tendering/quotes/${encodedUserId}`, { params, ...this.httpOptions });
  }

  /**
   * Broadcast message to all tendering quotes with the same external ID
   * POST /quoteManagement/tendering/broadcastMessage
   */
  broadcastMessage(externalId: string, userId: string, messageContent: string): Observable<any> {
    const payload = {
      externalId,
      userId,
      messageContent
    };
    
    console.log('Broadcasting message to external ID:', externalId);
    return this.http.post<any>(`${this.apiUrl}/tendering/broadcastMessage`, payload, this.httpOptions);
  }

  /**
   * Update tender status (alias for updateQuoteStatus but returns Tender)
   */
  updateTenderStatus(id: string, status: string): Observable<Tender> {
    return this.updateQuoteStatus(id, status).pipe(
      map(quote => this.mapQuoteToTender(quote))
    );
  }

  // ========================================
  // MAPPING METHODS
  // ========================================

  /**
   * Map backend Quote to frontend Tender model
   */
  private mapQuoteToTender(quote: Quote): Tender {
    // Extract response deadline from quote
    const responseDeadline = quote.expectedFulfillmentStartDate || 
                            quote.effectiveQuoteCompletionDate || 
                            new Date().toISOString();

    // Extract tender title from quote.description (this is where the title is saved)
    const tenderNote = quote.description || undefined;

    // Extract attachment from quote items
    let attachment = undefined;
    if (quote.quoteItem && quote.quoteItem.length > 0) {
      const firstItem = quote.quoteItem[0];
      if (firstItem.attachment && firstItem.attachment.length > 0) {
        const att = firstItem.attachment[0];
        attachment = {
          name: att.name || 'attachment.pdf',
          mimeType: att.mimeType || 'application/pdf',
          content: att.content || '',
          size: att.size?.amount
        };
      }
    }

    // Extract selected providers from related parties
    const selectedProviders = quote.relatedParty
      ?.filter(party => party.role?.toLowerCase() === API_ROLES.SELLER.toLowerCase())
      .map(party => party.id) || [];

    // Map quote category to tender category
    let category: 'coordinator' | 'tendering' = 'coordinator';
    if (quote.category === QUOTE_CATEGORIES.TENDER) {
      category = 'tendering';
    } else if (quote.category === QUOTE_CATEGORIES.COORDINATOR) {
      category = 'coordinator';
    }

    // Extract state from quoteItem (this is where the actual state is stored)
    let quoteItemState: string = 'pending';
    if (quote.quoteItem && quote.quoteItem.length > 0) {
      const firstItem = quote.quoteItem[0];
      quoteItemState = (firstItem as any).state || quote.state || 'pending';
    } else if (quote.state) {
      quoteItemState = quote.state;
    }

    // Map quote state to tender state
    // Backend states → Tender states → GUI display:
    // - pending → draft → 'draft'
    // - inProgress → pre-launched → 'pre-launched'
    // - approved → sent → 'launched'
    // - accepted/cancelled/rejected → closed → 'closed'
    let state: 'draft' | 'pre-launched' | 'pending' | 'sent' | 'closed' = 'draft';
    if (quoteItemState === QUOTE_STATUSES.PENDING) state = 'draft';
    else if (quoteItemState === QUOTE_STATUSES.IN_PROGRESS) state = 'pre-launched';
    else if (quoteItemState === QUOTE_STATUSES.APPROVED) state = 'sent';
    else if (quoteItemState === QUOTE_STATUSES.ACCEPTED) state = 'closed';
    else if (quoteItemState === QUOTE_STATUSES.CANCELLED) state = 'closed';
    else if (quoteItemState === QUOTE_STATUSES.REJECTED) state = 'closed';

    // Extract external_id, provider and buyerPartyId from quote
    const external_id = quote.externalId;
    const provider = quote.relatedParty
      ?.find(party => party.role?.toLowerCase() === API_ROLES.SELLER.toLowerCase())
      ?.name;
    const buyerPartyId = quote.relatedParty
      ?.find(party => party.role?.toLowerCase() === API_ROLES.BUYER.toLowerCase())
      ?.id;

    return {
      id: quote.id,
      category,
      state,
      responseDeadline,
      tenderNote,
      attachment,
      selectedProviders,
      external_id,
      provider,
      buyerPartyId,
      createdAt: quote.quoteDate,
      updatedAt: quote.quoteDate,
      effectiveQuoteCompletionDate: quote.effectiveQuoteCompletionDate,
      expectedFulfillmentStartDate: quote.expectedFulfillmentStartDate,
      expectedQuoteCompletionDate: quote.expectedQuoteCompletionDate,
      requestedQuoteCompletionDate: quote.requestedQuoteCompletionDate
    };
  }
} 