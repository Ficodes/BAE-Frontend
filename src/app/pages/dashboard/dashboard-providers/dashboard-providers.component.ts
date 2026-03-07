import { Component } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faEarthEurope, faHandshake, faLayerGroup, faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons";

type FeatureCard = { html: string; icon: any };
type Step = { num: string; title: string; desc: string };

@Component({
  selector: "app-dashboard-providers",
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: "./dashboard-providers.component.html",
  styleUrl: "./dashboard-providers.component.css",
})
export class DashboardProvidersComponent {
  featureCards: FeatureCard[] = [
    { html: "Reach a pan-<br/>European<br/>market", icon: faEarthEurope },
    { html: "Strengthen trust<br/>with customers", icon: faHandshake },
    { html: "Leverage DOME's<br/>provider tools", icon: faScrewdriverWrench },
    { html: "Complement and<br/>extend portfolio", icon: faLayerGroup },
  ];

  steps: Step[] = [
    {
      num: "01",
      title: "Onboard your organisation",
      desc: "Complete the onboarding and receive your credentials.",
    },
    {
      num: "02",
      title: "Describe & verify your services",
      desc: "Use DOME Marketplace templates to detail features, data handling and compliance",
    },
    {
      num: "03",
      title: "Publish & reach customers",
      desc: "Ready to go – Your services are available in the DOME catalogues",
    },
  ];
}
