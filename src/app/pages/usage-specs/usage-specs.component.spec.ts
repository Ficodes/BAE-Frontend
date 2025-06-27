import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsageSpecsComponent } from './usage-specs.component';

describe('UsageSpecsComponent', () => {
  let component: UsageSpecsComponent;
  let fixture: ComponentFixture<UsageSpecsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageSpecsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
