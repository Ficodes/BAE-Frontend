import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map } from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class RevenueSharingService {

  public static BASE_URL: String = environment.BASE_URL;
  public static PAYMENT_URL: String = environment.PAYMENT_URL;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getRevenue(id:any){
    let url = `${RevenueSharingService.BASE_URL}${RevenueSharingService.PAYMENT_URL}/dashboard/${id}`;
    //url= "https://payment.dome-marketplace-sbx.org/revenue/dashboard/urn:ngsi-ld:organization:a195013a-a0e4-493a-810a-b040e10da58f"
 
    return lastValueFrom(this.http.get<any>(url));
    //return [{"label":"My Subscription Plan","text":null,"link":null,"items":[{"label":"Plan Name","text":"BASIC","link":null,"items":null},{"label":"Start Date","text":"2025-07-01T00:00+08:00","link":null,"items":null},{"label":"Renewal Date","text":"2026-07-01T00:00+08:00","link":null,"items":null},{"label":"Discounts","text":"10% referral, 20% performance","link":null,"items":null}]},{"label":"Billing History","text":null,"link":null,"items":[{"label":"Invoice INV-2025-001","text":null,"link":null,"items":[{"label":"Status","text":"Paid","link":null,"items":null},{"label":"Issued On","text":"2025-01-15","link":null,"items":null},{"label":"Download","text":"Download PDF","link":"https://billing.dome.org/invoices/INV-2025-001","items":null}]},{"label":"Invoice INV-2025-002","text":null,"link":null,"items":[{"label":"Status","text":"Pending","link":null,"items":null},{"label":"Issued On","text":"2025-06-15","link":null,"items":null},{"label":"Download","text":"Download PDF","link":"https://billing.dome.org/invoices/INV-2025-002","items":null}]}]},{"label":"Revenue Volume Monitoring","text":null,"link":null,"items":[{"label":"Total Revenue for 2025-07-01 to 2026-07-01","text":"EUR 10.000,00","link":null,"items":null}]},{"label":"Referral Program Area","text":null,"link":null,"items":[{"label":"Referred Providers","text":"5","link":null,"items":null},{"label":"Discount Earned","text":"10%","link":null,"items":null}]},{"label":"Support","text":null,"link":null,"items":[{"label":"Email","text":"support@dome-marketplace.org","link":null,"items":null},{"label":"Help Center","text":"Visit Support Portal","link":"https://www.dome-helpcenter.org","items":null}]}]

    return [{
      "label":"Subscription",
      "text":"No active subscription found for this user.",
      "link":null,
      "items":null
  },
  {
      "label":"Billing History",
      "text":null,
      "link":null,
      "items":[ 
          {
              "label":"Invoice INV-2025-001",
              "text":null,
              "link":null,
              "items":[
                  {
                      "label":"Status",
                      "text":"Paid",
                      "link":null,
                      "items":null
                  },
                  {
                      "label":"Issued On",
                      "text":"2025-01-15",
                      "link":null,
                      "items":null
                  },
                  {
                      "label":"Download",
                      "text":"Download PDF",
                      "link":"https://billing.dome.org/invoices/INV-2025-001",
                      "items":null
                      }
                  ]
          },
          {
              "label":"Invoice INV-2025-002",
              "text":null,
              "link":null,
              "items":[
                  {
                      "label":"Status",
                      "text":"Pending",
                      "link":null,
                      "items":null
                  },
                  {
                      "label":"Issued On",
                      "text":"2025-06-15",
                      "link":null,
                      "items":null
                  },
                  {
                      "label":"Download",
                      "text":"Download PDF",
                      "link":"https://billing.dome.org/invoices/INV-2025-002",
                      "items":null
                  }
              ]
          }
      ]
  },
  {
      "label":"Revenue Summary",
      "text":"No revenue data available",
      "link":null,
      "items":null
  },
  {
      "label":"Referral Program Area",
      "text":null,
      "link":null,
      "items":[
          {
              "label":"Referred Providers",
              "text":"5",
              "link":null,
              "items":null
          },
          {
              "label":"Discount Earned",
              "text":"10%",
              "link":null,
              "items":null
          }
      ]
  },
  {
      "label":"Support",
      "text":null,
      "link":null,
      "items":[
          {
              "label":"Email",
              "text":"support@dome-marketplace.org",
              "link":null,
              "items":null
          },
          {
              "label":"Help Center",
              "text":"Visit Support Portal",
              "link":"https://www.dome-helpcenter.org",
              "items":null
          }
      ]
  }]
  }
}
