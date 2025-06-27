import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsageSpecGeneralInfoComponent } from './usage-spec-general-info.component';

describe('UsageSpecGeneralInfoComponent', () => {
  let component: UsageSpecGeneralInfoComponent;
  let fixture: ComponentFixture<UsageSpecGeneralInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageSpecGeneralInfoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecGeneralInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
