import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsageSpecSummaryComponent } from './usage-spec-summary.component';

describe('UsageSpecSummaryComponent', () => {
  let component: UsageSpecSummaryComponent;
  let fixture: ComponentFixture<UsageSpecSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageSpecSummaryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
