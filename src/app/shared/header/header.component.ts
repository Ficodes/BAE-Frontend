import {AfterViewInit, Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef, HostListener, DoCheck, OnDestroy} from '@angular/core';
import {
  faCartShopping,
  faHandHoldingBox,
  faAddressCard,
  faArrowRightFromBracket,
  faBoxesStacked,
  faClipboardCheck,
  faBrain,
  faAnglesLeft,
  faUser,
  faUsers,
  faCogs,
  faReceipt
} from "@fortawesome/sharp-solid-svg-icons";
import {LocalStorageService} from "../../services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LoginServiceService } from 'src/app/services/login-service.service';
import { Router } from '@angular/router';
import {EventMessageService} from "../../services/event-message.service";
import { environment } from 'src/environments/environment';
import { LoginInfo } from 'src/app/models/interfaces';
import { Subscription, timer} from 'rxjs';
import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { initFlowbite, Dropdown } from 'flowbite';
import { QrVerifierService } from 'src/app/services/qr-verifier.service';
import * as uuid from 'uuid';
import { TranslateService } from '@ngx-translate/core';
import {ShoppingCartServiceService} from "../../services/shopping-cart-service.service";

@Component({
  selector: 'bae-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit, DoCheck, OnDestroy{

  @ViewChild('theme_toggle_dark_icon') themeToggleDarkIcon: ElementRef;
  @ViewChild('theme_toggle_light_icon') themeToggleLightIcon: ElementRef;
  @ViewChild('navbarbutton') navbarbutton: ElementRef;

  constructor(themeToggleDarkIcon: ElementRef,
              themeToggleLightIcon: ElementRef,
              private translate: TranslateService,
              private localStorage: LocalStorageService,
              private api: ApiServiceService,
              private loginService: LoginServiceService,
              private cdr: ChangeDetectorRef,
              private route: ActivatedRoute,
              private eventMessage: EventMessageService,
              private router: Router,
              private qrVerifier: QrVerifierService,
              private sc: ShoppingCartServiceService) {

    this.themeToggleDarkIcon = themeToggleDarkIcon;
    this.themeToggleLightIcon = themeToggleLightIcon;
  }
  qrWindow: Window | null = null;
  statePair:string
  catalogs: any[] | undefined  = [];
  langs: any[] = [];
  defaultLang:any;
  showCart:boolean=false;
  is_logged:boolean=false;
  showLogin:boolean=false;
  loggedAsOrg:boolean=false;
  isAdmin:boolean;
  loginInfo:any;
  orgs:any[]=[];
  username:string='';
  email:string='';
  usercharacters:string='';
  loginSubscription: Subscription = new Subscription();
  roles:string[]=[];
  knowledge: string = environment.KNOWLEDGE_BASE_URL
  knowledge_onboarding: string = environment.KB_ONBOARDING_GUIDELINES_URL
  knowledge_guidelines: string = environment.KB_GUIDELNES_URL
  registration: string = environment.REGISTRATION_FORM_URL
  ticketing: string = environment.TICKETING_SYSTEM_URL
  domeAbout: string = environment.DOME_ABOUT_LINK
  domeRegister: string = environment.DOME_REGISTER_LINK
  domePublish: string = environment.DOME_PUBLISH_LINK
  public static BASE_URL: String = environment.BASE_URL;
  isNavBarOpen:boolean = false;
  flagDropdownOpen:boolean=false;
  cartCount: number = 0;

  ngOnDestroy(): void {
      this.qrWindow?.close()
      this.qrWindow=null
  }

  ngDoCheck(): void {
    if(this.qrWindow!=null && this.qrWindow.closed){
      this.qrVerifier.stopChecking(this.qrWindow)
      this.qrWindow=null
    }
  }
  @HostListener('document:click')
  onClick() {
    if(this.showCart==true){
      this.showCart=false;
      this.cdr.detectChanges();
    }
    if (this.isNavBarOpen) {
      this.isNavBarOpen = false;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.isNavBarOpen) {
      this.navbarbutton.nativeElement.blur();
      this.isNavBarOpen = false;
    }
  }

  async ngOnInit(){
    this.langs = this.translate.getLangs();
    console.log('langs')
    console.log(this.langs)
    //this.defaultLang = this.translate.getDefaultLang();
    let currLang = this.localStorage.getItem('current_language')
    if(!currLang || currLang == null) {
      this.defaultLang = this.translate.getDefaultLang();
    } else {
      this.defaultLang = currLang;
    }
    console.log('default')
    console.log(this.defaultLang)
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    console.log('aux: ' + aux)
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      this.loginInfo=aux;
      this.is_logged=true;
      this.orgs=aux.organizations;
      console.log('--roles')
      console.log(aux.roles)
      for(let i=0; i < aux.roles.length; i++){
        if(aux.roles[i].name == 'admin'){
          this.isAdmin=true;
          this.cdr.detectChanges();
        }
      }
      if(aux.logged_as == aux.id){
        this.username=aux.user;
        this.usercharacters=(aux.user.slice(0, 2)).toUpperCase();
        this.email=aux.email;
        for(let i=0;i<aux.roles.length;i++){
          this.roles.push(aux.roles[i].name)
        }
        console.log(this.roles)
      } else {
        let loggedOrg = this.orgs.find((element: { id: any; }) => element.id == aux.logged_as)
        console.log('loggedOrg')
        console.log(loggedOrg)
        this.loggedAsOrg=true;
        this.username=loggedOrg.name;
        this.usercharacters=(loggedOrg.name.slice(0, 2)).toUpperCase();
        this.email=loggedOrg.description;
        for(let i=0;i<loggedOrg.roles.length;i++){
          this.roles.push(loggedOrg.roles[i].name)
        }
        console.log(this.roles)
      }
      this.cdr.detectChanges();
    }

    this.sc.cart$.subscribe(cart => {
      this.cartCount = cart.length; // Updates counter on icon
    });

    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ToggleCartDrawer') {
        this.showCart=false;
        this.cdr.detectChanges();
      }
    })

    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'LoginProcess') {
        let aux = this.localStorage.getObject('login_items') as LoginInfo;
        if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
          this.loginInfo=aux;
          this.is_logged=true;
          this.cdr.detectChanges();
          this.orgs=aux.organizations;
          for(let i=0; i < aux.roles.length; i++){
            if(aux.roles[i].name == 'admin'){
              this.isAdmin=true;
              this.cdr.detectChanges();
            }
          }
          if(aux.logged_as == aux.id){
            this.username=aux.user;
            this.usercharacters=(aux.user.slice(0, 2)).toUpperCase();
            this.email=aux.email;
            for(let i=0;i<aux.roles.length;i++){
              this.roles.push(aux.roles[i].name)
            }
          } else {
            let loggedOrg = this.orgs.find((element: { id: any; }) => element.id == aux.logged_as)
            console.log('loggedOrg')
            console.log(loggedOrg)
            this.loggedAsOrg=true;
            this.username=loggedOrg.name;
            this.usercharacters=(loggedOrg.name.slice(0, 2)).toUpperCase();
            this.email=loggedOrg.description;
            for(let i=0;i<loggedOrg.roles.length;i++){
              this.roles.push(loggedOrg.roles[i].name)
            }
          }
          this.cdr.detectChanges();
        }
      }
    })
  }

  ngAfterViewInit() {
    initFlowbite();
    // Change the icons inside the button based on previous settings
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.themeToggleLightIcon.nativeElement.classList.remove('hidden');
    } else {
      this.themeToggleDarkIcon.nativeElement.classList.remove('hidden');
    }
  }
  toggleDarkMode() {
    // toggle icons inside button
    this.themeToggleDarkIcon.nativeElement.classList.toggle('hidden');
    this.themeToggleLightIcon.nativeElement.classList.toggle('hidden');

    // if set via local storage previously
    if (localStorage.getItem('color-theme')) {
      if (localStorage.getItem('color-theme') === 'light') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
        document.body.removeAttribute('data-theme');
      }

      // if NOT set via local storage previously
    } else {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
        document.body.removeAttribute('data-theme');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
        document.body.setAttribute('data-theme', 'dark');
      }
    }
  }

  goToCatalogSearch(id:any) {
    this.router.navigate(['/search/catalogue', id]);
  }

  goTo(path:string) {
    this.closeUserDropdown();
    this.router.navigate([path]);
  }

  toggleCartDrawer(){
    this.showCart=!this.showCart;
    this.cdr.detectChanges();
  }

  async toggleLogin(){
    console.log('login')
    this.showLogin=true;
    //this.api.getLogin()
    //await (window.location.href='http://localhost:8004/login');

    this.loginService.doLogin();
    this.cdr.detectChanges();
  }

  async logout(){
    this.closeUserDropdown();
    this.localStorage.setObject('login_items',{});
    this.is_logged=false;
    this.username='';
    this.email='';
    this.usercharacters='';
    if(this.router.url === '/dashboard'){
      window.location.reload();
    } else {
      this.router.navigate(['/dashboard']);
    }
    await this.loginService.logout();
    this.cdr.detectChanges();
  }

  changeSession(idx:number,exitOrgLogin:boolean){
    this.closeUserDropdown();
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(exitOrgLogin){
      this.loginInfo = {"id": aux.id,
      "user": aux.user,
      "email": aux.email,
      "token": aux.token,
      "expire": aux.expire,
      "partyId": aux.partyId,
      "roles": aux.roles,
      "organizations": aux.organizations,
      "logged_as": aux.id};
      this.localStorage.setObject('login_items',this.loginInfo);
      this.loggedAsOrg=false;
      this.username=aux.user;
      this.usercharacters=(this.loginInfo.user.slice(0, 2)).toUpperCase();
      this.email=aux.email;
      this.roles=[];
      for(let i=0;i<this.loginInfo.roles.length;i++){
        this.roles.push(this.loginInfo.roles[i].name)
      }
      this.eventMessage.emitChangedSession(this.loginInfo)
      this.cdr.detectChanges();
    } else {
      this.loginInfo = {"id": aux.id,
      "user": aux.user,
      "email": aux.email,
      "token": aux.token,
      "expire": aux.expire,
      "partyId": aux.partyId,
      "roles": aux.roles,
      "organizations": aux.organizations,
      "logged_as": this.orgs[idx].id };
      this.localStorage.setObject('login_items',this.loginInfo);
      this.loggedAsOrg=true;
      this.username=this.orgs[idx].name;
      this.usercharacters=(this.orgs[idx].name.slice(0, 2)).toUpperCase();
      this.email=this.orgs[idx].description;
      this.roles=[];
      for(let i=0;i<this.orgs[idx].roles.length;i++){
        this.roles.push(this.orgs[idx].roles[i].name)
      }
      this.eventMessage.emitChangedSession(this.loginInfo)
      this.cdr.detectChanges();
    }
    initFlowbite();
  }

  hideDropdown(dropdownId:any){
    this.closeUserDropdown();
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }

  onLoginClick(){
    if (environment.SIOP_INFO.enabled === true && this.qrVerifier.intervalId === undefined){
      this.statePair = uuid.v4()

      let verifierUrl = `${environment.SIOP_INFO.verifierHost}${environment.SIOP_INFO.verifierQRCodePath}?state=${this.statePair}&client_id=${environment.SIOP_INFO.clientID}`

      if (environment.SIOP_INFO.isRedirection) {
        // New verifier format
        let oldUrl = new URL(window.location.href)
        let newUrl = new URL(oldUrl.origin)
        newUrl.pathname = environment.SIOP_INFO.requestUri

        let finalUrl = newUrl.toString()
        let nonce = uuid.v4()

        verifierUrl = `${verifierUrl}&response_type=code&request_uri=${finalUrl}&scope=openid%20learcredential&nonce=${nonce}`
        window.location.href = verifierUrl
      } else {
        // Old verifier format
        let originalUrl = new URL(environment.SIOP_INFO.callbackURL);
        let newUrl = new URL(window.location.href);

        newUrl.pathname = originalUrl.pathname;
        newUrl.search = originalUrl.search

        // Get the final URL string
        let finalUrl = newUrl.toString();
        console.group(finalUrl)

        verifierUrl = `${verifierUrl}&client_callback=${finalUrl}`
        this.qrWindow = this.qrVerifier.launchPopup(verifierUrl,  'Scan QR code',  500, 500);
        this.initChecking()
      }
    }
    else if (environment.SIOP_INFO.enabled === false){
      window.location.replace(`${environment.BASE_URL}` +  '/login')
    }
  }

  private initChecking():void {
    this.qrVerifier.pollServer(this.qrWindow, this.statePair);
  }

  toggleNavBar() {
    this.isNavBarOpen = !this.isNavBarOpen;
  }

  switchLanguage(language: string) {
    this.translate.use(language);
    this.localStorage.setItem('current_language', language);
    this.defaultLang=language;
  }

  closeUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }

  protected readonly faCartShopping = faCartShopping;
  protected readonly faHandHoldingBox = faHandHoldingBox;
  protected readonly faAddressCard = faAddressCard;
  protected readonly faArrowRightFromBracket = faArrowRightFromBracket;
  protected readonly faBoxesStacked = faBoxesStacked;
  protected readonly faClipboardCheck = faClipboardCheck;
  protected readonly faBrain = faBrain;
  protected readonly faAnglesLeft = faAnglesLeft;
  protected readonly faUser = faUser;
  protected  readonly faUsers = faUsers;
  protected readonly faCogs = faCogs;
  protected readonly faReceipt = faReceipt;
}