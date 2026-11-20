import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { ResourceSpecServiceService } from './resource-spec-service.service';

describe('ResourceSpecServiceService', () => {
  let service: ResourceSpecServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ResourceSpecServiceService);
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests only resource plugins from charging', () => {
    service.getAssetTypes().subscribe(types => expect(types).toEqual([]));
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.BASE_URL}${environment.CHARGING}/api/assetManagement/assetTypes?type=resource`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('type')).toBe('resource');
    request.flush([]);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
