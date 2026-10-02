import {
  applyCharacteristicConstraints,
  characteristicValuesOverlap
} from './price-plan-constraint.utils';

describe('price plan constraint utilities', () => {
  const characteristics = [
    {
      id: 'region',
      name: 'Region',
      productSpecCharacteristicValue: [
        { value: 'EU', isDefault: true },
        { value: 'US', isDefault: false }
      ]
    },
    {
      id: 'vcores',
      name: 'vCores',
      productSpecCharacteristicValue: [
        { valueFrom: 1, valueTo: 386, unitOfMeasure: 'unit', isDefault: true }
      ]
    }
  ];

  it('removes a whole characteristic when the constraint has no values', () => {
    const result = applyCharacteristicConstraints(characteristics, [{ id: 'region', name: 'Region' }]);

    expect(result.map((characteristic) => characteristic.name)).toEqual(['vCores']);
  });

  it('removes only forbidden discrete values', () => {
    const result = applyCharacteristicConstraints(characteristics, [{
      id: 'region',
      name: 'Region',
      productSpecCharacteristicValue: [{ value: 'EU' }]
    }]);

    expect(result[0].productSpecCharacteristicValue).toEqual([
      { value: 'US', isDefault: true }
    ]);
  });

  it('turns a forbidden lower range into the effective plan range', () => {
    const result = applyCharacteristicConstraints(characteristics, [{
      id: 'vcores',
      name: 'vCores',
      productSpecCharacteristicValue: [{ valueFrom: 1, valueTo: 3 }]
    }]);

    expect(result[1].productSpecCharacteristicValue).toEqual([{
      valueFrom: 4,
      valueTo: 386,
      unitOfMeasure: 'unit',
      isDefault: true
    }]);
  });

  it('detects exact values and overlapping ranges consistently', () => {
    expect(characteristicValuesOverlap({ value: 4 }, { value: 4 })).toBeTrue();
    expect(characteristicValuesOverlap({ value: 4 }, { value: 5 })).toBeFalse();
    expect(characteristicValuesOverlap(
      { valueFrom: 4, valueTo: 20 },
      { valueFrom: 1, valueTo: 4 }
    )).toBeTrue();
  });
});
