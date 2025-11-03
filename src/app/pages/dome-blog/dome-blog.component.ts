import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {EventMessageService} from "src/app/services/event-message.service";
import {LocalStorageService} from "src/app/services/local-storage.service";
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { MarkdownComponent } from "ngx-markdown";

@Component({
  selector: 'app-dome-blog',
  standalone: true,
  imports: [CommonModule, MarkdownComponent],
  templateUrl: './dome-blog.component.html',
  styleUrl: './dome-blog.component.css'
})
export class DomeBlogComponent implements OnInit {
  constructor(
    private router: Router,
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService,
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  partyId:any='';
  checkAdmin:boolean=false;

  entries:any[]=[ ]

  async ngOnInit(): Promise<void> {
    this.initPartyInfo();
    let entries = await this.domeBlogService.getBlogEntries();
    this.entries=entries;
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      console.log('user info ---')
      console.log(aux)
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
        this.checkAdmin=aux.roles.some(role =>
          role.name === 'admin'
        );
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        this.checkAdmin=loggedOrg.roles.some((role: { name: string; }) =>
          role.name === 'admin'
        );
      }
    }
  }


  goToDetails(id:any) {
    this.router.navigate(['/blog/', id]);
  }

  goToCreate(){
    this.router.navigate(['/blog-entry']);
  }

  goToUpdate(id:any){
    this.router.navigate(['/blog-entry/', id]);
  }
}
