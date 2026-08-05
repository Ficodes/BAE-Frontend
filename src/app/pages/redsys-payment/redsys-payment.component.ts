import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

const REDSYS_PAYMENT_URL_PARAM = 'RedsysPaymentUrl';
const REDSYS_FIELDS = [
  'Ds_SignatureVersion',
  'Ds_MerchantParameters',
  'Ds_Signature',
] as const;

@Component({
  selector: 'app-redsys-payment',
  standalone: true,
  template: `
    <main class="flex min-h-[50vh] items-center justify-center p-8">
      <p>{{ statusMessage }}</p>
    </main>
  `,
})
export class RedsysPaymentComponent implements OnInit, OnDestroy {
  statusMessage = 'Redirecting to the secure payment gateway...';
  private paymentForm?: HTMLFormElement;

  constructor(
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const paymentUrl = queryParams.get(REDSYS_PAYMENT_URL_PARAM);
    const paymentFields = REDSYS_FIELDS.map((name) => ({
      name,
      value: queryParams.get(name),
    }));

    if (!paymentUrl || paymentFields.some(({ value }) => !value)) {
      this.statusMessage = 'The Redsys payment data is incomplete.';
      return;
    }

    let gateway: URL;
    try {
      gateway = new URL(paymentUrl);
    } catch {
      this.statusMessage = 'The Redsys payment URL is invalid.';
      return;
    }

    if (gateway.protocol !== 'https:' || !gateway.pathname.endsWith('/realizarPago')) {
      this.statusMessage = 'The Redsys payment URL is invalid.';
      return;
    }

    const form = this.document.createElement('form');
    form.method = 'POST';
    form.action = gateway.toString();
    form.hidden = true;
    form.setAttribute('data-redsys-payment-form', '');

    for (const { name, value } of paymentFields) {
      const input = this.document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value!;
      form.appendChild(input);
    }

    this.paymentForm = form;
    this.document.body.appendChild(form);
    form.submit();
  }

  ngOnDestroy(): void {
    this.paymentForm?.remove();
  }
}
