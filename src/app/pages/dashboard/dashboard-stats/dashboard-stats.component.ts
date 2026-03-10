import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IDashboardStats } from '../dashboard.component';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  templateUrl: './dashboard-stats.component.html',
  styleUrl: './dashboard-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule]
})
export class DashboardStatsComponent {
  stats = input.required<IDashboardStats>();

  constructor() { }

}
