/**
 * Quote status constants and messages used throughout the application
 *
 *
 */

/**
 * Quote category constants (frontend/Quote model)
 */
export const QUOTE_CATEGORIES = {
  TAILORED: 'tailored',
  TENDER: 'tender',
  COORDINATOR: 'coordinator'
} as const;

export type QuoteCategoryType = typeof QUOTE_CATEGORIES[keyof typeof QUOTE_CATEGORIES];

/**
 * Quote status constants (stored in quote.quoteItem[0].state)
 */
export const QUOTE_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'inProgress',
  APPROVED: 'approved',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
} as const;

export type QuoteStatus = typeof QUOTE_STATUSES[keyof typeof QUOTE_STATUSES];

/**
 * Tender status constants (frontend display states)
 */
export const TENDER_COORDINATOR_STATUSES_LABELS = {
  PENDING: 'not-yet-submitted',
  IN_PROGRESS: 'invites-sent-waiting-acceptance',
  APPROVED: 'tender-started',
  ACCEPTED: 'tender-closed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
} as const;

export type TenderCoordinatorStatusesLabel = typeof TENDER_COORDINATOR_STATUSES_LABELS[keyof typeof TENDER_COORDINATOR_STATUSES_LABELS];

/**
 * Tender status constants (frontend display states)
 */
export const TENDER_RELATED_QUOTES_LABELS_CUSTOMER = {
  PENDING: 'invite-sent',
  IN_PROGRESS: 'invite-accepted-by-provider',
  APPROVED: 'offer-submitted-by-provider',
  ACCEPTED: 'offering-accepted',
  CANCELLED: 'request-canceled',
  REJECTED: 'offering-rejected'
} as const;

export type TenderRelatedQuotesLabelsCustomer = typeof TENDER_RELATED_QUOTES_LABELS_CUSTOMER[keyof typeof TENDER_RELATED_QUOTES_LABELS_CUSTOMER];

/**
 * Tender status constants (frontend display states)
 */
export const TENDER_RELATED_QUOTES_LABELS_PROVIDER = {
  PENDING: 'invite-received-to-tender',
  IN_PROGRESS: 'invitation-accepted',
  APPROVED: 'offering-submitted',
  ACCEPTED: 'offering-accepted-by-customer',
  CANCELLED: 'request-canceled',
  REJECTED: 'offering-rejected'
} as const;

export type TenderRelatedQuotesLabelsProvider = typeof TENDER_RELATED_QUOTES_LABELS_PROVIDER[keyof typeof TENDER_RELATED_QUOTES_LABELS_PROVIDER];

/**
 * Tender status constants (frontend display states)
 */
export const TAILORED_STATUSES_LABELS_CUSTOMER = {
  PENDING: 'request-sent-awaiting-feedback',
  IN_PROGRESS: 'request-accepted-and-being-worked-on',
  APPROVED: 'offering-submitted-by-provider',
  ACCEPTED: 'offering-accepted',
  CANCELLED: 'request-canceled',
  REJECTED: 'rejected'
} as const;

export type TailoredStatusesLabelsCustomer = typeof TAILORED_STATUSES_LABELS_CUSTOMER[keyof typeof TAILORED_STATUSES_LABELS_CUSTOMER];

/**
 * Tender status constants (frontend display states)
 */
export const TAILORED_STATUSES_LABELS_PROVIDER = {
  PENDING: 'request-received-pending-feedback',
  IN_PROGRESS: 'request-accepted',
  APPROVED: 'offering-submitted',
  ACCEPTED: 'offering-accepted-by-customer',
  CANCELLED: 'request-canceled',
  REJECTED: 'rejected'
} as const;

export type TailoredStatusesLabelsProvider = typeof TAILORED_STATUSES_LABELS_PROVIDER[keyof typeof TAILORED_STATUSES_LABELS_PROVIDER];

export interface StatusInfo {
  explanation: string;
  availableActions: string;
}

export interface StatusMessages {
  provider: StatusInfo;
  buyer: StatusInfo;
}

/**
 * Quote status explanation messages for each state and role (for TAILORED quotes)
 * Quote status explanation messages for each state and role (for TAILORED quotes)
 */
