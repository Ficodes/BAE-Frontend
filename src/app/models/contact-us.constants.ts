export const CONTACT_US_SUPPORT_TYPES = ['general', 'technical', 'onboarding', 'legal'] as const;

export type ContactUsSupportType = typeof CONTACT_US_SUPPORT_TYPES[number];

export type ContactUsDestinations = Record<ContactUsSupportType, string>;
