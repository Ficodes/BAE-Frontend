import { TestBed } from '@angular/core/testing';

import { PricePlanMetricsService } from './price-plan-metrics.service';
import { ApiServiceService } from 'src/app/services/product-service.service';

describe('PricePlanMetricsService', () => {
  let service: PricePlanMetricsService;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getOfferingPrice']);
    apiSpy.getOfferingPrice.and.resolveTo(null);

    TestBed.configureTestingModule({
      providers: [
        PricePlanMetricsService,
        { provide: ApiServiceService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(PricePlanMetricsService);
  });

  it('should return empty list when no price plan is provided', async () => {
    const result = await service.getAppliedMetrics(undefined, []);
    expect(result).toEqual([]);
  });

  it('should return usage metric for direct usage price plan when no characteristic filters exist', async () => {
    const result = await service.getAppliedMetrics(
      {
        id: 'pp-1',
        priceType: 'usage',
        usageSpecId: 'usage-1',
        unitOfMeasure: { units: 'RAM_gb_hour' },
      },
      []
    );

    expect(result).toEqual([
      {
        priceId: 'pp-1',
        usageSpecId: 'usage-1',
        unitOfMeasure: 'RAM_gb_hour',
        value: 0,
      },
    ]);
  });

  it('should filter bundled usage metrics based on matching string/number/boolean characteristic values', async () => {
    apiSpy.getOfferingPrice.and.callFake(async (id: string) => {
      if (id === 'cpu') {
        return {
          id: 'cpu',
          priceType: 'usage',
          usageSpecId: 'u-cpu',
          unitOfMeasure: { units: 'CPU_core_hour' },
          prodSpecCharValueUse: [
            { id: 'char-region', productSpecCharacteristicValue: [{ value: 'eu' }] },
            { id: 'char-size', productSpecCharacteristicValue: [{ value: 4 }] },
            { id: 'char-spot', productSpecCharacteristicValue: [{ value: true }] },
          ],
        };
      }
      return {
        id: 'ram',
        priceType: 'usage',
        usageSpecId: 'u-ram',
        unitOfMeasure: { units: 'RAM_gb_hour' },
        prodSpecCharValueUse: [
          { id: 'char-region', productSpecCharacteristicValue: [{ value: 'us' }] },
        ],
      };
    });

    const result = await service.getAppliedMetrics(
      {
        id: 'bundle-main',
        bundledPopRelationship: [{ id: 'cpu' }, { id: 'ram' }],
      },
      [
        { id: 'char-region', value: 'eu' },
        { id: 'char-size', value: '4' },
        { id: 'char-spot', value: 'true' },
      ]
    );

    expect(result).toEqual([
      {
        priceId: 'cpu',
        usageSpecId: 'u-cpu',
        unitOfMeasure: 'CPU_core_hour',
        value: 0,
      },
    ]);
  });

  it('should match range constraints using valueFrom/valueTo boundaries', async () => {
    apiSpy.getOfferingPrice.and.resolveTo({
      id: 'storage',
      priceType: 'usage',
      usageSpecId: 'u-storage',
      unitOfMeasure: { units: 'Storage_gb_hour' },
      prodSpecCharValueUse: [
        {
          id: 'char-storage',
          productSpecCharacteristicValue: [{ valueFrom: 50, valueTo: 100 }],
        },
      ],
    });

    const appliedAtBoundary = await service.getAppliedMetrics(
      { id: 'bundle-1', bundledPopRelationship: [{ id: 'storage' }] },
      [{ id: 'char-storage', value: 100 }]
    );
    expect(appliedAtBoundary.length).toBe(1);

    const notAppliedOutside = await service.getAppliedMetrics(
      { id: 'bundle-2', bundledPopRelationship: [{ id: 'storage' }] },
      [{ id: 'char-storage', value: 101 }]
    );
    expect(notAppliedOutside).toEqual([]);
  });

  it('should not apply usage metric when characteristic ids do not match', async () => {
    apiSpy.getOfferingPrice.and.resolveTo({
      id: 'usage-optional',
      priceType: 'usage',
      usageSpecId: 'u-optional',
      unitOfMeasure: { units: 'RAM_gb_hour' },
      prodSpecCharValueUse: [
        {
          id: 'old-platinum-id',
          productSpecCharacteristicValue: [{ value: true }],
        },
      ],
    });

    const result = await service.getAppliedMetrics(
      { id: 'bundle-3', bundledPopRelationship: [{ id: 'usage-optional' }] },
      [{ id: 'new-platinum-id', value: true }]
    );

    expect(result).toEqual([]);
  });
});
