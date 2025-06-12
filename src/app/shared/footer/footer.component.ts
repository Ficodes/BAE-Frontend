import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {
  faCartShopping,
  faHandHoldingBox,
  faAddressCard,
  faArrowRightFromBracket,  
} from "@fortawesome/sharp-solid-svg-icons";
import { faLinkedin, faYoutube, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import {EventMessageService} from "../../services/event-message.service";
import {LocalStorageService} from "../../services/local-storage.service";
import { LoginInfo } from 'src/app/models/interfaces';
import * as moment from 'moment';

@Component({
  selector: 'bae-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  protected readonly faLinkedin = faLinkedin;
  protected readonly faYoutube = faYoutube;
  protected readonly faXTwitter = faXTwitter;
  protected readonly DOME_LINKEDIN = environment.DOME_LINKEDIN;
  protected readonly DOME_YOUTUBE = environment.DOME_YOUTUBE;
  protected readonly DOME_X = environment.DOME_X;
  feedback:boolean=false;
  checkLogged:boolean=false;

  constructor(private router: Router,private eventMessage: EventMessageService,private localStorage: LocalStorageService,) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'CloseFeedback') {
        this.feedback = false;
      }
      const userInfo = this.localStorage.getObject('login_items') as LoginInfo;
      if((JSON.stringify(userInfo) != '{}' && (((userInfo.expire - moment().unix())-4) > 0))) {
       this.checkLogged=true
      }
    })
  }
  

  goTo(path:string) {
    this.router.navigate([path]);
  }

  open(path:string){
    window.open(path, '_blank');
  }
}