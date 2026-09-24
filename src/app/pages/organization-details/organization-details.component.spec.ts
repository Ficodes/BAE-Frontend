import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { OrganizationDetailsComponent } from './organization-details.component';

describe('OrganizationDetailsComponent', () => {
  let component: OrganizationDetailsComponent;
  let fixture: ComponentFixture<OrganizationDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [OrganizationDetailsComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, ReactiveFormsModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OrganizationDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render contact medium title from contactType', () => {
    component.notFound = false;
    component.orgInfo = {
      contactMedium: [{
        mediumType: 'Email',
        characteristic: {
          contactType: 'Support',
          emailAddress: 'support@example.com'
        }
      }]
    };

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Support');
    expect(text).toContain('support@example.com');
  });

  it('should group contact mediums by medium type instead of payload position', () => {
    component.orgInfo = {
      contactMedium: [
        {
          mediumType: 'PostalAddress',
          characteristic: {
            contactType: 'Billing address',
            street1: 'Main street 1',
            postCode: '28001',
            city: 'Madrid',
            country: 'Spain'
          }
        },
        {
          mediumType: 'TelephoneNumber',
          characteristic: {
            contactType: 'Sales phone',
            phoneNumber: '+34 900 000 000'
          }
        },
        {
          mediumType: 'Email',
          characteristic: {
            contactType: 'Support email',
            emailAddress: 'support@example.com'
          }
        },
        {
          mediumType: 'Email',
          characteristic: {
            contactType: 'Sales email',
            emailAddress: 'sales@example.com'
          }
        }
      ]
    };

    const contacts = component.supportContacts;

    expect(contacts.map(contact => contact.kind)).toEqual(['email', 'email', 'phone', 'address']);
    expect(contacts.map(contact => contact.value)).toEqual([
      'support@example.com',
      'sales@example.com',
      '+34 900 000 000',
      'Main street 1, 28001 Madrid, Spain'
    ]);
  });
});
