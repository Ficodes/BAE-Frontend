import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

const LANG_KEY = 'current_language';
const DEFAULT_LANG = 'en';
const AVAILABLE_LANGS = ['en', 'es'];

@Injectable({
  providedIn: 'root'
})
export class LocaleService {

  private readonly translate = inject(TranslateService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly document = inject(DOCUMENT);

  private lang$ = new BehaviorSubject<string>(DEFAULT_LANG);
  readonly currentLang$: Observable<string> = this.lang$.asObservable();

  init(): Observable<any> {
    this.translate.addLangs(AVAILABLE_LANGS);
    this.translate.setDefaultLang(DEFAULT_LANG);

    this.translate.onLangChange.subscribe(({ lang }) => {
      this.document.documentElement.lang = lang;
      this.lang$.next(lang);
    });

    const stored = this.localStorage.getItem(LANG_KEY);
    const browserLang = this.translate.getBrowserLang() ?? DEFAULT_LANG;
    const lang = stored && stored.length > 0
      ? stored
      : AVAILABLE_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;

    return this.translate.use(lang);
  }

  get currentLang(): string {
    return this.lang$.value;
  }

  get availableLangs(): string[] {
    return [...AVAILABLE_LANGS];
  }

  setLanguage(lang: string): void {
    this.localStorage.setItem(LANG_KEY, lang);
    this.translate.use(lang);
  }
}
