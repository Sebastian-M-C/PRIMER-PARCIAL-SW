# Análisis Profundo de la Carpeta `server/src`

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Punto de Entrada](#punto-de-entrada)
3. [Módulos Principales](#módulos-principales)
4. [Flujos de Datos](#flujos-de-datos)
5. [Patrones de Diseño](#patrones-de-diseño)
6. [Interacciones entre Componentes](#interacciones-entre-componentes)
7. [Dependencias y Configuración](#dependencias-y-configuración)

---

## 🏗️ Arquitectura General

### Estructura de Directorios
```
src/
├── index.ts              # Punto de entrada - Configuración Express + Socket.io
├── routes/               # Rutas HTTP REST API
│   ├── index.ts          # Configurador central de rutas
│   ├── ai.ts             # Rutas de IA (OpenAI)
│   ├── ai_image_geminis.ts  # Rutas de análisis de imágenes (Gemini)
│   └── generator.ts      # Rutas de generación de código
├── ai/                   # Módulo de Inteligencia Artificial
│   ├── openaiService.ts  # Servicio OpenAI (texto a UML)
│   ├── applyUMLActions.ts # Aplicador de acciones UML
│   └── gemini/           # Módulo Gemini (análisis de imágenes)
│       ├── geminiClient.ts    # Cliente API Gemini
│       ├── orchestrator.ts    # Orquestador de análisis de imágenes
│       ├── ImageProcessor.ts  # Procesador de imágenes
│       ├── ocr.ts             # OCR (no usado actualmente)
│       └── visionParser.ts    # Parser de visión
├── generator/            # Generador Spring Boot
│   └── springBootGenerator.ts
├── generator_flutter/    # Generador Flutter
│   ├── flutterGenerator.ts   # Punto de entrada
│   ├── orchestrator.ts       # Orquestador principal
│   ├── projectBuilder.ts     # Constructor de proyecto
│   ├── generators/          # Generadores específicos
│   ├── templates/           # Plantillas
│   └── utils/               # Utilidades
├── collaboration/        # Colaboración en tiempo real
│   └── socketHandlers.ts
├── db/                   # Base de datos
│   └── connection.ts
└── types/                # Tipos TypeScript compartidos
    └── uml.ts
```

### Arquitectura de Capas
```
┌─────────────────────────────────────────┐
│         HTTP Layer (Express)           │
│  ┌──────────┐  ┌──────────┐            │
│  │  Routes  │  │ Socket  │            │
│  └────┬─────┘  └────┬─────┘            │
└───────┼──────────────┼──────────────────┘
        │              │
┌───────▼──────────────▼──────────────────┐
│         Business Logic Layer            │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │    AI    │  │Generator │  │Collabor ││
│  └────┬─────┘  └────┬─────┘  └────┬────┘│
└───────┼──────────────┼─────────────┼─────┘
        │              │             │
┌───────▼──────────────▼─────────────▼─────┐
│         Data & External Services         │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │   DB     │  │ OpenAI   │  │ Gemini  ││
│  └──────────┘  └──────────┘  └─────────┘│
└──────────────────────────────────────────┘
```

---

## 🚀 Punto de Entrada

### `index.ts` - Configuración del Servidor

**Responsabilidades:**
- Inicialización de Express con middleware (CORS, Helmet, Morgan)
- Configuración de Socket.io para colaboración en tiempo real
- Servir archivos estáticos del frontend compilado
- Inicialización de base de datos PostgreSQL
- Manejo de errores global
- Health check endpoint

**Flujo de Inicialización:**
```typescript
1. Cargar variables de entorno (.env)
2. Crear instancia Express
3. Crear servidor HTTP
4. Configurar Socket.io con CORS
5. Aplicar middleware (helmet, cors, morgan, body-parser)
6. Configurar rutas (setupRoutes)
7. Configurar handlers Socket.io (setupSocketHandlers)
8. Inicializar base de datos (initializeDatabase)
9. Iniciar servidor en puerto 3001
```

**Características Clave:**
- **SPA Support**: Catch-all handler para servir `index.html` del frontend
- **Error Handling**: Middleware global de manejo de errores
- **Graceful Shutdown**: Handlers para SIGTERM y SIGINT

---

## 📡 Módulos Principales

### 1. Routes (`routes/`)

#### `routes/index.ts` - Configurador Central
**Patrón:** Facade Pattern
- Centraliza la configuración de todas las rutas
- Expone función `setupRoutes(app)` que registra todos los routers

**Rutas Registradas:**
- `/api/generator` → `generatorRoutes`
- `/api/ai` → `aiRoutes` + `aiImageRoutes`

#### `routes/ai.ts` - Rutas de IA (OpenAI)
**Endpoints:**
- `POST /api/ai/suggest` - Obtener sugerencias de IA para diagrama UML
- `POST /api/ai/from-text` - Generar clase UML desde texto
- `POST /api/ai/generate-diagram` - Generar diagrama completo desde texto
- `POST /api/ai/modify-diagram` - Modificar diagrama existente con IA

**Flujo de `modify-diagram`:**
```
1. Recibir diagrama actual + instrucción de texto
2. Llamar a modifyDiagramFromText() → genera acciones UML
3. Aplicar acciones con applyActionsToDiagram()
4. (TODO) Persistir diagrama actualizado
5. (TODO) Emitir evento Socket.io para colaboración
6. Devolver acciones + diagrama actualizado
```

#### `routes/ai_image_geminis.ts` - Análisis de Imágenes
**Endpoint:**
- `POST /api/ai/image-to-diagram` - Convertir imagen a diagrama UML

**Características:**
- Soporta multipart/form-data (multer) para upload de archivos
- Fallback a JSON con `imagePath` si multer no está disponible
- Opciones: `lang` (idioma), `useLLM` (habilitar/deshabilitar IA)
- Procesa buffer de imagen directamente o ruta de archivo

**Flujo:**
```
1. Recibir imagen (buffer o path)
2. Preprocesar imagen (opcional)
3. Llamar a handleImageBufferToDiagram() o handleImageToDiagram()
4. Usar Gemini Vision API para análisis
5. Normalizar respuesta a DiagramModel
6. Devolver diagrama + metadata (engine, model, elapsed time)
```

#### `routes/generator.ts` - Generación de Código
**Endpoints:**
- `POST /api/generator/spring` - Generar proyecto Spring Boot
- `POST /api/generator/flutter` - Generar aplicación Flutter

**Flujo Spring Boot:**
```
1. Validar UML data (package, classes)
2. Llamar a generateSpringBootProject()
3. Generar estructura Maven
4. Generar entidades, DTOs, repositorios, servicios, controladores
5. Crear ZIP en memoria
6. Devolver ZIP como attachment
```

**Flujo Flutter:**
```
1. Validar diagrama (debe tener clases)
2. Llamar a generateFlutterFromDiagram()
3. Generar estructura Flutter (lib/, pubspec.yaml)
4. Generar modelos, servicios, páginas, navegación
5. Habilitar plataformas (web, windows)
6. Crear ZIP en disco
7. Devolver ZIP como download
8. Limpiar archivo temporal después de enviar
```

---

### 2. AI Module (`ai/`)

#### `ai/openaiService.ts` - Servicio OpenAI
**Responsabilidades:**
- Integración con OpenAI API (GPT-3.5-turbo)
- Generación de diagramas UML desde texto natural
- Sugerencias de mejora para diagramas existentes
- Modificación de diagramas con contexto

**Funciones Principales:**
- `getAISuggestions(umlData)` - Analiza diagrama y sugiere mejoras
- `generateFromText(text)` - Genera una clase UML desde texto
- `generateDiagramFromText(text)` - Genera diagrama completo (múltiples clases)
- `modifyDiagramFromText(diagram, text)` - Genera acciones para modificar diagrama

**Características:**
- **Fallback Mock**: Si OpenAI falla, devuelve respuestas mock
- **Prompts Especializados**: Diferentes prompts para cada tarea
- **Validación de Respuestas**: Valida estructura JSON de respuestas
- **Idioma**: Todos los prompts y respuestas en español

#### `ai/applyUMLActions.ts` - Aplicador de Acciones
**Responsabilidades:**
- Aplicar acciones generadas por IA sobre diagramas UML
- Inmutabilidad: No muta el diagrama original, retorna copia

**Acciones Soportadas:**
- **Clases**: `CREATE_CLASS`, `DELETE_CLASS`, `RENAME_CLASS`
- **Atributos**: `ADD_ATTRIBUTE`, `UPDATE_ATTRIBUTE`, `DELETE_ATTRIBUTE`
- **Métodos**: `ADD_METHOD`, `UPDATE_METHOD`, `DELETE_METHOD`
- **Relaciones**: `CREATE_RELATION`, `UPDATE_RELATION`, `DELETE_RELATION`

**Características:**
- Resolución de referencias por ID o nombre
- Validación de existencia antes de operar
- Manejo de advertencias (warnings) en `_aiWarnings`
- Prevención de duplicados

#### `ai/gemini/` - Módulo Gemini
**Propósito:** Análisis de imágenes de diagramas UML usando Google Gemini Vision API

**Componentes:**

1. **`geminiClient.ts`** - Cliente API Gemini
   - Llama a `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
   - Soporta imágenes como base64 inline_data
   - Fallback a `gemini-pro-vision` si el modelo no existe
   - Manejo de errores robusto

2. **`orchestrator.ts`** - Orquestador de Análisis
   - `handleImageToDiagram(path, options)` - Procesa archivo de imagen
   - `handleImageBufferToDiagram(buffer, options)` - Procesa buffer de imagen
   - Preprocesa imagen (redimensiona, optimiza)
   - Llama a Gemini con prompt especializado
   - Normaliza respuesta a `DiagramModel`

3. **`ImageProcessor.ts`** - Procesador de Imágenes
   - Preprocesa imágenes (redimensiona, comprime)
   - Optimiza para análisis de Gemini
   - Guarda versión procesada temporalmente

**Flujo Completo de Análisis de Imagen:**
```
1. Recibir imagen (buffer o path)
2. Preprocesar imagen (ImageProcessor)
   - Redimensionar a maxWidth (1600px)
   - Comprimir calidad (85%)
   - Convertir a JPEG
3. Construir prompt especializado para Gemini
4. Llamar a Gemini API (geminiClient)
   - Enviar prompt + imagen base64
   - Timeout: 60 segundos
5. Parsear respuesta JSON
   - Extraer texto de respuesta
   - Remover markdown code blocks si existen
   - Parsear JSON
6. Normalizar a DiagramModel
   - Validar estructura
   - Mapear clases y relaciones
   - Generar IDs si faltan
7. Retornar resultado con metadata
```

---

### 3. Generator Module (`generator/`)

#### `generator/springBootGenerator.ts` - Generador Spring Boot
**Responsabilidades:**
- Generar proyecto Spring Boot completo desde diagrama UML
- Crear estructura Maven estándar
- Generar código Java para todas las capas

**Estructura Generada:**
```
project/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── {package}/
│   │   │       ├── {Project}Application.java
│   │   │       ├── entity/          # Entidades JPA
│   │   │       ├── dto/             # DTOs (Request/Response)
│   │   │       ├── repository/       # Repositorios JPA
│   │   │       ├── service/         # Interfaces de servicio
│   │   │       │   └── impl/        # Implementaciones
│   │   │       └── controller/      # Controladores REST
│   │   └── resources/
│   │       └── application.properties
│   └── test/
└── docs/
    └── {project}-postman-collection.json
```

**Proceso de Generación:**
```
1. Crear estructura de directorios
2. Generar pom.xml con dependencias Spring Boot
3. Generar Application.java (clase principal)
4. Generar application.properties
5. Para cada clase UML:
   a. Generar Entity (con anotaciones JPA)
   b. Generar RequestDTO y ResponseDTO
   c. Generar Repository (interface JpaRepository)
   d. Generar Service (interface + implementación)
   e. Generar Controller (REST endpoints CRUD)
6. Generar colección Postman
7. Crear ZIP en memoria
8. Limpiar directorio temporal
```

**Características:**
- **Anotaciones JPA**: `@Entity`, `@OneToMany`, `@ManyToOne`, etc.
- **Validación**: `@NotNull`, `@NotBlank`, `@Email`
- **Lombok**: `@Data`, `@Builder`, `@NoArgsConstructor`
- **Timestamps Automáticos**: `@CreationTimestamp`, `@UpdateTimestamp`
- **Mapeo de Tipos**: UML types → Java types (String, Long, LocalDateTime, etc.)

---

### 4. Generator Flutter (`generator_flutter/`)

#### Arquitectura del Generador Flutter

**Componentes Principales:**

1. **`flutterGenerator.ts`** - Facade/Entry Point
   - Expone función pública `generateFlutterFromDiagram()`
   - Re-exporta tipos necesarios

2. **`orchestrator.ts`** - Orquestador Principal
   - Coordina todo el proceso de generación
   - Valida entrada
   - Crea estructura de proyecto
   - Llama a generadores específicos
   - Empaqueta en ZIP

3. **`projectBuilder.ts`** - Constructor de Proyecto
   - `createProjectStructure()` - Crea directorios base
   - `generateModels()` - Genera modelos Dart
   - `generateServices()` - Genera servicios HTTP
   - `generatePages()` - Genera páginas Flutter
   - `generateNavigation()` - Genera navegación
   - `generateConfiguration()` - Genera pubspec.yaml, main.dart, README

4. **`generators/`** - Generadores Específicos
   - `modelGenerator.ts` - Modelos Dart con JSON serialization
   - `serviceGenerator.ts` - Servicios HTTP con Dio
   - `pageGenerator.ts` - Páginas Flutter (list, form)
   - `routeGenerator.ts` - Rutas de navegación
   - `sidebarGenerator.ts` - Sidebar de navegación
   - `widgetGenerator.ts` - Widgets reutilizables
   - `configGenerator.ts` - Configuración de la app

5. **`utils/`** - Utilidades
   - `typeMapper.ts` - Mapeo UML types → Dart types
   - `relationMapper.ts` - Procesamiento de relaciones UML

6. **`templates/`** - Plantillas
   - `pubspecTemplate.ts` - Template de pubspec.yaml
   - `mainTemplate.ts` - Template de main.dart

7. **`platformAndPackaging.ts`** - Plataformas y Empaquetado
   - `enableFlutterPlatformsAndClean()` - Habilita web/windows
   - `zipDirectory()` - Crea ZIP del proyecto

**Estructura Generada:**
```
flutter_app/
├── pubspec.yaml
├── README.md
├── lib/
│   ├── main.dart
│   ├── models/           # Modelos Dart
│   ├── services/         # Servicios HTTP
│   ├── pages/            # Páginas Flutter
│   │   ├── list/         # Páginas de lista
│   │   └── form/         # Páginas de formulario
│   ├── widgets/          # Widgets reutilizables
│   ├── routes/           # Configuración de rutas
│   └── config/           # Configuración de la app
└── [platforms habilitados]
```

**Flujo de Generación:**
```
1. Validar diagrama (debe tener clases)
2. Crear directorios base (lib/, etc.)
3. Procesar relaciones UML → mapa de relaciones por clase
4. Generar modelos Dart (con JSON serialization)
5. Generar servicios HTTP (con Dio)
6. Generar páginas Flutter (list + form para cada clase)
7. Generar navegación (sidebar + rutas)
8. Generar configuración (pubspec.yaml, main.dart, README)
9. Habilitar plataformas (web, windows) si están habilitadas
10. Crear ZIP del proyecto
11. Retornar ruta del ZIP
```

**Características:**
- **JSON Serialization**: Modelos con `json_serializable`
- **HTTP Client**: Usa `dio` para llamadas HTTP
- **State Management**: Usa `provider` o similar
- **Navegación**: Sidebar con navegación entre páginas
- **Formularios**: Páginas de formulario con validación
- **Listas**: Páginas de lista con CRUD operations

---

### 5. Collaboration Module (`collaboration/`)

#### `collaboration/socketHandlers.ts` - Handlers Socket.io
**Responsabilidades:**
- Manejar conexiones WebSocket para colaboración en tiempo real
- Gestionar salas de diagramas (rooms)
- Sincronizar cambios entre usuarios
- Gestionar locks de elementos

**Namespace:** `/diagram`

**Eventos Soportados:**

**Cliente → Servidor:**
- `diagram:join` - Unirse a un diagrama
- `diagram:update` - Actualizar diagrama
- `diagram:lock` - Bloquear elemento
- `diagram:unlock` - Desbloquear elemento
- `diagram:cursor-update` - Actualizar posición del cursor
- `diagram:leave` - Salir del diagrama

**Servidor → Cliente:**
- `diagram:user-joined` - Usuario se unió
- `diagram:user-left` - Usuario salió
- `diagram:users` - Lista de usuarios en la sala
- `diagram:update` - Actualización del diagrama
- `diagram:lock` - Elemento bloqueado
- `diagram:unlock` - Elemento desbloqueado
- `diagram:locks` - Lista de locks activos
- `diagram:cursor-update` - Actualización de cursor

**Estructura de Datos:**
```typescript
interface DiagramRoom {
  users: Map<string, CollaborationUser>;  // socketId -> User
  locks: Map<string, CollaborationLock>;  // elementId -> Lock
  diagramData?: any;                      // Estado actual del diagrama
}

interface CollaborationUser {
  id: string;        // socket.id
  name: string;      // "User {shortId}"
  color: string;     // Color HSL aleatorio
  cursor?: { x: number; y: number };
}

interface CollaborationLock {
  elementId: string;
  userId: string;    // socket.id del usuario que tiene el lock
  timestamp: number;
}
```

**Flujo de Colaboración:**
```
1. Usuario se conecta → socket.io connection
2. Usuario emite 'diagram:join' con diagramId
3. Servidor:
   - Crea/obtiene room para diagramId
   - Crea CollaborationUser
   - Agrega usuario al room
   - Emite 'diagram:user-joined' a todos en el room
   - Emite 'diagram:users' con lista actualizada
   - Emite 'diagram:locks' con locks activos
   - Si hay diagramData, lo envía al nuevo usuario
4. Usuario emite 'diagram:update' con cambios
5. Servidor:
   - Actualiza diagramData en el room
   - Emite 'diagram:update' a todos excepto el emisor
6. Usuario emite 'diagram:lock' para editar elemento
7. Servidor:
   - Crea lock en el room
   - Emite 'diagram:lock' a todos
8. Usuario desconecta → cleanup automático
```

**Características:**
- **Rooms por Diagrama**: Cada diagrama tiene su propia sala
- **Locks Automáticos**: Los locks se crean cuando un usuario edita
- **Cleanup Automático**: Limpia locks y usuarios al desconectar
- **Broadcast Selectivo**: Emite a todos excepto al emisor cuando corresponde

---

### 6. Database Module (`db/`)

#### `db/connection.ts` - Conexión PostgreSQL
**Responsabilidades:**
- Gestionar pool de conexiones PostgreSQL
- Crear tablas si no existen
- Proporcionar acceso al pool

**Tablas Creadas:**
- `users` - Usuarios del sistema
- `diagrams` - Diagramas UML guardados
- `diagram_collaborators` - Colaboradores de diagramas
- `sessions` - Sesiones activas de colaboración
- `locks` - Locks de elementos (con expiración)

**Funciones:**
- `initializeDatabase()` - Inicializa conexión y crea tablas
- `getPool()` - Obtiene pool de conexiones
- `closeDatabase()` - Cierra conexiones

**Nota:** Actualmente el módulo de base de datos está configurado pero no se usa activamente en todas las rutas. Algunas funcionalidades (como persistencia de diagramas) están marcadas como TODO.

---

### 7. Types Module (`types/`)

#### `types/uml.ts` - Tipos UML Compartidos
**Interfaces:**
- `UMLAttribute` - Atributo de clase (name, type, nullable, unique, isId)
- `UMLMethod` - Método de clase (name, returnType, parameters)
- `UMLRelation` - Relación entre clases (type, target, mappedBy, joinColumn)
- `UMLClass` - Clase UML (name, attributes, methods, relations)
- `UMLDiagramJSON` - Diagrama completo (package, classes)

**Uso:** Estos tipos se usan en toda la aplicación para mantener consistencia en la estructura de datos UML.

---

## 🔄 Flujos de Datos

### Flujo 1: Generar Diagrama desde Texto
```
Cliente → POST /api/ai/generate-diagram
  ↓
routes/ai.ts → generateDiagramFromText()
  ↓
ai/openaiService.ts → OpenAI API
  ↓
OpenAI → JSON con clases y relaciones
  ↓
Validación y normalización
  ↓
Cliente ← Diagrama UML JSON
```

### Flujo 2: Analizar Imagen a Diagrama
```
Cliente → POST /api/ai/image-to-diagram (multipart/form-data)
  ↓
routes/ai_image_geminis.ts → upload.single('file')
  ↓
handleImageBufferToDiagram(buffer, options)
  ↓
Guardar buffer → archivo temporal
  ↓
handleImageToDiagram(path, options)
  ↓
ImageProcessor → preprocessImage() (redimensionar, comprimir)
  ↓
geminiClient → callGemini(prompt, imagePath)
  ↓
Gemini API → JSON con clases y relaciones
  ↓
Normalizar respuesta → DiagramModel
  ↓
Limpiar archivos temporales
  ↓
Cliente ← Diagrama + Metadata
```

### Flujo 3: Generar Proyecto Spring Boot
```
Cliente → POST /api/generator/spring (UML JSON)
  ↓
routes/generator.ts → generateSpringBootProject()
  ↓
generator/springBootGenerator.ts:
  1. Crear estructura de directorios
  2. Generar pom.xml
  3. Generar Application.java
  4. Generar application.properties
  5. Para cada clase:
     - Generar Entity
     - Generar DTOs (Request/Response)
     - Generar Repository
     - Generar Service (interface + impl)
     - Generar Controller
  6. Generar Postman collection
  7. Crear ZIP en memoria
  8. Limpiar temporales
  ↓
Cliente ← ZIP file (application/zip)
```

### Flujo 4: Colaboración en Tiempo Real
```
Cliente 1 → socket.emit('diagram:join', { diagramId })
  ↓
socketHandlers.ts → Crea/obtiene room
  ↓
Agrega usuario al room
  ↓
Emite 'diagram:user-joined' a todos en room
  ↓
Cliente 2 ← Recibe 'diagram:user-joined'
  ↓
Cliente 1 → socket.emit('diagram:update', { diagramId, diagramData })
  ↓
socketHandlers.ts → Actualiza diagramData en room
  ↓
Emite 'diagram:update' a todos excepto Cliente 1
  ↓
Cliente 2 ← Recibe 'diagram:update' → Actualiza UI
```

---

## 🎨 Patrones de Diseño

### 1. **Facade Pattern**
- `routes/index.ts` - Facade para configuración de rutas
- `flutterGenerator.ts` - Facade para generador Flutter

### 2. **Orchestrator Pattern**
- `ai/gemini/orchestrator.ts` - Orquesta análisis de imágenes
- `generator_flutter/orchestrator.ts` - Orquesta generación Flutter

### 3. **Builder Pattern**
- `generator_flutter/projectBuilder.ts` - Construye proyecto paso a paso
- Generadores Spring Boot construyen proyecto incrementalmente

### 4. **Template Method Pattern**
- Generadores usan templates para código (pubspec.yaml, main.dart, etc.)

### 5. **Strategy Pattern**
- Diferentes estrategias de generación (Spring Boot vs Flutter)
- Diferentes estrategias de IA (OpenAI vs Gemini)

### 6. **Observer Pattern**
- Socket.io para colaboración en tiempo real (pub/sub)

### 7. **Repository Pattern** (implícito)
- Generadores Spring Boot crean repositorios JPA
- Estructura preparada para patrón Repository

---

## 🔗 Interacciones entre Componentes

### Diagrama de Dependencias
```
index.ts
  ├── routes/index.ts
  │   ├── routes/ai.ts ────────→ ai/openaiService.ts
  │   │                              ├── OpenAI API
  │   │                              └── ai/applyUMLActions.ts
  │   ├── routes/ai_image_geminis.ts → ai/gemini/orchestrator.ts
  │   │                                    ├── ai/gemini/geminiClient.ts → Gemini API
  │   │                                    └── ai/gemini/ImageProcessor.ts
  │   └── routes/generator.ts
  │       ├── generator/springBootGenerator.ts
  │       └── generator_flutter/flutterGenerator.ts
  │           └── generator_flutter/orchestrator.ts
  │               └── generator_flutter/projectBuilder.ts
  ├── collaboration/socketHandlers.ts
  └── db/connection.ts → PostgreSQL
```

### Flujos de Interacción

**1. AI Services:**
- `openaiService.ts` es independiente (solo llama a OpenAI)
- `gemini/` es un módulo autocontenido
- `applyUMLActions.ts` es una utilidad pura (sin dependencias externas)

**2. Generators:**
- `springBootGenerator.ts` es independiente
- `generator_flutter/` es un módulo autocontenido con múltiples subcomponentes

**3. Collaboration:**
- `socketHandlers.ts` es independiente (solo usa Socket.io)
- No depende de otros módulos del servidor

**4. Database:**
- `connection.ts` es independiente
- Actualmente no se usa activamente en todas las rutas

---

## ⚙️ Dependencias y Configuración

### Variables de Entorno Requeridas
```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/umltool

# IA - OpenAI
OPENAI_API_KEY=sk-...

# IA - Gemini (alternativa)
GEMINI_API_KEY=AIza...
GOOGLE_API_KEY=AIza...  # Alias de GEMINI_API_KEY
GEMINI_MODEL=gemini-1.5-pro-latest  # Opcional
GEMINI_API_VERSION=v1beta  # Opcional

# Servidor
PORT=3001
NODE_ENV=development|production
CORS_ORIGIN=http://localhost:5173
```

### Dependencias Principales
- **Express** - Framework web
- **Socket.io** - WebSockets para colaboración
- **pg** - Cliente PostgreSQL
- **openai** - Cliente OpenAI
- **axios** - Cliente HTTP (para Gemini)
- **archiver** - Creación de ZIPs
- **multer** - Upload de archivos (opcional)
- **dotenv** - Variables de entorno
- **helmet** - Seguridad HTTP
- **cors** - CORS
- **morgan** - Logging HTTP

---

## 📊 Resumen de Funcionalidades

### ✅ Implementado
- ✅ Generación de diagramas UML desde texto (OpenAI)
- ✅ Análisis de imágenes a diagramas UML (Gemini)
- ✅ Generación de proyectos Spring Boot completos
- ✅ Generación de aplicaciones Flutter completas
- ✅ Colaboración en tiempo real (Socket.io)
- ✅ Sugerencias de IA para diagramas
- ✅ Modificación de diagramas con IA
- ✅ Aplicación de acciones UML

### 🚧 Parcialmente Implementado
- ⚠️ Persistencia de diagramas (estructura DB lista, pero no se usa en todas las rutas)
- ⚠️ Autenticación de usuarios (tablas creadas, pero no implementado)

### 📝 Mejoras Futuras Sugeridas
- [ ] Integrar persistencia de diagramas en todas las rutas
- [ ] Implementar autenticación y autorización
- [ ] Cache de respuestas de IA
- [ ] Validación más robusta de diagramas UML
- [ ] Soporte para más tipos de diagramas UML
- [ ] Exportación a otros formatos (PlantUML, Mermaid)
- [ ] Historial de cambios y versionado
- [ ] Tests unitarios y de integración

---

## 🔍 Puntos Clave para Optimización

1. **Gestión de Archivos Temporales:**
   - Los archivos temporales se crean en `tmp/` y `temp/`
   - Se limpian después de procesar, pero podría mejorarse con un job de limpieza periódica

2. **Manejo de Errores:**
   - Todos los módulos tienen manejo de errores, pero algunos podrían ser más específicos
   - Los fallbacks mock son útiles para desarrollo, pero deberían deshabilitarse en producción

3. **Validación de Entrada:**
   - La validación es básica en algunas rutas
   - Se recomienda usar una librería de validación (Zod, Joi) para validación más robusta

4. **Performance:**
   - La generación de proyectos puede ser lenta para diagramas grandes
   - Considerar procesamiento asíncrono con colas (Bull, RabbitMQ)

5. **Seguridad:**
   - Validar y sanitizar todas las entradas
   - Implementar rate limiting
   - Validar archivos subidos (tipo, tamaño)

---

*Documento generado el: $(date)*
*Última actualización: Análisis completo de la carpeta `server/src`*

