import { NgClass, SlicePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, SecurityContext } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import { map, Subject, takeUntil } from 'rxjs';
import { LoginInfo } from 'src/app/models/interfaces';
import { ProductOffering } from 'src/app/models/product.model';
import { FeaturedComponent } from 'src/app/offerings/featured/featured.component';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginServiceService } from 'src/app/services/login-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { StatsServiceService } from 'src/app/services/stats-service.service';
import { ThemeService } from 'src/app/services/theme.service';
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
  imports: [TranslateModule, SlicePipe, EuropeTrademarkComponent, ReactiveFormsModule, FeaturedComponent, NgClass],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private unSub = new Subject<void>();
  productOfferings?: ProductOffering[];
  protected MAX_CATEGORIES_PER_PRODUCT_OFFERING = 3;

  providerThemeName = environment.providerThemeName;
  currentTheme: ThemeConfig | null = null;

  private rotationIntervalId?: ReturnType<typeof setInterval>;

  isFilterPanelShown = false;
  searchField = new FormControl();
  searchEnabled = environment.SEARCH_ENABLED;

  domeRegister: string = environment.DOME_REGISTER_LINK;

  services: string[] = [];
  publishers: string[] = [];
  currentIndexServ = 0;
  currentIndexPub = 0;
  delay = 2000;

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
    private statsService: StatsServiceService,
    private themeService: ThemeService,
  ) { }

  ngOnInit() {
    this.themeService.currentTheme$.pipe(takeUntil(this.unSub)).subscribe((theme) => {
      this.currentTheme = theme;
    });

    this.getFirstThreeRandomProductOfferings();
    this.checkRouteForToken();
    this.getStats();
  }

  private startTagTransition() {
    if (this.rotationIntervalId) {
      clearInterval(this.rotationIntervalId);
    }

    this.rotationIntervalId = setInterval(() => {
      if (this.services.length > 0) {
        this.currentIndexServ = (this.currentIndexServ + 1) % this.services.length;
      }
      if (this.publishers.length > 0) {
        this.currentIndexPub = (this.currentIndexPub + 1) % this.publishers.length;
      }
    }, this.delay);
  }

  private getStats() {
    this.statsService.getStats().then((data) => {
      this.services = data?.services || [];
      this.publishers = data?.organizations || [];

      this.stats = {
        services: this.services.length,
        providers: this.publishers.length,
      };

      this.startTagTransition();
    });
  }

  private checkRouteForToken() {
    if (this.route.snapshot.queryParamMap.get('token') != null) {
      this.loginService.getLogin(this.route.snapshot.queryParamMap.get('token')).then((data) => {
        const info = {
          id: data.id,
          user: data.username,
          email: data.email,
          token: data.accessToken,
          expire: data.expire,
          partyId: data.partyId,
          roles: data.roles,
          organizations: data.organizations,
          logged_as: data.id,
        } as LoginInfo;

        // Using organization session by default if provided
        if (info.organizations != null && info.organizations.length > 0) {
          info.logged_as = info.organizations[0].id;
        }

        this.localStorage.addLoginInfo(info);
        this.eventMessage.emitLogin(info);
        initFlowbite();
      });
      this.router.navigate(['/dashboard']);
    } else {
      const aux = this.localStorage.getObject('login_items') as LoginInfo;
      if (JSON.stringify(aux) != '{}') {
        console.log(aux);
        console.log('moment');
        console.log(aux['expire']);
        console.log(moment().unix());
        console.log(aux['expire'] - moment().unix());
        console.log(aux['expire'] - moment().unix() <= 5);
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
              ? (this.domSanitizer.sanitize(SecurityContext.HTML, el.description) ?? undefined)
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

  filterSearch(event: Event) {
    event.preventDefault();
    if (this.searchField.value != '' && this.searchField.value != null) {
      this.router.navigate(['/search', { keywords: this.searchField.value }]);
    } else {
      this.router.navigate(['/search']);
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some((word) => word.length > threshold);
    }
    return false;
  }

  ngOnDestroy() {
    if (this.rotationIntervalId) {
      clearInterval(this.rotationIntervalId);
    }

    this.unSub.next();
    this.unSub.complete();
  }
}
