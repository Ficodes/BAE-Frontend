import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { LandingPageProvidersFaqsComponent } from './landing-providers-faqs/landing-providers-faqs.component';
import { LandingPageProvidersFitComponent } from './landing-providers-fit/landing-providers-fit.component';
import { LandingPageProvidersGrowComponent } from './landing-providers-grow/landing-providers-grow.component';
import { LandingPageProvidersHeroComponent } from './landing-providers-hero/landing-providers-hero.component';
import { LandingPageProvidersIncludedComponent } from "./landing-providers-included/landing-providers-included.component";
import { LandingPageProvidersProcureComponent } from "./landing-providers-procure/landing-providers-procure.component";
import { LandingPageProvidersTrustComponent } from './landing-providers-trust/landing-providers-trust.component';
import { LandingPageProvidersWhyComponent } from './landing-providers-why/landing-providers-why.component';

@Component({
  selector: "app-landing-page-providers",
  standalone: true,
  imports: [LandingPageProvidersHeroComponent, LandingPageProvidersTrustComponent, LandingPageProvidersWhyComponent, LandingPageProvidersFitComponent, LandingPageProvidersIncludedComponent, LandingPageProvidersProcureComponent, LandingPageProvidersFaqsComponent, LandingPageProvidersGrowComponent],
  templateUrl: "./landing-page-providers.component.html",
  styleUrl: "./landing-page-providers.component.css"
})
export class LandingPageProvidersComponent {
  ONBOARDING_PROVIDERS_LINK = environment.DOME_REGISTER_LINK;

  constructor() { }
}
