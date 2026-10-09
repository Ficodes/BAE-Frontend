import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { EventMessageService } from 'src/app/services/event-message.service';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let router: Router;
  let eventMessage: EventMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [HeaderComponent]
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
});
