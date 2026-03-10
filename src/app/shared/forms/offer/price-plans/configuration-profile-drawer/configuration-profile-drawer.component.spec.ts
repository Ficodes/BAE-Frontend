import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ConfigurationProfileDrawerComponent } from './configuration-profile-drawer.component';

describe('ConfigurationProfileDrawerComponent', () => {
  let component: ConfigurationProfileDrawerComponent;
  let fixture: ComponentFixture<ConfigurationProfileDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [ConfigurationProfileDrawerComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should exclude optional toggle characteristics ending with - enabled', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.profileData = [
      {
        id: 'char-1',
        name: 'Storage',
        productSpecCharacteristicValue: [{ value: 'small', isDefault: true }]
      },
      {
        id: 'char-2',
        name: 'Storage - enabled',
        productSpecCharacteristicValue: [{ value: true, isDefault: true }]
      }
    ];

    testComponent.ngOnInit();

    const names = testComponent.characteristics.value.map((char: any) => char.name);
    expect(names).toEqual(['Storage']);
  });

  it('should keep filtering compliance and data-space-specific characteristics', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.profileData = [
      {
        id: 'char-1',
        name: 'Compliance:SelfAtt',
        productSpecCharacteristicValue: [{ value: true, isDefault: true }]
      },
      {
        id: 'char-2',
        name: 'Policy JSON',
        valueType: 'authorizationPolicy',
        productSpecCharacteristicValue: [{ value: '{"a":1}', isDefault: true }]
      },
      {
        id: 'char-3',
        name: 'Credential JSON',
        valueType: 'credentialsConfiguration',
        productSpecCharacteristicValue: [{ value: '{"b":2}', isDefault: true }]
      },
      {
        id: 'char-4',
        name: 'Region',
        productSpecCharacteristicValue: [{ value: 'EU', isDefault: true }]
      }
    ];

    testComponent.ngOnInit();

    const names = testComponent.characteristics.value.map((char: any) => char.name);
    expect(names).toEqual(['Region']);
  });

  it('should preserve boolean false as default selected value', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.profileData = [
      {
        id: 'char-1',
        name: 'Platinum',
        productSpecCharacteristicValue: [
          { value: true, isDefault: false },
          { value: false, isDefault: true }
        ]
      }
    ];

    testComponent.ngOnInit();

    expect(testComponent.characteristics.at(0).value.selectedValue).toBeFalse();
  });
});
