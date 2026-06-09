import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AttachmentRefOrValue, Quote } from 'src/app/models/quote.model';
import { QuoteService } from './quote.service';

describe('QuoteService attachment downloads', () => {
  let service: QuoteService;
  let clickSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(QuoteService);
    clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
  });

  it('downloads from the direct object URL when content stores a document reference', () => {
    const quote = buildQuoteWithAttachment({
      name: 'supplier-proposal.pdf',
      mimeType: 'application/pdf',
      content: 'urn:ngsi-ld:DocumentSpecification:proposal-1',
      url: 'https://bucket.example.test/tender/supplier-proposal.pdf'
    });

    expect(() => service.downloadAttachment(quote)).not.toThrow();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('accepts href as a fallback attachment link when url is missing', () => {
    const quote = buildQuoteWithAttachment({
      name: 'buyer-request.pdf',
      mimeType: 'application/pdf',
      href: 'https://bucket.example.test/tender/buyer-request.pdf'
    });

    expect(() => service.downloadAttachment(quote)).not.toThrow();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('builds a backend download link when content stores a document specification reference', () => {
    const attachment: AttachmentRefOrValue = {
      name: 'missing-link.pdf',
      mimeType: 'application/pdf',
      content: 'urn:ngsi-ld:document-specification:missing-link'
    };

    expect(service.getAttachmentDownloadUrl(attachment))
      .toBe('http://localhost:8080/quoteManagement/documentSpecification/urn%3Angsi-ld%3Adocument-specification%3Amissing-link/attachment');
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
