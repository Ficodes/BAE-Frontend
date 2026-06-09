import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Observable, Subscription, interval } from 'rxjs';
import { LoginServiceService } from 'src/app/services/login-service.service';
import { LoginInfo } from '../models/interfaces';
import { EventMessageService } from './event-message.service';
import { LocalStorageService } from "./local-storage.service";
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class RefreshLoginServiceService {
  private intervalObservable: Observable<number>;
  private intervalSubscription: Subscription | undefined;

  constructor(
    private localStorage: LocalStorageService,
    private api: LoginServiceService,
    private router: Router,
    private eventMessage: EventMessageService,
    private notificationService: NotificationService
  ) {
    //this.intervalObservable = interval(1000); // Default interval duration set to 1000 milliseconds (1 second)
  }

  startInterval(intervalDuration: number, data: any): void {
    this.intervalObservable = interval(intervalDuration);

    this.intervalSubscription = this.intervalObservable.subscribe(() => {
      let aux = this.localStorage.getObject('login_items') as LoginInfo;
      this.api.getLogin(aux['token']).then(refreshed => {
        this.stopInterval()

        this.localStorage.setObject('login_items', {
          "id": refreshed.id,
          "user": refreshed.username,
          "email": refreshed.email,
          "token": refreshed.accessToken,
          "expire": refreshed.expire,
          "partyId": aux['partyId'],
          "roles": refreshed.roles,
          "organizations": aux['organizations'],
          "logged_as": aux['logged_as']
        });

        // Start the interval only if the token has been really refreshed
        // Otherwise close the session
        if (refreshed.expire > moment().unix() + 4) {
          this.startInterval(((refreshed.expire - moment().unix()) - 4) * 1000, refreshed)
        } else {
          this.logout();
        }
      }).catch(error => {
        console.error('Error refreshing token', error);
        this.logout();
      })
    });
  }

  stopInterval(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  private logout(): void {
    this.stopInterval();
    // Only logout if user is logged
    const aux = this.localStorage.getObject('login_items') as any;
    if (aux && Object.keys(aux).length > 0) {
      this.localStorage.setObject('login_items', {});
      this.eventMessage.emitLogin({} as LoginInfo);
      this.api.logout()
        .catch((err) => {
          console.error('Error during logout:', err);
        })

      this.router.navigate(['/dashboard']).then(() => {
        this.notificationService.showInfo('Your session has expired. Please log in again.');
      })
    }
  }
}
