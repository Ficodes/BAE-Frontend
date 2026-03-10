/* Copyright (c) 2022 Future Internet Consulting and Development Solutions S.L. */

import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from "@angular/common/http";
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CartDrawerComponent } from "./cart-drawer/cart-drawer.component";
import { CategoriesPanelComponent } from "./categories-panel/categories-panel.component";
import { EuropeTrademarkComponent } from './europe-trademark/europe-trademark.component';
import { FeedbackModalComponent } from './feedback-modal/feedback-modal.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { QuoteRequestModalComponent } from './quote-request-modal/quote-request-modal.component';

// Lista de componentes que pertenecen a este módulo.
const SHARED_COMPONENTS = [
  HeaderComponent,
  FooterComponent, EuropeTrademarkComponent,
  FeedbackModalComponent,
  CartDrawerComponent
];

// Lista de módulos comunes que este módulo necesita y re-exporta.
const SHARED_MODULES = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  FontAwesomeModule,
  TranslateModule,
  HttpClientModule,
  QuoteRequestModalComponent
];

// Lista de componentes/directivas Standalone que se importan y re-exportan.
const STANDALONE_IMPORTS = [
  CategoriesPanelComponent,
  RouterLink
];


@NgModule({
  imports: [
    ...SHARED_MODULES,
    ...STANDALONE_IMPORTS
  ],
  declarations: [
    ...SHARED_COMPONENTS
  ],
  exports: [
    ...SHARED_MODULES,
    ...SHARED_COMPONENTS,
    ...STANDALONE_IMPORTS
  ],
  providers: [
    DatePipe,
    TranslateService
  ]
})
export class SharedModule { }

