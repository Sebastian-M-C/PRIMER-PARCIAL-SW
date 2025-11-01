import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

// Generadores
import { generateModelDart, UMLClass, UMLAttribute } from './generators/modelGenerator';
import { generateServiceDart } from './generators/serviceGenerator';
import { generateListPageDart, generateFormPageDart } from './generators/pageGenerator';
import { generateSidebarDart } from './generators/sidebarGenerator';
import { generateRoutesDart } from './generators/routeGenerator';
import { generateHomePageDart } from './generators/widgetGenerator';

// Templates
import { generatePubspecYaml } from './templates/pubspecTemplate';
import { generateMainDart } from './templates/mainTemplate';

// Utils
import { getRelationsForClass, ProcessedRelation } from './utils/relationMapper';
import { enableFlutterPlatforms } from './enablePlatforms';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

/**
 * Tipos para el diagrama UML de entrada
 */
export interface UMLDiagramJSON {
  package?: string;
  name?: string;
  classes: Array<{
    id?: string;
    name: string;
    attributes: UMLAttribute[];
    methods?: Array<{
      name: string;
      returnType: string;
      parameters?: any[];
    }>;
  }>;
  relations?: Array<{
    id?: string;
    type: string;
    source: string;
    target: string;
    sourceCardinality?: string;
    targetCardinality?: string;
    mappedBy?: string;
    joinColumn?: string;
    label?: string;
  }>;
}

/**
 * Opciones de configuración para la generación
 */
export interface FlutterGeneratorOptions {
  /** URL base de la API REST (default: http://localhost:3000) */
  apiBaseUrl?: string;
  
  /** Habilitar plataforma web (default: true) */
  enableWeb?: boolean;
  
  /** Habilitar plataforma Windows (default: true) */
  enableWindows?: boolean;
  
  /** Timeout para comandos flutter (default: 5 minutos) */
  timeoutMs?: number;
}

/**
 * Genera un proyecto Flutter completo desde un diagrama UML
 * 
 * Proceso:
 * 1. Validar diagrama de entrada
 * 2. Crear estructura de carpetas del proyecto
 * 3. Generar modelos (data layer)
 * 4. Generar servicios (business layer)
 * 5. Generar páginas y widgets (presentation layer)
 * 6. Generar navegación (rutas + sidebar)
 * 7. Generar archivos de configuración (pubspec, main)
 * 8. Habilitar plataformas (web, windows)
 * 9. Empaquetar en ZIP
 * 
 * @param diagram - Diagrama UML con clases y relaciones
 * @param options - Opciones de configuración
 * @returns Ruta del archivo ZIP generado
 * @throws Error si falla la generación
 */
