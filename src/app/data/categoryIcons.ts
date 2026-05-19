import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBolt,
  faBrain,
  faCode,
  faLayerGroup,
  faPlug,
  faServer,
  faShieldHalved,
  faUserTie
} from '@fortawesome/pro-solid-svg-icons';

export const DEFAULT_CATEGORY_ICON: IconDefinition = faLayerGroup;

export const CATEGORY_ICONS: Record<string, IconDefinition> = {
  Security: faShieldHalved,
  Infrastructure: faServer,
  Productivity: faBolt,
  DevOps: faCode,
  Professional: faUserTie,
  Specific: faLayerGroup,
  'Data and AI': faBrain,
  Integration: faPlug,
};

export function iconForCategory(name: string | null | undefined): IconDefinition {
  if (!name) return DEFAULT_CATEGORY_ICON;
  return CATEGORY_ICONS[name] ?? DEFAULT_CATEGORY_ICON;
}
