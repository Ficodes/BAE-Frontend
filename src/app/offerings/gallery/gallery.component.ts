import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {CardComponent} from "../../shared/card/card.component";
import {components} from "../../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import { ApiServiceService } from 'src/app/services/product-service.service';
import {ThemeService} from "../../services/theme.service";
import {ThemeConfig} from "../../themes";
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'bae-off-gallery',
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css'
})
export class GalleryComponent implements OnInit, OnDestroy {

  products: ProductOffering[]=[];
  private themeSubscription: Subscription = new Subscription();
  currentTheme: ThemeConfig | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService) {
  }

  //Must be under environment.PRODUCT_LIMIT (i.e. 6 atm)
  gallery_limit=4;

  ngOnInit() {
    this.themeSubscription = this.themeService.currentTheme$
    .pipe(takeUntil(this.destroy$))
    .subscribe(theme => {
      this.currentTheme = theme;
    });
    console.log('API RESPONSE:')
    this.api.getProducts(0,undefined).then(async data => {
      const firstFour = data.slice(0, 4);
      this.products=await this.api.getProductsDetails(firstFour);
     /* for(let i=0; i < this.gallery_limit && i < data.length; i++){
          let attachment: any[]= []
          this.api.getProductSpecification(data[i].productSpecification.id).then(spec => {
            attachment = spec.attachment
            let prodPrices: any[] | undefined= data[i].productOfferingPrice;
            let prices: any[]=[];
            if(prodPrices!== undefined){
              if(prodPrices.length>0){
                for(let j=0; j < prodPrices.length; j++){
                  this.api.getProductPrice(prodPrices[j].id).then(price => {
                    prices.push(price);
                    if(j+1==prodPrices?.length){
                      this.products.push(
                        {
                          id: data[i].id,
                          name: data[i].name,
                          category: data[i].category,
                          description: data[i].description,
                          lastUpdate: data[i].lastUpdate,
                          attachment: attachment,
                          productOfferingPrice: prices,
                          productSpecification: data[i].productSpecification,
                          productOfferingTerm: data[i].productOfferingTerm,
                          version: data[i].version
                        }
                      )
                      this.cdr.detectChanges();
                    }
                  })
                }
              } else {
                this.products.push(
                  {
                    id: data[i].id,
                    name: data[i].name,
                    category: data[i].category,
                    description: data[i].description,
                    lastUpdate: data[i].lastUpdate,
                    attachment: attachment,
                    productOfferingPrice: prices,
                    productSpecification: data[i].productSpecification,
                    productOfferingTerm: data[i].productOfferingTerm,
                    version: data[i].version
                  }
                )                 
              }
            } else {
              this.products.push(
                {
                  id: data[i].id,
                  name: data[i].name,
                  category: data[i].category,
                  description: data[i].description,
                  lastUpdate: data[i].lastUpdate,
                  attachment: attachment,
                  productOfferingPrice: prices,
                  productSpecification: data[i].productSpecification,
                  productOfferingTerm: data[i].productOfferingTerm,
                  version: data[i].version
                }
              )              
            }

          })
        }*/
    })

    console.log('Productos...')
    console.log(this.products)
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

}
