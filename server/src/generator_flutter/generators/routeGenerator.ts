/**
 * Genera el archivo de rutas de la aplicación
 * Define todas las rutas disponibles con MaterialPageRoute
 * 
 * @param classNames - Array de nombres de clases
 * @returns Código Dart del generador de rutas
 */
export function generateRoutesDart(classNames: string[]): string {
  const imports = classNames.map(className => {
    const lowerName = className.toLowerCase();
    return `import 'pages/${lowerName}/${lowerName}_list_page.dart';`;
  }).join('\n');

  const routeCases = classNames.map(className => {
    const lowerName = className.toLowerCase();
    return `      case '/${lowerName}s':
        return MaterialPageRoute(builder: (_) => const ${className}ListPage());`;
  }).join('\n');

  return `import 'package:flutter/material.dart';
import 'pages/home_page.dart';
${imports}

/// Generador de rutas de la aplicación
/// Define todas las rutas disponibles y sus respectivas páginas
class AppRoutes {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/':
        return MaterialPageRoute(builder: (_) => const HomePage());
${routeCases}
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('Ruta no encontrada: \${settings.name}'),
            ),
          ),
        );
    }
  }
}
`;
}