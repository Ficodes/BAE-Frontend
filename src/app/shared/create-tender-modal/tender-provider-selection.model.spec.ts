import { Provider } from '../../services/provider.service';
import { buildStableProviderCandidates } from './tender-provider-selection.model';

describe('tender provider selection model', () => {
  const providers: Provider[] = [
    { id: 'seller-1', tradingName: 'Seller One' },
    { id: 'buyer-1', tradingName: 'Buyer One' },
    { id: 'seller-2', tradingName: 'Seller Two' },
  ];

  it('keeps selected providers in their original candidate position', () => {
    const candidates = buildStableProviderCandidates({
      tenderProviders: providers,
      invitedProviderIds: new Set<string>(),
      selectedProviderIds: new Set<string>(['buyer-1']),
    });

    expect(candidates.map(candidate => candidate.provider.id)).toEqual(['seller-1', 'buyer-1', 'seller-2']);
    expect(candidates.map(candidate => candidate.selected)).toEqual([false, true, false]);
  });

  it('excludes providers already invited on the server', () => {
    const candidates = buildStableProviderCandidates({
      tenderProviders: providers,
      invitedProviderIds: new Set<string>(['seller-1']),
      selectedProviderIds: new Set<string>(['buyer-1']),
    });

    expect(candidates.map(candidate => candidate.provider.id)).toEqual(['buyer-1', 'seller-2']);
  });
});
