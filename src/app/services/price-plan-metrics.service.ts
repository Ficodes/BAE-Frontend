import { Injectable } from '@angular/core';
import { ApiServiceService } from 'src/app/services/product-service.service';

export interface SelectedCharacteristicValue {
  id: string;
  value: any;
}

@Injectable({
  providedIn: 'root'
})
export class PricePlanMetricsService {
  private usagePriceComponentsCache = new Map<string, any[]>();

  constructor(private api: ApiServiceService) {}

  async getAppliedMetrics(pricePlan: any, selectedCharacteristics: SelectedCharacteristicValue[]): Promise<any[]> {
    const usageComponents = await this.getUsagePriceComponents(pricePlan);
    if (usageComponents.length === 0) {
      return [];
    }

    const selectedById = new Map<string, any>();
    for (const item of selectedCharacteristics || []) {
      if (item?.id) {
        selectedById.set(item.id, item.value);
      }
    }

    return usageComponents
      .filter((priceComponent) => this.isPriceComponentApplied(priceComponent, selectedById))
      .map((priceComponent) => ({
        priceId: priceComponent?.id,
        usageSpecId: priceComponent?.usageSpecId,
        unitOfMeasure: this.getMetricName(priceComponent?.unitOfMeasure),
        value: 0,
      }));
  }

  clearCache(pricePlanId?: string): void {
    if (pricePlanId) {
      this.usagePriceComponentsCache.delete(pricePlanId);
      return;
    }
    this.usagePriceComponentsCache.clear();
  }

  private async getUsagePriceComponents(pricePlan: any): Promise<any[]> {
    if (!pricePlan) {
      return [];
    }

    const pricePlanId = pricePlan?.id ? String(pricePlan.id) : '';
    if (pricePlanId && this.usagePriceComponentsCache.has(pricePlanId)) {
      return this.usagePriceComponentsCache.get(pricePlanId) || [];
    }

    const priceComponents = await this.resolvePriceComponents(pricePlan);
    const usageComponents = priceComponents.filter((component) => this.isUsagePriceComponent(component));

    if (pricePlanId) {
      this.usagePriceComponentsCache.set(pricePlanId, usageComponents);
    }

    return usageComponents;
  }

  private async resolvePriceComponents(pricePlan: any): Promise<any[]> {
    if (!pricePlan) {
      return [];
    }

    const bundledRelationships = Array.isArray(pricePlan?.bundledPopRelationship)
      ? pricePlan.bundledPopRelationship
      : [];

    if (bundledRelationships.length === 0) {
      return [pricePlan];
    }

    const resolvedComponents: any[] = [];
    for (const relationship of bundledRelationships) {
      if (!relationship?.id) {
        continue;
      }
      try {
        const component = await this.api.getOfferingPrice(relationship.id);
        if (component) {
          resolvedComponents.push(component);
        }
      } catch (error) {
        console.error('Error loading price component for applied metrics evaluation', error);
      }
    }

    return resolvedComponents;
  }

  private isUsagePriceComponent(component: any): boolean {
    const priceType = String(component?.priceType || '').toLowerCase();
    return priceType === 'usage' && !!component?.usageSpecId && !!this.getMetricName(component?.unitOfMeasure);
  }

  private isPriceComponentApplied(component: any, selectedById: Map<string, any>): boolean {
    const characteristicUses = Array.isArray(component?.prodSpecCharValueUse)
      ? component.prodSpecCharValueUse
      : [];

    if (characteristicUses.length === 0) {
      return true;
    }

    return characteristicUses.every((charUse: any) => this.matchesCharacteristicUse(charUse, selectedById));
  }

  private matchesCharacteristicUse(charUse: any, selectedById: Map<string, any>): boolean {
    const characteristicId = charUse?.id;
    if (!characteristicId) {
      return false;
    }

    if (!selectedById.has(characteristicId)) {
      return false;
    }

    const selectedValue = selectedById.get(characteristicId);
    const requiredValues = Array.isArray(charUse?.productSpecCharacteristicValue)
      ? charUse.productSpecCharacteristicValue
      : [];

    if (requiredValues.length === 0) {
      return true;
    }

    return requiredValues.some((requiredValue: any) => this.matchesRequiredValue(selectedValue, requiredValue));
  }

  private matchesRequiredValue(selectedValue: any, requiredValue: any): boolean {
    const hasRange = requiredValue?.valueFrom !== undefined || requiredValue?.valueTo !== undefined;
    if (hasRange) {
      const numericSelected = Number(selectedValue);
      if (Number.isNaN(numericSelected)) {
        return false;
      }
      const hasMin = requiredValue?.valueFrom !== undefined;
      const hasMax = requiredValue?.valueTo !== undefined;
      if (hasMin && numericSelected < Number(requiredValue.valueFrom)) {
        return false;
      }
      if (hasMax && numericSelected > Number(requiredValue.valueTo)) {
        return false;
      }
      return true;
    }

    if (requiredValue?.value === undefined) {
      return false;
    }

    const expected = requiredValue.value;

    if (typeof expected === 'boolean') {
      const normalizedSelected = this.normalizeBoolean(selectedValue);
      return normalizedSelected !== null && normalizedSelected === expected;
    }

    if (typeof expected === 'number') {
      const numericSelected = Number(selectedValue);
      return !Number.isNaN(numericSelected) && numericSelected === expected;
    }

    return String(selectedValue) === String(expected);
  }

  private normalizeBoolean(value: any): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    return null;
  }

  private getMetricName(unitOfMeasure: any): string {
    if (!unitOfMeasure) {
      return '';
    }
    if (typeof unitOfMeasure === 'string') {
      return unitOfMeasure;
    }
    if (typeof unitOfMeasure?.units === 'string') {
      return unitOfMeasure.units;
    }
    return '';
  }
}
