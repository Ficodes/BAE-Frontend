import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { PricePlansComponent } from './price-plans.component';

describe('PricePlansComponent', () => {
  let component: PricePlansComponent;
  let fixture: ComponentFixture<PricePlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [PricePlansComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PricePlansComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mapProductProfile should keep boolean false selectedValue', () => {
    const mapped = (component as any).mapProductProfile([
      {
        id: 'char-1',
        name: 'platinum',
        productSpecCharacteristicValue: [
          { value: true, isDefault: false },
          { value: false, isDefault: true }
        ]
      }
    ]);

    const selectedValues = mapped.get('selectedValues') as any;
    expect(selectedValues.at(0).get('selectedValue')?.value).toBeFalse();
  });
});
