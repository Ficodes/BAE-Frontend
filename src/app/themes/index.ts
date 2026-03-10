// Exportar todas las interfaces
export * from './theme.interfaces';

// Importar configuraciones de temas individuales
import { BAE_THEME_CONFIG } from './bae.theme';
import { DOME_THEME_CONFIG } from './dome.theme';
// Importa aquí otras configuraciones de temas que crees:
// import { FOREST_THEME_CONFIG } from './forest.theme';

// Exportar una lista consolidada de temas disponibles
// Esto facilita al ThemeService obtener todos los temas sin importarlos uno por uno.
export const AVAILABLE_THEMES = [
  BAE_THEME_CONFIG,
  DOME_THEME_CONFIG,
  // FOREST_THEME_CONFIG,
  // Añade otras configuraciones de temas aquí
];

// Opcionalmente, puedes exportar también los temas individuales si necesitas acceder a ellos directamente por su nombre
// export { DOME_THEME_CONFIG, OCEAN_THEME_CONFIG };
