import {Component, OnInit, SecurityContext } from '@angular/core'; 
import { DomSanitizer } from '@angular/platform-browser';
import {   map, Subject, takeUntil} from 'rxjs'; 
import { ProductOffering } from 'src/app/models/product.model';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { DashboardFooterComponent } from './dashboard-footer/dashboard-footer.component';
import { DashboardHeaderComponent } from './dashboard-header/dashboard-header.component';
import { TranslateModule } from '@ngx-translate/core';
import { SlicePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: true, 
  imports: [DashboardFooterComponent, DashboardHeaderComponent, TranslateModule, SlicePipe],
})
export class DashboardComponent  implements OnInit {
  private unSub = new Subject();
  productOfferings?: ProductOffering[];
  protected MAX_CATEGORIES_PER_PRODUCT_OFFERING = 3;

  constructor(
    private productService: ApiServiceService,
    private domSanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.getFirstThreeRandomProductOfferings();
  }

  private getFirstThreeRandomProductOfferings(): void {
    this.productService
      .getAllProducts()
      .pipe(
        takeUntil(this.unSub),
        map((items) =>
          items.map((el) => ({
            ...el,
            description: el.description
              ? (this.domSanitizer.sanitize(
                  SecurityContext.HTML,
                  el.description,
                ) ?? undefined)
              : el.description,
          })),
        ),
        map((items) => {
          const result = new Set<number>();
          const max = Math.min(3, items.length);

          while (result.size < max) {
            result.add(Math.floor(Math.random() * items.length));
          }

          return [...result].map((i) => items[i]);
        }),
      )
      .subscribe((picked) => {
        this.productOfferings = picked;
      });
  }

  ngOnDestroy() {
    this.unSub.complete();
    this.unSub.unsubscribe();
  }

}
