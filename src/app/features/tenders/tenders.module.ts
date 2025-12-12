import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { tendersRoutes } from './tenders.routes';
import { TenderListComponent } from './pages/tender-list/tender-list.component';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(tendersRoutes),
    TenderListComponent,
    NotificationComponent,
    ConfirmDialogComponent
  ],
  declarations: []
})
export class TendersModule { }

