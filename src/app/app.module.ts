import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app.component';
import { GalleryComponent } from "./offerings/gallery/gallery.component";
import { ExploreDomeComponent } from "./offerings/explore-dome/explore-dome.component";
import { PlatformBenefitsComponent } from "./offerings/platform-benefits/platform-benefits.component";
import { HowItWorksComponent } from "./offerings/how-it-works/how-it-works.component"; 
import { SearchComponent } from "./pages/search/search.component";
import { ProductDetailsComponent } from "./pages/product-details/product-details.component";
import { ProductInventoryComponent } from "./pages/product-inventory/product-inventory.component";
import { UserProfileComponent } from "./pages/user-profile/user-profile.component";
import { SellerOfferingsComponent } from "./pages/seller-offerings/seller-offerings.component";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SharedModule } from "./shared/shared.module";
import { AppRoutingModule } from './app-routing.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { HttpClient } from '@angular/common/http';
import {CategoriesFilterComponent} from "./shared/categories-filter/categories-filter.component";
import {CardComponent} from "./shared/card/card.component";
import {BadgeComponent} from "./shared/badge/badge.component";
import {BillingAccountFormComponent} from "./shared/billing-account-form/billing-account-form.component";
import { NgOptimizedImage } from '@angular/common';
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {CategoryItemComponent} from "./shared/category-item/category-item.component";
import { CartDrawerComponent } from "./shared/cart-drawer/cart-drawer.component";
import {CategoriesPanelComponent} from "./shared/categories-panel/categories-panel.component";
import { SearchCatalogComponent } from "./pages/search-catalog/search-catalog.component";
import { ShoppingCartComponent } from "./pages/shopping-cart/shopping-cart.component";
import { BillingAddressComponent } from "./pages/checkout/billing-address/billing-address.component";
import { CatalogsComponent } from "./pages/catalogs/catalogs.component";
import { CheckoutComponent } from "./pages/checkout/checkout.component";
import { RequestInterceptor } from './interceptors/requests-interceptor';
import { MarkdownModule } from 'ngx-markdown';
import { InventoryProductsComponent } from './pages/product-inventory/inventory-items/inventory-products/inventory-products.component';
import { UserInfoComponent } from './pages/user-profile/profile-sections/user-info/user-info.component';
import { OrgInfoComponent } from './pages/user-profile/profile-sections/org-info/org-info.component';
import { BillingInfoComponent } from './pages/user-profile/profile-sections/billing-info/billing-info.component';
import { OrderInfoComponent } from './pages/user-profile/profile-sections/order-info/order-info.component';
import { SellerCatalogsComponent } from './pages/seller-offerings/offerings/seller-catalogs/seller-catalogs.component';
import { SellerProductSpecComponent } from './pages/seller-offerings/offerings/seller-product-spec/seller-product-spec.component';
import { SellerServiceSpecComponent } from './pages/seller-offerings/offerings/seller-service-spec/seller-service-spec.component';
import { SellerResourceSpecComponent } from './pages/seller-offerings/offerings/seller-resource-spec/seller-resource-spec.component';
import { SellerOfferComponent } from './pages/seller-offerings/offerings/seller-offer/seller-offer.component';
import { CreateProductSpecComponent } from './pages/seller-offerings/offerings/seller-product-spec/create-product-spec/create-product-spec.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { NgxFileDropModule } from 'ngx-file-drop';
import { CreateServiceSpecComponent } from './pages/seller-offerings/offerings/seller-service-spec/create-service-spec/create-service-spec.component';
import { CreateResourceSpecComponent } from './pages/seller-offerings/offerings/seller-resource-spec/create-resource-spec/create-resource-spec.component';
import { CreateOfferComponent } from './pages/seller-offerings/offerings/seller-offer/create-offer/create-offer.component';
import {CategoriesRecursionComponent} from "./shared/categories-recursion/categories-recursion.component";
import { UpdateProductSpecComponent } from './pages/seller-offerings/offerings/seller-product-spec/update-product-spec/update-product-spec.component';
import { UpdateResourceSpecComponent } from './pages/seller-offerings/offerings/seller-resource-spec/update-resource-spec/update-resource-spec.component';
import { UpdateServiceSpecComponent } from './pages/seller-offerings/offerings/seller-service-spec/update-service-spec/update-service-spec.component';
import { ChatbotWidgetComponent } from './chatbot-widget/chatbot-widget.component';
import { UpdateOfferComponent } from './pages/seller-offerings/offerings/seller-offer/update-offer/update-offer.component';
import { CreateCatalogComponent } from './pages/seller-offerings/offerings/seller-catalogs/create-catalog/create-catalog.component';
import { UpdateCatalogComponent } from './pages/seller-offerings/offerings/seller-catalogs/update-catalog/update-catalog.component';
import { ErrorMessageComponent } from 'src/app/shared/error-message/error-message.component';
import { CartCardComponent } from 'src/app/shared/cart-card/cart-card.component';
import { AdminComponent } from './pages/admin/admin.component';
import { CategoriesComponent } from './pages/admin/categories/categories.component';
import { CreateCategoryComponent } from './pages/admin/categories/create-category/create-category.component';
import { UpdateCategoryComponent } from './pages/admin/categories/update-category/update-category.component';
import { CategoriesRecursionListComponent } from './shared/categories-recursion-list/categories-recursion-list.component';
import { ContactUsComponent } from './offerings/contact-us/contact-us.component';
import { ContactUsFormComponent } from './pages/contact-us/contact-us-form.component';
import { provideMatomo, MatomoModule, MatomoRouterModule, MatomoConfiguration, MatomoInitializationMode, MatomoInitializerService } from 'ngx-matomo-client';
import { withRouter } from 'ngx-matomo-client'
import { environment } from 'src/environments/environment';
import { AppInitService } from './services/app-init.service';
import { appConfigFactory } from './app-config-factory';
import { VerificationComponent } from './pages/admin/verification/verification.component';
import { EmailComponent } from './pages/admin/email/email.component';
import { InventoryResourcesComponent } from './pages/product-inventory/inventory-resources/inventory-resources.component';
import { InventoryServicesComponent } from './pages/product-inventory/inventory-services/inventory-services.component';
import { ProductInvDetailComponent } from './pages/product-inventory/inventory-items/product-inv-detail/product-inv-detail.component';
import { OrganizationDetailsComponent } from './pages/organization-details/organization-details.component';
import { FaqComponent } from './offerings/faq/faq.component';
import { NewPricePlanComponent } from './pages/seller-offerings/offerings/seller-offer/new-price-plan/new-price-plan.component';
import { UpdatePricePlanComponent } from './pages/seller-offerings/offerings/seller-offer/update-price-plan/update-price-plan.component';
import { MultipleSelectComponent } from './shared/multiple-select/multiple-select.component';
import {CharacteristicComponent} from "./shared/characteristic/characteristic.component";
import {PricePlanDrawerComponent} from "./shared/price-plan-drawer/price-plan-drawer.component";
import {OfferComponent} from "./shared/forms/offer/offer.component";
import {CustomOfferComponent} from "./shared/forms/offer/custom-offer/custom-offer.component"
import { ThemeService } from './services/theme.service';
import { ThemeAwareTranslateLoader } from './services/theme-aware-translate.loader';
import { RevenueReportComponent } from './shared/revenue-report/revenue-report.component'

