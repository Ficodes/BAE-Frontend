import {Injectable, Renderer2, RendererFactory2, Inject, PLATFORM_ID, Injector} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ThemeConfig, AVAILABLE_THEMES } from '../themes';
import {TranslateService} from "@ngx-translate/core";

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;

  private availableThemes: ThemeConfig[] = AVAILABLE_THEMES;
  private defaultTheme: ThemeConfig; // El tema por defecto si no se especifica o falla la carga

  private currentThemeSubject: BehaviorSubject<ThemeConfig | null>; // Puede ser null inicialmente
  public currentTheme$: Observable<ThemeConfig | null>;

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    private injector: Injector
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
  }

  private applyThemeClassToBody(themeName: string, oldThemeName?: string): void {
    if (isPlatformBrowser(this.platformId) && this.document?.body) {
      const body = this.document.body;
      if (oldThemeName && oldThemeName !== themeName) { // Solo remover si es diferente
        this.renderer.removeClass(body, `theme-${oldThemeName.toLowerCase()}`);
      }
      this.renderer.addClass(body, `theme-${themeName.toLowerCase()}`);
    }
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
      this.currentThemeSubject.next(themeToApply);

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
