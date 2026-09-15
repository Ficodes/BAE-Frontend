import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormField, SelectableFormField } from 'src/app/models/formFields/form-field.model';

export function buildFormGroup(fields: FormField[]): FormGroup {
  const controls: Record<string, FormControl> = {};
  for (const field of fields) {
    const isMultiSelect = field.type === 'select' && (field as SelectableFormField).multiple === true;
    const defaultValue = field.defaultValue ?? (isMultiSelect ? [] : field.type === 'boolean' ? false : '');
    controls[field.name] = new FormControl(
      defaultValue,
      field.required ? Validators.required : []
    );
  }
  return new FormGroup(controls);
}
