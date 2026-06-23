import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import * as moment from "moment";
import { Observer } from "rxjs";
import { applyRuntimeSearchFiltersConfig } from "src/app/data/availableFilters";
import { applyRuntimeFeaturesConfig } from "src/app/data/featuresConfig";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  constructor(private http: HttpClient) { }

  init(): Promise<any> {
    return new Promise((resolve, reject) => {
        const obs: Observer<any> = {
            next: ((config) => {
                const aiConfig = config.ai ?? {};
                // Load dynamic environment data
                environment.SIOP_INFO = config.siop;
                environment.CHAT_API = config.chat;
                environment.MATOMO_SITE_ID = config.matomoId;
                environment.MATOMO_TRACKER_URL = config.matomoUrl;
                environment.KNOWLEDGE_BASE_URL = config.knowledgeBaseUrl;
                environment.TICKETING_SYSTEM_URL = config.ticketingUrl;
                environment.DOME_TRUST_LINK = config.domeTrust;
                environment.DOME_ABOUT_LINK = config.domeAbout;
                environment.DOME_REGISTER_LINK = config.domeRegister;
                environment.DOME_CUSTOMER_REGISTER_LINK = config.domeRegisterCustomer;
                environment.DOME_PUBLISH_LINK = config.domePublish;
                environment.KB_ONBOARDING_GUIDELINES_URL = config.domeOnboardingGuidelines;
                environment.KB_GUIDELNES_URL = config.domeGuidelines;
                environment.REGISTRATION_FORM_URL = config.domeRegistrationForm;
                environment.DFT_CATALOG_ID = config.defaultId;
                environment.SELLER_ROLE = config.roles?.seller;
                environment.BUYER_ROLE = config.roles?.customer;
                environment.ADMIN_ROLE = config.roles?.admin;
                environment.ORG_ADMIN_ROLE = config.roles?.orgAdmin;
                environment.CERTIFIER_ROLE = config.roles?.certifier;
                environment.quoteApi = config.quoteApi ?? 'http://localhost:8080/quoteManagement';
                const analyticsConfig = this.getAnalyticsConfig(config);
                environment.analytics = analyticsConfig.link;
                environment.analyticsSupersetDomain = analyticsConfig.supersetDomain;
                environment.feedbackCampaign = config.feedbackCampaign ?? false;
                environment.feedbackCampaignExpiration = config.feedbackCampaign ?? moment().add(1, 'week').unix();
                environment.providerThemeName = config.theme ?? 'default';
                environment.LEAR_URL = config.learUrl ?? '';
                environment.AI_SEARCH_API_KEY = aiConfig.aiApiKey ?? config.aiApiKey ?? '';
                environment.AI_SEARCH_API_URL = aiConfig.aiApiUrl ?? config.aiApiUrl ?? '';
                environment.AI_SEARCH_PROFILE = aiConfig.aiSearchProfile ?? config.aiSearchProfile ?? '';
                applyRuntimeFeaturesConfig(config);
                applyRuntimeSearchFiltersConfig(config);
                resolve(config);
            }),
            error: (error) => {
                reject(error);
            },
            complete: () => {}
        }
        this.http.get<any>(`${environment.BASE_URL}/config`).subscribe(obs);
    });
  }

  private getAnalyticsConfig(config: any): {
    link: string;
    supersetDomain: string;
  } {
    const defaultAnalyticsLink = 'https://analytics.dome-marketplace-sbx.org/';
    const analyticsConfig = config?.analytics && typeof config.analytics === 'object'
      ? config.analytics
      : {};
    return {
      link: typeof config?.analytics === 'string'
        ? config.analytics
        : analyticsConfig.link ?? defaultAnalyticsLink,
      supersetDomain: config?.analyticsSupersetDomain
        ?? analyticsConfig.supersetDomain
        ?? analyticsConfig.domain
        ?? ''
    };
  }
}
