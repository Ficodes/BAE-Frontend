import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-hero',
  standalone: true,
  templateUrl: './dashboard-hero.component.html',
  styleUrl: './dashboard-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHeroComponent { }
