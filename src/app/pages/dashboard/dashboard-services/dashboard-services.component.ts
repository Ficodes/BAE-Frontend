import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/pro-regular-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { ProductOffering } from '../../../models/product.model';
import { CarouselComponent } from '../../../shared/carousel/carousel.component';

@Component({
  selector: 'app-dashboard-services',
  standalone: true,
  templateUrl: './dashboard-services.component.html',
  styleUrl: './dashboard-services.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, TranslateModule, CarouselComponent]
})
export class DashboardServicesComponent {
  faArrowRight = faArrowRight;
  productOfferings = input.required<ProductOffering[]>();

  getProductImage(prod: ProductOffering) {
    let images: any[] = []
    if (prod?.attachment) {
      let profile = prod?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
      images = prod.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
      if (profile.length != 0) {
        images = profile;
      }
    }
    return images.length > 0 ? images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

}
