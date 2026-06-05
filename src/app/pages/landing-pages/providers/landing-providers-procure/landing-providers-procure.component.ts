import { Component, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBagShopping, faHandshake, faMagnifyingGlass, faUser } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';

type ProcureStep = {
  number: number;
  textKey: string;
  icon: any;
};

@Component({
  selector: "app-landing-page-providers-procure",
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule],
  templateUrl: "./landing-providers-procure.component.html",
  styleUrl: "./landing-providers-procure.component.css"
})
export class LandingPageProvidersProcureComponent {
  url = input.required<string>();

  steps: ProcureStep[] = [
    {
      number: 1,
      textKey: 'LANDINGPAGE.providers.procureSteps.steps.step1',
      icon: faUser
    },
    {
      number: 2,
      textKey: 'LANDINGPAGE.providers.procureSteps.steps.step2',
      icon: faMagnifyingGlass
    },
    {
      number: 3,
      textKey: 'LANDINGPAGE.providers.procureSteps.steps.step3',
      icon: faBagShopping
    },
    {
      number: 4,
      textKey: 'LANDINGPAGE.providers.procureSteps.steps.step4',
      icon: faHandshake
    }
  ];
}
