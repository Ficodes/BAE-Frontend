import { TestBed } from '@angular/core/testing';
import { ProviderService } from 'src/app/services/provider.service';
import { ProviderDirectorySource } from './provider-directory.source';

describe('ProviderDirectorySource', () => {
  let source: ProviderDirectorySource;
  let providerService: jasmine.SpyObj<ProviderService>;

  beforeEach(() => {
    providerService = jasmine.createSpyObj<ProviderService>('ProviderService', ['getProviderDirectoryPage']);
    providerService.getProviderDirectoryPage.and.resolveTo({
      items: [],
      filteredPaginationToken: null
    });

    TestBed.configureTestingModule({
      providers: [
        ProviderDirectorySource,
        { provide: ProviderService, useValue: providerService }
      ]
    });

    source = TestBed.inject(ProviderDirectorySource);
  });

  it('loads organization directory pages filtered by launched offering publication', async () => {
    await source.loadPage({
      offset: 12,
      limit: 6,
      keyword: 'cloud',
      continuationToken: 'provider-token',
      fallbackLogoUrl: ''
    });

    expect(providerService.getProviderDirectoryPage).toHaveBeenCalledOnceWith({
      offset: 12,
      limit: 6,
      keyword: 'cloud',
      lifecycleStatus: 'Launched',
      filteredPaginationToken: 'provider-token'
    });
  });
});
