export type ProviderStatsEntity =
  | 'productOffering'
  | 'catalog'
  | 'productSpecification'
  | 'serviceSpecification'
  | 'resourceSpecification'
  | 'usageSpecification';

export type LifecycleStatus = 'Active' | 'Launched' | 'Retired' | 'Obsolete';

export type LifecycleStatusCounts = Record<LifecycleStatus, number>;

export type ProviderStats = Record<ProviderStatsEntity, LifecycleStatusCounts>;

export interface ProviderStatsTransition {
  entity: ProviderStatsEntity;
  previousLifecycleStatus: LifecycleStatus | null;
  nextLifecycleStatus: LifecycleStatus;
}

const LIFECYCLE_STATUSES: LifecycleStatus[] = ['Active', 'Launched', 'Retired', 'Obsolete'];

const PROVIDER_STATS_ENTITIES: ProviderStatsEntity[] = [
  'productOffering',
  'catalog',
  'productSpecification',
  'serviceSpecification',
  'resourceSpecification',
  'usageSpecification'
];

export function emptyLifecycleStatusCounts(): LifecycleStatusCounts {
  return {
    Active: 0,
    Launched: 0,
    Retired: 0,
    Obsolete: 0
  };
}

export function normalizeProviderStats(value: Partial<Record<ProviderStatsEntity, Partial<LifecycleStatusCounts>>>): ProviderStats {
  return PROVIDER_STATS_ENTITIES.reduce((stats, entity) => {
    const source = value?.[entity] || {};
    stats[entity] = LIFECYCLE_STATUSES.reduce((counts, status) => {
      counts[status] = Number(source[status] || 0);
      return counts;
    }, emptyLifecycleStatusCounts());
    return stats;
  }, {} as ProviderStats);
}

export function countStatuses(
  stats: ProviderStats | null,
  entity: ProviderStatsEntity,
  statuses: LifecycleStatus[]
): number {
  if (!stats) return 0;
  return statuses.reduce((total, status) => total + (stats[entity]?.[status] || 0), 0);
}

export function tabCountsFromProviderStats(
  stats: ProviderStats | null,
  entity: ProviderStatsEntity,
  tabStatusMap: Record<string, LifecycleStatus[]>
): Record<string, number> {
  return Object.keys(tabStatusMap).reduce((counts, tab) => {
    counts[tab] = countStatuses(stats, entity, tabStatusMap[tab]);
    return counts;
  }, {} as Record<string, number>);
}

export function applyProviderStatsTransition(
  stats: ProviderStats | null,
  transition: ProviderStatsTransition
): ProviderStats | null {
  if (!stats) return null;

  const nextStats = normalizeProviderStats(stats);
  const entityCounts = { ...nextStats[transition.entity] };

  if (transition.previousLifecycleStatus) {
    entityCounts[transition.previousLifecycleStatus] = Math.max(
      (entityCounts[transition.previousLifecycleStatus] || 0) - 1,
      0
    );
  }

  entityCounts[transition.nextLifecycleStatus] = (entityCounts[transition.nextLifecycleStatus] || 0) + 1;
  nextStats[transition.entity] = entityCounts;

  return nextStats;
}
