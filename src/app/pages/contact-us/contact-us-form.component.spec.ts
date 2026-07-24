import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { of, Subject } from "rxjs";
import { ContactUsService } from "../../services/contactUs.service";
import { ContactUsFormComponent, IContactUs } from "./contact-us-form.component";

interface ISendEmail {
  form: IContactUs;
}

describe("ContactUsFormComponent", () => {
  let component: ContactUsFormComponent;
  let fixture: ComponentFixture<ContactUsFormComponent>;
  let contactUsServiceSpy: jasmine.SpyObj<ContactUsService>;
  let router: Router;

  const validFormValue: IContactUs = {
    supportType: "technical",
    firstName: "Luigi",
    lastName: "Borriello",
    email: "luigi@test.com",
    organization: "OpenAI",
    roleInOrganization: "Senior Angular Developer",
    message: "Test message",
    privacyAccepted: true,
    marketingAccepted: false
  };

  const sendEmailResponse: ISendEmail = {
    form: validFormValue
  };

  beforeEach(async () => {
    contactUsServiceSpy = jasmine.createSpyObj("ContactUsService", ["sendEmail"]);

    await TestBed.configureTestingModule({
      imports: [ContactUsFormComponent],
      providers: [
        provideRouter([]),
        { provide: ContactUsService, useValue: contactUsServiceSpy }
      ]
    })
      .overrideComponent(ContactUsFormComponent, {
        set: {
          template: ""
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ContactUsFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    spyOn(router, "navigate").and.resolveTo(true);

    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.form.setValue(validFormValue);
  }

  it("should create", () => {
    expect(component).toBeDefined();
  });

  it("should initialize form with default values", () => {
    expect(component.form.getRawValue()).toEqual({
      supportType: "",
      firstName: "",
      lastName: "",
      email: "",
      organization: "",
      roleInOrganization: "",
      message: "",
      privacyAccepted: false,
      marketingAccepted: false
    });
  });

  it("should be invalid on init", () => {
    expect(component.form.invalid).toBeTrue();
  });

  it("should expose controls through getter f", () => {
    expect(component.f.firstName).toBeDefined();
    expect(component.f.lastName).toBeDefined();
    expect(component.f.email).toBeDefined();
    expect(component.f.organization).toBeDefined();
    expect(component.f.roleInOrganization).toBeDefined();
    expect(component.f.message).toBeDefined();
    expect(component.f.privacyAccepted).toBeDefined();
    expect(component.f.marketingAccepted).toBeDefined();
  });

  it("should return false from hasError if control is invalid but untouched and not submitted", () => {
    expect(component.hasError("firstName")).toBeFalse();
  });

  it("should return true from hasError if control is touched and invalid", () => {
    component.f.firstName.markAsTouched();

    expect(component.hasError("firstName")).toBeTrue();
  });

  it("should return true from hasError if form was submitted and control is invalid", () => {
    component.submitted = true;

    expect(component.hasError("firstName")).toBeTrue();
  });

  it("should validate invalid email", () => {
    component.f.email.setValue("abc");
    component.f.email.markAsTouched();
    component.f.email.updateValueAndValidity();

    expect(component.f.email.invalid).toBeTrue();
    expect(component.f.email.hasError("email")).toBeTrue();
    expect(component.hasError("email")).toBeTrue();
  });

  it("should validate privacyAccepted with requiredTrue", () => {
    component.f.privacyAccepted.setValue(false);
    component.f.privacyAccepted.markAsTouched();
    component.f.privacyAccepted.updateValueAndValidity();

    expect(component.f.privacyAccepted.invalid).toBeTrue();
    expect(component.f.privacyAccepted.hasError("required")).toBeTrue();
  });

  it("should accept privacyAccepted when true", () => {
    component.f.privacyAccepted.setValue(true);
    component.f.privacyAccepted.updateValueAndValidity();

    expect(component.f.privacyAccepted.valid).toBeTrue();
    expect(component.f.privacyAccepted.hasError("required")).toBeFalse();
  });

  it("should be valid when form is correctly filled", () => {
    fillValidForm();

    expect(component.form.valid).toBeTrue();
  });

  it("should set submitted to true and not call service if form is invalid", () => {
    component.onSubmit();

    expect(component.submitted).toBeTrue();
    expect(contactUsServiceSpy.sendEmail).not.toHaveBeenCalled();
    expect(component.submittedSuccessfully).toBeFalse();
  });

  it("should mark all controls as touched on invalid submit", () => {
    component.onSubmit();

    expect(component.f.firstName.touched).toBeTrue();
    expect(component.f.lastName.touched).toBeTrue();
    expect(component.f.email.touched).toBeTrue();
    expect(component.f.organization.touched).toBeTrue();
    expect(component.f.roleInOrganization.touched).toBeTrue();
    expect(component.f.message.touched).toBeTrue();
    expect(component.f.privacyAccepted.touched).toBeTrue();
  });

  it("should call sendEmail with raw form value when form is valid", () => {
    fillValidForm();
    contactUsServiceSpy.sendEmail.and.returnValue(of(sendEmailResponse) as any);

    component.onSubmit();

    expect(contactUsServiceSpy.sendEmail).toHaveBeenCalledOnceWith(validFormValue);
  });

  it("should set submittedSuccessfully to true when sendEmail succeeds", () => {
    fillValidForm();
    contactUsServiceSpy.sendEmail.and.returnValue(of(sendEmailResponse) as any);

    component.onSubmit();

    expect(component.submittedSuccessfully).toBeTrue();
  });

  it("should reset form and flags and navigate to dashboard on continue browsing", () => {
    fillValidForm();
    component.submitted = true;
    component.submittedSuccessfully = true;

    component.onContinueBrowsing();

    expect(component.submitted).toBeFalse();
    expect(component.submittedSuccessfully).toBeFalse();
    expect(component.form.getRawValue()).toEqual({
      supportType: "",
      firstName: "",
      lastName: "",
      email: "",
      organization: "",
      roleInOrganization: "",
      message: "",
      privacyAccepted: false,
      marketingAccepted: false
    });
    expect(router.navigate).toHaveBeenCalledWith(["/dashboard"]);
  });

  it("should emit and complete unsub subject on destroy", () => {
    const nextSpy = jasmine.createSpy("next");
    const completeSpy = jasmine.createSpy("complete");

    component.unsub.subscribe({
      next: nextSpy,
      complete: completeSpy
    });

    fixture.destroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it("should unsubscribe active request on destroy", () => {
    const response$ = new Subject<ISendEmail>();
    contactUsServiceSpy.sendEmail.and.returnValue(response$.asObservable() as any);

    fillValidForm();
    component.onSubmit();

    fixture.destroy();

    response$.next(sendEmailResponse);
    response$.complete();

    expect(component.submittedSuccessfully).toBeFalse();
  });
});
