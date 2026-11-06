export interface OfferDescriptionSections {
  specOverview: string;
  howItWorks: string;
  keyFeatures: { name: string; description: string; icon: string | null }[];
  businessBenefits: { name: string; description: string }[];
  useCases: { name: string; description: string; icon: string | null }[];
  faqs: { question: string; answer: string }[];
}

export function parseOfferDescription(raw: string | undefined): OfferDescriptionSections {
  const result: OfferDescriptionSections = { specOverview: raw ?? '', howItWorks: '', keyFeatures: [], businessBenefits: [], useCases: [], faqs: [] };
  const start = '<!--dome:details:start-->';
  const end = '<!--dome:details:end-->';
  const text = (raw ?? '').toString();
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return result;
  result.specOverview = text.slice(0, startIndex).replace(/\n+$/, '');
  const endIndex = text.indexOf(end);
  const inner = text.slice(startIndex + start.length, endIndex > -1 ? endIndex : undefined);
  try {
    const doc = new DOMParser().parseFromString(`<div>${inner}</div>`, 'text/html');
    const how = doc.querySelector('[data-dome-section="how-it-works"]');
    if (how) result.howItWorks = how.getAttribute('data-text') || how.querySelector('p')?.textContent || '';
    const items = (key: string, withIcon: boolean): any[] => {
      const section = doc.querySelector(`[data-dome-section="${key}"]`);
      return section ? Array.from(section.querySelectorAll('li')).map(li => {
        const name = li.getAttribute('data-name') || li.querySelector('strong')?.textContent || '';
        const description = li.getAttribute('data-desc') || '';
        return withIcon ? { name, description, icon: li.getAttribute('data-icon') || null } : { name, description };
      }) : [];
    };
    result.keyFeatures = items('key-features', true);
    result.businessBenefits = items('business-benefits', false);
    result.useCases = items('use-cases', true);
    const faq = doc.querySelector('[data-dome-section="faqs"]');
    result.faqs = faq ? Array.from(faq.querySelectorAll('li')).map(li => ({
      question: li.getAttribute('data-q') || li.querySelector('strong')?.textContent || '',
      answer: li.getAttribute('data-a') || li.querySelector('p')?.textContent || ''
    })).filter(item => item.question || item.answer) : [];
  } catch {}
  return result;
}

export function splitOfferAttachments(attachments: any[] = []): { images: any[]; attachments: any[] } {
  const profile = attachments.filter(item => item.name === 'Profile Picture');
  return profile.length
    ? { images: profile, attachments: attachments.filter(item => item.name !== 'Profile Picture') }
    : { images: attachments.filter(item => item.attachmentType === 'Picture'), attachments: attachments.filter(item => item.attachmentType !== 'Picture') };
}
