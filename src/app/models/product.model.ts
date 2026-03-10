// TMF 620 Product Catalog Management API Models

export interface ProductSpecification {
  id?: string;
  href?: string;
  brand?: string;
  description?: string;
  isBundle?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  productNumber?: string;
  version?: string;
  attachment?: AttachmentRefOrValue[];
  bundledProductSpecification?: BundledProductSpecification[];
  productSpecCharacteristic?: ProductSpecificationCharacteristic[];
  productSpecificationRelationship?: ProductSpecificationRelationship[];
  relatedParty?: RelatedParty[];
  resourceSpecification?: ResourceSpecificationRef[];
  serviceSpecification?: ServiceSpecificationRef[];
  targetProductSchema?: TargetProductSchema;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductSpecification_Create extends Omit<ProductSpecification, 'id' | 'href'> {
  name: string;
}

export interface BundledProductSpecification {
  id?: string;
  href?: string;
  lifecycleStatus?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductSpecificationCharacteristic {
  id?: string;
  configurable?: boolean;
  description?: string;
  extensible?: boolean;
  isUnique?: boolean;
  maxCardinality?: number;
  minCardinality?: number;
  name?: string;
  regex?: string;
  valueType?: string;
  productSpecCharacteristicValue?: ProductSpecificationCharacteristicValue[];
  productSpecCharRelationship?: ProductSpecificationCharacteristicRelationship[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@valueSchemaLocation'?: string;
}

export interface ProductSpecificationCharacteristicValue {
  isDefault?: boolean;
  rangeInterval?: string;
  regex?: string;
  unitOfMeasure?: string;
  valueFrom?: number;
  valueTo?: number;
  valueType?: string;
  validFor?: TimePeriod;
  value?: any;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductSpecificationCharacteristicRelationship {
  id?: string;
  charSpecSeq?: number;
  name?: string;
  relationshipType?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductSpecificationRelationship {
  id?: string;
  href?: string;
  name?: string;
  relationshipType?: string;
  role?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
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

export interface ResourceSpecificationRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ServiceSpecificationRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
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

export interface TimePeriod {
  endDateTime?: string;
  startDateTime?: string;
}

export interface Quantity {
  amount?: number;
  units?: string;
}

// Product Offering related interfaces
export interface ProductOffering {
  id?: string;
  href?: string;
  description?: string;
  isBundle?: boolean;
  isSellable?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  statusReason?: string;
  version?: string;
  agreement?: AgreementRef[];
  attachment?: AttachmentRefOrValue[];
  bundledProductOffering?: BundledProductOffering[];
  category?: CategoryRef[];
  channel?: ChannelRef[];
  marketSegment?: MarketSegmentRef[];
  place?: PlaceRef[];
  prodSpecCharValueUse?: ProductSpecificationCharacteristicValueUse[];
  productOfferingPrice?: ProductOfferingPriceRef[];
  productOfferingRelationship?: ProductOfferingRelationship[];
  productOfferingTerm?: ProductOfferingTerm[];
  productSpecification?: ProductSpecificationRef;
  resourceCandidate?: ResourceCandidateRef;
  serviceCandidate?: ServiceCandidateRef;
  serviceLevelAgreement?: SLARef;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface BundledProductOffering {
  id?: string;
  href?: string;
  lifecycleStatus?: string;
  name?: string;
  bundledProductOfferingOption?: BundledProductOfferingOption;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface BundledProductOfferingOption {
  numberRelOfferDefault?: number;
  numberRelOfferLowerLimit?: number;
  numberRelOfferUpperLimit?: number;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductSpecificationCharacteristicValueUse {
  id?: string;
  description?: string;
  maxCardinality?: number;
  minCardinality?: number;
  name?: string;
  valueType?: string;
  productSpecCharacteristicValue?: ProductSpecificationCharacteristicValue[];
  productSpecification?: ProductSpecificationRef;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductOfferingRelationship {
  id?: string;
  href?: string;
  name?: string;
  relationshipType?: string;
  role?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductOfferingTerm {
  description?: string;
  name?: string;
  duration?: Quantity;
  validFor?: TimePeriod;
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

export interface CategoryRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ChannelRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface MarketSegmentRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface PlaceRef {
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

export interface ResourceCandidateRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ServiceCandidateRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface SLARef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

// Legacy Product interface for backward compatibility (if needed)
export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  status?: ProductStatus;
  specifications?: ProductSpecification[];
  attachments?: AttachmentRefOrValue[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProductStatus = 'active' | 'inactive' | 'discontinued'; 