import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Observable, Subject } from 'rxjs';
import { ThemeService } from 'src/app/services/theme.service';
import { ThemeConfig } from 'src/app/themes';

import { ContactUsFormComponent } from './contact-us-form.component';

describe('ContactUsFormComponent', () => {
  let component: ContactUsFormComponent;
  let fixture: ComponentFixture<ContactUsFormComponent>;
  let themeSubject: Subject<ThemeConfig | null>;

  const themeServiceStub: { currentTheme$: Observable<ThemeConfig | null> } = {
    currentTheme$: new Subject<ThemeConfig | null>().asObservable(),
  };

  beforeEach(async () => {
    themeSubject = new Subject<ThemeConfig | null>();
    themeServiceStub.currentTheme$ = themeSubject.asObservable();

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [ContactUsFormComponent],
      providers: [{ provide: ThemeService, useValue: themeServiceStub }],
    })
    .overrideComponent(ContactUsFormComponent, {
      set: { template: '' },
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContactUsFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with an invalid form', () => {
    expect(component.contactForm.valid).toBeFalse();
    expect(component.contactForm.get('email')?.hasError('required')).toBeTrue();
    expect(component.contactForm.get('message')?.hasError('required')).toBeTrue();
  });

  it('should validate email format', () => {
    component.contactForm.patchValue({ email: 'invalid-email' });
    expect(component.contactForm.get('email')?.hasError('email')).toBeTrue();
  });

  it('ngOnInit should update currentTheme when theme service emits', () => {
    const theme = { name: 'default', displayName: 'Default', assets: { jumboBgUrl: '/bg.png' } } as any;

    component.ngOnInit();
    themeSubject.next(theme);

    expect(component.currentTheme).toEqual(theme);
  });

  it('ngOnDestroy should stop updating theme after destroy', () => {
    const firstTheme = { name: 'first', displayName: 'First', assets: {} } as any;
    const secondTheme = { name: 'second', displayName: 'Second', assets: {} } as any;

    component.ngOnInit();
    themeSubject.next(firstTheme);
    component.ngOnDestroy();
    themeSubject.next(secondTheme);

    expect(component.currentTheme).toEqual(firstTheme);
  });

  it('hide should set showThanksMessage to false', () => {
    component.showThanksMessage = true;

    component.hide();

    expect(component.showThanksMessage).toBeFalse();
  });

  it('resetContactForm should clear values and control state', () => {
    component.contactForm.patchValue({
      email: 'john@example.com',
      name: 'John',
      lastname: 'Doe',
      organization: 'Acme',
      role: 'Engineer',
      message: 'Hello',
    });
    component.contactForm.markAllAsTouched();

    component.resetContactForm();

    expect(component.contactForm.value).toEqual({
      email: null,
      name: null,
      lastname: null,
      organization: null,
      role: null,
      message: null,
    });
    Object.values(component.contactForm.controls).forEach((control) => {
      expect(control.pristine).toBeTrue();
      expect(control.untouched).toBeTrue();
      expect(control.value).toBeNull();
    });
  });

  it('should make form valid when all required fields are provided with valid values', () => {
    component.contactForm.patchValue({
      email: 'john@example.com',
      name: 'John',
      lastname: 'Doe',
      organization: 'Acme',
      role: 'Engineer',
      message: 'Hello',
    });

    expect(component.contactForm.valid).toBeTrue();
  });
});
