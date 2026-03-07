import { Component } from "@angular/core";

type Milestone = {
  title: string;
  desc: string;
  active: boolean;
};

@Component({
  selector: "app-dashboard-ecosystem",
  standalone: true,
  templateUrl: "./dashboard-ecosystem.component.html",
})
export class DashboardEcosystemComponent {
  milestones: Milestone[] = [
    {
      title: "DOME IS LIVE",
      desc: "Initial catalogue of verified providers and services, built-in procurement tools",
      active: true,
    },
    {
      title: "MORE SERVICES, BETTER TOOLS",
      desc: "Expanded catalogue, better tools, improved verification workflows",
      active: false,
    },
    {
      title: "FEDERATION AT SCALE",
      desc: "A connected network of marketplaces, providers and customers, driving cross-border transactions through trust, sovereignty and fair access",
      active: false,
    },
  ];
}
