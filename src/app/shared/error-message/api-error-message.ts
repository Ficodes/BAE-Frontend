import { TranslateService } from '@ngx-translate/core';

export function formatApiErrorMessage(
  translate: TranslateService,
  fallbackKey: string,
  error: unknown
): string {
  const fallback = translate.instant(fallbackKey);
  const proxyError = (error as any)?.error?.error;
  const reason = typeof proxyError === 'string' ? proxyError.trim() : '';

  return reason
    ? `${fallback}\n${translate.instant('ERRORS._reason', { reason })}`
    : fallback;
}
