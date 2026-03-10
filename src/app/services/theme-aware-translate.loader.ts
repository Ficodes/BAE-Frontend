import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ThemeService } from './theme.service'; // Asegúrate que la ruta es correcta

export class ThemeAwareTranslateLoader implements TranslateLoader {

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  public getTranslation(lang: string): any {
    const currentThemeName = this.themeService.getCurrentThemeConfig()?.name;
    const themeJsonPath = `assets/i18n/themes/${lang}-${currentThemeName}.json`;
    const commonJsonPath = `assets/i18n/${lang}.json`;

    // forkJoin nos permite obtener ambas peticiones (base y tema)
    return forkJoin([
      this.http.get(commonJsonPath), // Petición para el JSON base (obligatoria)
      this.http.get(themeJsonPath).pipe( // Petición para el JSON del tema (opcional)
        catchError(() => {
          // Si el archivo del tema no existe (ej. tema BAE no tiene es-BAE.json),
          // devolvemos un observable con un objeto vacío para no romper la fusión.
          return of({});
        })
      )
    ]).pipe(
      map(([commonTranslations, themeTranslations]) => {
        // Fusionamos los objetos. Las propiedades de themeTranslations
        // sobrescribirán las de commonTranslations si tienen la misma clave.
        // Usamos una fusión profunda (deep merge) para que no reemplace objetos enteros como "DASHBOARD".
        return this.deepMerge(commonTranslations, themeTranslations);
      })
    );
  }

  /**
   * Realiza una fusión profunda de dos objetos.
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}
