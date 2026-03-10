import { Component, input } from "@angular/core";
import { TranslateModule } from '@ngx-translate/core';

type Milestone = {
  title: string;
  desc: string;
  active: boolean;
};

@Component({
  selector: "app-dashboard-ecosystem",
  standalone: true,
  templateUrl: "./dashboard-ecosystem.component.html",
  imports: [TranslateModule]
})
export class DashboardEcosystemComponent {

  providersLink = input.required<string>();
  customersLink = input.required<string>();

  milestones: Milestone[] = [
    {
      title: "DASHBOARD.ecosystem._milestones._live._title",
      desc: "DASHBOARD.ecosystem._milestones._live._desc",
      active: true,
    },
    {
      title: "DASHBOARD.ecosystem._milestones._tools._title",
      desc: "DASHBOARD.ecosystem._milestones._tools._desc",
      active: false,
    },
    {
      title: "DASHBOARD.ecosystem._milestones._federation._title",
      desc: "DASHBOARD.ecosystem._milestones._federation._desc",
      active: false,
    },
  ];
}
