import { parseOfferDescription, splitOfferAttachments } from './offer-description.util';

describe('shared offer detail content', () => {
  it('preserves plain markdown descriptions', () => {
    expect(parseOfferDescription('## Overview\nOriginal description').specOverview).toBe('## Overview\nOriginal description');
  });

  it('keeps the offer page attachment behaviour when a profile picture exists', () => {
    const profile = { id: 'profile', name: 'Profile Picture', attachmentType: 'Picture' };
    const diagram = { id: 'diagram', name: 'Diagram', attachmentType: 'Picture' };
    const manual = { id: 'manual', name: 'Manual', attachmentType: 'Document' };
    const media = splitOfferAttachments([profile, diagram, manual]);
    expect(media.images).toEqual([profile]);
    expect(media.attachments).toEqual([diagram, manual]);
  });

  it('uses picture attachments for imagery and the rest for downloads without a profile picture', () => {
    const image = { name: 'Image', attachmentType: 'Picture' };
    const file = { name: 'Manual', attachmentType: 'Document' };
    expect(splitOfferAttachments([image, file])).toEqual({ images: [image], attachments: [file] });
    expect(splitOfferAttachments()).toEqual({ images: [], attachments: [] });
  });
});
