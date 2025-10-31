// Generador mínimo de proyecto Flutter a partir de un UMLDiagramJSON.
// Produce un proyecto runnable (sin codegen) empaquetado en ZIP.

/**
 * Objetivo:
 * - Leer un UMLDiagramJSON (clases con atributos).
 * - Generar archivos Dart básicos (modelos, pantallas, main).
 * - Empaquetar el proyecto generado en generated/<uuid>.zip y devolver la ruta.
 *
 * Notas:
 * - Este generador prioriza simplicidad para que la app sea ejecutable inmediatamente.
 * - Relaciones complejas y codegen (freezed/json_serializable) se omiten por simplicidad.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { enableFlutterPlatforms } from './enablePlatforms';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Tipos internos simplificados para el generador
type UMLAttr = { name: string; type: string; nullable?: boolean };
type UMLClass = { name: string; attributes: UMLAttr[] };
type UMLDiagramJSON = { package?: string; classes: Array<Omit<UMLClass, 'id'>>; relations?: any[] };

/**
 * mapUmlTypeToDart
 * - Mapea tipos UML / Java comunes a tipos Dart básicos para generar modelos simples.
 * - Si no reconoce el tipo, intenta inferir un nombre de modelo o usa String por defecto.
 */
function mapUmlTypeToDart(t: string): string {
  const s = (t || '').toLowerCase();
  if (['string', 'char', 'varchar', 'text'].includes(s)) return 'String';
  if (['long', 'integer', 'int', 'short'].includes(s)) return 'int';
  if (['bigdecimal', 'decimal', 'double', 'float'].includes(s)) return 'double';
  if (['localdatetime', 'datetime', 'date', 'timestamp'].includes(s)) return 'DateTime';
  if (['boolean', 'bool'].includes(s)) return 'bool';
  // Si el tipo empieza por mayúscula, se asume que es un modelo personalizado (ej. Address).
  // En caso contrario, devolvemos String como fallback.
  return /^[A-Z]/.test(t) ? t : 'String';
}

/**
 * generateModelDart
 * - Genera una clase Dart simple con:
 *   - campos finales
 *   - constructor con parámetros (required cuando no nullable)
 *   - factory fromJson(Map) para parsear desde JSON
 *   - toJson() para serializar
 *
 * Limitaciones:
 * - No genera validaciones ni codegen (freezed).
 * - DateTime se parsea desde string ISO si existe.
 */
function generateModelDart(cls: UMLClass): string {
  const className = cls.name;

  // Campos: final <type> <name>;
  const fields = cls.attributes.map(a => {
    const dartType = mapUmlTypeToDart(a.type);
    const nullSuffix = a.nullable ? '?' : '';
    return `  final ${dartType}${nullSuffix} ${a.name};`;
  }).join('\n');

  // Constructor: required o no según nullable
  const ctorParams = cls.attributes.map(a => {
    const isRequired = a.nullable ? '' : 'required ';
    return `    ${isRequired}this.${a.name},`;
  }).join('\n');

  // fromJson: mapea campos con casting seguro y fallbacks para evitar null runtime errors
  const fromJsonBody = cls.attributes.map(a => {
    const dartType = mapUmlTypeToDart(a.type);
    const name = a.name;
    const nullable = a.nullable ? true : false;

    if (dartType === 'int') {
      const fallback = nullable ? 'null' : '0';
      return `      ${name}: json['${name}'] != null ? (json['${name}'] is num ? (json['${name}'] as num).toInt() : int.tryParse(json['${name}'].toString()) ?? ${fallback}) : ${fallback},`;
    }

    if (dartType === 'double') {
      const fallback = nullable ? 'null' : '0.0';
      return `      ${name}: json['${name}'] != null ? (json['${name}'] is num ? (json['${name}'] as num).toDouble() : double.tryParse(json['${name}'].toString()) ?? ${fallback}) : ${fallback},`;
    }

    if (dartType === 'bool') {
      const fallback = nullable ? 'null' : 'false';
      return `      ${name}: json['${name}'] != null ? (json['${name}'] is bool ? json['${name}'] as bool : json['${name}'].toString().toLowerCase() == 'true') : ${fallback},`;
    }

    if (dartType === 'DateTime') {
      const fallback = nullable ? 'null' : 'DateTime.fromMillisecondsSinceEpoch(0)';
      return `      ${name}: json['${name}'] != null ? DateTime.parse(json['${name}'].toString()) : ${fallback},`;
    }

    // String or custom types: coerce to String for primitives, leave object as-is for custom types
    if (dartType === 'String') {
      const fallback = nullable ? 'null' : "''";
      return `      ${name}: json['${name}'] != null ? json['${name}'].toString() : ${fallback},`;
    }

    // Fallback generic: keep raw JSON (caller can handle) - nullable fallback to null or an empty map
    const fallback = nullable ? 'null' : '{}';
    return `      ${name}: json['${name}'] != null ? json['${name}'] : ${fallback},`;
  }).join('\n');

  // toJson: serializa, DateTime -> toIso8601String()
  const toJsonBody = cls.attributes.map(a => {
    if (mapUmlTypeToDart(a.type) === 'DateTime') {
      return `      '${a.name}': ${a.name}?.toIso8601String(),`;
    }
    return `      '${a.name}': ${a.name},`;
  }).join('\n');

  return `class ${className} {
${fields}

  ${className}({
${ctorParams}
  });

  factory ${className}.fromJson(Map<String, dynamic> json) => ${className}(
${fromJsonBody}
  );

  Map<String, dynamic> toJson() => {
${toJsonBody}
  };
}
`;
}

