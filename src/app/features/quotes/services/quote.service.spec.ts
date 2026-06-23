import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AttachmentRefOrValue, Quote } from 'src/app/models/quote.model';
import { environment } from 'src/environments/environment';
import { QuoteService } from './quote.service';

describe('QuoteService attachment downloads', () => {
  let service: QuoteService;
  let httpMock: HttpTestingController;
  let clickSpy: jasmine.Spy;
  let createObjectUrlSpy: jasmine.Spy;
  let revokeObjectUrlSpy: jasmine.Spy;
  let originalDocumentApi: string;

  beforeEach(() => {
    originalDocumentApi = environment.documentApi;
    environment.documentApi = '/document';

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(QuoteService);
    httpMock = TestBed.inject(HttpTestingController);
    clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:document-attachment');
    revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL').and.stub();
  });

  afterEach(() => {
    httpMock.verify();
    environment.documentApi = originalDocumentApi;
  });

  it('downloads from the direct object URL when content stores a document reference', () => {
    const quote = buildQuoteWithAttachment({
      name: 'supplier-proposal.pdf',
      mimeType: 'application/pdf',
      content: 'urn:ngsi-ld:DocumentSpecification:proposal-1',
      url: 'https://bucket.example.test/tender/supplier-proposal.pdf'
    });

    service.downloadAttachment(quote).subscribe({
      next: () => {
        expect(clickSpy).toHaveBeenCalled();
        expect(createObjectUrlSpy).not.toHaveBeenCalled();
      },
      error: fail
    });
  });

  it('fetches the document specification and decodes its base64 attachment when content stores a document reference', () => {
    const quote = buildQuoteWithAttachment({
      name: 'quote-reference-name.pdf',
      mimeType: 'application/pdf',
      content: 'urn:ngsi-ld:document-specification:6b947d6f-599d-45b2-94c1-9537167c83a3'
    });

    service.downloadAttachment(quote).subscribe({
      next: () => {
        expect(clickSpy).toHaveBeenCalled();
        expect(createObjectUrlSpy).toHaveBeenCalled();
        expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:document-attachment');
      },
      error: fail
    });

    const req = httpMock.expectOne(
      'http://localhost:8004/document/documentSpecification/urn%3Angsi-ld%3Adocument-specification%3A6b947d6f-599d-45b2-94c1-9537167c83a3'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'urn:ngsi-ld:document-specification:6b947d6f-599d-45b2-94c1-9537167c83a3',
      name: 'document-entity.pdf',
      attachment: [
        {
          content: btoa('pdf-bytes'),
          mimeType: 'application/pdf',
          name: 'document-file.pdf'
        }
      ]
    });
  });

  it('errors when the document specification does not contain an encoded attachment', () => {
    const quote = buildQuoteWithAttachment({
      name: 'missing-document-file.pdf',
      mimeType: 'application/pdf',
      content: 'urn:ngsi-ld:document-specification:missing-document-file'
    });

    service.downloadAttachment(quote).subscribe({
      next: () => fail('Expected missing document attachment to fail'),
      error: (error: Error) => {
        expect(error.message).toContain('Document attachment content not found');
      }
    });

    const req = httpMock.expectOne(
      'http://localhost:8004/document/documentSpecification/urn%3Angsi-ld%3Adocument-specification%3Amissing-document-file'
    );
    req.flush({ attachment: [{ name: 'empty.pdf', mimeType: 'application/pdf' }] });
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('accepts href as a fallback attachment link when url is missing', () => {
    const quote = buildQuoteWithAttachment({
      name: 'buyer-request.pdf',
      mimeType: 'application/pdf',
      href: 'https://bucket.example.test/tender/buyer-request.pdf'
    });

    service.downloadAttachment(quote).subscribe({
      next: () => expect(clickSpy).toHaveBeenCalled(),
      error: fail
    });
  });

  it('does not treat a document specification reference as a direct download URL', () => {
    const attachment: AttachmentRefOrValue = {
      name: 'missing-link.pdf',
      mimeType: 'application/pdf',
      content: 'urn:ngsi-ld:document-specification:missing-link'
    };

    expect(service.getAttachmentDownloadUrl(attachment))
      .toBeNull();
  });

  function buildQuoteWithAttachment(attachment: AttachmentRefOrValue): Quote {
    return {
      id: 'quote-123456789',
      quoteItem: [
        {
          attachment: [attachment]
        }
      ]
    };
  }
});
