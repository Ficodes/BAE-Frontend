/**
 * Quote status constants and messages used throughout the application
 */

export interface StatusInfo {
  explanation: string;
  availableActions: string;
}

export interface StatusMessages {
  provider: StatusInfo;
  buyer: StatusInfo;
}

/**
 * Quote status explanation messages for each state and role
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
 * Auto-generated chat messages for status changes
 */
export const QUOTE_CHAT_MESSAGES = {
  STATUS_CHANGE: (status: string) => `Status changed to: ${status}`,
  ATTACHMENT_UPLOADED: (filename: string) => `Attachment uploaded: ${filename}`
};

/**
 * Action button helper texts displayed next to buttons in quote details modal
 */
export const QUOTE_ACTION_BUTTON_TEXTS = {
  ACCEPT_QUOTE_PROVIDER: 'Accept the request of the customer.',
  ACCEPT_PROPOSAL_CUSTOMER: 'Accept the proposal that has been sent to you by the provider.',
  CANCEL_QUOTE_PROVIDER: 'Cancel the quote request.',
  REJECT_PROPOSAL_CUSTOMER: 'Reject the proposal.',
  CREATE_OFFER: 'Create a customized offering based on this accepted quote.',
  EXPECTED_DATE_REQUIRED: 'Set an expected date for the delivery of the proposal first'
};
