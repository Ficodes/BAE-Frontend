import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QrVerifierService {

  constructor() { }
  private _intervalId: number | undefined;

  public get intervalId(): number | undefined {
    return this._intervalId;
  }

  private set intervalId(value: number | undefined) {
    this._intervalId = value;
  }

  private fetchServer(thePopup:Window, state:string, path:string, handler:any):void {
    // Ask for a dynamic callback validation
    let newUrl = new URL(window.location.href);
    let callback = newUrl.origin

    fetch(`${environment.BASE_URL}${path}?state=${state}&callback_url=${callback}`).then(
      (response) =>{
        if (response.status === 400 || response.status === 500) {
          this.stopChecking(thePopup)
          return
        } else if (response.status === 401) {
          return
        }

        this.stopChecking(thePopup)
        thePopup.close()
        handler(response)
      })
      .catch((error) => {
        this.stopChecking(thePopup)
      })
  }

  private poll(qrWindow: Window | null, state: string, path: string, cb: any): void {
    if (qrWindow == null) {
      return
    }

    const interval = () => {
      this.fetchServer(qrWindow, state, path, cb)
    }

    this.intervalId = window.setInterval(interval, 1000, qrWindow, state);
    window.setTimeout((popup:Window)=>{this.stopChecking(popup)}, 45000, qrWindow)
  }

  launchPopup(url:string, title:string, w:number, h:number) {
    // Fixes dual-screen position                             Most browsers        Firefox
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
    
    const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    
    const systemZoom = width / window.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft
    const top = (height - h) / 2 / systemZoom + dualScreenTop
    // const newWindow = window.open(url, title,
    //   `
    //   popup=yes,
    //   scrollbars=yes,
    //   width=${w / systemZoom},
    //   height=${h / systemZoom},
    //   top=${top},
    //   left=${left}
    //   `
    // )

    const newWindow = window.open(url, '_blank')
    newWindow?.focus()
    return newWindow;
  }

  pollCertCredential(qrWindow: Window | null, state: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.poll(qrWindow, state, environment.SIOP_INFO.pollCertPath, async (resp: any) => {
        let data = await resp.json()
        resolve(data)
      })
    })
  }

  pollServer(qrWindow: Window | null, state: string): void {
    this.poll(qrWindow, state, environment.SIOP_INFO.pollPath, () => {
      window.location.replace('/dashboard?token=local')
    })
  }

  stopChecking(thePopup:Window){
    if(this.intervalId != undefined){
      if(!thePopup.closed){
        thePopup.close()
      }

      clearInterval(this.intervalId)
      this.intervalId=undefined
    }
  }
}
