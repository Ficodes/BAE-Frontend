import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import { filter } from 'rxjs';
import { LoginInfo } from 'src/app/models/interfaces';
import { RefreshLoginServiceService } from "src/app/services/refresh-login-service.service";
import { environment } from "../environments/environment";
import { EventMessageService } from "./services/event-message.service";
import { LocalStorageService } from "./services/local-storage.service";
import { LocaleService } from './services/locale.service';
import { ThemeService } from "./services/theme.service";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'BAE Marketplace';
  showPanel = false;
  providerThemeName = environment.providerThemeName;
  isProduction: boolean = environment.isProduction;
  showHeaderAndFooter = false;

  constructor(private localeService: LocaleService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private router: Router,
    private themeService: ThemeService,
    private refreshApi: RefreshLoginServiceService) {
    this.localeService.init().subscribe();
    if (!this.localStorage.getObject('selected_categories'))
      this.localStorage.setObject('selected_categories', []);

    /*this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'AddedFilter' || ev.type === 'RemovedFilter') {
        this.checkPanel();
      }

    })*/

  }
  ngOnInit(): void {
    const providerThemeName = environment.providerThemeName;
    this.themeService.initializeProviderTheme(providerThemeName);

    initFlowbite();
    if (!this.localStorage.getObject('selected_categories'))
      this.localStorage.setObject('selected_categories', []);
    if (!this.localStorage.getObject('cart_items'))
      this.localStorage.setObject('cart_items', []);
    if (!this.localStorage.getObject('login_items'))
      this.localStorage.setObject('login_items', {});
    if (!this.localStorage.getObject('feedback'))
      this.localStorage.setObject('feedback', {});
    //this.checkPanel();
    this.eventMessage.messages$.subscribe(ev => {
      if (ev.type === 'LoginProcess') {
        this.refreshApi.stopInterval();
        let info = ev.value as LoginInfo;

        this.refreshApi.startInterval(((info.expire - moment().unix()) - 4) * 1000, ev);
        initFlowbite();
        //this.refreshApi.startInterval(3000, ev.value);
      }
    })
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) === '{}') {
      //this.siopInfo.getSiopInfo().subscribe((data)=>{
      //  environment.SIOP_INFO = data
      //})
    }
    else if (((aux.expire - moment().unix()) - 4) > 0) {
      this.refreshApi.stopInterval();
      this.refreshApi.startInterval(((aux.expire - moment().unix()) - 4) * 1000, aux);
      initFlowbite();
    }
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' }); // or just window.scrollTo(0, 0);
      });

  }

  /*checkPanel() {
    const filters = this.localStorage.getObject('selected_categories') as Category[] || [] ;
    const oldState = this.showPanel;
    this.showPanel = filters.length > 0;
    if(this.showPanel != oldState) {
      this.eventMessage.emitFilterShown(this.showPanel);
      this.localStorage.setItem('is_filter_panel_shown', this.showPanel.toString())
    }
  }*/


}
