import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  notification$ = this.notificationSubject.asObservable();

  showSuccess(message: string) {
    this.show({ type: 'success', message });
  }

  showError(message: string) {
    this.show({ type: 'error', message });
  }

  showInfo(message: string) {
    this.show({ type: 'info', message });
  }

  private show(notification: Notification) {
    this.notificationSubject.next(notification);
    setTimeout(() => this.clear(), 3000);
  }

  clear() {
    this.notificationSubject.next(null);
  }
} 