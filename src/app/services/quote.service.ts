import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, throwError } from 'rxjs';
import { AttachmentRefOrValue, Quote, Quote_Create, Quote_Update, QuoteStateType } from 'src/app/models/quote.model';
import { environment } from 'src/environments/environment';

interface DocumentSpecificationResponse {
  name?: string;
  attachment?: AttachmentRefOrValue[];
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private apiUrl = environment.quoteApi;

  constructor(private http: HttpClient) {}

  private get documentApiUrl(): string {
    const documentApi = environment.documentApi;
    const baseUrl = documentApi.startsWith('http://') || documentApi.startsWith('https://')
      ? documentApi
      : `${environment.BASE_URL}${documentApi}`;

    return baseUrl.replace(/\/$/, '');
  }

  // TMF 648 Quote Management API methods
  
  /**
   * Creates a new quote
   * POST /quote
   */
  createQuote(quote: Quote_Create): Observable<Quote> {
    return this.http.post<Quote>(`${this.apiUrl}/quote`, quote);
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
    return this.http.post<any>(`${this.apiUrl}${environment.quoteEndpoints.createQuote}`, requestData);
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
    
    return this.http.get<Quote[]>(`${this.apiUrl}/quote`, { params });
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
    return this.http.get<Quote>(`${this.apiUrl}/quoteById/${encodedId}`, { params });
  }

  /**
   * Updates partially a Quote
   * PATCH /updateQuoteStatus/{id}
   */
  patchQuote(id: string, quote: Quote_Update): Observable<Quote> {
    const encodedId = encodeURIComponent(id);
    console.log('Updating quote with URL:', `${this.apiUrl}/updateQuoteStatus/${encodedId}`);
    return this.http.patch<Quote>(`${this.apiUrl}/updateQuoteStatus/${encodedId}`, quote);
  }

  /**
   * Deletes a Quote
   * DELETE /quote/{id}
   */
  deleteQuote(id: string): Observable<void> {
    const encodedId = encodeURIComponent(id);
    console.log('Deleting quote with URL:', `${this.apiUrl}/quote/${encodedId}`);
    return this.http.delete<void>(`${this.apiUrl}/quote/${encodedId}`);
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
    return this.http.patch<Quote>(`${this.apiUrl}/addNoteToQuote/${encodedId}`, null, { params });
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
    const apiRole = role === 'customer' ? 'Customer' : 'Seller';
    params = params.set('role', apiRole);
    
    const encodedUserId = encodeURIComponent(userId);
    console.log('Getting quotes by user with URL:', `${this.apiUrl}/quoteByUser/${encodedUserId}`);
    return this.http.get<Quote[]>(`${this.apiUrl}/quoteByUser/${encodedUserId}`, { params });
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
    
    return this.http.patch<Quote>(`${this.apiUrl}/updateQuoteStatus/${encodedId}`, null, { params });
  }

  /**
   * Update quote completion date using the specific updateQuoteDate endpoint
   * PATCH /updateQuoteDate/{id}?date={date}&dateType={dateType}
   */
  updateQuoteDate(id: string, date: string, dateType: 'requested' | 'expected'): Observable<Quote> {
    let params = new HttpParams();
    params = params.set('date', date);
    params = params.set('dateType', dateType);
    
    const encodedId = encodeURIComponent(id);
    console.log('Updating quote date with URL:', `${this.apiUrl}/updateQuoteDate/${encodedId}`);
    console.log('Date:', date, 'DateType:', dateType);
    
    return this.http.patch<Quote>(`${this.apiUrl}/updateQuoteDate/${encodedId}`, null, { params });
  }

  /**
   * @deprecated Use addNoteToQuote instead
   */
  addNoteToQuoteOld(id: string, note: string): Observable<any> {
    return this.addNoteToQuote(id, note);
  }

