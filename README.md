# BaeFrontend

This project develops the frontend for the BAE Marketplace.

# Application Theming System

## Overview

This section outlines the architecture and usage of the application's dynamic theming system. The system is designed to allow for extensive white-labeling, enabling changes to the application's appearance, branding, and navigation based on a selected theme.

Each theme can configure:
- **Visual Styles**: Colors, fonts, and other CSS properties.
- **Assets**: Logos, background images, and other graphics.
- **Navigation**: Dynamic links in the header and footer.
- **Component Behavior**: Toggling features or sections, like parts of the dashboard.
- **Text and Labels**: Leverages the internationalization (i18n) system for customizable text.

## How It Works

The core of the system is the `ThemeService`, which is responsible for loading and applying a theme across the application.

1.  **Initialization**: When the application starts, the `ThemeService` is initialized. It determines which theme to load based on a provider-specific identifier (e.g., from an environment variable). If the specified theme is not found or none is provided, it falls back to a pre-defined default theme.

2.  **CSS Styling**: The service applies a unique CSS class to the `<body>` tag, formatted as `theme-<theme-name>` (e.g., `theme-dome`). This class is used in SCSS files to apply theme-specific styles by overriding CSS custom properties.

3.  **Configuration Loading**: The service loads a `ThemeConfig` TypeScript object that contains paths to assets, navigation link structures, and other configuration flags. This object is exposed application-wide via an RxJS `Observable`, `themeService.currentTheme$`. Components can subscribe to this observable to access theme-specific data dynamically.

---

## Creating a New Theme

Follow these steps to add a new theme to the application. In this example, we will create a new theme called **"Galaxy"**.

### 1. Locate Theme Directory

First, locate the directory to add your theme's configuration files inside `src/app/themes/`.

### 2. Create SCSS File

Inside your new directory, create a `.scss` file for your theme's CSS variables.

**File:** `src/app/themes/galaxy.theme.scss`

This file must define a selector for your theme (`body.theme-galaxy`) and override the global CSS custom properties for colors.

```scss
body.theme-galaxy {
  /* Define primary and secondary colors for the Galaxy theme. */
  /* These variables will be used by TailwindCSS and custom components. */
  
  /* Example HEX: #8A2BE2 */
  --theme-primary-50: 138 43 226;
  /* Example HEX: #4B0082 */
  --theme-primary-100: 75 0 130;

  /* Example HEX: #E6E6FA */
  --theme-secondary-50: 230 230 250;
  /* Example HEX: #2C004C */
  --theme-secondary-100: 44 0 76;
}
```

### 3. Create TypeScript Configuration File
Next, create the TypeScript configuration file. This defines all the non-CSS aspects of your theme.

**File:** `src/app/themes/galaxy.theme.ts`

```ts
import { NavLink, ThemeConfig } from '../theme.interfaces';

// Define navigation links for the theme
const galaxyHeaderLinks: NavLink[] = [
 {
    label: 'HEADER._home', // Translation key
    url: '/',
    isRouterLink: true
 },
 {
    label: 'HEADER._starmaps',
    id: 'starmapsDropdown',
    children: [
        { label: 'HEADER._browse_maps', url: '/search', isRouterLink: true },
        { label: 'HEADER._about_maps', url: '/about-starmaps', isRouterLink: true }
    ]
 }
];

// Export the main theme configuration object
export const GALAXY_THEME_CONFIG: ThemeConfig = {
    name: 'Galaxy', // This MUST match the name used in the SCSS class (theme-galaxy)
    displayName: 'Galaxy Interstellar Marketplace',
    assets: {
        logoUrl: 'assets/themes/galaxy/galaxy-logo.svg',
        jumboBgUrl: 'assets/themes/galaxy/stars-background.png',
        cardDefaultBgUrl: 'assets/themes/galaxy/nebula-background.png'
    },
    links: {
        headerLinks: galaxyHeaderLinks,
        // footerLinks can be defined similarly
    },
    dashboard: {
        showFeaturedOfferings: true,
        showPlatformBenefits: false,
    }
};
```

### 4. Register the Theme
You must register the new theme in two places for it to be loaded by the application.

**A. Register SCSS:** Import your new `.scss` file in the main `styles.css` file.

**File:** `src/styles.css`
``` css
/* ... */
@import 'app/themes/dome.theme.scss';
@import 'app/themes/bae.theme.scss';
@import 'app/themes/galaxy.theme.scss'; /* Add this line */
/* ... */
```

**B. Register TypeScript Config:** Import your new config object into and add it to the array. `src/app/themes/index.ts``AVAILABLE_THEMES`

**File:** (Create if it doesn't exist) `src/app/themes/index.ts`
``` typescript
import { ThemeConfig } from './theme.interfaces';
import { DOME_THEME_CONFIG } from './dome/dome.theme';
import { BAE_THEME_CONFIG } from './bae/bae.theme';
import { GALAXY_THEME_CONFIG } from './galaxy/galaxy.theme'; // 1. Import new theme

export const AVAILABLE_THEMES: ThemeConfig[] = [
  DOME_THEME_CONFIG,
  BAE_THEME_CONFIG,
  GALAXY_THEME_CONFIG // 2. Add to array
];
```

### 5. Add Theme Assets
Finally, place all your theme-specific assets (logo, images, etc.) in the corresponding folder under `src/assets/themes/`.

``` 
src/assets/themes/galaxy/
  - galaxy-logo.svg
  - stars-background.png
  - nebula-background.png
```

## Using Theme Data in Components
To use theme data (like the logo URL) in a component, inject the and subscribe to the observable. The best practice is to use
the `async` pipe in your template. `ThemeService currentTheme$`

**Example:** `header.component.ts`

``` typescript
import { Component } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  template: `
    <ng-container *ngIf="themeService.currentTheme$ | async as theme">
      <img [src]="theme.assets.logoUrl" alt="Logo">
      <!-- Access other theme properties here -->
    </ng-container>
  `
})
export class HeaderComponent {
  constructor(public themeService: ThemeService) {}
}
```

## Translations (i18n)
The theming system is integrated with `ngx-translate` for internationalization. Notice that link labels in the theme 
configuration file are translation keys (e.g., ). `HEADER._home`

When creating a new theme or adding new links, you must add these keys to the language JSON files.
**Example:** `src/assets/i18n/themes/en-galaxy.json`
``` json
{
  "HEADER": {
    "_starmaps": "Starmaps",          // Add new key for Galaxy theme
    "_browse_maps": "Browse Maps",    // Add new key for Galaxy theme
    "_about_maps": "About Starmaps"   // Add new key for Galaxy theme
  },
  "FOOTER": {
    // ...
  }
}
```
Ensure that any new keys are added to the JSON files for all supported languages (e.g., , `fr-galaxy.json`). `es-galaxy.json`


