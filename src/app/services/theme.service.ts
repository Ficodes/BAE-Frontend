import {Injectable, Renderer2, RendererFactory2, Inject, PLATFORM_ID, Injector, OnDestroy} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ThemeConfig, AVAILABLE_THEMES } from '../themes';
import {TranslateService} from "@ngx-translate/core";
import { LocalStorageService } from './local-storage.service';

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements OnDestroy {
  private readonly themeManagedMetaAttribute = 'data-theme-managed-meta';
  private readonly themeModeStorageKey = 'color-theme';
  private renderer: Renderer2;

  private availableThemes: ThemeConfig[] = AVAILABLE_THEMES;
  private defaultTheme: ThemeConfig; // El tema por defecto si no se especifica o falla la carga

  private currentThemeSubject: BehaviorSubject<ThemeConfig | null>; // Puede ser null inicialmente
  public currentTheme$: Observable<ThemeConfig | null>;
  private themeModeSubject: BehaviorSubject<ThemeMode>;
  public themeMode$: Observable<ThemeMode>;
  private darkMediaQuery?: MediaQueryList;

  private readonly onSystemColorSchemeChange = (): void => {
    if (this.themeModeSubject.value === ThemeMode.System) {
      this.applyColorScheme(this.themeModeSubject.value);
    }
  };

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    private injector: Injector,
    private localStorage: LocalStorageService
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.currentThemeSubject = new BehaviorSubject<ThemeConfig | null>(null);
    this.currentTheme$ = this.currentThemeSubject.asObservable();

    // Determinar el tema por defecto como fallback
    this.defaultTheme = this.availableThemes.find(t => t.isDefault) || this.availableThemes[0];
    if (!this.defaultTheme && this.availableThemes.length > 0) {
      console.warn("ThemeService: Ningún tema marcado como 'isDefault'. Usando el primero de la lista como fallback.");
      this.defaultTheme = this.availableThemes[0];
    } else if (this.availableThemes.length === 0) {
      console.error("ThemeService: No hay temas disponibles. El sistema de temas no funcionará correctamente.");
      // Considera un tema mock básico para evitar errores, aunque esto es un problema de configuración.
      this.defaultTheme = { name: 'fallback', displayName: 'Fallback', assets: { logoUrl: '' } };
    }

    if (this.isBrowser() && typeof window.matchMedia === 'function') {
      this.darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.darkMediaQuery.addEventListener('change', this.onSystemColorSchemeChange);
    }

    const initialMode = this.resolveInitialThemeMode();
    this.themeModeSubject = new BehaviorSubject<ThemeMode>(initialMode);
    this.themeMode$ = this.themeModeSubject.asObservable();
  }

  ngOnDestroy(): void {
    this.darkMediaQuery?.removeEventListener('change', this.onSystemColorSchemeChange);
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private resolveInitialThemeMode(): ThemeMode {
    if (!this.isBrowser()) {
      return ThemeMode.System;
    }

    const stored = this.localStorage.getItem(this.themeModeStorageKey);
    if (stored === ThemeMode.Light || stored === ThemeMode.Dark || stored === ThemeMode.System) {
      return stored;
    }
    return ThemeMode.System;
  }

  get currentThemeMode(): ThemeMode {
    return this.themeModeSubject.value;
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeModeSubject.next(mode);

    if (this.isBrowser()) {
      if (mode === ThemeMode.System) {
        this.localStorage.removeItem(this.themeModeStorageKey);
      } else {
        this.localStorage.setItem(this.themeModeStorageKey, mode);
      }
    }

    this.applyColorScheme(mode);
  }

  private prefersDarkColorScheme(): boolean {
    return this.darkMediaQuery?.matches ?? false;
  }

  private activeThemeSupportsDarkMode(): boolean {
    const activeTheme = this.currentThemeSubject.value ?? this.defaultTheme;
    return activeTheme?.features?.darkMode === true;
  }

  private applyColorScheme(mode: ThemeMode): void {
    if (!this.isBrowser() || !this.document?.documentElement) {
      return;
    }

    const html = this.document.documentElement;
    const isDark = this.activeThemeSupportsDarkMode()
      && (mode === ThemeMode.Dark || (mode === ThemeMode.System && this.prefersDarkColorScheme()));

    if (isDark) {
      this.renderer.addClass(html, 'dark');
    } else {
      this.renderer.removeClass(html, 'dark');
    }
  }

  private applyThemeClassToBody(themeName: string, oldThemeName?: string): void {
    if (this.isBrowser() && this.document?.body) {
      const body = this.document.body;
      if (oldThemeName && oldThemeName !== themeName) { // Solo remover si es diferente
        this.renderer.removeClass(body, `theme-${oldThemeName.toLowerCase()}`);
      }
      this.renderer.addClass(body, `theme-${themeName.toLowerCase()}`);
    }
  }

  private applyThemeBrowserMetadata(theme: ThemeConfig): void {
    if (!this.isBrowser() || !this.document) {
      return;
    }

    const browserTitle = theme.browserTitle || theme.displayName;
    if (browserTitle) {
      this.document.title = browserTitle;
    }

    this.applyThemeMetaTags(theme);

    const faviconUrl = theme.assets?.faviconUrl;
    if (!faviconUrl) {
      return;
    }

    const normalizedFaviconUrl = faviconUrl.startsWith('/') ? faviconUrl : `/${faviconUrl}`;
    let favicon = this.document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

    if (!favicon && this.document.head) {
      favicon = this.renderer.createElement('link');
      this.renderer.setAttribute(favicon, 'rel', 'icon');
      this.renderer.appendChild(this.document.head, favicon);
    }

    if (favicon) {
      this.renderer.setAttribute(favicon, 'href', normalizedFaviconUrl);
    }
  }

  private applyThemeMetaTags(theme: ThemeConfig): void {
    const head = this.document.head;
    if (!head) {
      return;
    }

    head
      .querySelectorAll(`meta[${this.themeManagedMetaAttribute}="true"]`)
      .forEach((tag) => this.renderer.removeChild(head, tag));

    if (!theme.metaTags?.length) {
      return;
    }

    theme.metaTags.forEach((tagConfig) => {
      if (!tagConfig.content || (!tagConfig.name && !tagConfig.property)) {
        return;
      }

      const metaTag = this.renderer.createElement('meta');
      this.renderer.setAttribute(metaTag, this.themeManagedMetaAttribute, 'true');
      this.renderer.setAttribute(metaTag, 'content', tagConfig.content);

      if (tagConfig.name) {
        this.renderer.setAttribute(metaTag, 'name', tagConfig.name);
      }

      if (tagConfig.property) {
        this.renderer.setAttribute(metaTag, 'property', tagConfig.property);
      }

      this.renderer.appendChild(head, metaTag);
    });
  }

  /**
   * Inicializa y aplica el tema especificado por la configuración del proveedor.
   * Este método debe ser llamado una vez al inicio de la aplicación (ej. en AppComponent o un APP_INITIALIZER).
   * @param providerThemeName El nombre del tema que el proveedor ha configurado para esta instancia.
   */
  initializeProviderTheme(providerThemeName?: string): void {
    let themeToApply: ThemeConfig | undefined;

    if (providerThemeName) {
      themeToApply = this.availableThemes.find(t => t.name.toLowerCase() === providerThemeName.toLowerCase());
      if (!themeToApply) {
        console.warn(`ThemeService: El tema del proveedor '${providerThemeName}' no se encontró. Usando el tema por defecto.`);
      }
    }

    if (!themeToApply) {
      themeToApply = this.defaultTheme;
    }

    if (!themeToApply && this.availableThemes.length > 0) { // Doble seguro si defaultTheme falló
      themeToApply = this.availableThemes[0];
    }


    if (themeToApply) {
      // Si ya hay un tema aplicado y es diferente, quitar la clase vieja.
      const oldTheme = this.currentThemeSubject.value;
      this.applyThemeClassToBody(themeToApply.name, oldTheme?.name);
      this.applyThemeBrowserMetadata(themeToApply);
      this.currentThemeSubject.next(themeToApply);
      this.applyColorScheme(this.currentThemeMode);

      try {
        const translateService = this.injector.get(TranslateService);
        if (translateService.currentLang) {
          translateService.reloadLang(translateService.currentLang);
        }
      } catch (e) {
        console.error('No se pudo obtener TranslateService. ¿Está importado el TranslateModule correctamente?', e);
      }


    } else {
      console.error("ThemeService: No se pudo determinar un tema para aplicar.");
      // Aquí podría ser útil aplicar una clase de 'error-theme' o similar
      // para indicar visualmente que algo falló con la tematización.
    }
  }

  private findTheme(providerThemeName?: string): ThemeConfig | undefined {
    let themeToApply: ThemeConfig | undefined;

    if (providerThemeName) {
      themeToApply = this.availableThemes.find(t => t.name.toLowerCase() === providerThemeName.toLowerCase());
      if (!themeToApply) {
        console.warn(`ThemeService: El tema del proveedor '${providerThemeName}' no se encontró. Usando el tema por defecto.`);
      }
    }

    if (!themeToApply) {
      themeToApply = this.defaultTheme;
    }

    return themeToApply;
  }


  /**
   * Obtiene la configuración completa del tema actualmente activo.
   * @returns La configuración del tema actual, o null si no se ha inicializado.
   */
  getCurrentThemeConfig(): ThemeConfig | null {
    return this.currentThemeSubject.value;
  }

  /**
   * Obtiene la lista de todos los temas disponibles (para desarrollo o debugging).
   * No debería usarse para un selector de temas de usuario final.
   * @returns Un array de configuraciones de temas.
   */
  getAvailableThemes(): ThemeConfig[] {
    return this.availableThemes;
  }
}
