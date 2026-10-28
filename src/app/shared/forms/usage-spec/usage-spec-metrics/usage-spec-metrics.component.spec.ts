import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UsageSpecMetricsComponent } from './usage-spec-metrics.component';
import { EventMessageService } from 'src/app/services/event-message.service';

describe('UsageSpecMetricsComponent', () => {
  let component: UsageSpecMetricsComponent;
  let fixture: ComponentFixture<UsageSpecMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [UsageSpecMetricsComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  for (const name of ['Requests per minute', 'requests PER MINUTE', '  Requests per minute  ']) {
    it(`rejects the duplicate name "${name}" without adding or emitting a row`, () => {
      component.writeValue([{ id: 'existing', name: 'Requests per minute' }]);
      component.showCreateMetric = true;
      component.metricsForm.patchValue({ name });
      const change = jasmine.createSpy('change');
      component.registerOnChange(change);
      const event = spyOn(TestBed.inject(EventMessageService), 'emitSubformChange');
      fixture.detectChanges();

      expect(component.metricsForm.hasError('nonUniqueName')).toBeTrue();
      expect(fixture.nativeElement.querySelector('[data-cy="metricNameError"]').textContent).toContain('USAGE_SPECS._metric_name_unique');
      expect(fixture.nativeElement.querySelector('[data-cy="btnSaveMetric"]').disabled).toBeTrue();
      component.saveMetric();
      expect(component.metrics.length).toBe(1);
      expect(component.showCreateMetric).toBeTrue();
      expect(change).not.toHaveBeenCalled();
      expect(event).not.toHaveBeenCalled();
    });
  }

  it('stores trimmed names and accepts distinct metrics', () => {
    component.metricsForm.patchValue({ name: ' Requests per minute ', description: 'First' });
    component.saveMetric();
    component.metricsForm.patchValue({ name: 'Errors per minute', description: 'Second' });
    component.saveMetric();
    expect(component.metrics.map(metric => metric.name)).toEqual(['Requests per minute', 'Errors per minute']);
    expect(component.metrics[0].id).not.toBe(component.metrics[1].id);
  });

  for (const name of ['', '   ', 'X'.repeat(101)]) {
    it(`guards saveMetric against invalid input of length ${name.length}`, () => {
      component.metricsForm.patchValue({ name });
      component.saveMetric();
      expect(component.metrics).toEqual([]);
      expect(component.metricsForm.invalid).toBeTrue();
      expect(component.metricsForm.touched).toBeTrue();
    });
  }

  it('rechecks uniqueness in saveMetric if the list changed after the name was entered', () => {
    component.metricsForm.patchValue({ name: 'Requests' });
    expect(component.metricsForm.valid).toBeTrue();
    component.metrics = [{ id: 'existing', name: 'Requests' }];
    component.saveMetric();
    expect(component.metrics.length).toBe(1);
    expect(component.metricsForm.hasError('nonUniqueName')).toBeTrue();
  });

  it('revalidates after deleting a row, allows its name to be reused, and emits a metrics change', () => {
    component.writeValue([{ id: 'existing', name: 'Requests' }]);
    component.metricsForm.patchValue({ name: ' requests ' });
    expect(component.metricsForm.hasError('nonUniqueName')).toBeTrue();
    const event = spyOn(TestBed.inject(EventMessageService), 'emitSubformChange');

    component.deleteMetric(component.metrics[0]);
    expect(component.metricsForm.valid).toBeTrue();
    expect(event).toHaveBeenCalledOnceWith(jasmine.objectContaining({ subformType: 'metrics', currentValue: [] }));
    component.saveMetric();
    expect(component.metrics.map(metric => metric.name)).toEqual(['requests']);
  });

  it('revalidates the candidate when an external metric list is loaded', () => {
    component.metricsForm.patchValue({ name: 'Requests' });
    component.writeValue([{ id: 'loaded', name: 'requests' }]);
    expect(component.metricsForm.hasError('nonUniqueName')).toBeTrue();
    component.writeValue([]);
    expect(component.metricsForm.valid).toBeTrue();
  });

  it('does not mutate the metric array supplied by the parent', () => {
    const original = [{ id: 'existing', name: 'Requests' }];
    component.writeValue(original);
    component.metricsForm.patchValue({ name: 'Errors' });
    component.saveMetric();
    component.deleteMetric(component.metrics[0]);
    expect(original).toEqual([{ id: 'existing', name: 'Requests' }]);
    expect(component.metrics.map(metric => metric.name)).toEqual(['Errors']);
  });

  it('allows the same name in a different outer specification', () => {
    component.writeValue([{ id: 'existing', name: 'Requests' }]);
    const otherFixture = TestBed.createComponent(UsageSpecMetricsComponent);
    const other = otherFixture.componentInstance;
    otherFixture.detectChanges();
    other.metricsForm.patchValue({ name: 'Requests' });
    other.saveMetric();
    expect(other.metrics.map(metric => metric.name)).toEqual(['Requests']);
    otherFixture.destroy();
  });
});
