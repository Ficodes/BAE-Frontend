import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateUsageSpecComponent } from './update-usage-spec.component';

describe('UpdateUsageSpecComponent', () => {
  let component: UpdateUsageSpecComponent;
  let fixture: ComponentFixture<UpdateUsageSpecComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateUsageSpecComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateUsageSpecComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
