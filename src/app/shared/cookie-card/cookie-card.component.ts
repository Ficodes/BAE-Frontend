import { Component, OnInit } from '@angular/core';
import { CookieRenewalService } from "src/app/services/cookie-renewal.service";
import {LocalStorageService} from "../../services/local-storage.service";
import {EventMessageService} from "../../services/event-message.service";
import { CookieInfo } from 'src/app/models/interfaces';
import { environment } from 'src/environments/environment';
import * as moment from 'moment';

@Component({
  selector: 'cookie-card',
  templateUrl: './cookie-card.component.html',
  styleUrl: './cookie-card.component.css'
})
export class CookieCardComponent {
  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private cookieService: CookieRenewalService
    ) { }

    allowCookies(){
      this.localStorage.setObject('cookie_info',{
        "allowed": true,
        "expire": environment.COOKIE_INTERVAL
      });
      this.cookieService.startCookieInterval(environment.COOKIE_INTERVAL);
      this.eventMessage.emitCookiesAllowed();
    }
}
