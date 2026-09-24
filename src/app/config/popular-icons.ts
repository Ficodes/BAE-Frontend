import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBuilding,
  faUsers,
  faBuildingUser,
  faShareNodes,
  faClipboardList,
  faGears,
  faArrowsUpDownLeftRight,
  faClock,
  faGlobe,
  faSliders,
  faPlugCirclePlus,
  faBrain,
  faChartLine,
  faDatabase,
  faChartPie,
  faMagnifyingGlass,
  faLightbulb,
  faGaugeHigh,
  faEye,
  faShuffle,
  faChartColumn,
  faShield,
  faBuildingShield,
  faUserShield,
  faCertificate,
  faScaleBalanced,
  faLock,
  faServer,
  faCloud,
  faCode,
  faLaptopCode,
  faHardDrive,
  faMobileScreen,
  faScrewdriverWrench,
  faHeadset,
  faComments,
  faFileLines,
  faGraduationCap,
  faBolt,
  faStar,
  faHandshake,
} from '@fortawesome/free-solid-svg-icons';

export interface PopularIcon {
  name: string;
  icon: IconDefinition;
}

export interface IconCategory {
  labelKey: string;
  icons: PopularIcon[];
}

export const POPULAR_ICON_CATEGORIES: IconCategory[] = [
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_business',
    icons: [
      { name: 'building', icon: faBuilding },
      { name: 'users', icon: faUsers },
      { name: 'building-user', icon: faBuildingUser },
      { name: 'sitemap', icon: faShareNodes },
      { name: 'clipboard-list', icon: faClipboardList },
      { name: 'gears', icon: faGears },
      { name: 'arrows-move', icon: faArrowsUpDownLeftRight },
      { name: 'clock', icon: faClock },
      { name: 'globe', icon: faGlobe },
      { name: 'sliders', icon: faSliders },
      { name: 'plug-circle-plus', icon: faPlugCirclePlus },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_data',
    icons: [
      { name: 'brain', icon: faBrain },
      { name: 'chart-line', icon: faChartLine },
      { name: 'database', icon: faDatabase },
      { name: 'chart-pie', icon: faChartPie },
      { name: 'search', icon: faMagnifyingGlass },
      { name: 'lightbulb', icon: faLightbulb },
      { name: 'gauge', icon: faGaugeHigh },
      { name: 'eye', icon: faEye },
      { name: 'shuffle', icon: faShuffle },
      { name: 'chart-bar', icon: faChartColumn },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_security',
    icons: [
      { name: 'shield', icon: faShield },
      { name: 'building-shield', icon: faBuildingShield },
      { name: 'user-shield', icon: faUserShield },
      { name: 'certificate', icon: faCertificate },
      { name: 'balance', icon: faScaleBalanced },
      { name: 'lock', icon: faLock },
      { name: 'hard-drive', icon: faHardDrive },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_tech',
    icons: [
      { name: 'cloud', icon: faCloud },
      { name: 'code', icon: faCode },
      { name: 'laptop-code', icon: faLaptopCode },
      { name: 'server', icon: faServer },
      { name: 'mobile', icon: faMobileScreen },
      { name: 'tools', icon: faScrewdriverWrench },
    ],
  },
  {
    labelKey: 'CREATE_PROD_SPEC._icon_cat_customer',
    icons: [
      { name: 'headset', icon: faHeadset },
      { name: 'comments', icon: faComments },
      { name: 'file', icon: faFileLines },
      { name: 'graduation-cap', icon: faGraduationCap },
      { name: 'bolt', icon: faBolt },
      { name: 'star', icon: faStar },
      { name: 'handshake', icon: faHandshake },
    ],
  },
];

export const POPULAR_ICONS: PopularIcon[] = POPULAR_ICON_CATEGORIES.flatMap(c => c.icons);

export function findIconByName(name: string | undefined | null): IconDefinition | null {
  if(!name) return null;
  const found = POPULAR_ICONS.find(i => i.name === name);
  return found ? found.icon : null;
}