// Función Factory requerida para crear el cargador con sus dependencias
export function createThemeAwareLoader(http: HttpClient, themeService: ThemeService) {
  return new ThemeAwareTranslateLoader(http, themeService);
}

import {AboutDomeComponent} from "src/app/pages/about-dome/about-dome.component"
import { QuotesModule } from "src/app/features/quotes/quotes.module"
import { MarkdownTextareaComponent } from "src/app/shared/forms/markdown-textarea/markdown-textarea.component"
import { ProviderRevenueSharingComponent } from "src/app/pages/user-profile/profile-sections/provider-revenue-sharing/provider-revenue-sharing.component"
import { OperatorRevenueSharingComponent } from "src/app/pages/admin/operator-revenue-sharing/operator-revenue-sharing.component"

@NgModule({
  declarations: [
    AppComponent,
    SearchComponent,
    GalleryComponent,
    PlatformBenefitsComponent,
    HowItWorksComponent,
    ExploreDomeComponent,
    CategoriesFilterComponent,
    CategoryItemComponent,
    CardComponent,
    BadgeComponent,
    //CartDrawerComponent,
    BillingAddressComponent,
    CheckoutComponent,
    ProductDetailsComponent,
    SearchCatalogComponent,
    CatalogsComponent,
    ShoppingCartComponent,
    ProductInventoryComponent,
    BillingAccountFormComponent,
    UserProfileComponent,
    OrgInfoComponent,
    SellerOfferingsComponent,
    InventoryProductsComponent,
    UserInfoComponent,
    BillingInfoComponent,
    OrderInfoComponent,
    SellerCatalogsComponent,
    SellerProductSpecComponent,
    SellerServiceSpecComponent,
    SellerResourceSpecComponent,
    SellerOfferComponent,
    CreateProductSpecComponent,
    CreateServiceSpecComponent,
    CreateResourceSpecComponent,
    CreateOfferComponent,
    CategoriesRecursionComponent,
    UpdateProductSpecComponent,
    UpdateResourceSpecComponent,
    UpdateServiceSpecComponent,
    UpdateOfferComponent,
    CreateCatalogComponent,
    UpdateCatalogComponent,
    ErrorMessageComponent,
    CartCardComponent,
    AdminComponent,
    CategoriesComponent,
    CreateCategoryComponent,
    UpdateCategoryComponent,
    CategoriesRecursionListComponent,
    ContactUsComponent,
    ContactUsFormComponent,
    VerificationComponent,
    EmailComponent,
    InventoryResourcesComponent,
    InventoryServicesComponent,
    ProductInvDetailComponent,
    OrganizationDetailsComponent,
    FaqComponent,
    NewPricePlanComponent,
    UpdatePricePlanComponent
  ],
    imports: [
        BrowserModule,
        FontAwesomeModule,
        SharedModule,
        AppRoutingModule,
        NgOptimizedImage,
        FaIconComponent,
        FormsModule,
        ReactiveFormsModule,
        PickerComponent,
        NgxFileDropModule,
        ChatbotWidgetComponent,
        QuotesModule,
        MarkdownModule.forRoot(),
        TranslateModule.forRoot({
            defaultLanguage: 'en',
            loader: {
                provide: TranslateLoader,
                useFactory: (createThemeAwareLoader),
                deps: [HttpClient, ThemeService]
            }
        }),
        CategoriesPanelComponent,
        MatomoModule.forRoot({
            mode: MatomoInitializationMode.AUTO_DEFERRED
        }),
        MatomoRouterModule,
        CharacteristicComponent,
        PricePlanDrawerComponent,
        RevenueReportComponent,
        OfferComponent,
        CustomOfferComponent,
        AboutDomeComponent,
        MarkdownTextareaComponent,
        ProviderRevenueSharingComponent,
        OperatorRevenueSharingComponent
    ],
  providers: [
    AppInitService,
    {
      provide: APP_INITIALIZER,
      useFactory: appConfigFactory,
      deps: [AppInitService, MatomoInitializerService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestInterceptor,
      multi: true,
    }
  ],
  exports: [
    CategoriesRecursionComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/');
}
