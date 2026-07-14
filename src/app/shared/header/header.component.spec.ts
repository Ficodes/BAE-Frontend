import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [HeaderComponent]
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should treat user menu routes as workspace routes', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/product-inventory/123');

    component.ngOnInit();

    expect(component.isWorkspace).toBeTrue();
  });

  it('should not treat marketplace routes as workspace routes', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/browse');

    component.ngOnInit();

    expect(component.isWorkspace).toBeFalse();
  });

  it('should keep checkout in marketplace mode', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/checkout');

    component.ngOnInit();

    expect(component.isWorkspace).toBeFalse();
  });
});
