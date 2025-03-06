import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const pricePlanValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
  const paymentOnline = form.get('paymentOnline')?.value;
  const priceComponents = form.get('priceComponents')?.value;

  if (paymentOnline && (!priceComponents || priceComponents.length === 0)) {
    return { priceComponentsRequired: true }; // Custom error
  }

  return null; // Validation passes
};
