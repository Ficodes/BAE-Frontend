import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {faFileCertificate, faBadgeCheck, faHandHoldingCircleDollar, faChartNetwork} from "@fortawesome/pro-solid-svg-icons";
import { environment } from 'src/environments/environment';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-about-dome',
  standalone: true,
  imports: [
    NgClass,
    FontAwesomeModule,
    TranslateModule
  ],
  templateUrl: './about-dome.component.html',
  styleUrl: './about-dome.component.css'
})
export class AboutDomeComponent {
  protected readonly faFileCertificate = faFileCertificate;
  protected readonly faBadgeCheck = faBadgeCheck;
  protected readonly faHandHoldingCircleDollar = faHandHoldingCircleDollar;
  protected readonly faChartNetwork = faChartNetwork;
  domePublish: string = environment.DOME_PUBLISH_LINK
}
