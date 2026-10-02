import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { UsageSpecComponent } from './usage-spec.component';

describe('UsageSpecComponent', () => {
  let component: UsageSpecComponent;
  let fixture: ComponentFixture<UsageSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [UsageSpecComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate general info when the provider already has a usage spec with the same name', () => {
    component.usageSpec = { id: 'usage-spec-2' };
    (component as any).providerUsageSpecs = [
      { id: 'usage-spec-1', name: 'Requests' }
    ];
    (component as any).applyExistingUsageSpecNames();

    const generalInfo = component.usageSpecForm.get('generalInfo') as FormGroup;
    generalInfo.addControl('name', new FormControl(' requests '));
    generalInfo.updateValueAndValidity();

    expect(generalInfo.hasError('nonUniqueName')).toBeTrue();
    expect(component.validateCurrentStep()).toBeFalse();
  });

  it('should allow the current usage spec name when updating', () => {
    component.usageSpec = { id: 'usage-spec-1' };
    (component as any).providerUsageSpecs = [
      { id: 'usage-spec-1', name: 'Requests' }
    ];
    (component as any).applyExistingUsageSpecNames();

    const generalInfo = component.usageSpecForm.get('generalInfo') as FormGroup;
    generalInfo.addControl('name', new FormControl('Requests'));
    generalInfo.updateValueAndValidity();

    expect(generalInfo.hasError('nonUniqueName')).toBeFalse();
    expect(component.validateCurrentStep()).toBeTrue();
  });

  it('should block summary navigation when no metrics have been added', () => {
    component.currentStep = 1;

    expect(component.usageSpecForm.get('metrics')?.hasError('metricsRequired')).toBeTrue();
    expect(component.validateCurrentStep()).toBeFalse();
    expect(component.canNavigate(2)).toBeFalse();
  });

  it('should allow summary navigation after at least one metric has been added', () => {
    const generalInfo = component.usageSpecForm.get('generalInfo') as FormGroup;
    generalInfo.addControl('name', new FormControl('Requests'));
    generalInfo.updateValueAndValidity();
    component.usageSpecForm.get('metrics')?.setValue([
      { name: 'API calls', description: '', valueType: 'number' }
    ]);
    component.currentStep = 1;

    expect(component.usageSpecForm.get('metrics')?.valid).toBeTrue();
    expect(component.validateCurrentStep()).toBeTrue();
    component.goToStep(2);
    expect(component.currentStep).toBe(2);
  });
});
