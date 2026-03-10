import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ThemeService);
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
  });

  it('should apply DOME browser title and favicon when DOME theme is selected', () => {
    service.initializeProviderTheme('DOME');
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

    expect(document.title).toBe('DOME Marketplace');
    expect(favicon).not.toBeNull();
    expect(favicon?.getAttribute('href')).toContain('/assets/dome_logo.PNG');
  });
});
