import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsageSpecMetricsComponent } from './usage-spec-metrics.component';

describe('UsageSpecMetricsComponent', () => {
  let component: UsageSpecMetricsComponent;
  let fixture: ComponentFixture<UsageSpecMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageSpecMetricsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
