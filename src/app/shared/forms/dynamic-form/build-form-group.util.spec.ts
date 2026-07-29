import { Validators } from '@angular/forms';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { buildFormGroup } from './build-form-group.util';

describe('buildFormGroup', () => {
  it('should return an empty FormGroup when given an empty array', () => {
    const fg = buildFormGroup([]);
    expect(Object.keys(fg.controls).length).toBe(0);
  });

  it('should create a string control with empty string default', () => {
    const fields: FormField[] = [{ name: 'title', label: 'Title', type: 'string' }];
    const fg = buildFormGroup(fields);
    expect(fg.contains('title')).toBeTrue();
    expect(fg.get('title')?.value).toBe('');
  });

  it('should create a number control with empty string default', () => {
    const fields: FormField[] = [{ name: 'age', label: 'Age', type: 'number' }];
    const fg = buildFormGroup(fields);
    expect(fg.contains('age')).toBeTrue();
    expect(fg.get('age')?.value).toBe('');
  });

  it('should create a boolean control with false default', () => {
    const fields: FormField[] = [{ name: 'active', label: 'Active', type: 'boolean' }];
    const fg = buildFormGroup(fields);
    expect(fg.contains('active')).toBeTrue();
    expect(fg.get('active')?.value).toBeFalse();
  });

  it('should create a single-select control with empty string default', () => {
    const fields: FormField[] = [{
      name: 'status', label: 'Status', type: 'select',
      options: [{ value: 'a', label: 'A' }]
    }];
    const fg = buildFormGroup(fields);
    expect(fg.get('status')?.value).toBe('');
  });

  it('should create a multi-select control with empty array default', () => {
    const fields: FormField[] = [{
      name: 'tags', label: 'Tags', type: 'select',
      options: [{ value: 'a', label: 'A' }],
      multiple: true
    }];
    const fg = buildFormGroup(fields);
    expect(fg.get('tags')?.value).toEqual([]);
  });

  it('should use the provided defaultValue over the type default', () => {
    const fields: FormField[] = [
      { name: 'name', label: 'Name', type: 'string', defaultValue: 'hello' },
      { name: 'count', label: 'Count', type: 'number', defaultValue: 42 },
      { name: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true }
    ];
    const fg = buildFormGroup(fields);
    expect(fg.get('name')?.value).toBe('hello');
    expect(fg.get('count')?.value).toBe(42);
    expect(fg.get('enabled')?.value).toBeTrue();
  });

  it('should add Validators.required when required is true', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: true }];
    const fg = buildFormGroup(fields);
    fg.get('name')?.setValue('');
    expect(fg.get('name')?.hasError('required')).toBeTrue();
  });

  it('should not add Validators.required when required is false', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: false }];
    const fg = buildFormGroup(fields);
    fg.get('name')?.setValue('');
    expect(fg.get('name')?.hasError('required')).toBeFalse();
  });

  it('should not add Validators.required when required is not set', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string' }];
    const fg = buildFormGroup(fields);
    fg.get('name')?.setValue('');
    expect(fg.get('name')?.hasError('required')).toBeFalse();
  });

  it('should create controls for all fields in the array', () => {
    const fields: FormField[] = [
      { name: 'f1', label: 'F1', type: 'string' },
      { name: 'f2', label: 'F2', type: 'number' },
      { name: 'f3', label: 'F3', type: 'boolean' }
    ];
    const fg = buildFormGroup(fields);
    expect(Object.keys(fg.controls)).toEqual(['f1', 'f2', 'f3']);
  });

  it('should return a valid FormGroup when all required fields are filled', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: true }];
    const fg = buildFormGroup(fields);
    fg.get('name')?.setValue('value');
    expect(fg.valid).toBeTrue();
  });

  it('should return an invalid FormGroup when a required field is empty', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: true }];
    const fg = buildFormGroup(fields);
    expect(fg.valid).toBeFalse();
  });
});
