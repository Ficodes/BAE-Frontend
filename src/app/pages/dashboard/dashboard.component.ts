import {Component, HostListener, OnInit, ChangeDetectorRef} from '@angular/core';
import {EventMessageService} from "../../services/event-message.service";
import {LocalStorageService} from "../../services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';
import { interval, Subscription} from 'rxjs';
import { RefreshLoginServiceService } from "src/app/services/refresh-login-service.service"
import { StatsServiceService } from "src/app/services/stats-service.service"
import { LoginServiceService } from "src/app/services/login-service.service"
import { FormControl } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  isFilterPanelShown = false;
  showContact:boolean=false;
  searchField = new FormControl();
  searchEnabled = environment.SEARCH_ENABLED;
  domePublish: string = environment.DOME_PUBLISH_LINK
  domeRegister: string = environment.DOME_REGISTER_LINK
  services: string[] = []
  publishers: string[] = []
  categories:any[]=[];
  currentIndexServ: number = 0;
  currentIndexPub: number = 0;
  delay: number = 2000;
  //loginSubscription: Subscription = new Subscription();;
  constructor(private localStorage: LocalStorageService,
              private eventMessage: EventMessageService,
              private statsService : StatsServiceService,
              private route: ActivatedRoute,
              private router: Router,
              private api: ApiServiceService,
              private loginService: LoginServiceService,
              private cdr: ChangeDetectorRef,
              private refreshApi: RefreshLoginServiceService) {
    this.eventMessage.messages$.subscribe(ev => {
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
    this.statsService.getStats().then(data=> {
      this.services=data?.services;
      this.publishers=data?.organizations;
      this.startTagTransition();
    })
    this.isFilterPanelShown = JSON.parse(this.localStorage.getItem('is_filter_panel_shown') as string);
    //this.route.snapshot.paramMap.get('id');
    console.log('--- route data')
    console.log(this.route.queryParams)
    console.log(this.route.snapshot.queryParamMap.get('token'))
    if(this.route.snapshot.queryParamMap.get('token') != null){    
      this.loginService.getLogin(this.route.snapshot.queryParamMap.get('token')).then(data => {
        console.log('---- loginangular response ----')
        console.log(data)
        console.log(data.username)
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
        console.log('----')
        //this.refreshApi.stopInterval();
        //this.refreshApi.startInterval(((data.expire - moment().unix())-4)*1000, data);
        //this.refreshApi.startInterval(3000, data);
      })      
      this.router.navigate(['/dashboard'])
    } else {
      console.log('sin token')
      //this.localStorage.clear()
      let aux = this.localStorage.getObject('login_items') as LoginInfo;
      if (JSON.stringify(aux) != '{}') {
        console.log(aux)
        console.log('moment')
        console.log(aux['expire'])
        console.log(moment().unix())
        console.log(aux['expire'] - moment().unix())
        console.log(aux['expire'] - moment().unix() <= 5)
      }
    }
    this.api.getLaunchedCategories().then(data => {
      for(let i=0; i < data.length; i++){
        if(data[i].isRoot==true){
          this.categories.push(data[i])
        }        
      }
      initFlowbite();
      this.cdr.detectChanges();
    })

    this.showContact = true;

    this.cdr.detectChanges();
    console.log('----')
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
  
}
