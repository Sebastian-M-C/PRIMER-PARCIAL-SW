/**
 * Genera el archivo main.dart principal
 * Configura MaterialApp con tema y rutas
 * 
 * @param appName - Nombre de la aplicación
 * @returns Código Dart del main.dart
 */
export function generateMainDart(appName: string = 'Mi App'): string {
  return `import 'package:flutter/material.dart';
import 'routes.dart';

/// Punto de entrada de la aplicación
void main() {
  runApp(const MyApp());
}

/// Widget raíz de la aplicación
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${appName}',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 2,
        ),
        // No usar 'const' aquí porque BorderRadius.circular no es const
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      initialRoute: '/',
      routes: appRoutes,
    );
  }
}
`;
}