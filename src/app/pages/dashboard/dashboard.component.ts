import {Component, HostListener, OnInit, ChangeDetectorRef, OnDestroy} from '@angular/core';
import {EventMessageService} from "../../services/event-message.service";
import {LocalStorageService} from "../../services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';
import { interval, Subscription, Subject} from 'rxjs';
import { RefreshLoginServiceService } from "src/app/services/refresh-login-service.service"
import { StatsServiceService } from "src/app/services/stats-service.service"
import { LoginServiceService } from "src/app/services/login-service.service"
import { FormControl } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { environment } from 'src/environments/environment';
import {ThemeService} from "../../services/theme.service";
import {ThemeConfig} from "../../themes";
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  isFilterPanelShown = false;
  showContact:boolean=false;
  searchField = new FormControl();
  searchEnabled = environment.SEARCH_ENABLED;
  domePublish: string = environment.DOME_PUBLISH_LINK
  domeRegister: string = environment.DOME_REGISTER_LINK
  services: string[] = []
  publishers: string[] = []
  currentIndexServ: number = 0;
  currentIndexPub: number = 0;
  delay: number = 2000;
  currentTheme: ThemeConfig | null = null;
  private themeSubscription: Subscription = new Subscription();
  providerThemeName=environment.providerThemeName;
  private destroy$ = new Subject<void>();

  //loginSubscription: Subscription = new Subscription();;
  constructor(private localStorage: LocalStorageService,
              private eventMessage: EventMessageService,
              private statsService : StatsServiceService,
              private route: ActivatedRoute,
              private router: Router,
              private api: ApiServiceService,
              private loginService: LoginServiceService,
              private cdr: ChangeDetectorRef,
              private themeService: ThemeService,
              private refreshApi: RefreshLoginServiceService) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'FilterShown') {
        this.isFilterPanelShown = ev.value as boolean;
      }
      if(ev.type == 'CloseContact'){
        this.showContact=false;
        this.cdr.detectChanges();
      }
    })
  }
  @HostListener('document:click')
  onClick() {
    if(this.showContact==true){
      this.showContact=false;
      this.cdr.detectChanges();
    }
  }

  startTagTransition() {
    setInterval(() => {
      this.currentIndexServ = (this.currentIndexServ + 1) % this.services.length;
      this.currentIndexPub = (this.currentIndexPub + 1) % this.publishers.length;
    }, this.delay);
  }

  async ngOnInit() {
    this.themeSubscription = this.themeService.currentTheme$
    .subscribe(theme => {
      this.currentTheme = theme;
    });
    this.destroy$.next();
    this.destroy$.complete();

    this.statsService.getStats().then(data=> {
      this.services=data?.services || [];
      this.publishers=data?.organizations || [];
      this.startTagTransition();
    })
    this.isFilterPanelShown = JSON.parse(this.localStorage.getItem('is_filter_panel_shown') as string);
    if(this.route.snapshot.queryParamMap.get('token') != null){
      this.loginService.getLogin(this.route.snapshot.queryParamMap.get('token')).then(data => {
        let info = {
          "id": data.id,
          "user": data.username,
          "email": data.email,
          "token": data.accessToken,
          "expire": data.expire,
          "partyId": data.partyId,
          "roles": data.roles,
          "organizations": data.organizations,
          "logged_as": data.id } as LoginInfo;

        // Using organization session by default if provided
        if (info.organizations != null && info.organizations.length > 0) {
          info.logged_as = info.organizations[0].id
        }

        this.localStorage.addLoginInfo(info);
        this.eventMessage.emitLogin(info);
        initFlowbite();
        //this.refreshApi.stopInterval();
        //this.refreshApi.startInterval(((data.expire - moment().unix())-4)*1000, data);
        //this.refreshApi.startInterval(3000, data);
      })
      this.router.navigate(['/dashboard'])
    } else {
      //this.localStorage.clear()
      let aux = this.localStorage.getObject('login_items') as LoginInfo;
      // keep stored session data if present
    }

    this.showContact = true;

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }


  filterSearch(event: any) {
    if(this.searchField.value!='' && this.searchField.value != null){
      this.router.navigate(['/search', {keywords: this.searchField.value}]);
    } else {
      this.router.navigate(['/search']);
    }
  }

  goTo(path:string) {
    this.router.navigate([path]);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