export async function generateFlutterFromDiagram(
  diagram: UMLDiagramJSON,
  options: FlutterGeneratorOptions = {}
): Promise<string> {
  console.log('[FlutterGenerator] Iniciando generación de proyecto Flutter...');
  
  // ============ 1. VALIDACIÓN ============
  
  if (!diagram || !Array.isArray(diagram.classes) || diagram.classes.length === 0) {
    throw new Error('El diagrama debe contener al menos una clase');
  }

  const {
    apiBaseUrl = 'http://localhost:3000',
    enableWeb = true,
    enableWindows = true,
    timeoutMs = 5 * 60 * 1000
  } = options;

  // ============ 2. PREPARAR RUTAS ============
  
  const projectId = uuidv4();
  const outputDir = path.join(process.cwd(), 'generated');
  const projectDir = path.join(outputDir, projectId);
  const zipPath = path.join(outputDir, `${projectId}.zip`);

  // Asegurar que existe el directorio de salida
  await mkdir(outputDir, { recursive: true });
  await mkdir(projectDir, { recursive: true });

  console.log(`[FlutterGenerator] Proyecto: ${projectDir}`);
  console.log(`[FlutterGenerator] ZIP final: ${zipPath}`);

  try {
    // ============ 3. ESTRUCTURA DE CARPETAS ============
    
    await createProjectStructure(projectDir);

    // ============ 4. PROCESAR RELACIONES ============
    
    // Crear mapa de IDs a nombres de clases
    const classesMap = new Map<string, string>();
    diagram.classes.forEach(cls => {
      if (cls.id) {
        classesMap.set(cls.id, cls.name);
      }
    });

    // Procesar relaciones por clase
    const relationsMap = new Map<string, ProcessedRelation[]>();
    if (diagram.relations && diagram.relations.length > 0) {
      diagram.classes.forEach(cls => {
        if (cls.id) {
          const relations = getRelationsForClass(
            cls.name,
            cls.id,
            diagram.relations!,
            classesMap
          );
          relationsMap.set(cls.name, relations);
        }
      });
    }

    console.log(`[FlutterGenerator] Clases detectadas: ${diagram.classes.length}`);
    console.log(`[FlutterGenerator] Relaciones detectadas: ${diagram.relations?.length || 0}`);

    // ============ 5. GENERAR DATA LAYER (Modelos) ============
    
    console.log('[FlutterGenerator] Generando modelos...');
    await generateModels(projectDir, diagram.classes, relationsMap);

    // ============ 6. GENERAR BUSINESS LAYER (Servicios) ============
    
    console.log('[FlutterGenerator] Generando servicios...');
    await generateServices(projectDir, diagram.classes, apiBaseUrl);

    // ============ 7. GENERAR PRESENTATION LAYER (Páginas) ============
    
    console.log('[FlutterGenerator] Generando páginas...');
    await generatePages(projectDir, diagram.classes);

    // ============ 8. GENERAR NAVEGACIÓN ============
    
    console.log('[FlutterGenerator] Generando navegación...');
    const appName = diagram.name || 'Mi App';
    await generateNavigation(projectDir, diagram.classes, appName);

    // ============ 9. GENERAR CONFIGURACIÓN ============
    
    console.log('[FlutterGenerator] Generando archivos de configuración...');
    await generateConfiguration(projectDir, diagram.package || appName, appName);

    // ============ 10. HABILITAR PLATAFORMAS ============
    
    console.log('[FlutterGenerator] Habilitando plataformas Flutter...');
    await enableFlutterPlatforms(projectDir, {
      enableWeb,
      enableWindows,
      timeoutMs
    });

    // ============ 11. EMPAQUETAR EN ZIP ============
    
    console.log('[FlutterGenerator] Empaquetando proyecto en ZIP...');
    await zipDirectory(projectDir, zipPath);

    console.log('[FlutterGenerator] ✅ Generación completada exitosamente');
    console.log(`[FlutterGenerator] Archivo ZIP: ${zipPath}`);

    return zipPath;

  } catch (error) {
    console.error('[FlutterGenerator] ❌ Error durante la generación:', error);
    
    // Limpiar archivos temporales en caso de error
    try {
      await fs.promises.rm(projectDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('[FlutterGenerator] Error al limpiar archivos temporales:', cleanupError);
    }

    throw error;
  }
}

/**
 * Crea la estructura de carpetas del proyecto Flutter
 * 
 * Estructura generada:
 * project/
 * ├── lib/
 * │   ├── models/
 * │   ├── services/
 * │   ├── pages/
 * │   │   ├── home/
 * │   │   └── <clase>/
 * │   └── widgets/
 * ├── test/
 * └── android/ (generado por flutter create)
 */
async function createProjectStructure(projectDir: string): Promise<void> {
  const dirs = [
    'lib/models',
    'lib/services',
    'lib/pages',
    'lib/widgets',
    'test'
  ];

  for (const dir of dirs) {
    const fullPath = path.join(projectDir, dir);
    await mkdir(fullPath, { recursive: true });
  }

  console.log('[FlutterGenerator] Estructura de carpetas creada');
}

/**
 * Genera todos los modelos (data layer)
 * Un archivo .dart por cada clase UML
 */
async function generateModels(
  projectDir: string,
  classes: UMLClass[],
  relationsMap: Map<string, ProcessedRelation[]>
): Promise<void> {
  const modelsDir = path.join(projectDir, 'lib/models');

  for (const cls of classes) {
    const relations = relationsMap.get(cls.name) || [];
    const modelCode = generateModelDart(cls, relations);
    const fileName = `${cls.name.toLowerCase()}.dart`;
    const filePath = path.join(modelsDir, fileName);

    await writeFile(filePath, modelCode, 'utf-8');
    console.log(`  ✓ Modelo generado: ${fileName}`);
  }
}

/**
 * Genera todos los servicios (business layer)
 * Un archivo de servicio por cada clase
 */
async function generateServices(
  projectDir: string,
  classes: UMLClass[],
  apiBaseUrl: string
): Promise<void> {
  const servicesDir = path.join(projectDir, 'lib/services');

  for (const cls of classes) {
    const serviceCode = generateServiceDart(cls.name, apiBaseUrl);
    const fileName = `${cls.name.toLowerCase()}_service.dart`;
    const filePath = path.join(servicesDir, fileName);

    await writeFile(filePath, serviceCode, 'utf-8');
    console.log(`  ✓ Servicio generado: ${fileName}`);
  }
}

/**
 * Genera todas las páginas (presentation layer)
 * Para cada clase:
 * - Página de lista (ListView)
 * - Página de formulario (Create/Edit)
 */
async function generatePages(
  projectDir: string,
  classes: UMLClass[]
): Promise<void> {
  const pagesDir = path.join(projectDir, 'lib/pages');

  for (const cls of classes) {
    const lowerName = cls.name.toLowerCase();
    const classDir = path.join(pagesDir, lowerName);
    await mkdir(classDir, { recursive: true });

    // Página de lista
    const listPageCode = generateListPageDart(cls.name, cls.attributes);
    const listPagePath = path.join(classDir, `${lowerName}_list_page.dart`);
    await writeFile(listPagePath, listPageCode, 'utf-8');

    // Página de formulario
    const formPageCode = generateFormPageDart(cls.name, cls.attributes);
    const formPagePath = path.join(classDir, `${lowerName}_form_page.dart`);
    await writeFile(formPagePath, formPageCode, 'utf-8');

    console.log(`  ✓ Páginas generadas: ${lowerName}_list_page.dart, ${lowerName}_form_page.dart`);
  }
}

/**
 * Genera componentes de navegación
 * - Rutas (routes.dart)
 * - Sidebar (app_drawer.dart)
 * - Home page (home_page.dart)
 */
async function generateNavigation(
  projectDir: string,
  classes: UMLClass[],
  appName: string
): Promise<void> {
  const libDir = path.join(projectDir, 'lib');
  const widgetsDir = path.join(projectDir, 'lib/widgets');
  const homeDir = path.join(projectDir, 'lib/pages/home');

  await mkdir(widgetsDir, { recursive: true });
  await mkdir(homeDir, { recursive: true });

  const classNames = classes.map(c => c.name);

  // Generar rutas
  const routesCode = generateRoutesDart(classNames);
  await writeFile(path.join(libDir, 'routes.dart'), routesCode, 'utf-8');
  console.log('  ✓ Rutas generadas: routes.dart');

  // Generar sidebar
  const sidebarCode = generateSidebarDart(classNames, appName);
  await writeFile(path.join(widgetsDir, 'app_drawer.dart'), sidebarCode, 'utf-8');
  console.log('  ✓ Sidebar generado: app_drawer.dart');

  // Generar home page
  const homePageCode = generateHomePageDart(classNames, appName);
  await writeFile(path.join(homeDir, 'home_page.dart'), homePageCode, 'utf-8');
  console.log('  ✓ Home page generado: home_page.dart');
}

/**
 * Genera archivos de configuración
 * - pubspec.yaml
 * - main.dart
 * - analysis_options.yaml
 * - README.md
 */
async function generateConfiguration(
  projectDir: string,
  packageName: string,
  appName: string
): Promise<void> {
  const libDir = path.join(projectDir, 'lib');

  // pubspec.yaml
  const pubspecCode = generatePubspecYaml(packageName);
  await writeFile(path.join(projectDir, 'pubspec.yaml'), pubspecCode, 'utf-8');
  console.log('  ✓ Configuración generada: pubspec.yaml');

  // main.dart
  const mainCode = generateMainDart(appName);
  await writeFile(path.join(libDir, 'main.dart'), mainCode, 'utf-8');
  console.log('  ✓ Main generado: main.dart');

  // analysis_options.yaml
  const analysisOptions = `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    - prefer_const_constructors
    - prefer_const_literals_to_create_immutables
    - avoid_print
`;
  await writeFile(path.join(projectDir, 'analysis_options.yaml'), analysisOptions, 'utf-8');

  // README.md
  const readme = `# ${appName}

Proyecto Flutter generado automáticamente desde diagrama UML.

## 🚀 Ejecutar proyecto

\`\`\`bash
# Instalar dependencias
flutter pub get

# Ejecutar en modo desarrollo
flutter run

# Ejecutar en web
flutter run -d chrome

# Compilar para producción
flutter build apk  # Android
flutter build web  # Web
\`\`\`

## 📂 Estructura

- **lib/models/** - Modelos de datos (Data Layer)
- **lib/services/** - Servicios API REST (Business Layer)
- **lib/pages/** - Páginas de la aplicación (Presentation Layer)
- **lib/widgets/** - Widgets reutilizables

## 🔧 Configuración

Editar la URL base de la API en cada servicio:
\`\`\`dart
// lib/services/*_service.dart
static const String baseUrl = 'http://localhost:3000';
\`\`\`

## 📱 Características

- ✅ Arquitectura en capas (Presentación, Negocio, Datos)
- ✅ CRUD completo por cada entidad
- ✅ Navegación con Drawer (sidebar)
- ✅ Consumo de API REST
- ✅ Validaciones de formularios
- ✅ Manejo de estados (loading, error, empty)
- ✅ Diseño Material Design 3

## 🛠️ Tecnologías

- Flutter SDK ^3.0.0
- http ^1.1.0 (cliente HTTP)
- Material Design 3
`;
  await writeFile(path.join(projectDir, 'README.md'), readme, 'utf-8');
  console.log('  ✓ README generado: README.md');
}

/**
 * Empaqueta el proyecto en un archivo ZIP
 */
async function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`[FlutterGenerator] ZIP creado: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      console.error('[FlutterGenerator] Error al crear ZIP:', err);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}