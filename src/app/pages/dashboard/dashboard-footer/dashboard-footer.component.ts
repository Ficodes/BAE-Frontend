import { NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faLinkedin,
  faXTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ThemeService } from 'src/app/services/theme.service'; 
import { EuropeTrademarkComponent } from 'src/app/shared/europe-trademark/europe-trademark.component';

@Component({
  selector: 'app-dashboard-footer',
  templateUrl: './dashboard-footer.component.html',
  styleUrls: ['./dashboard-footer.component.css'],
  standalone: true,
  imports: [
    TranslateModule,
    EuropeTrademarkComponent,
    FontAwesomeModule,
    NgClass,
  ],
})
export class DashboardFooterComponent implements OnInit, OnDestroy {
  protected readonly faLinkedin = faLinkedin;
  protected readonly faYoutube = faYoutube;
  protected readonly faXTwitter = faXTwitter;
  private unSub = new Subject();
  constructor(private themeService: ThemeService) {}

  public socialLinks: { icon: any; url: string | undefined }[] = [];

  ngOnInit() {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.unSub))
      .subscribe((theme) => {
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

  open(path: string) {
    window.open(path, '_blank');
  }

  ngOnDestroy() {
    this.unSub.complete();
    this.unSub.unsubscribe();
  }
}
