import { Provider } from '../../services/provider.service';

export interface TenderProviderCandidate {
  provider: Provider;
  selected: boolean;
}

export interface BuildStableProviderCandidatesInput {
  tenderProviders: Provider[];
  invitedProviderIds: Set<string>;
  selectedProviderIds: Set<string>;
}

export function buildStableProviderCandidates({
  tenderProviders,
  invitedProviderIds,
  selectedProviderIds,
}: BuildStableProviderCandidatesInput): TenderProviderCandidate[] {
  return tenderProviders
    .filter((provider) => Boolean(provider.id) && !invitedProviderIds.has(provider.id!))
    .map((provider) => ({
      provider: { ...provider },
      selected: selectedProviderIds.has(provider.id!),
    }));
}
