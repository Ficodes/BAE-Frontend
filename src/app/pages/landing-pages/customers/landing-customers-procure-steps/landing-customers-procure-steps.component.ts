import { Component, input } from "@angular/core";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBagShopping, faHandshake, faMagnifyingGlass, faUser } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';

type ProcureStep = {
  key: string;
  icon: any;
};


@Component({
  selector: "app-landing-customers-procure-steps",
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule],
  templateUrl: "./landing-customers-procure-steps.component.html",
  styleUrl: "./landing-customers-procure-steps.component.css"
})
export class LandingCustomersProcureStepsComponent {
  url = input.required<string>();

  steps: ProcureStep[] = [
    { key: 'step1', icon: faUser },
    { key: 'step2', icon: faMagnifyingGlass },
    { key: 'step3', icon: faBagShopping },
    { key: 'step4', icon: faHandshake }
  ];
}
