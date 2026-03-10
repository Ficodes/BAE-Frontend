import { Component, Input } from '@angular/core';
import {Report} from 'src/app/models/interfaces'

@Component({
  selector: 'app-revenue-report',
  standalone: true,
  imports: [],
  templateUrl: './revenue-report.component.html',
  styleUrl: './revenue-report.component.css'
})
export class RevenueReportComponent {
  @Input() node!: any;
}