  /**
   * Add attachment to quote (file upload)
   */
  addAttachmentToQuote(id: string, file: File, description?: string): Observable<Quote> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    const encodedId = encodeURIComponent(id);
    console.log('Adding attachment to quote with URL:', `${this.apiUrl}/addAttachmentToQuote/${encodedId}`);
    return this.http.patch<Quote>(`${this.apiUrl}/addAttachmentToQuote/${encodedId}`, formData);
  }

  /**
   * Download attachment from quote
   */
  downloadAttachment(quote: Quote): Observable<void> {
    const attachment = this.getFirstQuoteAttachment(quote);

    if (!attachment) {
      return throwError(() => new Error('No attachment found for this quote.'));
    }

    const filename = this.getQuoteAttachmentFilename(quote, attachment);
    const downloadUrl = this.getAttachmentDownloadUrl(attachment);
    if (downloadUrl) {
      this.startAttachmentDownload(downloadUrl, filename);
      console.log(`Started attachment download: ${filename}`);
      return of(void 0);
    }

    const documentSpecificationId = this.getDocumentSpecificationId(attachment);
    if (!documentSpecificationId) {
      return throwError(() => new Error('Attachment link not available for this attachment.'));
    }

    return this.http.get<DocumentSpecificationResponse>(
      this.getDocumentSpecificationUrl(documentSpecificationId)
    ).pipe(
      map(documentSpecification => {
        const documentAttachment = documentSpecification.attachment?.[0];
        if (!documentAttachment?.content) {
          throw new Error('Document attachment content not found.');
        }

        const documentFilename = documentAttachment.name || documentSpecification.name || filename;
        const mimeType = documentAttachment.mimeType || attachment.mimeType || 'application/octet-stream';
        this.downloadBase64Attachment(documentAttachment.content, mimeType, documentFilename);
        console.log(`Downloaded document attachment: ${documentFilename}`);
      })
    );
  }

  getAttachmentDownloadUrl(attachment: AttachmentRefOrValue): string | null {
    const candidates = [attachment.url, attachment.href, attachment.path, attachment.content];
    return candidates.find((candidate): candidate is string => this.isDownloadableAttachmentLink(candidate)) || null;
  }

  getDocumentSpecificationUrl(documentSpecificationId: string): string {
    return `${this.documentApiUrl}/documentSpecification/${encodeURIComponent(documentSpecificationId.trim())}`;
  }

  private getFirstQuoteAttachment(quote: Quote): AttachmentRefOrValue | null {
    if (!Array.isArray(quote.quoteItem)) {
      return null;
    }

    for (const item of quote.quoteItem) {
      if (item.attachment && item.attachment.length > 0) {
        return item.attachment[0];
      }
    }

    return null;
  }

  private getQuoteAttachmentFilename(quote: Quote, attachment: AttachmentRefOrValue): string {
    const shortQuoteId = quote.id?.length && quote.id.length > 8 ? quote.id.slice(-8) : quote.id || 'unknown';
    return attachment.name || `quote-${shortQuoteId}-attachment.pdf`;
  }

  private startAttachmentDownload(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private downloadBase64Attachment(encodedContent: string, mimeType: string, filename: string): void {
    const base64Content = encodedContent.includes(',')
      ? encodedContent.substring(encodedContent.indexOf(',') + 1)
      : encodedContent;
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.startAttachmentDownload(url, filename);
    URL.revokeObjectURL(url);
  }

  private getDocumentSpecificationId(attachment: AttachmentRefOrValue): string | null {
    const candidates = [attachment.content, attachment.id, attachment.href];
    return candidates.find((candidate): candidate is string => this.isDocumentSpecificationReference(candidate)) || null;
  }

  private isDownloadableAttachmentLink(value?: string): value is string {
    const trimmedValue = value?.trim();
    return Boolean(
      trimmedValue &&
      (/^https?:\/\//i.test(trimmedValue) || trimmedValue.startsWith('/') || trimmedValue.startsWith('blob:'))
    );
  }

  private isDocumentSpecificationReference(value?: string): value is string {
    return /^urn:ngsi-ld:(document-specification|documentspecification):/i.test(value?.trim() || '');
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
    return quote.quoteItem?.some(item => item.state === 'cancelled') || false;
  }

  isQuoteAccepted(quote: Quote): boolean {
    return quote.quoteItem?.some(item => item.state === 'accepted') || false;
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
}
