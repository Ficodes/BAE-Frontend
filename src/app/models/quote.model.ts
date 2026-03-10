export interface Quote {
  id?: string;
  href?: string;
  category?: string;
  description?: string;
  effectiveQuoteCompletionDate?: string;
  expectedFulfillmentStartDate?: string;
  expectedQuoteCompletionDate?: string;
  externalId?: string;
  instantSyncQuote?: boolean;
  quoteDate?: string;
  requestedQuoteCompletionDate?: string;
  version?: string;
  agreement?: AgreementRef[];
  authorization?: Authorization[];
  billingAccount?: BillingAccountRef[];
  contactMedium?: ContactMedium[];
  note?: Note[];
  productOfferingQualification?: ProductOfferingQualificationRef[];
  quoteItem: QuoteItem[];
  quoteTotalPrice?: QuotePrice[];
  relatedParty?: RelatedParty[];
  state?: QuoteStateType;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface QuoteItem {
  id?: string;
  action?: string;
  quantity?: number;
  state?: string;
  appointment?: AppointmentRef[];
  attachment?: AttachmentRefOrValue[];
  note?: Note[];
  product?: ProductRefOrValue;
  productOffering?: ProductOfferingRef;
  productOfferingQualificationItem?: ProductOfferingQualificationItemRef;
  quoteItem?: QuoteItem[];
  quoteItemAuthorization?: Authorization[];
  quoteItemPrice?: QuotePrice[];
  quoteItemRelationship?: QuoteItemRelationship[];
  relatedParty?: RelatedParty[];
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface RelatedParty {
  id: string;
  href?: string;
  name?: string;
  role?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType': string;
}

export interface Note {
  id?: string;
  author?: string;
  date?: string;
  system?: string;
  text?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface AttachmentRefOrValue {
  id?: string;
  href?: string;
  attachmentType?: string;
  content?: string;
  description?: string;
  mimeType?: string;
  name?: string;
  path?: string;
  size?: Quantity;
  url?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface QuotePrice {
  description?: string;
  name?: string;
  priceType?: string;
  recurringChargePeriod?: string;
  unitOfMeasure?: string;
  price?: Price;
  priceAlteration?: PriceAlteration[];
  productOfferingPrice?: ProductOfferingPriceRef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface Price {
  percentage?: number;
  taxRate?: number;
  dutyFreeAmount?: Money;
  taxIncludedAmount?: Money;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface Money {
  unit?: string;
  value?: number;
}

export interface PriceAlteration {
  applicationDuration?: number;
  description?: string;
  name?: string;
  priceType?: string;
  priority?: number;
  recurringChargePeriod?: string;
  unitOfMeasure?: string;
  price?: Price;
  productOfferingPrice?: ProductOfferingPriceRef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface TimePeriod {
  endDateTime?: string;
  startDateTime?: string;
}

export interface Quantity {
  amount?: number;
  units?: string;
}

export interface QuoteItemRelationship {
  id?: string;
  relationshipType?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface Authorization {
  id?: string;
  approvalRequired?: boolean;
  approvedBy?: string;
  approvedDate?: string;
  authorizationDate?: string;
  authorizationState?: string;
  rejectionReason?: string;
  requestedBy?: string;
  requestedDate?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

// Reference types
export interface AgreementRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface BillingAccountRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ContactMedium {
  mediumType?: string;
  preferred?: boolean;
  characteristic?: MediumCharacteristic;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface MediumCharacteristic {
  city?: string;
  contactType?: string;
  country?: string;
  emailAddress?: string;
  faxNumber?: string;
  phoneNumber?: string;
  postCode?: string;
  socialNetworkId?: string;
  stateOrProvince?: string;
  street1?: string;
  street2?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductOfferingQualificationRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductOfferingQualificationItemRef {
  id: string;
  href?: string;
  name?: string;
  productOfferingQualificationHref?: string;
  productOfferingQualificationId?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface AppointmentRef {
  id: string;
  href?: string;
  description?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductRefOrValue {
  id?: string;
  href?: string;
  description?: string;
  isBundle?: boolean;
  isCustomerVisible?: boolean;
  name?: string;
  orderDate?: string;
  productSerialNumber?: string;
  startDate?: string;
  terminationDate?: string;
  agreement?: AgreementItemRef[];
  billingAccount?: BillingAccountRef;
  place?: RelatedPlaceRefOrValue[];
  product?: ProductRefOrValue[];
  productCharacteristic?: Characteristic[];
  productOffering?: ProductOfferingRef;
  productOrderItem?: RelatedProductOrderItem[];
  productPrice?: ProductPrice[];
  productRelationship?: ProductRelationship[];
  productSpecification?: ProductSpecificationRef;
  productTerm?: ProductTerm[];
  realizingResource?: ResourceRef[];
  realizingService?: ServiceRef[];
  relatedParty?: RelatedParty[];
  status?: ProductStatusType;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductOfferingRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductOfferingPriceRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductSpecificationRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  targetProductSchema?: TargetProductSchema;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface TargetProductSchema {
  '@baseType'?: string;
  '@schemaLocation': string;
  '@type': string;
}

// Additional supporting interfaces
export interface AgreementItemRef {
  id: string;
  href?: string;
  agreementItemId?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface RelatedPlaceRefOrValue {
  id?: string;
  href?: string;
  name?: string;
  role: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface Characteristic {
  id?: string;
  name: string;
  valueType?: string;
  value?: any;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface RelatedProductOrderItem {
  orderItemAction?: string;
  orderItemId: string;
  productOrderHref?: string;
  productOrderId: string;
  role?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductPrice {
  description?: string;
  name?: string;
  priceType?: string;
  recurringChargePeriod?: string;
  unitOfMeasure?: string;
  billingAccount?: BillingAccountRef;
  price?: Price;
  priceAlteration?: PriceAlteration[];
  productOfferingPrice?: ProductOfferingPriceRef;
  productPriceAlteration?: PriceAlteration[];
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductRelationship {
  relationshipType: string;
  product?: ProductRefOrValue;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductTerm {
  description?: string;
  name?: string;
  duration?: Quantity;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ResourceRef {
  id: string;
  href?: string;
  name?: string;
  value?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ServiceRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

// Enums
export type QuoteStateType = 'rejected' | 'pending' | 'inProgress' | 'cancelled' | 'approved' | 'accepted';

export type ProductStatusType = 'created' | 'pendingActive' | 'cancelled' | 'active' | 'pendingTerminate' | 'terminated' | 'suspended' | 'aborted';

// Create types for easier use
export interface Quote_Create extends Omit<Quote, 'id' | 'href' | 'quoteDate' | 'state' | 'effectiveQuoteCompletionDate' | 'quoteTotalPrice' | 'expectedQuoteCompletionDate' | 'validFor'> {
  quoteItem: QuoteItem[];
}

export interface Quote_Update extends Partial<Omit<Quote, 'id' | 'href' | 'quoteDate'>> {
} 