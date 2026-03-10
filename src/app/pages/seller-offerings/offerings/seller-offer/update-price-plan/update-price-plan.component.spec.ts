import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UpdatePricePlanComponent } from './update-price-plan.component';

describe('UpdatePricePlanComponent', () => {
  let component: UpdatePricePlanComponent;
  let fixture: ComponentFixture<UpdatePricePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UpdatePricePlanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdatePricePlanComponent);
    component = fixture.componentInstance;
    component.selectedProdSpec = {
      productSpecCharacteristic: [],
    } as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onClick should close overlays when click happens outside component', () => {
    component.showEmoji = true;
    component.showPriceComponents = true;
    component.showProfile = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    spyOn((component as any).elementRef.nativeElement, 'contains').and.returnValue(false);

    component.onClick(new Event('click'));

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
