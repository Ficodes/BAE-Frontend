import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {EventMessageService} from "src/app/services/event-message.service";
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'usage-list',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule],
  templateUrl: './usage-list.component.html',
  styleUrl: './usage-list.component.css'
})
export class UsageListComponent  implements OnInit {
  usageSpecs:any[]=[];
  nextUsageSpecs:any[]=[];
  loading:boolean=false;
  loading_more:boolean=false;
  partyId:any='';
  page:number=0;
  page_check:boolean = true;
  USAGE_SPEC_LIMIT: number = environment.USAGE_SPEC_LIMIT;

  constructor(
    private eventMessage: EventMessageService,
    private usageService: UsageServiceService,
    private localStorage: LocalStorageService,
    private paginationService: PaginationService
  ) {
  }

  async ngOnInit() {
    this.initPartyInfo();
    this.loading=true;
    /*this.usageService.getUsageSpecs(this.partyId).then(data => {
      this.usageSpecs=data;
      this.loading=false;
    })*/
    await this.getUsageSpecs(false);
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  async getUsageSpecs(next:boolean){
    if(next==false){
      this.loading=true;
    }
    
    let options = {
      "partyId": this.partyId
    }
    
    this.paginationService.getItemsPaginated(this.page, this.USAGE_SPEC_LIMIT, next, this.usageSpecs,this.nextUsageSpecs, options,
      this.usageService.getUsageSpecs.bind(this.usageService)).then(data => {
      this.page_check=data.page_check;      
      this.usageSpecs=data.items;
      this.nextUsageSpecs=data.nextItems;
      this.page=data.page;
      this.loading=false;
      this.loading_more=false;
    })
  }

  async next(){
    await this.getUsageSpecs(true);
  }

  goToCreate(){
    this.eventMessage.emitCreateUsageSpec(true);
  }

  goToUpdate(usageSpec:any){
    this.eventMessage.emitUpdateUsageSpec(usageSpec);
  }

}
