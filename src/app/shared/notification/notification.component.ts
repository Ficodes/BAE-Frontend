import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="notificationService.notification$ | async as notification"
      [ngClass]="{
        'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg': true,
        'bg-green-100 text-green-800': notification.type === 'success',
        'bg-red-100 text-red-800': notification.type === 'error',
        'bg-blue-100 text-blue-800': notification.type === 'info'
      }"
      class="transition-all duration-300 ease-in-out"
    >
      {{ notification.message }}
    </div>
  `
})
export class NotificationComponent implements OnInit {
  constructor(public notificationService: NotificationService) {}

  ngOnInit() {}
} 