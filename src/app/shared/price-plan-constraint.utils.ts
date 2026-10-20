export interface CharacteristicConstraintValueUse {
  id?: string;
  name?: string;
  productSpecCharacteristicValue?: any[];
}

export function isRangeCharacteristicValue(value: any): boolean {
  return value?.valueFrom !== undefined && value?.valueTo !== undefined;
}

export function characteristicValuesOverlap(left: any, right: any): boolean {
  if (isRangeCharacteristicValue(left) && isRangeCharacteristicValue(right)) {
    const leftFrom = Number(left.valueFrom);
    const leftTo = Number(left.valueTo);
    const rightFrom = Number(right.valueFrom);
    const rightTo = Number(right.valueTo);
    return Number.isFinite(leftFrom) && Number.isFinite(leftTo) &&
      Number.isFinite(rightFrom) && Number.isFinite(rightTo) &&
      leftFrom <= rightTo && leftTo >= rightFrom;
  }

  return left?.value !== undefined && right?.value !== undefined &&
    String(left.value) === String(right.value);
}

export function hasConstraintValues(constraint: CharacteristicConstraintValueUse): boolean {
  return Array.isArray(constraint?.productSpecCharacteristicValue) &&
    constraint.productSpecCharacteristicValue.length > 0;
}

export function applyCharacteristicConstraints(
  characteristics: any[],
  constraintValueUses: CharacteristicConstraintValueUse[]
): any[] {
  return characteristics.flatMap((characteristic: any) => {
    const matchingConstraints = constraintValueUses.filter((constraint) =>
      constraint?.name === characteristic?.name
    );
    if (matchingConstraints.length === 0) {
      return [characteristic];
    }
    if (matchingConstraints.some((constraint) => !hasConstraintValues(constraint))) {
      return [];
    }

    const sourceValues = Array.isArray(characteristic?.productSpecCharacteristicValue)
      ? characteristic.productSpecCharacteristicValue
      : [];
    const forbiddenValues = matchingConstraints.flatMap((constraint) =>
      constraint.productSpecCharacteristicValue || []
    );
    const allowedValues = sourceValues.flatMap((sourceValue: any) =>
      subtractForbiddenValues(sourceValue, forbiddenValues)
    );

    if (sourceValues.length > 0 && allowedValues.length === 0) {
      return [];
    }

    return [{
      ...characteristic,
      productSpecCharacteristicValue: normalizeDefaultValue(allowedValues)
    }];
  });
}

function subtractForbiddenValues(sourceValue: any, forbiddenValues: any[]): any[] {
  if (!isRangeCharacteristicValue(sourceValue)) {
    return forbiddenValues.some((forbiddenValue) => characteristicValuesOverlap(sourceValue, forbiddenValue))
      ? []
      : [{ ...sourceValue }];
  }

  return forbiddenValues
    .filter(isRangeCharacteristicValue)
    .reduce((segments: any[], forbiddenValue: any) => {
      const forbiddenFrom = Number(forbiddenValue.valueFrom);
      const forbiddenTo = Number(forbiddenValue.valueTo);
      if (!Number.isFinite(forbiddenFrom) || !Number.isFinite(forbiddenTo)) {
        return segments;
      }

      return segments.flatMap((segment) => {
        const segmentFrom = Number(segment.valueFrom);
        const segmentTo = Number(segment.valueTo);
        if (forbiddenTo < segmentFrom || forbiddenFrom > segmentTo) {
          return [segment];
        }

        const remainingSegments: any[] = [];
        if (forbiddenFrom > segmentFrom) {
          remainingSegments.push({ ...segment, valueTo: forbiddenFrom - 1 });
        }
        if (forbiddenTo < segmentTo) {
          remainingSegments.push({ ...segment, valueFrom: forbiddenTo + 1 });
        }
        return remainingSegments;
      });
    }, [{ ...sourceValue }]);
}

function normalizeDefaultValue(values: any[]): any[] {
  if (values.length === 0) return values;
  const defaultIndex = values.findIndex((value) => value?.isDefault);
  return values.map((value, index) => ({
    ...value,
    isDefault: index === (defaultIndex >= 0 ? defaultIndex : 0)
  }));
}
