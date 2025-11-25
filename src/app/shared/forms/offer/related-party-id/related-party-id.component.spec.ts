import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatedPartyIdComponent } from './related-party-id.component';

describe('RelatedPartyIdComponent', () => {
  let component: RelatedPartyIdComponent;
  let fixture: ComponentFixture<RelatedPartyIdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatedPartyIdComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RelatedPartyIdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
