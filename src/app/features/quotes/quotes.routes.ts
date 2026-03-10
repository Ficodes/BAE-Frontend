import { Routes } from '@angular/router';
import { QuoteListComponent } from './pages/quote-list/quote-list.component';
import { QuoteDetailsComponent } from './pages/quote-details/quote-details.component';
import { QuoteFormComponent } from './pages/quote-form/quote-form.component';

export const quotesRoutes: Routes = [
  {
    path: '',
    component: QuoteListComponent
  },
  {
    path: 'new',
    component: QuoteFormComponent
  },
  {
    path: ':id/edit',
    component: QuoteFormComponent
  }
]; 