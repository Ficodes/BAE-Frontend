import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormControl } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { UsageSpecComponent } from './usage-spec.component';
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { UsageSpecMetricsComponent } from './usage-spec-metrics/usage-spec-metrics.component';

describe('UsageSpecComponent', () => {
  let component: UsageSpecComponent;
  let fixture: ComponentFixture<UsageSpecComponent>;
  let httpMock: HttpTestingController;
  let name: FormControl;

  function expectChecks(value: string, limit = 1, partyId = 'party-1') {
    return ['Active', 'Launched'].map(status => {
      const req = httpMock.expectOne(request =>
        request.url === `${UsageServiceService.BASE_URL}/usage/usageSpecification`
        && request.params.get('lifecycleStatus') === status
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('name')).toBe(value);
      expect(req.request.params.get('relatedParty.id')).toBe(partyId);
      expect(req.request.params.get('limit')).toBe(String(limit));
      expect(req.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
      return req;
    });
  }

  function addMetric() {
    component.usageSpecForm.get('metrics')?.setValue([{ name: 'API calls', valueType: 'number' }]);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageSpecComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(UsageSpecComponent);
    component = fixture.componentInstance;
    component.partyId = 'party-1';
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    name = component.usageSpecForm.get('generalInfo.name') as FormControl;
  });

  afterEach(() => httpMock.verify());

  it('does not fetch all specifications when the form opens', fakeAsync(() => {
    tick(1000);
    httpMock.expectNone(() => true);
    expect(name.hasError('required')).toBeTrue();
  }));

  it('waits for 500 ms without typing and checks only the latest name', fakeAsync(() => {
    name.setValue('R');
    expect(name.pending).toBeTrue();
    tick(300);
    name.setValue('Re');
    tick(300);
    name.setValue(' Requests ');
    tick(499);
    httpMock.expectNone(() => true);
    expect(component.validateCurrentStep()).toBeFalse();

    tick(1);
    const [active, launched] = expectChecks('Requests');
    active.flush([]);
    expect(name.pending).toBeTrue();
    launched.flush([]);
    expect(name.valid).toBeTrue();
    expect(component.validateCurrentStep()).toBeTrue();
  }));

  for (const status of ['Active', 'Launched']) {
    it(`rejects a name matching a ${status} specification`, fakeAsync(() => {
      name.markAsDirty();
      name.setValue('Requests');
      tick(500);
      const [active, launched] = expectChecks('Requests');
      active.flush(status === 'Active' ? [{ id: 'other' }] : []);
      launched.flush(status === 'Launched' ? [{ id: 'other' }] : []);

      expect(name.hasError('nonUniqueName')).toBeTrue();
      expect(component.validateCurrentStep()).toBeFalse();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('USAGE_SPECS._unique');
      expect(fixture.nativeElement.querySelector('[data-cy="usageSpecNext"]').disabled).toBeTrue();
    }));
  }

  it('allows reusing a deleted name when neither live state contains a match', fakeAsync(() => {
    name.setValue('Retired metric');
    tick(500);
    expectChecks('Retired metric').forEach(req => req.flush([]));
    expect(name.valid).toBeTrue();
    // No unfiltered request or Retired/Obsolete query should be sent.
    httpMock.expectNone(() => true);
  }));

  it('blocks advancing and submission throughout the debounce and both responses', fakeAsync(() => {
    const create = spyOn(component, 'createUsageSpec');
    addMetric();
    name.setValue('Requests');
    component.goToStep(1);
    component.submitForm();
    expect(component.currentStep).toBe(0);
    expect(create).not.toHaveBeenCalled();
    tick(500);
    const [active, launched] = expectChecks('Requests');
    active.flush([]);
    component.submitForm();
    expect(create).not.toHaveBeenCalled();
    expect(component.usageSpecForm.pending).toBeTrue();

    launched.flush([]);
    component.submitForm();
    expect(create).toHaveBeenCalledTimes(1);
  }));

  it('disables the edit submit button and blocks direct writes while pending', fakeAsync(() => {
    component.formType = 'update';
    addMetric();
    name.setValue('Requests');
    const service = TestBed.inject(UsageServiceService);
    const post = spyOn(service, 'postUsageSpec');
    const patch = spyOn(service, 'updateUsageSpec');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="btnCreateUsageSpec"]').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('USAGE_SPECS._checking_name');
    component.updateUsageSpec();
    component.formType = 'create';
    component.createUsageSpec();
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
    tick(500);
    expectChecks('Requests').forEach(req => req.flush([]));
  }));

  it('ignores the specification being edited and requests room for a second match', fakeAsync(() => {
    component.formType = 'update';
    component.usageSpec = { id: 'current' };
    name.setValue('Requests');
    tick(500);
    const [active, launched] = expectChecks('Requests', 2);
    active.flush([]);
    launched.flush([{ id: 'current' }]);
    expect(name.valid).toBeTrue();
  }));

  it('still rejects another match alongside the edited specification', fakeAsync(() => {
    component.formType = 'update';
    component.usageSpec = { id: 'current' };
    name.setValue('Requests');
    tick(500);
    const [active, launched] = expectChecks('Requests', 2);
    active.flush([{ id: 'current' }, { id: 'other' }]);
    launched.flush([]);
    expect(name.hasError('nonUniqueName')).toBeTrue();
  }));

  it('cancels in-flight checks when the name changes', fakeAsync(() => {
    name.setValue('Old name');
    tick(500);
    const previous = expectChecks('Old name');
    name.setValue('New name');
    expect(previous.every(req => req.cancelled)).toBeTrue();
    expect(name.pending).toBeTrue();
    tick(500);
    expectChecks('New name').forEach(req => req.flush([]));
    expect(name.valid).toBeTrue();
  }));

  it('blocks validation on network failure and checks again after another edit', fakeAsync(() => {
    name.setValue('Requests');
    tick(500);
    const [active, launched] = expectChecks('Requests');
    active.flush('Unavailable', { status: 503, statusText: 'Service unavailable' });
    expect(launched.cancelled).toBeTrue();
    expect(name.hasError('nameCheckFailed')).toBeTrue();
    expect(component.validateCurrentStep()).toBeFalse();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('USAGE_SPECS._name_check_error');

    name.setValue('Requests again');
    tick(500);
    expectChecks('Requests again').forEach(req => req.flush([]));
    expect(name.valid).toBeTrue();
  }));

  it('does not query invalid names', fakeAsync(() => {
    for (const value of ['', '   ', 'a'.repeat(101)]) {
      name.setValue(value);
      tick(500);
      expect(name.invalid).toBeTrue();
      httpMock.expectNone(() => true);
    }
  }));

  it('requires a provider and rechecks when the provider changes', fakeAsync(() => {
    component.partyId = '';
    name.setValue('Requests');
    expect(name.hasError('nameCheckFailed')).toBeTrue();
    tick(500);
    httpMock.expectNone(() => true);

    component.partyId = 'party-1';
    component.ngOnChanges({ partyId: new SimpleChange('', 'party-1', false) });
    tick(500);
    const oldRequests = expectChecks('Requests');
    component.partyId = 'party-2';
    component.ngOnChanges({ partyId: new SimpleChange('party-1', 'party-2', false) });
    expect(oldRequests.every(req => req.cancelled)).toBeTrue();
    tick(500);
    expectChecks('Requests', 1, 'party-2').forEach(req => req.flush([]));
    expect(name.valid).toBeTrue();
  }));

  it('cancels checks when the form is destroyed', fakeAsync(() => {
    name.setValue('Requests');
    tick(500);
    const requests = expectChecks('Requests');
    fixture.destroy();
    expect(requests.every(req => req.cancelled)).toBeTrue();
  }));

  it('creates a specification only after validation, using the checked trimmed name', fakeAsync(() => {
    addMetric();
    name.setValue(' Requests ');
    tick(500);
    expectChecks('Requests').forEach(req => req.flush([]));
    component.submitForm();
    const post = httpMock.expectOne(request => request.method === 'POST');
    expect(post.request.body.name).toBe('Requests');
    expect(post.request.body.relatedParty[0].id).toBe('party-1');
    post.flush({ id: 'created' });
  }));

  it('updates with the checked name instead of an older debounced subform value', fakeAsync(() => {
    component.formType = 'update';
    component.usageSpec = { id: 'current', name: 'Original', lifecycleStatus: 'Active', specCharacteristic: [] };
    (component as any).formChanges = {
      generalInfo: { currentValue: { name: 'Older edit', description: '' } }
    };
    addMetric();
    name.setValue(' Latest edit ');
    tick(500);
    expectChecks('Latest edit', 2).forEach(req => req.flush([]));
    component.submitForm();
    const patch = httpMock.expectOne(request => request.method === 'PATCH');
    expect(patch.request.body.name).toBe('Latest edit');
    patch.flush({});
    tick();
  }));

  it('blocks summary navigation when no metrics have been added', fakeAsync(() => {
    name.setValue('Requests');
    tick(500);
    expectChecks('Requests').forEach(req => req.flush([]));
    component.currentStep = 1;
    expect(component.validateCurrentStep()).toBeFalse();
    expect(component.canNavigate(2)).toBeFalse();
  }));

  it('allows summary navigation after validating the name and adding a metric', fakeAsync(() => {
    name.setValue('Requests');
    tick(500);
    expectChecks('Requests').forEach(req => req.flush([]));
    addMetric();
    component.currentStep = 1;
    expect(component.validateCurrentStep()).toBeTrue();
    component.goToStep(2);
    expect(component.currentStep).toBe(2);
  }));

  for (const formType of ['create', 'update'] as const) {
    it(`blocks progression and ${formType} requests for duplicate rows in the complete list`, fakeAsync(() => {
      component.formType = formType;
      component.usageSpec = { id: 'outer', specCharacteristic: [] };
      name.setValue('Outer metric');
      tick(500);
      expectChecks('Outer metric', formType === 'update' ? 2 : 1).forEach(req => req.flush([]));
      component.usageSpecForm.get('metrics')?.setValue([
        { id: 'first', name: 'Requests per minute' },
        { id: 'second', name: ' REQUESTS PER MINUTE ' }
      ]);
      component.currentStep = 1;
      component.highestStep = 1;
      fixture.detectChanges();

      expect(component.usageSpecForm.get('metrics')?.hasError('duplicateMetricNames')).toBeTrue();
      expect(component.validateCurrentStep()).toBeFalse();
      expect(component.canNavigate(2)).toBeFalse();
      expect(fixture.nativeElement.querySelector('[data-cy="duplicateMetricNamesError"]').textContent).toContain('USAGE_SPECS._duplicate_metric_names');
      expect(fixture.nativeElement.querySelector('[data-cy="usageSpecNext"]').disabled).toBeTrue();
      if (formType === 'update') expect(fixture.nativeElement.querySelector('[data-cy="btnCreateUsageSpec"]').disabled).toBeTrue();
      component.goToStep(2);
      expect(component.currentStep).toBe(1);
      component.submitForm();
      component.createUsageSpec();
      component.updateUsageSpec();
      httpMock.expectNone(() => true);
    }));

    it(`allows ${formType} after a duplicate row is removed and submits only the remaining row`, fakeAsync(() => {
      component.formType = formType;
      component.usageSpec = { id: 'outer', lifecycleStatus: 'Active', specCharacteristic: [] };
      name.setValue('Outer metric');
      tick(500);
      expectChecks('Outer metric', formType === 'update' ? 2 : 1).forEach(req => req.flush([]));
      component.usageSpecForm.get('metrics')?.setValue([
        { id: 'first', name: 'Requests', description: 'Keep this', valueType: 'number', custom: 'preserved' },
        { id: 'second', name: 'requests', description: 'Remove this', valueType: 'number' }
      ]);
      component.currentStep = 1;
      component.highestStep = 1;
      fixture.detectChanges();
      const child = fixture.debugElement.query(By.directive(UsageSpecMetricsComponent)).componentInstance as UsageSpecMetricsComponent;
      child.deleteMetric(child.metrics[1]);
      fixture.detectChanges();
      expect(component.usageSpecForm.valid).toBeTrue();
      expect(fixture.nativeElement.querySelector('[data-cy="duplicateMetricNamesError"]')).toBeNull();
      component.goToStep(2);
      component.submitForm();
      const req = httpMock.expectOne(request => request.method === (formType === 'create' ? 'POST' : 'PATCH'));
      expect(req.request.body.specCharacteristic).toEqual([
        { name: 'Requests', description: 'Keep this', valueType: 'number', custom: 'preserved' }
      ]);
      req.flush({ id: 'outer' });
      tick();
    }));
  }

  it('validates duplicate rows loaded for editing without mutating the original specification', fakeAsync(() => {
    component.formType = 'update';
    const original = [
      { id: 'server-1', name: 'Requests', valueType: 'number' },
      { id: 'server-2', name: 'Requests', valueType: 'number' }
    ];
    component.usageSpec = { id: 'outer', name: 'Outer metric', specCharacteristic: original };
    component.loadUsageSpecData();
    tick(500);
    expectChecks('Outer metric', 2).forEach(req => req.flush([]));
    expect(component.usageSpecForm.get('metrics')?.hasError('duplicateMetricNames')).toBeTrue();
    expect(component.usageSpec.specCharacteristic).toBe(original);
    expect(original.map(metric => metric.id)).toEqual(['server-1', 'server-2']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="duplicateMetricNamesError"]')).not.toBeNull();
    component.currentStep = 1;
    fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(UsageSpecMetricsComponent)).componentInstance as UsageSpecMetricsComponent;
    child.deleteMetric(child.metrics[1]);
    expect(component.usageSpecForm.valid).toBeTrue();
    expect(original.length).toBe(2);
  }));

  it('updates the current list after adding and deleting rows, even if an older change event arrives', fakeAsync(() => {
    component.formType = 'update';
    component.usageSpec = { id: 'outer', lifecycleStatus: 'Active', specCharacteristic: [] };
    name.setValue('Outer metric');
    tick(500);
    expectChecks('Outer metric', 2).forEach(req => req.flush([]));
    component.usageSpecForm.get('metrics')?.setValue([{ id: 'existing', name: 'Requests', valueType: 'number' }]);
    component.currentStep = 1;
    fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(UsageSpecMetricsComponent)).componentInstance as UsageSpecMetricsComponent;
    child.metricsForm.patchValue({ name: 'Temporary' });
    child.saveMetric();
    const staleRows = [...child.metrics];
    child.deleteMetric(child.metrics[1]);
    component.handleSubformChange({
      subformType: 'metrics', isDirty: true, dirtyFields: ['creatingMetrics'], originalValue: [], currentValue: staleRows
    });
    component.submitForm();
    const req = httpMock.expectOne(request => request.method === 'PATCH');
    expect(req.request.body.specCharacteristic).toEqual([{ name: 'Requests', valueType: 'number' }]);
    req.flush({});
    tick();
  }));

  it('checks inner names locally without requesting names from the backend', fakeAsync(() => {
    name.setValue('Outer metric');
    tick(500);
    expectChecks('Outer metric').forEach(req => req.flush([]));
    component.currentStep = 1;
    fixture.detectChanges();
    const child = fixture.debugElement.query(By.directive(UsageSpecMetricsComponent)).componentInstance as UsageSpecMetricsComponent;
    child.metricsForm.patchValue({ name: 'Requests' });
    child.saveMetric();
    child.metricsForm.patchValue({ name: ' requests ' });
    child.saveMetric();
    expect(child.metrics.length).toBe(1);
    tick(1000);
    httpMock.expectNone(() => true);
  }));

  it('preserves the exact name and metadata of an existing metric referenced by usage prices', fakeAsync(() => {
    component.formType = 'update';
    component.usageSpec = {
      id: 'outer', name: 'Outer metric', lifecycleStatus: 'Launched',
      specCharacteristic: [{ name: ' Requests ', description: 'Original', valueType: 'number', custom: 'preserved' }]
    };
    component.loadUsageSpecData();
    tick(500);
    expectChecks('Outer metric', 2).forEach(req => req.flush([]));
    component.submitForm();
    const req = httpMock.expectOne(request => request.method === 'PATCH');
    expect(req.request.body.specCharacteristic).toEqual([
      { name: ' Requests ', description: 'Original', valueType: 'number', custom: 'preserved' }
    ]);
    req.flush({});
    tick();
  }));
});
