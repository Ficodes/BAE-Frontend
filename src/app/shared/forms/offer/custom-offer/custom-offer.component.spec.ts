import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomOfferComponent } from './custom-offer.component';

describe('CustomOfferComponent', () => {
  let component: CustomOfferComponent;
  let fixture: ComponentFixture<CustomOfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomOfferComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
