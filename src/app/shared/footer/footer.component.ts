import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  faLinkedin,
  faXTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import * as moment from 'moment';
import { Subject, takeUntil } from 'rxjs';
import { LoginInfo } from 'src/app/models/interfaces';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ThemeService } from 'src/app/services/theme.service';
import { EventMessageService } from '../../services/event-message.service';
import { NavHeaderLink } from '../../themes';


@Component({
  selector: 'bae-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent implements OnInit, OnDestroy {
  protected readonly faLinkedin = faLinkedin;
  protected readonly faYoutube = faYoutube;
  protected readonly faXTwitter = faXTwitter;
  private unSub = new Subject();

  checkLogged: boolean = false;
  feedback: boolean = false;

  socialLinks: { icon: any; url: string }[] = [];
  footerLinks: NavHeaderLink[] = [];
  columns: number;

  constructor(
    private themeService: ThemeService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private router: Router) { }

  ngOnInit() {
    this.getCurrentThemeData();
    this.checkEventMessages();
    this.checkIfLogged();
  }

  private checkIfLogged() {
    const userInfo = this.localStorage.getObject('login_items') as LoginInfo;
    if ((JSON.stringify(userInfo) != '{}' && (((userInfo.expire - moment().unix()) - 4) > 0))) {
      this.checkLogged = true;
    }
  }

  private checkEventMessages() {
    this.eventMessage.messages$
      .pipe(takeUntil(this.unSub))
      .subscribe(ev => {
        if (ev.type === 'CloseFeedback') {
          this.feedback = false;
        }

        this.checkIfLogged();
      })
  }

  private getCurrentThemeData() {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.unSub))
      .subscribe((theme) => {
        this.footerLinks = theme?.links?.footerLinks || [];
        this.columns = theme?.links?.footerLinksColsNumber || 0;

        this.socialLinks = [];

        if (theme?.links?.linkedin) {
          this.socialLinks.push({
            url: theme.links.linkedin,
            icon: this.faLinkedin,
          });
        }
        if (theme?.links?.twitter) {
          this.socialLinks.push({
            url: theme.links.twitter,
            icon: this.faXTwitter,
          });
        }
        if (theme?.links?.youtube) {
          this.socialLinks.push({
            url: theme.links.youtube,
            icon: this.faYoutube,
          });
        }
      });
  }

  goToRoute(path: string) {
    this.router.navigate([path]);
  }

  openNewTab(path: string) {
    window.open(path, '_blank');
  }

  ngOnDestroy() {
    this.unSub.complete();
    this.unSub.unsubscribe();
  }
}
