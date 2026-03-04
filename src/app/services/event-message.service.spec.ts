import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventMessage, EventMessageService } from './event-message.service';

describe('EventMessageService', () => {
  let service: EventMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(EventMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  function expectNextEvent(
    emit: () => void,
    expected: EventMessage,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const sub = service.messages$.subscribe((message) => {
        expect(message).toEqual(expected);
        sub.unsubscribe();
        resolve();
      });
      emit();
    });
  }

  it('emitAddedFilter should publish AddedFilter event', async () => {
    const filter = { id: 'cat-1' };
    await expectNextEvent(
      () => service.emitAddedFilter(filter),
      { type: 'AddedFilter', value: filter },
    );
  });

  it('emitRemovedCartItem should publish RemovedCartItem event', async () => {
    const product = { id: 'prod-1' };
    await expectNextEvent(
      () => service.emitRemovedCartItem(product),
      { type: 'RemovedCartItem', value: product },
    );
  });

  it('emitToggleDrawer should publish ToggleCartDrawer event', async () => {
    await expectNextEvent(
      () => service.emitToggleDrawer(true),
      { type: 'ToggleCartDrawer', value: true },
    );
  });

  it('emitSellerCreateCustomOffer should publish SellerCreateCustomOffer with offer and partyId', async () => {
    const offer = { id: 'offer-1' };
    const partyId = 'party-1';
    await expectNextEvent(
      () => service.emitSellerCreateCustomOffer(offer, partyId),
      { type: 'SellerCreateCustomOffer', value: { offer, partyId } },
    );
  });

  it('emitCloseCartCard should publish CloseCartCard event even when value is undefined', async () => {
    await expectNextEvent(
      () => service.emitCloseCartCard(undefined),
      { type: 'CloseCartCard', value: undefined },
    );
  });

  it('emitSubformChange should publish SubformChange event', async () => {
    const changeState = { type: 'pricePlan', changed: true };
    await expectNextEvent(
      () => service.emitSubformChange(changeState as any),
      { type: 'SubformChange', value: changeState as any },
    );
  });

  it('emitUpdateUsageSpec should publish UpdateUsageSpec event', async () => {
    const usageSpec = { id: 'usage-1' };
    await expectNextEvent(
      () => service.emitUpdateUsageSpec(usageSpec),
      { type: 'UpdateUsageSpec', value: usageSpec },
    );
  });

  it('emitCreateUsageSpec should publish CreateUsageSpec event', async () => {
    await expectNextEvent(
      () => service.emitCreateUsageSpec(false),
      { type: 'CreateUsageSpec', value: false },
    );
  });

  it('emitCloseFeedback should publish CloseFeedback event', async () => {
    await expectNextEvent(
      () => service.emitCloseFeedback(true),
      { type: 'CloseFeedback', value: true },
    );
  });

  it('emitCloseQuoteRequest should publish CloseQuoteRequest event', async () => {
    await expectNextEvent(
      () => service.emitCloseQuoteRequest(false),
      { type: 'CloseQuoteRequest', value: false },
    );
  });
});
