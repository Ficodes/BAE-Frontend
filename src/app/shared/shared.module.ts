/* Copyright (c) 2022 Future Internet Consulting and Development Solutions S.L. */

import {NgModule} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from "@angular/common/http";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {CategoriesPanelComponent} from "./categories-panel/categories-panel.component";
import { CartDrawerComponent } from "./cart-drawer/cart-drawer.component";
import { FeedbackModalComponent } from './feedback-modal/feedback-modal.component';

const imports: any[] = [
  CommonModule,
  HttpClientModule,
  FormsModule,
  ReactiveFormsModule,
  FontAwesomeModule,
  TranslateModule
];

const declarations: any[] = [
  HeaderComponent,
  FooterComponent,
  CartDrawerComponent,
  FeedbackModalComponent
];


@NgModule({
    imports: [...imports, CategoriesPanelComponent],
  exports: [...imports, ...declarations],
  declarations: [...declarations],
  providers:[DatePipe, TranslateService]
})
export class SharedModule { }
