export interface AssetTypeFormField {
  type: 'text' | 'textarea' | 'checkbox' | 'select';
  label?: string;
  mandatory?: boolean;
  default?: string | boolean;
  placeholder?: string;
  options?: { text: string; value: string }[];
}

export interface AssetType {
  id: string;
  href: string;
  name: string;
  author: string;
  version: string;
  categoryId: string | null;
  mediaTypes: string[];
  formats: ('URL' | 'FILE')[];
  overrides: ('NAME' | 'VERSION' | 'OPEN')[];
  formOrder?: string[];
  form?: Record<string, AssetTypeFormField>;
}
