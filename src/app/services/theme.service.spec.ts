import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ThemeMode, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  const getMetaContent = (property: string) => {
    return document
      .querySelector(`meta[property="${property}"]`)
      ?.getAttribute('content');
  };

  beforeEach(() => {
    localStorage.removeItem('color-theme');
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem('color-theme');
    document.documentElement.classList.remove('dark');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should apply default theme browser title and favicon when no theme is provided', () => {
    service.initializeProviderTheme();
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

    expect(document.title).toBe('BAE Marketplace');
    expect(favicon).not.toBeNull();
    expect(favicon?.getAttribute('href')).toContain('/assets/themes/bae/bae-logo.svg');
    expect(getMetaContent('og:title')).toBeUndefined();
  });

  it('should apply DOME browser title, favicon and meta tags when DOME theme is selected', () => {
    service.initializeProviderTheme('DOME');
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

    expect(document.title).toBe('DOME Marketplace');
    expect(favicon).not.toBeNull();
    expect(favicon?.getAttribute('href')).toContain('/assets/dome_logo.PNG');
    expect(getMetaContent('og:title')).toBe('DOME Marketplace - Dashboard');
    expect(getMetaContent('og:description')).toBe('The European federated ecosystem for secure and trusted Cloud and Edge service procurement.');
    expect(getMetaContent('og:image')).toBe('https://dome-marketplace.eu');
    expect(getMetaContent('og:url')).toBe('https://dome-marketplace.eu/dashboard');
    expect(getMetaContent('og:type')).toBe('website');
  });

  it('should remove theme meta tags when switching to a theme without meta tags', () => {
    service.initializeProviderTheme('DOME');
    service.initializeProviderTheme('BAE');

    expect(getMetaContent('og:title')).toBeUndefined();
  });

  it('should apply dark mode for the default BAE theme when requested', () => {
    service.initializeProviderTheme('BAE');

    service.setThemeMode(ThemeMode.Dark);

    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(localStorage.getItem('color-theme')).toBe(ThemeMode.Dark);
  });

  it('should force light mode for DOME even when dark mode is stored', () => {
    localStorage.setItem('color-theme', ThemeMode.Dark);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ThemeService);

    service.initializeProviderTheme('DOME');

    expect(service.currentThemeMode).toBe(ThemeMode.Dark);
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });
});
