import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { EventMessageService } from 'src/app/services/event-message.service';

import { HeaderComponent } from './header.component';

@Component({ template: '' })
class TestPageComponent {}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let router: Router;
  let eventMessage: EventMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'my-offerings', component: TestPageComponent },
          { path: 'profile', component: TestPageComponent },
          { path: 'admin', component: TestPageComponent },
          { path: 'dashboard', component: TestPageComponent }
        ]),
        TranslateModule.forRoot()
      ],
      declarations: [HeaderComponent, TestPageComponent]
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    eventMessage = TestBed.inject(EventMessageService);
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

  it('should render the workspace header for workspace routes', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/product-inventory/123');

    component.ngOnInit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#workspaceSupport')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#usageSpecs')).toBeNull();
  });

  it('should render marketplace navigation outside workspace routes', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/browse');

    component.ngOnInit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#workspaceSupport')).toBeNull();
    expect(fixture.nativeElement.querySelector('ul')).not.toBeNull();
  });

  ['/profile', '/admin'].forEach(path => {
    it(`should return to the marketplace after leaving the offer editor for ${path}`, fakeAsync(() => {
      fixture.ngZone!.run(() => router.navigateByUrl('/my-offerings'));
      tick();
      eventMessage.emitSellerCreateOffer(true);
      fixture.detectChanges();
      expect(component.activeEditor).toBe('offer');

      const leaveSpy = spyOn(eventMessage, 'emitLeaveOfferEditorRequest').and.callThrough();
      fixture.ngZone!.run(() => router.navigateByUrl(path));
      tick();
      fixture.detectChanges();

      const backLink: HTMLAnchorElement = fixture.nativeElement.querySelector('nav a');
      expect(component.activeEditor).toBeNull();
      expect(backLink.textContent).toContain('OFFERINGS._back_to_marketplace');

      fixture.ngZone!.run(() => backLink.click());
      tick();

      expect(router.url).toBe('/dashboard');
      expect(leaveSpy).not.toHaveBeenCalled();
    }));
  });

  it('should keep offer exit handling when navigating within my-offerings', fakeAsync(() => {
    fixture.ngZone!.run(() => router.navigateByUrl('/my-offerings'));
    tick();
    eventMessage.emitSellerCreateOffer(true);
    const leaveSpy = spyOn(eventMessage, 'emitLeaveOfferEditorRequest').and.callThrough();

    fixture.ngZone!.run(() => router.navigateByUrl('/my-offerings?tab=offers'));
    tick();
    fixture.detectChanges();

    const backLink: HTMLAnchorElement = fixture.nativeElement.querySelector('nav a');
    expect(component.activeEditor).toBe('offer');
    expect(backLink.textContent).toContain('CREATE_OFFER._back_to_offers');

    fixture.ngZone!.run(() => backLink.click());
    tick();

    expect(leaveSpy).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/my-offerings?tab=offers');
  }));

  it('goToResources should open configured knowledge base URL', () => {
    const openSpy = spyOn(window, 'open');
    const fallbackUrl = environment.KNOWLEDGE_BASE_URL || environment.KB_GUIDELNES_URL;

    component.goToResources();

    expect(openSpy).toHaveBeenCalledWith(fallbackUrl, '_blank', 'noopener');
  });

  it('should treat usage spec create/update as a workspace editor', () => {
    eventMessage.emitCreateUsageSpec(true);

    expect(component.activeEditor).toBe('usageSpec');
    expect(component.backLabelKey).toBe('OFFERINGS._back_to_usage_specs');

    eventMessage.emitUsageSpecList(true);

    expect(component.activeEditor).toBeNull();
  });

  it('workspace back should return usage spec editors to the usage spec list', () => {
    const usageListSpy = spyOn(eventMessage, 'emitUsageSpecList').and.callThrough();
    component.activeEditor = 'usageSpec';

    component.onWorkspaceBackClick();

    expect(usageListSpy).toHaveBeenCalledOnceWith(true);
  });

  it('workspace back should request product spec editor leave handling', () => {
    const leaveSpy = spyOn(eventMessage, 'emitLeaveProductSpecEditorRequest').and.callThrough();
    component.activeEditor = 'productSpec';

    component.onWorkspaceBackClick();

    expect(leaveSpy).toHaveBeenCalled();
  });

  it('workspace back should request service spec editor leave handling', () => {
    const leaveSpy = spyOn(eventMessage, 'emitLeaveServiceSpecEditorRequest').and.callThrough();
    const listSpy = spyOn(eventMessage, 'emitSellerServiceSpec').and.callThrough();
    component.activeEditor = 'serviceSpec';

    component.onWorkspaceBackClick();

    expect(leaveSpy).toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('workspace back should request resource spec editor leave handling', () => {
    const leaveSpy = spyOn(eventMessage, 'emitLeaveResourceSpecEditorRequest').and.callThrough();
    const listSpy = spyOn(eventMessage, 'emitSellerResourceSpec').and.callThrough();
    component.activeEditor = 'resourceSpec';

    component.onWorkspaceBackClick();

    expect(leaveSpy).toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();
  });
  for (const kind of ['products', 'services', 'resources']) {
    it(`returns ${kind} details to the correct inventory section`, () => {
      const url = kind === 'products' ? '/product-inventory/p1' : `/product-inventory/${kind}/i1`;
      spyOnProperty(router, 'url', 'get').and.returnValue(url + '?status=active&view=list');
      const navigate = spyOn(router, 'navigate').and.resolveTo(true);

      expect(component.backLabelKey).toBe('PRODUCT_INVENTORY._back_to_' + kind);
      component.onWorkspaceBackClick();

      expect(navigate).toHaveBeenCalledOnceWith(['/product-inventory'], {
        queryParams: { section: kind, view: 'list' }
      });
    });
  }

  it('returns related specification details to their parent product', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/product-inventory/services/spec1?source=specification&productId=p1&status=created&view=list');
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    expect(component.backLabelKey).toBe('PRODUCT_INVENTORY._back_to_product');
    component.onWorkspaceBackClick();

    expect(navigate).toHaveBeenCalledOnceWith(['/product-inventory', 'p1'], {
      queryParams: { view: 'list' }
    });
  });
});
