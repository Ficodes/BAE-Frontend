import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/pro-regular-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { ProductOffering } from '../../../models/product.model';
import { CarouselComponent } from '../../../shared/carousel/carousel.component';

@Component({
  selector: 'app-dashboard-services',
  standalone: true,
  templateUrl: './dashboard-services.component.html',
  styleUrl: './dashboard-services.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, TranslateModule, CarouselComponent, RouterLink]
})
export class DashboardServicesComponent implements OnInit {
  faArrowRight = faArrowRight;
  productOfferings = input.required<ProductOffering[]>();
  visibleItems = 3;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.updateVisibleItems();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateVisibleItems();
  }

  updateVisibleItems(): void {
    const width = window.innerWidth;

    if (width < 768) {
      this.visibleItems = 1;
    } else if (width < 1024) {
      this.visibleItems = 2;
    } else {
      this.visibleItems = 3;
    }

    this.cdr.markForCheck();
  }

  getProductImage(prod: ProductOffering): string {
    let images: any[] = [];

    if (prod?.attachment) {
      const profile = prod.attachment.filter(item => item.name === 'Profile Picture') ?? [];
      images = prod.attachment.filter(item => item.attachmentType === 'Picture') ?? [];

      if (profile.length !== 0) {
        images = profile;
      }
    }

    return images.length > 0 ? images.at(0)?.url : 'https://placehold.co/600x400/svg';
  }
}
