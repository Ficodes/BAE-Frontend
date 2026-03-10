import { Component, input } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faEarthEurope, faHandshake, faLayerGroup, faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons";
import { TranslateModule } from "@ngx-translate/core";

type FeatureCard = { html: string; hoverText: string; icon: any };
type Step = { num: string; title: string; desc: string };

@Component({
  selector: "app-dashboard-providers",
  standalone: true,
  imports: [FontAwesomeModule, TranslateModule],
  templateUrl: "./dashboard-providers.component.html",
  styleUrl: "./dashboard-providers.component.css",
})
export class DashboardProvidersComponent {
  providersLink = input.required<string>();

  featureCards: FeatureCard[] = [
    {
      html: "DASHBOARD.providers.features.market.title",
      hoverText: "DASHBOARD.providers.features.market.desc",
      icon: faEarthEurope
    },
    {
      html: "DASHBOARD.providers.features.trust.title",
      hoverText: "DASHBOARD.providers.features.trust.desc",
      icon: faHandshake
    },
    {
      html: "DASHBOARD.providers.features.tools.title",
      hoverText: "DASHBOARD.providers.features.tools.desc",
      icon: faScrewdriverWrench
    },
    {
      html: "DASHBOARD.providers.features.portfolio.title",
      hoverText: "DASHBOARD.providers.features.portfolio.desc",
      icon: faLayerGroup
    }
  ];

  steps: Step[] = [
    {
      num: "01",
      title: "DASHBOARD.providers.steps.onboard.title",
      desc: "DASHBOARD.providers.steps.onboard.desc"
    },
    {
      num: "02",
      title: "DASHBOARD.providers.steps.verify.title",
      desc: "DASHBOARD.providers.steps.verify.desc"
    },
    {
      num: "03",
      title: "DASHBOARD.providers.steps.publish.title",
      desc: "DASHBOARD.providers.steps.publish.desc"
    }
  ];
}
