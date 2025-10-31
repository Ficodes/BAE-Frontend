import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductInventoryComponent } from './pages/product-inventory/product-inventory.component';
import { ProductInvDetailComponent } from './pages/product-inventory/inventory-items/product-inv-detail/product-inv-detail.component';
import { SearchComponent } from "./pages/search/search.component";
import { ProductDetailsComponent } from "./pages/product-details/product-details.component";
import { SearchCatalogComponent } from "./pages/search-catalog/search-catalog.component";
import { CatalogsComponent } from "./pages/catalogs/catalogs.component";
import { ShoppingCartComponent } from "./pages/shopping-cart/shopping-cart.component";
import {CheckoutComponent} from "./pages/checkout/checkout.component";
import { UserProfileComponent } from "./pages/user-profile/user-profile.component";
import { SellerOfferingsComponent } from "./pages/seller-offerings/seller-offerings.component";
import { AdminComponent } from "./pages/admin/admin.component";
import { ContactUsFormComponent } from "./pages/contact-us/contact-us-form.component";
import { AuthGuard } from './guard/auth.guard';
import { OrganizationDetailsComponent } from "./pages/organization-details/organization-details.component"
import { ProductOrdersComponent } from './pages/product-orders/product-orders.component';
import {AboutDomeComponent} from "src/app/pages/about-dome/about-dome.component"
import { QuoteListComponent } from "src/app/features/quotes/pages/quote-list/quote-list.component"
import { UsageSpecsComponent } from "src/app/pages/usage-specs/usage-specs.component"
import { DomeBlogComponent } from "src/app/pages/dome-blog/dome-blog.component"
import { BlogEntryDetailComponent } from "src/app/pages/dome-blog/blog-entry-detail/blog-entry-detail.component"
import { EntryFormComponent } from "src/app/pages/dome-blog/entry-form/entry-form.component"

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
  { path: 'search/:id',
    component: ProductDetailsComponent
  },
  { path: 'org-details/:id',
    component: OrganizationDetailsComponent
  },
  { path: 'search/catalogue/:id',
  component: SearchCatalogComponent
  },
  { path: 'catalogues',
  component: CatalogsComponent
  },
  { path: 'shopping-cart',
  component: ShoppingCartComponent,
  canActivate: [AuthGuard], data: { roles: [] }
  },
  { path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  { path: 'checkout/:id',
    component: CheckoutComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  { path: 'product-inventory',
  component: ProductInventoryComponent,
  canActivate: [AuthGuard], data: { roles: [] }
  },
  { path: 'product-inventory/:id',
  component: ProductInvDetailComponent
  },
  { path: 'profile',
  component: UserProfileComponent,
  canActivate: [AuthGuard], data: { roles: ['individual','orgAdmin'] }
  },
  { path: 'my-offerings',
  component: SellerOfferingsComponent,
  canActivate: [AuthGuard], data: { roles: ['seller'] }
  },
  { path: 'admin',
  component: AdminComponent,
  canActivate: [AuthGuard], data: { roles: ['admin', 'certifier'] }
  },
  { path: 'contact-us',
    component: ContactUsFormComponent
  },
  { path: 'product-orders',
    component: ProductOrdersComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  { path: 'quote-list',
    component: QuoteListComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'usage-spec',
    component: UsageSpecsComponent,
    canActivate: [AuthGuard], data: { roles: ['seller'] }
  },
  { path: 'blog',
    component: DomeBlogComponent
  },
  { path: 'blog/:id',
    component: BlogEntryDetailComponent
  },
  { path: 'blog-entry',
    component: EntryFormComponent
  },
  { path: 'blog-entry/:id',
    component: EntryFormComponent
  },
  { path: '**', redirectTo: 'dashboard', pathMatch: 'full' },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

