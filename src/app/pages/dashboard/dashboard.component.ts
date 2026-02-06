import { SlicePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import { map, Subject, takeUntil } from 'rxjs';
import { LoginInfo } from 'src/app/models/interfaces';
import { ProductOffering } from 'src/app/models/product.model';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginServiceService } from 'src/app/services/login-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { StatsServiceService } from 'src/app/services/stats-service.service';
import { EuropeTrademarkComponent } from 'src/app/shared/europe-trademark/europe-trademark.component';
import { ThemeConfig } from 'src/app/themes';
import { environment } from 'src/environments/environment';

interface Stats {
  services: number;
  providers: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: true,
  imports: [TranslateModule, SlicePipe, EuropeTrademarkComponent],
})
export class DashboardComponent implements OnInit {
  private unSub = new Subject();
  productOfferings?: ProductOffering[];
  protected MAX_CATEGORIES_PER_PRODUCT_OFFERING = 3;

  providerThemeName = environment.providerThemeName;
  currentTheme: ThemeConfig | null = null;

  stats?: Stats;

  constructor(
    private productService: ApiServiceService,
    private domSanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private loginService: LoginServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private statsService: StatsServiceService
  ) { }

  ngOnInit() {
    this.getFirstThreeRandomProductOfferings();
    this.checkRouteForToken();
    this.getStats()
  }


  private getStats() {
    this.statsService.getStats().then(data => {
      this.stats = {
        services: data?.services?.length || 0,
        providers: data?.organizations?.length || 0
      }
    })
  }

  private checkRouteForToken() {
    if (this.route.snapshot.queryParamMap.get('token') != null) {
      this.loginService.getLogin(this.route.snapshot.queryParamMap.get('token')).then(data => {
        console.log('---- loginangular response ----')
        console.log(data)
        console.log(data.username)

        const info = {
          "id": data.id,
          "user": data.username,
          "email": data.email,
          "token": data.accessToken,
          "expire": data.expire,
          "partyId": data.partyId,
          "roles": data.roles,
          "organizations": data.organizations,
          "logged_as": data.id
        } as LoginInfo;

        // Using organization session by default if provided
        if (info.organizations != null && info.organizations.length > 0) {
          info.logged_as = info.organizations[0].id
        }

        this.localStorage.addLoginInfo(info);
        this.eventMessage.emitLogin(info);
        initFlowbite();
        console.log('----')

      })
      this.router.navigate(['/dashboard'])
    } else {
      console.log('sin token')
      const aux = this.localStorage.getObject('login_items') as LoginInfo;
      if (JSON.stringify(aux) != '{}') {
        console.log(aux)
        console.log('moment')
        console.log(aux['expire'])
        console.log(moment().unix())
        console.log(aux['expire'] - moment().unix())
        console.log(aux['expire'] - moment().unix() <= 5)
      }
    }


    this.cdr.detectChanges();
    console.log('----')
  }

  private getFirstThreeRandomProductOfferings(): void {
    this.productService
      .getAllProducts()
      .pipe(

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

        takeUntil(this.unSub),
      )
      .subscribe((picked) => {
        this.productOfferings = picked;
      });
  }

  goToSearch() {
    this.router.navigate(['/search']);
  }

  ngOnDestroy() {
    this.unSub.complete();
    this.unSub.unsubscribe();
  }

}
