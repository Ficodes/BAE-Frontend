import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SearchComponent } from "./pages/search/search.component";
import { ProductDetailsComponent } from "./pages/product-details/product-details.component";
import { SearchCatalogComponent } from "./pages/search-catalog/search-catalog.component";
import { CatalogsComponent } from "./pages/catalogs/catalogs.component";
import { ShoppingCartComponent } from "./pages/shopping-cart/shopping-cart.component";

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'search',
    component: SearchComponent
  },
  { path: 'search/:id', 
    component: ProductDetailsComponent
  },
  { path: 'search/catalog/:id', 
  component: SearchCatalogComponent
  },
  { path: 'catalogs', 
  component: CatalogsComponent
  },
  { path: 'shopping-cart', 
  component: ShoppingCartComponent
  }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

