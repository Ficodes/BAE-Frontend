import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RedsysPaymentComponent } from './redsys-payment.component';

describe('RedsysPaymentComponent', () => {
  const queryParams = {
    RedsysPaymentUrl: 'https://sis-t.redsys.es:25443/sis/realizarPago',
    Ds_SignatureVersion: 'HMAC_SHA512_V2',
    Ds_MerchantParameters: 'merchant-parameters',
    Ds_Signature: 'signature',
  };

  afterEach(() => {
    document.querySelector('[data-redsys-payment-form]')?.remove();
  });

  it('posts the three signed fields to the Redsys URL from charging', async () => {
    const submit = spyOn(HTMLFormElement.prototype, 'submit');
    const fixture = await createComponent(queryParams);

    fixture.detectChanges();

    const form = TestBed.inject(DOCUMENT).querySelector(
      '[data-redsys-payment-form]'
    ) as HTMLFormElement;
    expect(form.method).toBe('post');
    expect(form.action).toBe(queryParams.RedsysPaymentUrl);
    expect(form.querySelectorAll('input')).toHaveSize(3);

    for (const [name, value] of Object.entries(queryParams).slice(1)) {
      expect(
        (form.querySelector(`input[name="${name}"]`) as HTMLInputElement).value
      ).toBe(value);
    }
    expect(submit).toHaveBeenCalledTimes(1);

    fixture.destroy();
  });

  it('does not submit when a signed field is missing', async () => {
    const submit = spyOn(HTMLFormElement.prototype, 'submit');
    const fixture = await createComponent({
      RedsysPaymentUrl: queryParams.RedsysPaymentUrl,
      Ds_SignatureVersion: queryParams.Ds_SignatureVersion,
      Ds_MerchantParameters: queryParams.Ds_MerchantParameters,
    });

    fixture.detectChanges();

    expect(submit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('incomplete');
  });

  it('does not submit to a non-HTTPS payment URL', async () => {
    const submit = spyOn(HTMLFormElement.prototype, 'submit');
    const fixture = await createComponent({
      ...queryParams,
      RedsysPaymentUrl: 'http://redsys.example.test/sis/realizarPago',
    });

    fixture.detectChanges();

    expect(submit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('invalid');
  });

  async function createComponent(params: Record<string, string>) {
    await TestBed.configureTestingModule({
      imports: [RedsysPaymentComponent],
      providers: [{
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(params),
          },
        },
      }],
    }).compileComponents();

    return TestBed.createComponent(RedsysPaymentComponent);
  }
});
