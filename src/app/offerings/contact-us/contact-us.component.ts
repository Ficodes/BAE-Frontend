import { Component } from '@angular/core';
import {faAtom} from "@fortawesome/pro-regular-svg-icons";
import { Router } from '@angular/router';
import {EventMessageService} from "../../services/event-message.service";

@Component({
  selector: 'contact-us',
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.css'
})
export class ContactUsComponent {
  protected readonly faAtom = faAtom;

  constructor(
    private router: Router,
    private eventMessage: EventMessageService
  ) {  }

  contact(){
    window.open('https://app.getonepass.eu/invite/8Zw5HETsNr', '_blank');
  }

  goTo(path:string) {
    this.router.navigate([path]);
  }

  closeModal(){
    this.eventMessage.emitCloseContact(true);
  }
}
