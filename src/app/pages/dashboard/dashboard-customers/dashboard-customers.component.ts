import { Component } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faCircleCheck, faEye } from "@fortawesome/free-regular-svg-icons";
import { faBoltLightning, faDiagramProject } from "@fortawesome/free-solid-svg-icons";

type FeatureCard = { html: string; icon: any };
type Step = { num: string; title: string; desc: string };

@Component({
  selector: "app-dashboard-customers",
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: "./dashboard-customers.component.html",
  styleUrl: './dashboard-customers.component.css'
})
export class DashboardCustomersComponent {
  featureCards: FeatureCard[] = [
    { html: "Access to<br/>verified digital<br/>services", icon: faCircleCheck },
    { html: "Transparent,<br/>guided service<br/>discovery", icon: faEye },
    { html: "Powerful<br/>procurement<br/>tools", icon: faBoltLightning },
    { html: "Unified access to<br/>a broad<br/>ecosystem", icon: faDiagramProject },
  ];

  steps: Step[] = [
    { num: "01", title: "Register as a customer", desc: "Create your customer profile" },
    {
      num: "02",
      title: "Search & compare",
      desc: "Find services that fit your needs and assess sustainability with standardized documentation and trust badges.",
    },
    {
      num: "03",
      title: "Connect & procure",
      desc: "Procure directly with providers - or use DOME's tools to manage the process end-to-end.",
    },
  ];
}
