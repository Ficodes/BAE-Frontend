import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  public static BASE_URL: String = environment.BASE_URL;
  public static CHARGING: String = environment.CHARGING;
  public static ORDER_LIMIT: Number = environment.ORDER_LIMIT;

  constructor(private http: HttpClient) { }

  completePayment(params: any) {
    const {
      action,
      ref,
      sig,
      client,
      ...providerParams
    } = params;

    const body: any = {
      ...providerParams,
      confirm_action: action,
      reference: ref,
      client,
      signature: sig
    }

    let url = `${PaymentService.BASE_URL}${PaymentService.CHARGING}/api/orderManagement/orders/confirm/`;
    return this.http.post<any>(url, body, { observe: 'response' });
  }

}
