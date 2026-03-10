import { Component, input } from "@angular/core";
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faCircleCheck, faEye } from "@fortawesome/free-regular-svg-icons";
import { faBoltLightning, faDiagramProject } from "@fortawesome/free-solid-svg-icons";
import { TranslateModule } from '@ngx-translate/core';

type FeatureCard = { html: string; hoverText: string; icon: any };
type Step = { num: string; title: string; desc: string };

@Component({
  selector: "app-dashboard-customers",
  standalone: true,
  imports: [FontAwesomeModule, TranslateModule, RouterLink],
  templateUrl: "./dashboard-customers.component.html",
  styleUrl: "./dashboard-customers.component.css"
})
export class DashboardCustomersComponent {
  customerLink = input.required<string>();

  featureCards: FeatureCard[] = [
    {
      html: 'DASHBOARD.customers._cards.access.title',
      hoverText: 'DASHBOARD.customers._cards.access.desc',
      icon: faCircleCheck
    },
    {
      html: 'DASHBOARD.customers._cards.discovery.title',
      hoverText: 'DASHBOARD.customers._cards.discovery.desc',
      icon: faEye
    },
    {
      html: 'DASHBOARD.customers._cards.procurement.title',
      hoverText: 'DASHBOARD.customers._cards.procurement.desc',
      icon: faBoltLightning
    },
    {
      html: 'DASHBOARD.customers._cards.ecosystem.title',
      hoverText: 'DASHBOARD.customers._cards.ecosystem.desc',
      icon: faDiagramProject
    }
  ];

  steps: Step[] = [
    {
      num: '01',
      title: 'DASHBOARD.customers._steps.register.title',
      desc: 'DASHBOARD.customers._steps.register.desc'
    },
    {
      num: '02',
      title: 'DASHBOARD.customers._steps.search.title',
      desc: 'DASHBOARD.customers._steps.search.desc'
    },
    {
      num: '03',
      title: 'DASHBOARD.customers._steps.connect.title',
      desc: 'DASHBOARD.customers._steps.connect.desc'
    }
  ];
}
