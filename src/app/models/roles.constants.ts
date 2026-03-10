/**
 * Role constants used throughout the application
 * These match the API's expected role values
 */
export const API_ROLES = {
  BUYER: 'Buyer',
  SELLER: 'Seller'
} as const;

/**
 * UI role constants (lowercase, used in UI logic)
 */
export const UI_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller'
} as const;

/**
 * Type for API roles
 */
export type ApiRole = typeof API_ROLES[keyof typeof API_ROLES];

/**
 * Type for UI roles
 */
export type UiRole = typeof UI_ROLES[keyof typeof UI_ROLES];

/**
 * Helper function to convert UI role to API role
 */
export function toApiRole(uiRole: UiRole): ApiRole {
  return uiRole === UI_ROLES.BUYER ? API_ROLES.BUYER : API_ROLES.SELLER;
}

/**
 * Helper function to convert API role to UI role
 */
export function toUiRole(apiRole: ApiRole): UiRole {
  return apiRole === API_ROLES.BUYER ? UI_ROLES.BUYER : UI_ROLES.SELLER;
}

