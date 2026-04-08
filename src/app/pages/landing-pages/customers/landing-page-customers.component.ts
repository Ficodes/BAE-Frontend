import { Component } from "@angular/core";
import { environment } from "src/environments/environment";
import { LandingCustomersBuyOptionsComponent } from './landing-customers-buy-options/landing-customers-buy-options.component';
import { LandingCustomersFaqsComponent } from './landing-customers-faqs/landing-customers-faqs.component';
import { LandingCustomersFinalCtaComponent } from './landing-customers-finalCta/landing-customers-finalCta.component';
import { LandingCustomersHeroComponent } from "./landing-customers-hero/landing-customers-hero.component";
import { LandingCustomersProcureStepsComponent } from './landing-customers-procure-steps/landing-customers-procure-steps.component';
import { LandingpageCustomersRightForYouComponent } from "./landing-customers-rightForYou/landing-customers-rightForYou.component";
import { LandingCustomersTrustedComponent } from './landing-customers-trusted/landing-customers-trusted.component';
import { LandingpageCustomersWhyJoinComponent } from "./landing-customers-whyJoin/landing-customers-whyJoin.component";

@Component({
  selector: "app-landing-page-customers",
  standalone: true,
  imports: [LandingCustomersHeroComponent, LandingCustomersTrustedComponent, LandingpageCustomersWhyJoinComponent, LandingpageCustomersRightForYouComponent, LandingCustomersBuyOptionsComponent, LandingCustomersProcureStepsComponent, LandingCustomersFaqsComponent, LandingCustomersFinalCtaComponent],
  templateUrl: "./landing-page-customers.component.html",
  styleUrl: "./landing-page-customers.component.css"
})
export class LandingPageCustomersComponent {
  ONBOARDING_CUSTOMERS_LINK = environment.DOME_CUSTOMER_REGISTER_LINK;
}
