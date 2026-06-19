import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { OrgInfoComponent } from './org-info.component';

describe('OrgInfoComponent', () => {
  let component: OrgInfoComponent;
  let fixture: ComponentFixture<OrgInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [OrgInfoComponent],
      imports: [HttpClientTestingModule, ReactiveFormsModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OrgInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require a title before saving a contact medium', () => {
    component.emailSelected = true;
    component.addressSelected = false;
    component.phoneSelected = false;
    component.mediumForm.patchValue({
      email: 'support@example.com'
    });

    component.saveMedium();

    expect(component.mediumForm.get('contactTitle')?.invalid).toBeTrue();
    expect(component.contactmediums.length).toBe(0);
  });

  it('should save the contact medium title as contactType', () => {
    component.emailSelected = true;
    component.addressSelected = false;
    component.phoneSelected = false;
    component.mediumForm.patchValue({
      contactTitle: 'Support',
      email: 'support@example.com'
    });

    component.saveMedium();

    expect(component.contactmediums.length).toBe(1);
    expect(component.contactmediums[0].characteristic.contactType).toBe('Support');
  });

  it('should not repeat the phone title in the info column', () => {
    component.loading = false;
    component.contactmediums = [{
      id: 'phone-1',
      mediumType: 'TelephoneNumber',
      preferred: false,
      characteristic: {
        contactType: 'Support',
        phoneNumber: '+34911222333'
      }
    }];

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Support');
    expect(text).toContain('+34911222333');
    expect(text).not.toContain('(Support) +34911222333');
  });
});
