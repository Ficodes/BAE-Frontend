import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { PricePlanDrawerComponent } from './price-plan-drawer.component';

describe('PricePlanDrawerComponent', () => {
  let component: PricePlanDrawerComponent;
  let fixture: ComponentFixture<PricePlanDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [PricePlanDrawerComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PricePlanDrawerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updateIsDefault should match boolean values coming from select controls', () => {
    const profileData = [
      {
        id: 'char-1',
        name: 'platinum',
        productSpecCharacteristicValue: [
          { value: true, isDefault: true },
          { value: false, isDefault: false }
        ]
      }
    ];
    const selectedValues = [
      { id: 'char-1', selectedValue: 'false' }
    ];

    const updated = component.updateIsDefault(profileData, selectedValues);

    expect(updated[0].productSpecCharacteristicValue[0].isDefault).toBeFalse();
    expect(updated[0].productSpecCharacteristicValue[1].isDefault).toBeTrue();
  });

  it('should ignore - enabled characteristics in processed and paginated profile data', () => {
    const fb = TestBed.inject(FormBuilder);
    component.formGroup = fb.group({
      prodSpecCharValueUse: [[
        { id: '1', name: 'Char 1', productSpecCharacteristicValue: [{ value: 'A', isDefault: true }] },
        { id: '2', name: 'Char 1 - enabled', productSpecCharacteristicValue: [{ value: true, isDefault: true }] },
        { id: '3', name: 'Char 2', productSpecCharacteristicValue: [{ value: 'B', isDefault: true }] },
        { id: '4', name: 'Char 3', productSpecCharacteristicValue: [{ value: 'C', isDefault: true }] },
        { id: '5', name: 'Char 4', productSpecCharacteristicValue: [{ value: 'D', isDefault: true }] },
        { id: '6', name: 'Char 5', productSpecCharacteristicValue: [{ value: 'E', isDefault: true }] }
      ]],
      productProfile: [null],
      paymentOnline: [true],
      priceComponents: [[]]
    });
    component.pageSize = 5;

    const processed = component.getProcessedProfileData();

    expect(processed.length).toBe(5);
    expect(processed.some((char: any) => char.name === 'Char 1 - enabled')).toBeFalse();
    expect(component.totalPages).toBe(1);
    expect(component.paginatedProfileData.length).toBe(5);
  });
});
