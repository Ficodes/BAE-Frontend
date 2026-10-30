import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { ServiceSpecServiceService } from './service-spec-service.service';

describe('ServiceSpecServiceService', () => {
  let service: ServiceSpecServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ServiceSpecServiceService);
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests installed asset types from charging', () => {
    service.getAssetTypes().subscribe(types => expect(types).toEqual([]));
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.BASE_URL}${environment.CHARGING}/api/assetManagement/assetTypes`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('encodes the plugin id for the detail endpoint', () => {
    service.getAssetType('plugin/id').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.BASE_URL}${environment.CHARGING}/api/assetManagement/assetTypes/plugin%2Fid`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'plugin/id' });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
