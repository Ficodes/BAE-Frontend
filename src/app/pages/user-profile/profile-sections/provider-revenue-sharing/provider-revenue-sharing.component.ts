import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { LoginInfo, Report } from 'src/app/models/interfaces';
import { RevenueSharingService } from 'src/app/services/revenue-sharing.service'
import { RevenueReportComponent } from 'src/app/shared/revenue-report/revenue-report.component'
import * as moment from 'moment';

@Component({
  selector: 'provider-revenue-sharing',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule, RevenueReportComponent],
  templateUrl: './provider-revenue-sharing.component.html',
  styleUrl: './provider-revenue-sharing.component.css'
})

export class ProviderRevenueSharingComponent implements OnInit {
  loading: boolean = false;
  subscription:any;
  billing:any;
  revenue:any;
  revenueSummary:any;
  referral:any;
  support:any;
  errorMessage: any = '';
  showError:boolean=false;
  

  partyId:any='';
  report: Report[]=[];
  

  constructor(
    private localStorage: LocalStorageService,
    private revenueService: RevenueSharingService
  ) {
  }
  

  async ngOnInit() {
    this.loading=true;
    this.initPartyInfo();
    try {
      let info = await this.revenueService.getRevenue(this.partyId);
      this.loading=false;
      console.log('------')
      console.log(info)
      this.report=info;
    } catch (error) {
      this.handleError(error, "There was an error accessing revenue sharing's data, please contact with an administrator.");
      this.loading=false;
    } finally {
      this.loading=false;
    }

  }

  private handleError(error: any, defaultMessage: string) {
    console.error(defaultMessage, error);
    this.errorMessage = error?.error?.error
      ? `Error: ${error.error.error}`
      : defaultMessage;
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
      }      
    }
  }

}