export const QUOTE_STATUS_MESSAGES: Record<string, StatusMessages> = {
  pending: {
    provider: {
      explanation: 'At this stage you can decide whether to accept or reject the quote request.',
      availableActions: 'Send messages to customer (chat), accept or decline the quote.'
    },
    buyer: {
      explanation: 'The quote is created and sent to the provider. At this stage the provider must either accept or decline the request.',
      availableActions: 'Send messages to provider (chat), view quote request details or cancel the request.'
    }
  },
  inProgress: {
    provider: {
      explanation: "At this point you need to provide a proposal in the form of a PDF attachment.",
      availableActions: 'Send messages to customer (chat), upload attachment or decline the quote.'
    },
    buyer: {
      explanation: 'Your quote request is being processed. The provider is currently building the proposal based on your specifications. You will be notified once the quote is ready for review and a PDF is uploaded.',
      availableActions: 'Send messages to provider (chat), view quote details or cancel the request.'
    }
  },
  approved: {
    provider: {
      explanation: 'The quote details are now locked and cannot be modified. The quote has been sent to the customer. You should wait for the customer to review the proposal and use the chat to get in touch with them.',
      availableActions: 'Send messages to customer (chat) or cancel the quote.'
    },
    buyer: {
      explanation: 'The provider has approved and sent you a quote proposal. Please review the details and attached documents. You can accept, reject, or request updates through the chat.',
      availableActions: 'Send messages to provider (chat), accept the proposal or reject the proposal or cancel the quote.'
    }
  },
  accepted: {
    provider: {
      explanation: 'The customer has accepted your quote proposal. You should now create a customized version of the offering that will be visible only to the customer. The chat remains open for further communication.',
      availableActions: 'Send messages to customer (chat), create customized offering.'
    },
    buyer: {
      explanation: 'You have accepted the quote proposal. The provider will now create a customized offering based on this agreement. Once available, you can proceed with the normal order process to subscribe to the service.',
      availableActions: 'Send messages to provider (chat).'
    }
  },
  rejected: {
    provider: {
      explanation: 'The customer has rejected this quote proposal. The negotiation process has ended. You can reach out to the customer through the chat and consider submitting a new proposal.',
      availableActions: 'View quote details and chat history.'
    },
    buyer: {
      explanation: 'You have rejected this quote proposal. The negotiation process has been closed. If you wish, you can submit a new quote request with updated requirements.',
      availableActions: 'View quote details and chat history.'
    }
  },
  cancelled: {
    provider: {
      explanation: 'This quote has been cancelled.',
      availableActions: 'View quote details and chat history. No further actions available.'
    },
    buyer: {
      explanation: 'This quote has been cancelled.',
      availableActions: 'View quote details and chat history. No further actions available.'
    }
  }
};

/**
 * Tender status explanation messages for TENDERING quotes (related quotes)
 */
export const TENDERING_STATUS_MESSAGES: Record<string, StatusMessages> = {
  pending: {
    provider: {
      explanation: 'The tender request has been sent to you. At this stage you can decide whether to participate or not in this tender.',
      availableActions: 'Send messages to buyer (chat), accept or decline the tender request or withdraw from the tender.'
    },
    buyer: {
      explanation: 'The tender is created and sent to the provider. Waiting for the provider to accept or decline participation.',
      availableActions: 'Send messages to provider (chat), view tender request details or cancel the request.'
    }
  },
  inProgress: {
    provider: {
      explanation: "You are participating in this tender. Provide your offer as a PDF document to attach with all required details.",
      availableActions: 'Send messages to buyer (chat), upload tender response documents or withdraw from tender.'
    },
    buyer: {
      explanation: 'The provider is preparing their tender response. You will be notified once they submit their proposal.',
      availableActions: 'Send messages to provider (chat), view tender details or cancel the tender.'
    }
  },
  approved: {
    provider: {
      explanation: 'Your offer has been submitted and is under review by the buyer.',
      availableActions: 'Send messages to buyer (chat) or withdraw your tender response.'
    },
    buyer: {
      explanation: 'The provider has submitted their tender response. Please review the submission and all attached documents.',
      availableActions: 'Send messages to provider (chat), accept the tender response, reject it, or request clarifications.'
    }
  },
  accepted: {
    provider: {
      explanation: 'Congratulations! Your tender response has been accepted. You must now proceed with creating the customized offering.',
      availableActions: 'Send messages to buyer (chat).'
    },
    buyer: {
      explanation: 'You have accepted this offer. The provider must now proceed with creating the customized offering.',
      availableActions: 'Send messages to provider (chat).'
    }
  },
  rejected: {
    provider: {
      explanation: 'Your offer was not selected for this tender.',
      availableActions: 'View tender details and chat history.'
    },
    buyer: {
      explanation: 'You have rejected this offer.',
      availableActions: 'View tender details and chat history.'
    }
  },
  cancelled: {
    provider: {
      explanation: 'This offering has been cancelled.',
      availableActions: 'View tender details and chat history. No further actions available.'
    },
    buyer: {
      explanation: 'This offering has been cancelled.',
      availableActions: 'View tender details and chat history. No further actions available.'
    }
  }
};

