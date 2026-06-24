import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, filter, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { ThemeService } from './theme.service';

export class ThemeAwareTranslateLoader implements TranslateLoader {

  private cache = new Map<string, Observable<any>>();

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  public getTranslation(lang: string): Observable<any> {
    return this.themeService.currentTheme$.pipe(
      filter(theme => theme !== null),
      take(1),
      switchMap(theme => {
        const themeName = theme?.name;
        const cacheKey = themeName ? `${lang}-${themeName}` : lang;

        if (this.cache.has(cacheKey)) {
          return this.cache.get(cacheKey)!;
        }

        const common$ = this.http.get(`assets/i18n/${lang}.json`);
        const translation$ = themeName
          ? forkJoin([
              common$,
              this.http.get(`assets/i18n/themes/${lang}-${themeName}.json`).pipe(catchError(() => of({})))
            ]).pipe(map(([common, theme]) => this.deepMerge(common, theme)))
          : common$;

        const cached$ = translation$.pipe(shareReplay(1));
        this.cache.set(cacheKey, cached$);
        return cached$;
      })
    );
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      output[key] = this.isObject(source[key]) && this.isObject(target?.[key])
        ? this.deepMerge(target[key], source[key])
        : source[key];
    }
    return output;
  }

  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
