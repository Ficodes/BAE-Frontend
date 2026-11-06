import { LoginInfo } from 'src/app/models/interfaces';
import { environment } from 'src/environments/environment';

export function isPlatformAdministrator(login: unknown): boolean {
  const info = login as Partial<LoginInfo> | null | undefined;
  return !!info && typeof info.expire === 'number' && info.expire > Date.now() / 1000
    && !!info.roles?.some(role => role.name?.toLowerCase() === environment.ADMIN_ROLE.toLowerCase());
}
