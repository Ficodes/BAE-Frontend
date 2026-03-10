import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'operator-revenue-sharing',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule],
  templateUrl: './operator-revenue-sharing.component.html',
  styleUrl: './operator-revenue-sharing.component.css'
})
export class OperatorRevenueSharingComponent {
  loading: boolean = false;
  items: any[]=[{
    title: 'Total Subcription Revenue',
    description: '€45.000 (Q2 2025)'
  }];
}
