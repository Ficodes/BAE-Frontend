import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map } from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {LocalStorageService} from "./local-storage.service";
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {

  public static BASE_URL: String = environment.BASE_URL;
  public static BASE_PATCH: String = environment.BILLING;
  public static API_ORDERING: String = environment.CUSTOMER_BILLING;

  public static ORDER_LIMIT: Number = environment.ORDER_LIMIT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getInvoices(partyId:any, page:any, filters:any[], date:any, role:any){

    console.log('Reading invoices')
    console.log(partyId)
    console.log(role)


    // TODO. Qué le pasa a esta petición? devuelve algo raro....
    let url = `${InvoicesService.BASE_URL}${InvoicesService.BASE_PATCH}${InvoicesService.API_ORDERING}?limit=1000&offset=${page}`;
  
    url += `&relatedParty.id=${partyId}&relatedParty.role=${role}&state=settled`

    // let status=''
    // if(filters.length>0){
    //   for(let i=0; i < filters.length; i++){
    //     if(i==filters.length-1){
    //       status=status+filters[i]
    //     } else {
    //       status=status+filters[i]+','
    //     }
    //   }
    //   url=url+'&state='+status;
    // }
    // if(date!=undefined){
    //   url=url+'&orderDate>'+date;
    // }
    console.log(url);
    //  TODO no se que le pasa a esta petición
    let result =  lastValueFrom(this.http.get<any[]>(url));
    console.log(result)
    return result;
    //  TODO más triste es robar:
    let inv:any[]= [
      {
        "id": "urn:ngsi-ld:applied-customer-billing-rate:4c0eae59-b20e-4bc1-953e-450b1b62005e",
        "href": "urn:ngsi-ld:applied-customer-billing-rate:4c0eae59-b20e-4bc1-953e-450b1b62005e",
        "date": "2025-01-30T11:06:00.021081459Z",
        "description": "Mantenimienfo Opplafy",
        "isBilled": false,
        "name": "20250123",
        "type": "-",
        "appliedTax": [
          {
            "taxCategory": "VAT",
            "taxRate": 10.0,
            "taxAmount": {
              "unit": "EUR",
              "value": 10.0
            }
          }
        ],
        "billingAccount": {
          "id": "urn:ngsi-ld:billing-account:99c38326-b1dd-4a90-b25d-80f97051c702",
          "href": "urn:ngsi-ld:billing-account:99c38326-b1dd-4a90-b25d-80f97051c702",
          "name": "qwert12345"
        },
        "taxExcludedAmount": {
          "unit": "EUR",
          "value": 100.0
        },
        "taxIncludedAmount": {
          "unit": "EUR",
          "value": 110.0
        }
      },
      {
        "id": "urn:ngsi-ld:applied-customer-billing-rate:0414d763-f886-43f7-94a3-184665de308d",
        "href": "urn:ngsi-ld:applied-customer-billing-rate:0414d763-f886-43f7-94a3-184665de308d",
        "date": "2025-01-29T11:06:40.629374381Z",
        "description": "Hosting Google",
        "isBilled": false,
        "name": "20250124",
        "type": "-",
        "appliedTax": [
          {
            "taxCategory": "VAT",
            "taxRate": 10.0,
            "taxAmount": {
              "unit": "EUR",
              "value": 100.0
            }
          }
        ],
        "billingAccount": {
          "id": "urn:ngsi-ld:billing-account:99c38326-b1dd-4a90-b25d-80f97051c702",
          "href": "urn:ngsi-ld:billing-account:99c38326-b1dd-4a90-b25d-80f97051c702",
          "name": "qwert12345"
        },
        "taxExcludedAmount": {
          "unit": "EUR",
          "value": 1000.0
        },
        "taxIncludedAmount": {
          "unit": "EUR",
          "value": 1100.0
        }
      },
      {
        "id": "urn:ngsi-ld:applied-customer-billing-rate:2b731d0e-3777-4348-a834-003761ae412f",
        "href": "urn:ngsi-ld:applied-customer-billing-rate:2b731d0e-3777-4348-a834-003761ae412f",
        "date": "2025-01-25T11:11:01.470847126Z",
        "description": "Mongo training",
        "isBilled": true,
        "name": "202501268",
        "type": "-",
        "appliedTax": [
          {
            "taxCategory": "VAT",
            "taxRate": 10.0,
            "taxAmount": {
              "unit": "EUR",
              "value": 100.0
            }
          }
        ],
        "billingAccount": {
          "id": "urn:ngsi-ld:billing-account:99c38326-b1dd-4a90-b25d-80f97051c702",
          "href": "urn:ngsi-ld:billing-account:99c38326-b1dd-4a90-b25d-80f97051c702",
          "name": "qwert12345"
        },
        "taxExcludedAmount": {
          "unit": "EUR",
          "value": 1000.0
        },
        "taxIncludedAmount": {
          "unit": "EUR",
          "value": 1100.0
        }
      }
    ]
    return inv
  }

  updateInvoice(patchData:any,invoiceId:any){
    console.log('updatingInvoice...');
    console.log(invoiceId);
    console.log(patchData);
    let url = `${InvoicesService.BASE_URL}${InvoicesService.BASE_PATCH}${InvoicesService.API_ORDERING}/${invoiceId}`;
    return this.http.patch(url, patchData)
  }

  getAppliedCustomerBillingRates(billId: string) {
    console.log('Reading applied customer billing rates for bill:', billId);
    let url = `${InvoicesService.BASE_URL}${InvoicesService.BASE_PATCH}/appliedCustomerBillingRate?bill.id=${billId}`;
    console.log(url);
    return lastValueFrom(this.http.get<any[]>(url));
  }
}
