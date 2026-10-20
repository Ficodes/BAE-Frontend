import { extractComplianceLevelFromVcToken } from './compliance-credential.utils';

const asJwt = (payload: any): string => {
  const encode = (value: any) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
};

describe('compliance credential utils', () => {
  it('extracts compliance level from legacy vc payloads', () => {
    const token = asJwt({
      vc: {
        credentialSubject: {
          'gx:labelLevel': 'P'
        }
      }
    });

    expect(extractComplianceLevelFromVcToken(token)).toBe('P');
  });

  it('extracts compliance level from legacy verifiableCredential payloads', () => {
    const token = asJwt({
      verifiableCredential: {
        credentialSubject: {
          'gx:labelLevel': 'PP'
        }
      }
    });

    expect(extractComplianceLevelFromVcToken(token)).toBe('PP');
  });

  it('extracts compliance level from root-level credential payloads', () => {
    const token = asJwt({
      credentialSubject: {
        id: 'urn:ngsi-ld:product-specification:7436c6e6-5d98-491d-b160-fed5bc9aeb49',
        'gx:labelLevel': 'BL',
        'gx:engineVersion': '1.2.1',
        'gx:rulesVersion': 'CD25.03',
        'gx:compliantCredentials': [],
        'gx:validatedCriteria': []
      },
      type: [
        'VerifiableCredential',
        'gx.labelcredential.w3c.2'
      ]
    });

    expect(extractComplianceLevelFromVcToken(token)).toBe('BL');
  });

  it('falls back to no level for unsupported or invalid payloads', () => {
    expect(extractComplianceLevelFromVcToken(asJwt({ credentialSubject: { 'gx:labelLevel': 'UNKNOWN' } }))).toBe('NL');
    expect(extractComplianceLevelFromVcToken('not-a-jwt')).toBe('NL');
  });
});
