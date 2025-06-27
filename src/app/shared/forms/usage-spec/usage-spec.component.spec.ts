import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsageSpecComponent } from './usage-spec.component';

describe('UsageSpecComponent', () => {
  let component: UsageSpecComponent;
  let fixture: ComponentFixture<UsageSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
