import { AfterViewInit, ChangeDetectorRef, Component, DoCheck, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  faAddressCard,
  faAnglesLeft,
  faArrowRightFromBracket,
  faBoxesStacked,
  faBrain,
  faCartShopping,
  faClipboardCheck,
  faCogs,
  faHandHoldingBox,
  faPieChart,
  faReceipt,
  faRuler,
  faUser,
  faUsers
} from '@fortawesome/sharp-solid-svg-icons';
import { TranslateService } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import * as uuid from 'uuid';

import { LoginInfo } from 'src/app/models/interfaces';
import { LoginServiceService } from 'src/app/services/login-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { QrVerifierService } from 'src/app/services/qr-verifier.service';
import { EventMessageService } from '../../services/event-message.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { ShoppingCartServiceService } from '../../services/shopping-cart-service.service';
import { ThemeService } from '../../services/theme.service';
import { NavLink, ThemeAuthUrlsConfig, ThemeConfig } from '../../themes';

@Component({
  selector: 'bae-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, AfterViewInit, DoCheck, OnDestroy {
  @ViewChild('navbarbutton') navbarbutton?: ElementRef<HTMLElement>;

  constructor(
    private translate: TranslateService,
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private loginService: LoginServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private eventMessage: EventMessageService,
    private router: Router,
    private qrVerifier: QrVerifierService,
    private themeService: ThemeService,
    private sc: ShoppingCartServiceService
  ) { }

  providerThemeName = environment.providerThemeName;
  quotesEnabled = environment.QUOTES_ENABLED;
  tenderEnabled = environment.TENDER_ENABLED;

  knowledge = environment.KNOWLEDGE_BASE_URL;
  knowledge_onboarding = environment.KB_ONBOARDING_GUIDELINES_URL;
  knowledge_guidelines = environment.KB_GUIDELNES_URL;
  registration = environment.REGISTRATION_FORM_URL;
  ticketing = environment.TICKETING_SYSTEM_URL;
  analytics = environment.analytics;
  domeAbout = environment.DOME_ABOUT_LINK;
  domePublish = environment.DOME_PUBLISH_LINK;

  sellerRole = environment.SELLER_ROLE;
  orgAdminRole = environment.ORG_ADMIN_ROLE;
  certifierRole = environment.CERTIFIER_ROLE;

  langs: any[] = [];
  defaultLang: any;

  showCart = false;
  is_logged = false;
  showLogin = false;

  loggedAsOrg = false;
  isAdmin = false;

  loginInfo: any;
  orgs: any[] = [];

  username = '';
  email = '';
  usercharacters = '';

  roles: string[] = [];

  isNavBarOpen = false;
  flagDropdownOpen = false;

  cartCount = 0;
  scrolled = false;

  qrWindow: Window | null = null;
  statePair = '';

  currentTheme: ThemeConfig | null = null;
  headerLinks: NavLink[] = [];
  themeAuthUrls?: ThemeAuthUrlsConfig;

  private themeSubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = window.scrollY > 10;
  }

  @HostListener('document:click')
  onClick() {
    if (this.showCart) {
      this.showCart = false;
      this.cdr.detectChanges();
    }
    if (this.isNavBarOpen) {
      this.isNavBarOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isNavBarOpen) {
      this.navbarbutton?.nativeElement.blur();
      this.isNavBarOpen = false;
    }
  }

  ngDoCheck(): void {
    if (this.qrWindow && this.qrWindow.closed) {
      this.qrVerifier.stopChecking(this.qrWindow);
      this.qrWindow = null;
    }
  }

  ngOnInit(): void {
    this.langs = this.translate.getLangs();
    const currLang = this.localStorage.getItem('current_language');
    this.defaultLang = currLang ?? this.translate.getDefaultLang();

    this.themeSubscription = this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.themeAuthUrls = theme?.authUrls;

      const links = theme?.links?.headerLinks || [];
      this.headerLinks = this.resolveLinksEnv(links);

      if (theme?.links) {
        theme.links.headerLinks = this.headerLinks;
      }
    });

    this.hydrateLoginFromStorage();

    this.sc.cart$.pipe(takeUntil(this.destroy$)).subscribe(cart => {
      this.cartCount = cart.length;
      this.cdr.detectChanges();
    });

    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'ToggleCartDrawer') {
        this.showCart = false;
        this.cdr.detectChanges();
      }

      if (ev.type === 'LoginProcess') {
        this.hydrateLoginFromStorage();
      }
    });

    initFlowbite();
  }

  ngAfterViewInit(): void {
    initFlowbite();
  }

  ngOnDestroy(): void {
    this.qrWindow?.close();
    this.qrWindow = null;

    this.themeSubscription.unsubscribe();

    this.destroy$.next();
    this.destroy$.complete();
  }


  private resolveLinksEnv(links: NavLink[]): NavLink[] {
    const walk = (arr: NavLink[]): NavLink[] =>
      arr.map(link => {
        const out: NavLink = { ...link };
        if ((link as any).environmentName) {
          out.url = (environment as any)[(link as any).environmentName] || '';
        }
        if (link.children?.length) {
          out.children = walk(link.children);
        }
        return out;
      });

    return walk(links);
  }

  private hydrateLoginFromStorage() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;

    if (JSON.stringify(aux) === '{}') {
      this.resetLoginState();
      return;
    }

    if (((aux.expire - moment().unix()) - 4) <= 0) {
      this.resetLoginState();
      return;
    }

    this.loginInfo = aux;
    this.is_logged = true;
    this.orgs = aux.organizations ?? [];

    this.isAdmin = (aux.roles ?? []).some(r => r.name === environment.ADMIN_ROLE);

    if (aux.logged_as === aux.id) {
      this.loggedAsOrg = false;
      this.username = aux.user;
      this.usercharacters = (aux.user?.slice(0, 2) || '').toUpperCase();
      this.email = aux.email;
      this.roles = (aux.roles ?? []).map(r => r.name);
    } else {
      const loggedOrg = this.orgs.find((o: any) => o.id === aux.logged_as);
      this.loggedAsOrg = true;
      this.username = loggedOrg?.name ?? '';
      this.usercharacters = (this.username.slice(0, 2) || '').toUpperCase();
      this.email = loggedOrg?.description ?? '';
      this.roles = (loggedOrg?.roles ?? []).map((r: any) => r.name);
    }

    this.cdr.detectChanges();
  }

  private resetLoginState() {
    this.is_logged = false;
    this.isAdmin = false;
    this.loggedAsOrg = false;
    this.loginInfo = null;
    this.orgs = [];
    this.roles = [];
    this.username = '';
    this.email = '';
    this.usercharacters = '';
    this.cdr.detectChanges();
  }

  goToCatalogSearch(id: any) {
    this.router.navigate(['/search/catalogue', id]);
  }

  goTo(path: string, id?: string) {
    this.closeUserDropdown();

    if (id) {
      this.closeDropdown('dropdown-marketplaceMenu');
    }

    this.router.navigate([path]);
  }

  toggleCartDrawer() {
    this.showCart = !this.showCart;
    this.cdr.detectChanges();
  }

  toggleNavBar() {
    this.isNavBarOpen = !this.isNavBarOpen;
  }

  switchLanguage(language: string) {
    this.translate.use(language);
    this.localStorage.setItem('current_language', language);
    this.defaultLang = language;
  }

  async logout() {
    this.closeUserDropdown();
    this.localStorage.setObject('login_items', {});
    this.resetLoginState();

    if (this.router.url === '/dashboard') {
      window.location.reload();
    } else {
      this.router.navigate(['/dashboard']);
    }

    await this.loginService.logout();
    this.cdr.detectChanges();
  }

  changeSession(idx: number, exitOrgLogin: boolean) {
    this.closeUserDropdown();

    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) === '{}') return;

    if (exitOrgLogin) {
      this.loginInfo = {
        id: aux.id,
        user: aux.user,
        email: aux.email,
        token: aux.token,
        expire: aux.expire,
        partyId: aux.partyId,
        roles: aux.roles,
        organizations: aux.organizations,
        logged_as: aux.id
      };

      this.localStorage.setObject('login_items', this.loginInfo);
      this.eventMessage.emitChangedSession(this.loginInfo);
      this.hydrateLoginFromStorage();
      initFlowbite();
      return;
    }

    const org = this.orgs[idx];
    if (!org) return;

    this.loginInfo = {
      id: aux.id,
      user: aux.user,
      email: aux.email,
      token: aux.token,
      expire: aux.expire,
      partyId: aux.partyId,
      roles: aux.roles,
      organizations: aux.organizations,
      logged_as: org.id
    };

    this.localStorage.setObject('login_items', this.loginInfo);
    this.eventMessage.emitChangedSession(this.loginInfo);
    this.hydrateLoginFromStorage();
    initFlowbite();
  }

  hideDropdown(dropdownId: string) {
    this.closeUserDropdown();
    const dropdown = document.getElementById(dropdownId);
    dropdown?.classList.add('hidden');
  }

  closeUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown?.classList.add('hidden');
  }

  closeDropdown(id: string) {
    document.getElementById(id)?.classList.add('hidden');
  }

  openDropdown(id: string) {
    document.getElementById(id)?.classList.remove('hidden');
  }

  onLoginClick() {
    if (environment.SIOP_INFO.enabled === true && this.qrVerifier.intervalId === undefined) {
      this.statePair = uuid.v4();

      let verifierUrl =
        `${environment.SIOP_INFO.verifierHost}${environment.SIOP_INFO.verifierQRCodePath}` +
        `?state=${this.statePair}&client_id=${environment.SIOP_INFO.clientID}`;

      if (environment.SIOP_INFO.isRedirection) {
        const oldUrl = new URL(window.location.href);
        const newUrl = new URL(oldUrl.origin);
        newUrl.pathname = environment.SIOP_INFO.requestUri;

        const finalUrl = newUrl.toString();
        const nonce = uuid.v4();

        verifierUrl =
          `${verifierUrl}&response_type=code&request_uri=${finalUrl}` +
          `&scope=openid%20learcredential&nonce=${nonce}`;

        window.location.href = verifierUrl;
        return;
      }

      const originalUrl = new URL(environment.SIOP_INFO.callbackURL);
      const newUrl = new URL(window.location.href);

      newUrl.pathname = originalUrl.pathname;
      newUrl.search = originalUrl.search;

      const finalUrl = newUrl.toString();
      verifierUrl = `${verifierUrl}&client_callback=${finalUrl}`;

      this.qrWindow = this.qrVerifier.launchPopup(verifierUrl, 'Scan QR code', 500, 500);
      this.qrVerifier.pollServer(this.qrWindow, this.statePair);
      return;
    }

    if (environment.SIOP_INFO.enabled === false) {
      window.location.replace(`${environment.BASE_URL}/login`);
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
  protected readonly faUsers = faUsers;
  protected readonly faCogs = faCogs;
  protected readonly faReceipt = faReceipt;
  protected readonly faRuler = faRuler;
  protected readonly faPieChart = faPieChart;
}
