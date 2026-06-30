import { Component, input } from "@angular/core";

import { RouterLink } from "@angular/router";
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
  imports: [TranslateModule, RouterLink]
})
export class DashboardEcosystemComponent {

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
