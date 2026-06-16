interface BaseFormField {
  name: string;
  label: string;
  required?: boolean;
  colSpan?: number;
  defaultValue?: any;
}

export interface StringFormField extends BaseFormField {
  type: 'string';
  maxLength?: number;
  placeholder?: string;
}

export interface NumberFormField extends BaseFormField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectableFormField extends BaseFormField {
  type: 'select';
  options: SelectOption[];
  multiple?: boolean;
}

export interface BooleanFormField extends BaseFormField {
  type: 'boolean';
}

export type FormField = StringFormField | NumberFormField | SelectableFormField | BooleanFormField;
