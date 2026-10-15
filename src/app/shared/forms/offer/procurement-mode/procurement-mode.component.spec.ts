import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormGroup } from '@angular/forms';

import { ProcurementModeComponent } from './procurement-mode.component';
import { environment } from 'src/environments/environment';

describe('ProcurementModeComponent', () => {
  let component: ProcurementModeComponent;
  let fixture: ComponentFixture<ProcurementModeComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [ProcurementModeComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProcurementModeComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep manual when selecting a non-manual mode before payment info is loaded', fakeAsync(() => {
    component.form = new FormGroup({});
    component.formType = 'create';
    component.data = {};

    fixture.detectChanges();

    const paymentInfoRequest = httpMock.expectOne(`${environment.BASE_URL}/paymentInfo`);

    component.selectProcurementMode('automatic');

    expect(component.formGroup.get('mode')?.value).toBe('manual');
    expect(component.procurementMode).toBe('manual');
    expect(component.errorMessageKey).toBe('FORMS.PROCUREMENT_MODE._payment_check_pending');

    paymentInfoRequest.flush({ providerUrl: 'https://payments.example.com', gatewaysCount: 1 });
    tick();

    component.selectProcurementMode('automatic');

    expect(component.formGroup.get('mode')?.value).toBe('automatic');
    expect(component.procurementMode).toBe('automatic');
  }));

  it('should block non-manual modes when payment info returns zero gateways', fakeAsync(() => {
    component.form = new FormGroup({});
    component.formType = 'create';
    component.data = {};

    fixture.detectChanges();

    const paymentInfoRequest = httpMock.expectOne(`${environment.BASE_URL}/paymentInfo`);
    paymentInfoRequest.flush({ providerUrl: 'https://payments.example.com', gatewaysCount: 0 });
    tick();

    component.selectProcurementMode('payment-automatic');

    expect(component.formGroup.get('mode')?.value).toBe('manual');
    expect(component.procurementMode).toBe('manual');
    expect(component.errorMessageKey).toBe('FORMS.PROCUREMENT_MODE._payment_gateway_required');
  }));
});