/**
 * generateListScreenDart
 * - Crea una pantalla List + Detail para la clase proporcionada.
 * - La ListScreen recibe una lista de items y navega a Detail al tocar un elemento.
 * - Detail muestra todos los pares clave:valor del objeto mediante toJson().
 *
 * Nota: usa rutas y navegación básica MaterialPageRoute para simplicidad.
 */
function generateListScreenDart(className: string): string {
  const lc = className.toLowerCase();
  return `import 'package:flutter/material.dart';
import '../models/${lc}.dart';

class ${className}ListScreen extends StatelessWidget {
  final List<${className}> items;
  const ${className}ListScreen({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${className} List')),
      body: ListView.builder(
        itemCount: items.length,
        itemBuilder: (_, i) {
          final it = items[i];
          // Muestra el primer valor del map como título (fallback simple)
          return ListTile(
            title: Text(it.toJson().values.first?.toString() ?? '${className}'),
            subtitle: Text(items[i].toJson().toString()),
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => ${className}DetailScreen(item: it),
            )),
          );
        },
      ),
    );
  }
}

class ${className}DetailScreen extends StatelessWidget {
  final ${className} item;
  const ${className}DetailScreen({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final map = item.toJson();
    return Scaffold(
      appBar: AppBar(title: Text('${className} Detail')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: map.entries.map((e) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Text('\${e.key}: \${e.value}'),
          )).toList(),
        ),
      ),
    );
  }
}
`;
}

/**
 * generateMainDart
 * - Genera main.dart y la clase MyApp que:
 *   - importa modelos y screens generadas
 *   - prepara listas de ejemplo (basadas en atributos) para que la app muestre datos al iniciar
 *   - registra rutas simples para navegar a cada ListScreen
 *
 * Limitación: las listas de ejemplo usan objetos construidos con fromJson({ campo: null })
 * para evitar tener que inferir valores reales.
 */
function generateMainDart(classes: UMLClass[]): { main: string; app: string } {
  const imports = classes.map(c => `import 'models/${c.name.toLowerCase()}.dart';`).join('\n');

  // Crea listas de ejemplo para cada entidad (un elemento con valores nulos)
  const sampleLists = classes.map(c => {
    const name = c.name;
    const sample = c.attributes.length ? `{ ${c.attributes.map(a => `'${a.name}': null`).join(', ')} }` : '{}';
    return `  final ${name.toLowerCase()}s = <${name}>[ ${name}.fromJson(${sample}) ];`;
  }).join('\n');

  // Rutas para cada entidad: '/classname' -> ClassNameListScreen
  const routes = classes.map(c => `        '/${c.name.toLowerCase()}': (context) => ${c.name}ListScreen(items: ${c.name.toLowerCase()}s),`).join('\n');

  const appImports = classes.map(c => `import 'screens/${c.name.toLowerCase()}_list.dart';`).join('\n');

  const main = `import 'package:flutter/material.dart';
${imports}
${appImports}

void main() {
  runApp(const MyApp());
}
`;

  const app = `class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
${sampleLists ? sampleLists : ''}
    return MaterialApp(
      title: 'Generated App',
      theme: ThemeData(primarySwatch: Colors.blue),
      routes: {
${routes}
      },
      home: Scaffold(
        appBar: AppBar(title: const Text('Generated App')),
        body: Center(child: Text('Navega a las rutas generadas')),
      ),
    );
  }
}
`;
  return { main, app };
}

