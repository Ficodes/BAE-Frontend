import { Component } from '@angular/core';
import {faCircleNodes} from "@fortawesome/pro-solid-svg-icons";
import {faCloudArrowDown} from "@fortawesome/pro-regular-svg-icons";
import { Router } from '@angular/router';

@Component({
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.css'
})
export class HowItWorksComponent {
  protected readonly faCircleNodes = faCircleNodes;
  protected readonly faCloudArrowDown = faCloudArrowDown;

  constructor(
    private router: Router
  ) {  }

  contact(){
    //window.location.href='https://app.getonepass.eu/invite/8Zw5HETsNr';
    window.open('https://app.getonepass.eu/invite/8Zw5HETsNr', '_blank');
  }

  goTo(path:string) {
    this.router.navigate([path]);
  }
}
