import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { NewPricePlanComponent } from './new-price-plan.component';

describe('NewPricePlanComponent', () => {
  let component: NewPricePlanComponent;
  let fixture: ComponentFixture<NewPricePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [NewPricePlanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewPricePlanComponent);
    component = fixture.componentInstance;
    component.selectedProdSpec = {
      productSpecCharacteristic: [],
    } as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onClick should close drawers and emoji picker when open', () => {
    component.showEmoji = true;
    component.showPriceComponents = true;
    component.showProfile = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showEmoji).toBeFalse();
    expect(component.showPriceComponents).toBeFalse();
    expect(component.showProfile).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('changeDomeManaged should toggle dome managed mode', () => {
    component.isDomeManaged = false;

    component.changeDomeManaged();
    expect(component.isDomeManaged).toBeTrue();

    component.changeDomeManaged();
    expect(component.isDomeManaged).toBeFalse();
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short words', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