/**
 * generatePubspec
 * - Genera un pubspec.yaml mínimo para que el proyecto sea reconocible por Flutter.
 * - No incluye dependencias de codegen para evitar pasos adicionales al usuario.
 */
function generatePubspec(name: string) {
  return `name: ${name}
description: Generated Flutter app
publish_to: 'none'
environment:
  sdk: ">=2.18.0 <4.0.0"
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

flutter:
  uses-material-design: true
`;
}

/**
 * generateFlutterFromDiagram
 * - Punto principal exportado por el módulo.
 * - Crea un directorio temporal under generated/<id>/ con la estructura de proyecto (pubspec + lib/models + lib/screens + lib/main.dart)
 * - Escribe archivos para cada clase en diagram.classes
 * - Empaqueta el directorio en generated/<id>.zip y devuelve la ruta al ZIP
 *
 * Comportamiento de errores:
 * - Lanza excepción si hay fallo en escritura/compresión; el caller debe manejar/limpiar.
 *
 * Uso esperado:
 * - El route handler del servidor invoca esta función con el UMLDiagramJSON y luego sirve el ZIP resultante al cliente.
 */
export async function generateFlutterFromDiagram(diagram: UMLDiagramJSON): Promise<string> {
  // Id único para el proyecto temporal
  const id = `flutter_${uuidv4()}`;
  const tmpDir = path.resolve(process.cwd(), 'generated', id);

  // Asegura que el directorio exista (no falla si ya existe)
  try { await stat(tmpDir); } catch { await mkdir(tmpDir, { recursive: true }); }

  // pubspec.yaml
  await writeFile(path.join(tmpDir, 'pubspec.yaml'), generatePubspec(diagram.package || 'generated_app'), 'utf8');

  // Estructura lib/ y subcarpetas
  const libDir = path.join(tmpDir, 'lib');
  await mkdir(libDir, { recursive: true });
  await mkdir(path.join(libDir, 'models'), { recursive: true });
  await mkdir(path.join(libDir, 'screens'), { recursive: true });

  // Genera modelos y pantallas para cada clase del diagrama
  for (const cls of diagram.classes) {
    // Modelo Dart (lib/models/<classname>.dart)
    const modelCode = generateModelDart({ name: cls.name, attributes: cls.attributes });
    await writeFile(path.join(libDir, 'models', `${cls.name.toLowerCase()}.dart`), modelCode, 'utf8');

    // Pantalla List + Detail (lib/screens/<classname>_list.dart)
    const screenCode = generateListScreenDart(cls.name);
    await writeFile(path.join(libDir, 'screens', `${cls.name.toLowerCase()}_list.dart`), screenCode, 'utf8');
  }

  // Genera main.dart con wiring de la app y rutas
  const { main, app } = generateMainDart(diagram.classes);
  await writeFile(path.join(libDir, 'main.dart'), `${main}\n${app}`, 'utf8');

  // <-- NUEVA LLAMADA: generar los ficheros de plataforma (web/windows) con flutter create
  try {
    // Intentamos crear los artefactos de plataforma si 'flutter' está disponible.
    // Si falla, capturamos el error pero seguimos para que el ZIP aún sea devuelto (con lib/ y pubspec).
    await enableFlutterPlatforms(tmpDir, { enableWeb: true, enableWindows: true, timeoutMs: 2 * 60 * 1000 });
  } catch (e) {
    console.warn('enableFlutterPlatforms falló o flutter no está disponible en PATH. El proyecto seguirá conteniendo lib/ y pubspec.yaml. Error:', e);
  }

  // Empaqueta el directorio temporal en un ZIP dentro de generated/
  const zipPath = path.resolve(process.cwd(), 'generated', `${id}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise<string>((resolve, reject) => {
    // Cuando la escritura finaliza, resolvemos con la ruta al ZIP
    output.on('close', () => resolve(zipPath));
    archive.on('error', err => reject(err));

    archive.pipe(output);
    // Añade todo el contenido del tmpDir al ZIP (sin envolver en una carpeta extra)
    archive.directory(tmpDir, false);
    archive.finalize();
  });
}