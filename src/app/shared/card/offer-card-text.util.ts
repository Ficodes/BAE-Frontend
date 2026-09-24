const HIDDEN_TAGS_REGEX = /\n*\[TAGS\]:(\[.*\])\s*$/;

export function getVisibleOfferDescription(description: string | undefined): string {
  return (description ?? '').replace(HIDDEN_TAGS_REGEX, '').trimEnd();
}

export function getShortOfferDescription(description: string | undefined): string {
  const visibleDescription = getVisibleOfferDescription(description);
  if (!visibleDescription) return '';

  const withoutHtml = visibleDescription.replace(/<[^>]*>/g, ' ');
  const textarea = document.createElement('textarea');
  textarea.innerHTML = withoutHtml;

  return textarea.value.replace(/\s+/g, ' ').trim();
}
