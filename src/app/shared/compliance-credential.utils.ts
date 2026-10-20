import { jwtDecode } from 'jwt-decode';

const ALLOWED_COMPLIANCE_LEVELS = ['NL', 'BL', 'P', 'PP'];

function extractCredential(decoded: any): any {
  if (!decoded) return null;

  if (decoded.verifiableCredential) return decoded.verifiableCredential;
  if (decoded.vc) return decoded.vc;
  if (decoded.credentialSubject) return decoded;

  return null;
}

export function extractComplianceLevelFromVcToken(vcToken: any): string {
  if (!vcToken || typeof vcToken !== 'string') return 'NL';

  try {
    const credential = extractCredential(jwtDecode(vcToken));
    const level = credential?.credentialSubject?.['gx:labelLevel'];

    return typeof level === 'string' && ALLOWED_COMPLIANCE_LEVELS.includes(level) ? level : 'NL';
  } catch {
    return 'NL';
  }
}
