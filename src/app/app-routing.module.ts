import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuoteListComponent } from "src/app/features/quotes/pages/quote-list/quote-list.component";
import { AboutDomeComponent } from "src/app/pages/about-dome/about-dome.component";
import { BlogEntryDetailComponent } from "src/app/pages/dome-blog/blog-entry-detail/blog-entry-detail.component";
import { DomeBlogComponent } from "src/app/pages/dome-blog/dome-blog.component";
import { EntryFormComponent } from "src/app/pages/dome-blog/entry-form/entry-form.component";
import { UsageSpecsComponent } from "src/app/pages/usage-specs/usage-specs.component";
import { AuthGuard } from './guard/auth.guard';
import { quoteGuardGuard } from './guard/quote-guard.guard';
import { AdminComponent } from "./pages/admin/admin.component";
import { CatalogsComponent } from "./pages/catalogs/catalogs.component";
import { CheckoutComponent } from "./pages/checkout/checkout.component";
import { ContactUsFormComponent } from "./pages/contact-us/contact-us-form.component";
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OrganizationDetailsComponent } from "./pages/organization-details/organization-details.component";
import { ProductDetailsComponent } from "./pages/product-details/product-details.component";
import { ProductInvDetailComponent } from './pages/product-inventory/inventory-items/product-inv-detail/product-inv-detail.component';
import { ProductInventoryComponent } from './pages/product-inventory/product-inventory.component';
import { ProductOrdersComponent } from './pages/product-orders/product-orders.component';
import { SearchCatalogComponent } from "./pages/search-catalog/search-catalog.component";
import { SearchComponent } from "./pages/search/search.component";
import { SellerOfferingsComponent } from "./pages/seller-offerings/seller-offerings.component";
import { ShoppingCartComponent } from "./pages/shopping-cart/shopping-cart.component";
import { UserProfileComponent } from "./pages/user-profile/user-profile.component";



const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'about',
    component: AboutDomeComponent
  },
  {
    path: 'search',
    component: SearchComponent
  },
  {
    path: 'search/:id',
    component: ProductDetailsComponent
  },
  {
    path: 'org-details/:id',
    component: OrganizationDetailsComponent
  },
  {
    path: 'search/catalogue/:id',
    component: SearchCatalogComponent
  },
  {
    path: 'catalogues',
    component: CatalogsComponent
  },
  {
    path: 'shopping-cart',
    component: ShoppingCartComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'checkout/:id',
    component: CheckoutComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'product-inventory',
    component: ProductInventoryComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'product-inventory/:id',
    component: ProductInvDetailComponent
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'my-offerings',
    component: SellerOfferingsComponent,
    canActivate: [AuthGuard], data: { roles: ['seller'] }
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard], data: { roles: ['admin', 'certifier'] }
  },
  {
    path: 'contact-us',
    component: ContactUsFormComponent
  },
  {
    path: 'product-orders',
    component: ProductOrdersComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'quote-list',
    component: QuoteListComponent,
    canActivate: [AuthGuard, quoteGuardGuard], data: { roles: [] }
  },
  {
    path: 'tenders',
    loadChildren: () => import('./features/tenders/tenders.module').then(m => m.TendersModule),
    canActivate: [AuthGuard, quoteGuardGuard],
    data: { roles: [] }
  },
  {
    path: 'usage-spec',
    component: UsageSpecsComponent,
    canActivate: [AuthGuard], data: { roles: ['seller'] }
  },
  {
    path: 'blog',
    component: DomeBlogComponent
  },
  {
    path: 'blog/:slugOrId',
    component: BlogEntryDetailComponent
  },
  {
    path: 'blog-entry',
    component: EntryFormComponent,
    canActivate: [AuthGuard], data: { roles: ['admin'] }
  },
  {
    path: 'blog-entry/:id',
    component: EntryFormComponent,
    canActivate: [AuthGuard], data: { roles: ['admin'] }
  },

  {
    path: 'landing-page',
    children: [{
      path: 'customers',
      loadComponent: () => import('./pages/landing-pages/customers/landing-page-customers.component').then(c => c.LandingPageCustomersComponent),
    },
    {
      path: 'providers',
      loadComponent: () => import('./pages/landing-pages/providers/landing-page-providers.component').then(c => c.LandingPageProvidersComponent),
    }]
  },

  { path: '**', redirectTo: 'dashboard', pathMatch: 'full' },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
