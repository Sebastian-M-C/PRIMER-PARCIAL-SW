/**
 * Genera el archivo de rutas de la aplicación
 * Define todas las rutas disponibles con MaterialPageRoute
 * 
 * @param classNames - Array de nombres de clases
 * @returns Código Dart del generador de rutas
 */
export function generateRoutesDart(classNames: string[]): string {
  // Normalizar y filtrar nombres válidos
  const validNames = (classNames || [])
    .map(n => String(n || '').trim())
    .filter(n => n.length > 0);

  if (validNames.length === 0) {
    return `import 'package:flutter/material.dart';

/// Rutas generadas automáticamente (ninguna clase encontrada)
final Map<String, WidgetBuilder> appRoutes = {
  '/': (context) => const Scaffold(body: Center(child: Text('No pages generated'))),
};
`;
  }

  // Helpers para safe identifiers / paths
  const makeLower = (n: string) =>
    n.replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();

  const toPascal = (n: string) =>
    n
      .replace(/[^\w\s]/g, ' ')
      .split(/[\s_]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  
  const imports = validNames.map(cls => {
    const lower = makeLower(cls);
    return `import 'pages/${lower}/${lower}_list_page.dart';`;
  }).join('\n');

  // Entradas del mapa de rutas
  const firstClass = validNames[0];
  const firstClassSafe = toPascal(firstClass);

  const routesEntries = validNames.map(cls => {
    const pascal = toPascal(cls);
    const lower = makeLower(cls);
    const routeKey = `/${lower}s`;
    // No forzamos const aquí para evitar fallos si la página no define constructor const
    return `  '${routeKey}': (context) => ${pascal}ListPage(),`;
  }).join('\n');

  return `import 'package:flutter/material.dart';
${imports}

/// Rutas generadas automáticamente
/// Home apunta a la lista de ${firstClass}
final Map<String, WidgetBuilder> appRoutes = {
  '/': (context) => ${firstClassSafe}ListPage(),
${routesEntries}
};
`;
}