/**
 * Tender status explanation messages for COORDINATOR quotes
 */
export const COORDINATOR_STATUS_MESSAGES: Record<string, StatusMessages> = {
  pending: {
    provider: {
      explanation: '...',
      availableActions: '...'
    },
    buyer: {
      explanation: 'Tender is still in draft',
      availableActions: 'Finish draft details'
    }
  },
  inProgress: {
    provider: {
      explanation: "...",
      availableActions: '...'
    },
    buyer: {
      explanation: 'The invited providers now have time to accept or decline the invite to the tender',
      availableActions: 'View provider responses, send messages, monitor progress, or start the tender'
    }
  },
  approved: {
    provider: {
      explanation: '...',
      availableActions: '...'
    },
    buyer: {
      explanation: 'The tendering is launched, the providers that have accepted the invitation must now provide an offer by attaching a PDF document. You must review and compare the offerings provided and will be able to accept the winning one once the End tender date has been reached and the tendering process is closed',
      availableActions: 'Review responses, compare proposals, or request additional information.'
    }
  },
  accepted: {
    provider: {
      explanation: '...',
      availableActions: '...'
    },
    buyer: {
      explanation: 'The tender is now closed. You can select the winning proposal and accept it',
      availableActions: 'View tender details, communicate with winning provider'
    }
  },
  rejected: {
    provider: {
      explanation: '...',
      availableActions: '...'
    },
    buyer: {
      explanation: '...',
      availableActions: '...'
    }
  },
  cancelled: {
    provider: {
      explanation: 'This tender has been cancelled.',
      availableActions: 'View tender details. No further actions available.'
    },
    buyer: {
      explanation: 'This tender has been cancelled.',
      availableActions: 'View tender details. No further actions available.'
    }
  }
};

/**
 * Auto-generated chat messages for status changes
 */
export const QUOTE_CHAT_MESSAGES = {
  STATUS_CHANGE: (status: string) => `Status changed to: ${status}`,
  ATTACHMENT_UPLOADED: (filename: string) => `Attachment uploaded: ${filename}`
};

/**
 * Tender creation step 2 instruction message
 */
export const TENDER_STEP2_DESCRIPTION = 'You must decide and select a date for the start and the end of the tender, also you must provide a PDF document with the description of your request. Fill all of this information before going to the next step.';

/**
 * Action button helper texts displayed next to buttons in quote details modal
 */
export const QUOTE_ACTION_BUTTON_TEXTS = {
  ACCEPT_QUOTE_PROVIDER: 'Accept the request of the customer. Set an expected delivery Date first to proceed.',
  ACCEPT_PROPOSAL_CUSTOMER: 'Accept the proposal that has been sent to you by the provider.',
  CANCEL_QUOTE_PROVIDER: 'Cancel the quote request.',
  REJECT_PROPOSAL_CUSTOMER: 'Reject the proposal.',
  CREATE_OFFER: 'Create a customized offering based on this accepted quote.',
  EXPECTED_DATE_REQUIRED: 'Set an expected date for the delivery of the proposal first',

  ACCEPT_TENDER_INVITE: 'Accept the invitation to the tender.',
  DECLINE_TENDER_INVITE: 'Decline the invitation to the tender.'
};
