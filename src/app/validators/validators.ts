import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const pricePlanValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
  const paymentOnline = form.get('paymentOnline')?.value;
  const priceComponents = form.get('priceComponents')?.value;

  if (paymentOnline && (!priceComponents || priceComponents.length === 0)) {
    return { priceComponentsRequired: true }; // Custom error
  }

  return null; // Validation passes
};

export function uniqueNameValidatorFactory(getExistingNames: () => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const nameControl = control.get('name');
    if (!nameControl) return null;

    const name = nameControl.value?.trim().toLowerCase();
    if (!name) return null;

    const existingNames = getExistingNames().map(n => n?.trim().toLowerCase());

    return existingNames.includes(name)
      ? { nonUniqueName: true }
      : null;
  };
}


export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const isWhitespace = (control.value || '').trim().length === 0;
  const isValid = !isWhitespace;
  return isValid ? null : { whitespace: true };
}
