import { Injectable } from '@angular/core';
import { Observable, Subscription, interval } from 'rxjs';
import * as moment from 'moment';
import {LocalStorageService} from "./local-storage.service";
import { CookieInfo } from '../models/interfaces';
import { environment } from "src/environments/environment";
import { Router } from '@angular/router';
import {EventMessageService} from "./event-message.service";

@Injectable({
  providedIn: 'root'
})
export class CookieRenewalService {

  private intervalObservable: Observable<number>;
  private intervalSubscription: Subscription | undefined;

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService
    ) {
  }

  startCookieInterval(intervalDuration: number): void {
    this.intervalObservable = interval(intervalDuration);
    console.log('start interval')
    console.log(intervalDuration)

    this.intervalSubscription = this.intervalObservable.subscribe(() => {
      console.log('cookie subscription')

      //let aux = this.localStorage.getObject('cookie_info') as CookieInfo;
      this.stopCookieInterval();
      this.localStorage.setObject('cookie_info',{
        "allowed": false,
        "expire": environment.COOKIE_INTERVAL
      });
      //this.startCookieInterval(moment().unix());
      this.eventMessage.emitCookiesDisabled();

    });
  }

  stopCookieInterval(): void {
    if (this.intervalSubscription) {
      console.log('stop cookie interval')
      this.intervalSubscription.unsubscribe();
    }
  }
}
