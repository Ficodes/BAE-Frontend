import { Component, DoCheck, OnDestroy, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QrVerifierService } from 'src/app/services/qr-verifier.service';
import { environment } from 'src/environments/environment';
import * as uuid from 'uuid';

@Component({
  selector: 'app-dashboard-header',
  templateUrl: './dashboard-header.component.html',
  styleUrls: ['./dashboard-header.component.css'],
  standalone: true,
  imports: [TranslateModule],
})
export class DashboardHeaderComponent implements OnInit, OnDestroy, DoCheck {
  statePair: string;
  qrWindow: Window | null = null;

  constructor(private qrVerifier: QrVerifierService) {}

  ngOnInit() {}

  ngDoCheck(): void {
    if (this.qrWindow != null && this.qrWindow.closed) {
      this.qrVerifier.stopChecking(this.qrWindow);
      this.qrWindow = null;
    }
  }

  onLoginClick() {
    if (
      environment.SIOP_INFO.enabled === true &&
      this.qrVerifier.intervalId === undefined
    ) {
      this.statePair = uuid.v4();

      let verifierUrl = `${environment.SIOP_INFO.verifierHost}${environment.SIOP_INFO.verifierQRCodePath}?state=${this.statePair}&client_id=${environment.SIOP_INFO.clientID}`;

      if (environment.SIOP_INFO.isRedirection) {
        // New verifier format
        let oldUrl = new URL(window.location.href);
        let newUrl = new URL(oldUrl.origin);
        newUrl.pathname = environment.SIOP_INFO.requestUri;

        let finalUrl = newUrl.toString();
        let nonce = uuid.v4();

        verifierUrl = `${verifierUrl}&response_type=code&request_uri=${finalUrl}&scope=openid%20learcredential&nonce=${nonce}`;
        window.location.href = verifierUrl;
      } else {
        // Old verifier format
        let originalUrl = new URL(environment.SIOP_INFO.callbackURL);
        let newUrl = new URL(window.location.href);

        newUrl.pathname = originalUrl.pathname;
        newUrl.search = originalUrl.search;

        // Get the final URL string
        let finalUrl = newUrl.toString();
        console.group(finalUrl);

        verifierUrl = `${verifierUrl}&client_callback=${finalUrl}`;
        this.qrWindow = this.qrVerifier.launchPopup(
          verifierUrl,
          'Scan QR code',
          500,
          500,
        );
        this.initChecking();
      }
    } else if (environment.SIOP_INFO.enabled === false) {
      window.location.replace(`${environment.BASE_URL}` + '/login');
    }
  }

  private initChecking(): void {
    this.qrVerifier.pollServer(this.qrWindow, this.statePair);
  }

  ngOnDestroy(): void {
    this.qrWindow?.close();
    this.qrWindow = null;
  }
}
