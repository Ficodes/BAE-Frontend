import { TranslateService } from '@ngx-translate/core';

import { formatApiErrorMessage } from './api-error-message';

describe('formatApiErrorMessage', () => {
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    (translate.instant as jasmine.Spy).and.callFake((key: string, params?: any) => {
      if (key === 'TEST._fallback') {
        return 'Could not complete this action.';
      }
      return `Reason: ${params.reason}`;
    });
  });

  it('should append a trimmed proxy reason below the contextual fallback', () => {
    const message = formatApiErrorMessage(
      translate,
      'TEST._fallback',
      { error: { error: '  The resource is owned by another user  ' } }
    );

    expect(message).toBe(
      'Could not complete this action.\nReason: The resource is owned by another user'
    );
  });

  it('should return only the fallback when the proxy reason is not a non-empty string', () => {
    expect(formatApiErrorMessage(translate, 'TEST._fallback', { error: {} }))
      .toBe('Could not complete this action.');
    expect(formatApiErrorMessage(translate, 'TEST._fallback', { error: { error: '  ' } }))
      .toBe('Could not complete this action.');
    expect(formatApiErrorMessage(translate, 'TEST._fallback', { error: { error: {} } }))
      .toBe('Could not complete this action.');
  });
});
