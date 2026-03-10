/**
 * Tender model - Frontend representation of tender/quote objects
 * Note: Backend uses "Quote" terminology, frontend uses "Tender" terminology
 */

export interface Tender {
  id?: string;
  category: 'coordinator' | 'tendering';
  state: 'draft' | 'pre-launched' | 'pending' | 'sent' | 'closed';
  responseDeadline: string;
  tenderNote?: string;
  attachment?: TenderAttachment;
  selectedProviders: string[];
  external_id?: string;   // ID of parent tender (for child tenders)
  provider?: string;       // Provider name (for child tenders)
  buyerPartyId?: string;   // Buyer org URN (for child tenders, used in provider view)
  createdAt?: string;
  updatedAt?: string;
  
  // Completion dates from Quote
  expectedQuoteCompletionDate?: string;
  requestedQuoteCompletionDate?: string;
  effectiveQuoteCompletionDate?: string;
  expectedFulfillmentStartDate?: string;
}

export interface TenderAttachment {
  name: string;
  mimeType: string;
  content: string; // Base64 encoded content
  size?: number;
}

export interface Tender_Create {
  category: 'coordinator' | 'tendering';
  state: 'draft' | 'pre-launched' | 'pending' | 'sent' | 'closed';
  responseDeadline: string;
  tenderNote?: string;
  attachment?: TenderAttachment;
  selectedProviders: string[];
  external_id?: string;
  provider?: string;
}

export interface Tender_Update {
  responseDeadline?: string;
  tenderNote?: string;
  attachment?: TenderAttachment;
  selectedProviders?: string[];
  state?: 'draft' | 'pre-launched' | 'pending' | 'sent' | 'closed';
  external_id?: string;
  provider?: string;
}

export type TenderStateType = 'draft' | 'pre-launched' | 'pending' | 'sent' | 'closed';

