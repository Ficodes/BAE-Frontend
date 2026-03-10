import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faMessages, faRotate, faShieldCheck } from '@fortawesome/pro-regular-svg-icons';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-whatsdome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-whatsdome.component.html',
  styleUrls: ['./dashboard-whatsdome.component.css'],
  imports: [FontAwesomeModule, TranslateModule],
})
export class DashboardWhatsDome {
  faShieldCheck = faShieldCheck;
  faEye = faEye;
  faRotate = faRotate;
  faMessages = faMessages;
}
