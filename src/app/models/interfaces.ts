import {components} from "./product-catalog";
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"];
type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
type ProductSpecificationCharacteristic = components["schemas"]["ProductSpecificationCharacteristic"];

export interface Category {
  id?: string,
  href?: string,
  description?: string,
  isRoot?: boolean,
  parentId?: string,
  lastUpdate?: string,
  lifecycleStatus?: string,
  name: string,
  version?: string,
  validFor?: object,
  children?: Category[],
  count?: number, // Count from AI search facets
  sanitizedId?: string // Sanitized ID for CSS selectors (used with static filters)
}

export interface LoginInfo {
  id: string,
  user: string,
  email: string,
  token: string,
  expire: number,
  partyId: string,
  username: string,
  roles: any[],
  organizations: any[],
  logged_as: string
}

export interface FeedbackInfo {
  approval?: boolean,
  expire?: number,
}


export interface productSpecCharacteristicValueCart {
    characteristic: ProductSpecificationCharacteristic,
    value?: CharacteristicValueSpecification
  }

export interface cartProduct {
  id?: string,
  name?: string,
  image?: string,
  href?: string,
  options: {
    characteristics?: productSpecCharacteristicValueCart[],
    pricing?: ProductOfferingPrice
  }
  termsAccepted: boolean
}

export interface billingAccountCart {
  id: string,
  name: string,
  href: string,
  email: string,
  postalAddress: {
    city: string,
    country: string,
    postCode: string,
    stateOrProvince: string,
    street: string
  },
  telephoneNumber: string,
  telephoneType: string,
  selected:boolean
}

export interface ProductOfferingPrice_DTO {
    id?: string;
    href?: string;
    description?: string;
    isBundle?: boolean;
    lastUpdate?: string;
    lifecycleStatus?: string;
    name?: string;
    percentage?: number;
    priceType?: string;
    recurringChargePeriodLength?: number;
    recurringChargePeriodType?: string;
    version?: string;
    bundledPopRelationship?: {
        id?: string;
        href?: string;
        name?: string;
        description?: string;
        priceType?: string;
        lifecycleStatus: string;
        recurringChargePeriodLength?: number;
        recurringChargePeriodType?: string;
        price?: {
          unit?: string;
          value?: number;
        };
        unitOfMeasure?: {
          amount?: number;
          units?: string;
        };
        popRelationship?: {
          id?: string;
          href?: string;
          name?: string;
          relationshipType?: string;
          role?: string;
          percentage?: number;
          priceType?: string;
          price?: {
            unit?: string;
            value?: number;
          };
          validFor?: {
            endDateTime?: string;
            startDateTime?: string;}
        }[]
        prodSpecCharValueUse?: [
          {
            id?: string;
            description?: string;
            maxCardinality?: number;
            minCardinality?: number;
            name?: string;
            valueType?: string;
            productSpecCharacteristicValue: {
              isDefault?: boolean;
              rangeInterval?: string;
              regex?: string;
              unitOfMeasure?: string;
              valueFrom?: number;
              valueTo?: number;
              valueType?: string;
              validFor?: {endDateTime:string; startDateTime:string};
              value?: any
            }[]
            productSpecification?: {
              id: string;
              href?: string;
              name?: string;
              version?: string;
            }
            validFor?: {
              endDateTime?: string;
              startDateTime?: string;
            }
          }
        ]
    }[]
    constraint?: {
      id: string;
      href?: string;
      name?: string;
      version?: string;}[]
    place?: {
      id: string;
      href?: string;
      name?: string;}[]
    popRelationship?: {
      id?: string;
      href?: string;
      name?: string;
      relationshipType?: string;
      role?: string;
    }[]
    price?: {
      unit?: string;
      value?: number;
    }
    pricingLogicAlgorithm?: {
      id?: string;
      href?: string;
      description?: string;
      name?: string;
      plaSpecId?: string;
      validFor?: {
        endDateTime?: string;
        startDateTime?: string;}
    }[]
    prodSpecCharValueUse?: [
      {
        id?: string;
        description?: string;
        maxCardinality?: number;
        minCardinality?: number;
        name?: string;
        valueType?: string;
        productSpecCharacteristicValue: {
          isDefault?: boolean;
          rangeInterval?: string;
          regex?: string;
          unitOfMeasure?: string;
          valueFrom?: number;
          valueTo?: number;
          valueType?: string;
          validFor?: {endDateTime:string; startDateTime:string};
          value?: any
        }[]
        productSpecification?: {
          id: string;
          href?: string;
          name?: string;
          version?: string;
        }
        validFor?: {
          endDateTime?: string;
          startDateTime?: string;
        }
      }
    ]
    productOfferingTerm?: {
      description?: string;
      name?: string;
      duration?: {
        amount?: number;
        units?: string;
      }
      validFor?: {
        endDateTime?: string;
        startDateTime?: string;
      }
    }[]
    tax?: {
      id?: string;
      href?: string;
      taxCategory?: string;
      taxRate?: number;
      taxAmount?: {
      unit?: string;
      value?: number;
      }
    }[]
    unitOfMeasure?: {
      amount?: number;
      units?: string;
    }
    validFor?: {
      endDateTime?: string;
      startDateTime?: string;
    }
}

export type SubformType = 
  | 'generalInfo'
  | 'productSpec'
  | 'category'
  | 'license'
  | 'pricePlans'
  | 'procurementMode'
  | 'replicationMode';

export interface FormChangeState {
  subformType: string;
  isDirty: boolean;
  dirtyFields: string[];
  originalValue: any;
  currentValue: any;
}

export interface PricePlanChangeState extends FormChangeState {
  priceComponentsChanged: boolean;
  profileChanged: boolean;
  modifiedPricePlans: {
    newValue?: any;
    oldValue?: any;
    id: string;
    isNew: boolean;
    modifiedFields: string[];
    priceComponents: {
      added: Array<{
        id: string;
        name: string;
        price: number;
        currency: string;
        recurringPeriod?: string;
        usageUnit?: string;
        discountValue?: number;
        discountUnit?: string;
        discountDuration?: number|null;
        discountDurationUnit?: string;
      }>;
      modified: Array<{
        id: string;
        name: string;
        price: number;
        currency: string;
        recurringPeriod?: string;
        usageUnit?: string;
        modifiedFields: string[];
        discountValue?: number;
        discountUnit?: string;
        discountDuration?: number|null;
        discountDurationUnit?: string;
      }>;
      deleted: string[]; // IDs de los componentes eliminados
    };
  }[];
}

export interface Report {
  label?: string;
  text?: string;
  link?: string;
  items?: Report[];
}

