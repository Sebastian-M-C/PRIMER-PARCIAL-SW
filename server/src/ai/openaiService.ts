import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno antes de usar process.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Verificar si la variable de entorno está cargada
console.log('OPENAI_API_KEY está cargada:', !!process.env.OPENAI_API_KEY);

// Validar que la API key existe
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY environment variable is missing or empty');
  console.error('Please make sure you have a .env file in the server directory with:');
  console.error('OPENAI_API_KEY=sk-your-actual-api-key-here');
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// Inicializar el cliente OpenAI con la API key explícitamente
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('✅ OpenAI client initialized successfully');

// Prompt de sistema para generación de diagramas completos
const DIAGRAM_SYSTEM_PROMPT = `Eres un experto en diseño UML y arquitectura de software. Tu tarea es convertir descripciones en lenguaje natural a diagramas UML completos con múltiples clases y sus relaciones.

INSTRUCCIONES CRÍTICAS:
- Responde ÚNICAMENTE en español
- Analiza la descripción del usuario y extrae todas las clases mencionadas
- Identifica las relaciones entre las clases usando los tipos apropiados
- Genera atributos apropiados para cada clase basándote en el contexto
- Incluye métodos comunes (guardar, buscar, eliminar) para cada clase
- Usa tipos Java apropiados (String, Long, Integer, Boolean, LocalDateTime, BigDecimal)
- Nombres en camelCase para atributos y métodos, PascalCase para clases
- Siempre incluye un campo 'id' como clave primaria en cada clase
- Para relaciones, genera IDs únicos y etiquetas descriptivas

TIPOS DE RELACIONES UML SOPORTADAS:
1. ONE_TO_ONE: Relación uno a uno (ej: Usuario tiene un Perfil)
2. ONE_TO_MANY: Relación uno a muchos (ej: Usuario tiene muchos Pedidos)
3. MANY_TO_ONE: Relación muchos a uno (ej: Pedidos pertenecen a un Usuario)
4. MANY_TO_MANY: Relación muchos a muchos (ej: Estudiantes tienen muchos Cursos, Cursos tienen muchos Estudiantes)
5. INHERITANCE: Herencia (ej: Empleado extiende de Persona, usa cuando una clase "es un tipo de" otra)
6. COMPOSITION: Composición (ej: Casa contiene Habitaciones, usa cuando una clase "contiene" otra y la parte no puede existir sin el todo)
7. AGGREGATION: Agregación (ej: Universidad tiene Estudiantes, usa cuando una clase "tiene" otra pero la parte puede existir independientemente)

CUANDO USAR CADA TIPO:
- INHERITANCE: Cuando una clase "es un tipo de" otra (relación is-a)
- COMPOSITION: Cuando una clase "contiene" otra y la parte no puede existir sin el todo (relación parte-todo fuerte)
- AGGREGATION: Cuando una clase "tiene" otra pero la parte puede existir independientemente (relación parte-todo débil)
- MANY_TO_MANY: Cuando múltiples instancias de una clase se relacionan con múltiples instancias de otra

FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON válido que siga exactamente esta estructura:
{
  "classes": [
    {
      "name": "NombreClase",
      "attributes": [
        {
          "name": "nombreAtributo",
          "type": "String|Long|Integer|Boolean|LocalDateTime|BigDecimal",
          "nullable": false,
          "unique": false,
          "isId": false
        }
      ],
      "methods": [
        {
          "name": "nombreMetodo",
          "returnType": "String|void|NombreClase",
          "parameters": [
            {
              "name": "nombreParametro",
              "type": "String"
            }
          ]
        }
      ]
    }
  ],
  "relations": [
    {
      "id": "relacion_1",
      "source": "ClaseOrigen",
      "target": "ClaseDestino",
      "type": "ONE_TO_ONE|ONE_TO_MANY|MANY_TO_ONE|MANY_TO_MANY|INHERITANCE|COMPOSITION|AGGREGATION",
      "sourceCardinality": "1|*|0..1|1..*",
      "targetCardinality": "1|*|0..1|1..*",
      "sourceLabel": "etiqueta origen (opcional)",
      "targetLabel": "etiqueta destino (opcional)",
      "mappedBy": "campoMapeado (opcional, para JPA)",
      "joinColumn": "columna_union (opcional, para JPA)",
      "label": "Etiqueta descriptiva (opcional)"
    }
  ]
}

CAMPOS OBLIGATORIOS PARA RELACIONES:
- id: Identificador único de la relación
- source: Nombre de la clase origen
- target: Nombre de la clase destino
- type: Tipo de relación (debe ser uno de los 7 tipos soportados)
- sourceCardinality: Cardinalidad en el origen (ej: "1", "*", "0..1", "1..*")
- targetCardinality: Cardinalidad en el destino (ej: "1", "*", "0..1", "1..*")

NO incluyas texto adicional, explicaciones o comentarios. Solo el JSON válido.`;

// Prompt de sistema para MODIFICAR un diagrama existente (contexto-aware)
const MODIFY_SYSTEM_PROMPT = `Eres un experto en diseño UML y arquitectura de software.
Tu tarea es LEER el diagrama UML actual y la instrucción del usuario, y devolver una lista de ACCIONES
para crear, actualizar, renombrar o eliminar elementos existentes sin duplicarlos innecesariamente.

REQUISITOS CLAVE:
- Responde ÚNICAMENTE en español.
- Si la clase/relación ya existe, MODIFICA en lugar de crear duplicados.
- Mantén convenciones: PascalCase para clases, camelCase para atributos/métodos.
- Campos comunes: agregar id (Long, isId: true) si corresponde; respetar tipos Java (String, Long, Integer, Boolean, LocalDateTime, BigDecimal).
- Todas las salidas deben ser ACCIONES discretas.

TIPOS DE RELACIONES UML SOPORTADAS:
1. ONE_TO_ONE: Relación uno a uno (ej: Usuario tiene un Perfil)
2. ONE_TO_MANY: Relación uno a muchos (ej: Usuario tiene muchos Pedidos)
3. MANY_TO_ONE: Relación muchos a uno (ej: Pedidos pertenecen a un Usuario)
4. MANY_TO_MANY: Relación muchos a muchos (ej: Estudiantes tienen muchos Cursos, Cursos tienen muchos Estudiantes)
5. INHERITANCE: Herencia (ej: Empleado extiende de Persona, usa "extiende", "hereda", "es un")
6. COMPOSITION: Composición (ej: Casa contiene Habitaciones, usa "contiene", "compone", "parte de")
7. AGGREGATION: Agregación (ej: Universidad tiene Estudiantes, usa "tiene", "agrega", "incluye")

CUANDO USAR CADA TIPO:
- INHERITANCE: Cuando una clase "es un tipo de" otra (relación is-a)
- COMPOSITION: Cuando una clase "contiene" otra y la parte no puede existir sin el todo (relación parte-todo fuerte)
- AGGREGATION: Cuando una clase "tiene" otra pero la parte puede existir independientemente (relación parte-todo débil)
- MANY_TO_MANY: Cuando múltiples instancias de una clase se relacionan con múltiples instancias de otra

FORMATO DE RESPUESTA (JSON válido):
{
  "actions": [
    {
      "type": "CREATE_CLASS|UPDATE_CLASS|DELETE_CLASS|RENAME_CLASS|ADD_ATTRIBUTE|UPDATE_ATTRIBUTE|DELETE_ATTRIBUTE|ADD_METHOD|UPDATE_METHOD|DELETE_METHOD|CREATE_RELATION|UPDATE_RELATION|DELETE_RELATION",
      "target": {
        "className": "NombreClase",
        "newClassName": "NuevoNombreClase",
        "relationId": "relacion_1",
        "sourceClassName": "ClaseOrigen",
        "targetClassName": "ClaseDestino",
        "attributeName": "nombreAtributo",
        "newAttributeName": "nuevoNombreAtributo",
        "methodName": "nombreMetodo",
        "newMethodName": "nuevoNombreMetodo"
      },
      "payload": {
        "type": "ONE_TO_ONE|ONE_TO_MANY|MANY_TO_ONE|MANY_TO_MANY|INHERITANCE|COMPOSITION|AGGREGATION",
        "source": "ClaseOrigen",
        "target": "ClaseDestino",
        "sourceCardinality": "1|*|0..1|1..*",
        "targetCardinality": "1|*|0..1|1..*",
        "mappedBy": "nombreCampo (opcional, para JPA)",
        "joinColumn": "nombre_columna (opcional, para JPA)",
        "label": "Etiqueta descriptiva (opcional)"
      },
      "reason": "Explicación breve de por qué se toma esta acción"
    }
  ]
}

CAMPOS OBLIGATORIOS PARA CREATE_RELATION:
- type: Tipo de relación (debe ser uno de los 7 tipos soportados)
- source: Nombre de la clase origen
- target: Nombre de la clase destino
- sourceCardinality: Cardinalidad en el origen (ej: "1", "*", "0..1", "1..*")
- targetCardinality: Cardinalidad en el destino (ej: "1", "*", "0..1", "1..*")

CAMPOS OPCIONALES PARA CREATE_RELATION:
- mappedBy: Campo que mapea la relación (para JPA)
- joinColumn: Nombre de columna de unión (para JPA)
- label: Etiqueta descriptiva de la relación

DETECCIÓN Y TIPADO DE ATRIBUTOS:
- **IMPORTANTE**: Siempre detecta e infiere el tipo de dato correcto para los atributos basándote en el nombre y contexto.
- Tipos comunes de Java: String, Long, Integer, Double, BigDecimal, Boolean, LocalDateTime, Date.
- Si el usuario dice "añade email" → infiere tipo String (ej: { name: "email", type: "String" }).
- Si el usuario dice "añade edad" o "añade cantidad" → infiere tipo Long o Integer (ej: { name: "edad", type: "Long" }).
- Si el usuario dice "añade precio" o "añade total" → infiere tipo BigDecimal o Double (ej: { name: "precio", type: "BigDecimal" }).
- Si el usuario dice "añade activo" o "añade esActivo" → infiere tipo Boolean (ej: { name: "activo", type: "Boolean" }).
- Si el usuario dice "añade fecha" o "añade createdAt" → infiere tipo LocalDateTime (ej: { name: "fechaCreacion", type: "LocalDateTime" }).
- Si el usuario especifica el tipo explícitamente (ej: "añade email:String"), usa ese tipo.
- Si el atributo es "id" o termina en "Id", usa tipo Long con isId: true.
- Para atributos que referencian otras clases, usa el nombre de la clase como tipo (ej: { name: "usuario", type: "Usuario" }).

FORMATO DE ATRIBUTOS EN PAYLOAD:
Para ADD_ATTRIBUTE y UPDATE_ATTRIBUTE, el payload debe ser un objeto con esta estructura:
{
  "name": "nombreAtributo",
  "type": "String|Long|Integer|Double|BigDecimal|Boolean|LocalDateTime|Date|NombreClase",
  "nullable": false,
  "unique": false,
  "isId": false
}

INSTRUCCIONES DE DECISIÓN:
- Si el usuario dice "añade atributo X a la clase Y" y la clase Y existe, devuelve ADD_ATTRIBUTE con el tipo inferido.
- Si el atributo existe, usa UPDATE_ATTRIBUTE para actualizarlo (puede cambiar nombre, tipo, o ambos).
- Si se pide renombrar atributo, usa UPDATE_ATTRIBUTE con newAttributeName en target y el nuevo nombre en payload.name.
- Si se pide cambiar el tipo de un atributo, usa UPDATE_ATTRIBUTE con el nuevo tipo en payload.type.
- Si se pide eliminar, usa la acción DELETE_* correspondiente.
- Si se pide una nueva relación entre clases existentes, usa CREATE_RELATION con el tipo apropiado.
- Si el usuario dice "extiende", "hereda", "es un" → usa INHERITANCE.
- Si el usuario dice "contiene", "compone", "parte de" (relación fuerte) → usa COMPOSITION.
- Si el usuario dice "tiene", "agrega", "incluye" (relación débil) → usa AGGREGATION.
- Si el usuario dice "muchos a muchos" o describe relación bidireccional múltiple → usa MANY_TO_MANY.
- Si las clases no existen y es necesario, crea primero con CREATE_CLASS y luego la relación.

NO incluyas texto adicional ni comentarios fuera del JSON.`;

export interface AISuggestion {
  type: 'attribute' | 'method' | 'relation' | 'normalization' | 'naming';
  title: string;
  description: string;
  suggestion: any;
  priority: 'low' | 'medium' | 'high';
}

export interface GeneratedUMLClass {
  name: string;
  attributes: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    unique?: boolean;
    isId?: boolean;
  }>;
  methods: Array<{
    name: string;
    returnType: string;
    parameters: Array<{ name: string; type: string }>;
  }>;
  relations: Array<{
    type: string;
    target: string;
    mappedBy?: string;
    joinColumn?: string;
  }>;
}

export interface UMLDiagramResponse {
  classes: Array<{
    name: string;
    attributes: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      unique?: boolean;
      isId?: boolean;
    }>;
    methods: Array<{
      name: string;
      returnType: string;
      parameters: Array<{ name: string; type: string }>;
    }>;
  }>;
  relations: Array<{
    id: string;
    source: string;
    target: string;
    type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY' | 'INHERITANCE' | 'COMPOSITION' | 'AGGREGATION';
    sourceCardinality?: string;
    targetCardinality?: string;
    sourceLabel?: string;
    targetLabel?: string;
    mappedBy?: string;
    joinColumn?: string;
    label?: string;
  }>;
}

// Acciones para modificar un diagrama existente de forma consciente del contexto
export type UMLActionType =
  | 'CREATE_CLASS'
  | 'UPDATE_CLASS'
  | 'DELETE_CLASS'
  | 'RENAME_CLASS'
  | 'ADD_ATTRIBUTE'
  | 'UPDATE_ATTRIBUTE'
  | 'DELETE_ATTRIBUTE'
  | 'ADD_METHOD'
  | 'UPDATE_METHOD'
  | 'DELETE_METHOD'
  | 'CREATE_RELATION'
  | 'UPDATE_RELATION'
  | 'DELETE_RELATION';

export interface UMLActionTarget {
  className?: string;
  newClassName?: string; // para RENAME_CLASS
  relationId?: string;
  sourceClassName?: string;
  targetClassName?: string;
  attributeName?: string;
  newAttributeName?: string; // para renombrar atributo
  methodName?: string;
  newMethodName?: string; // para renombrar método
}

export interface UMLAction {
  type: UMLActionType;
  target?: UMLActionTarget;
  // payload contendrá el objeto completo que se debe crear/actualizar
  payload?: any;
  // razón opcional para trazabilidad
  reason?: string;
}

export interface UMLActionResponse {
  actions: UMLAction[];
}

export async function getAISuggestions(umlData: any): Promise<AISuggestion[]> {
  try {
    const prompt = `
Analiza el siguiente diagrama UML y proporciona sugerencias de mejora:

Datos UML:
${JSON.stringify(umlData, null, 2)}

Por favor proporciona sugerencias en las siguientes áreas:
1. Atributos faltantes (como id, timestamps, etc.)
2. Convenciones de nomenclatura (camelCase para atributos, PascalCase para clases)
3. Relaciones faltantes
4. Oportunidades de normalización
5. Métodos faltantes

INSTRUCCIONES CRÍTICAS:
- Responde ÚNICAMENTE en español
- Los títulos deben ser frases completas en español
- Las descripciones deben explicar claramente el problema y la solución
- Usa el formato exacto: "Faltan timestamps: La clase 'NombreClase' debería incluir los campos createdAt y updatedAt"
- Para relaciones: "Recomendación: La clase 'ClaseA' debería tener una relación con la clase 'ClaseB'"
- Para atributos: "Falta clave primaria: La clase 'NombreClase' debería tener un campo id como clave primaria"
- Para métodos: "Métodos faltantes: La clase 'NombreClase' debería incluir métodos para [funcionalidad específica]"

Devuelve tu respuesta como un array JSON de sugerencias con esta estructura:
[
  {
    "type": "attribute|method|relation|normalization|naming",
    "title": "Título descriptivo en español",
    "description": "Descripción detallada del problema y solución en español",
    "suggestion": "El objeto de sugerencia real",
    "priority": "low|medium|high"
  }
]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Eres un experto en diseño UML. Analiza diagramas UML y proporciona sugerencias constructivas de mejora. OBLIGATORIO: Responde ÚNICAMENTE en español. Todos los títulos, descripciones y sugerencias deben estar en español. Usa frases completas y descriptivas. Responde con JSON válido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    return getMockSuggestions(umlData);
  }
}

export async function generateFromText(text: string): Promise<GeneratedUMLClass> {
  try {
    const prompt = `
Convierte la siguiente descripción en lenguaje natural a una definición de clase UML:

Descripción: "${text}"

IMPORTANTE: Responde SIEMPRE en español. Todos los nombres de clases, atributos y métodos deben estar en español.

Devuelve un objeto JSON con esta estructura:
{
  "name": "NombreClase",
  "attributes": [
    {
      "name": "nombreAtributo",
      "type": "String|Long|Integer|Boolean|LocalDateTime|BigDecimal",
      "nullable": false,
      "unique": false,
      "isId": false
    }
  ],
  "methods": [
    {
      "name": "nombreMetodo",
      "returnType": "String|void|NombreClase",
      "parameters": [
        {
          "name": "nombreParametro",
          "type": "String"
        }
      ]
    }
  ],
  "relations": [
    {
      "type": "ONE_TO_ONE|ONE_TO_MANY|MANY_TO_ONE|MANY_TO_MANY",
      "target": "ClaseRelacionada",
      "mappedBy": "nombreCampo",
      "joinColumn": "nombre_columna"
    }
  ]
}

Pautas:
- Usa tipos Java apropiados
- Incluye un campo id con isId: true para la clave primaria
- Usa camelCase para atributos y métodos
- Usa PascalCase para nombres de clases
- Incluye métodos comunes como guardar(), buscarPorId(), etc.
- Agrega relaciones apropiadas si se mencionan
- NOMBRES EN ESPAÑOL: Si la descripción está en español, usa nombres en español
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Eres un experto en diseño UML. Convierte descripciones en lenguaje natural a definiciones de clases UML apropiadas. SIEMPRE responde en español y con JSON válido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating from text:', error);
    return getMockGeneratedClass(text);
  }
}

export async function generateDiagramFromText(text: string): Promise<UMLDiagramResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: DIAGRAM_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsedResponse = JSON.parse(response);
    
    // Validar que la respuesta tenga la estructura esperada
    if (!parsedResponse.classes || !Array.isArray(parsedResponse.classes)) {
      throw new Error('Invalid response structure: missing classes array');
    }
    
    if (!parsedResponse.relations || !Array.isArray(parsedResponse.relations)) {
      parsedResponse.relations = [];
    }

    return parsedResponse as UMLDiagramResponse;
  } catch (error) {
    console.error('Error generating diagram from text:', error);
    return getMockDiagramResponse(text);
  }
}

export async function modifyDiagramFromText(currentDiagram: any, text: string): Promise<UMLActionResponse> {
  try {
    const userPrompt = `DIAGRAMA ACTUAL (JSON):\n${JSON.stringify(currentDiagram, null, 2)}\n\nINSTRUCCIÓN DEL USUARIO:\n${text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: MODIFY_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    if (!parsed.actions || !Array.isArray(parsed.actions)) {
      throw new Error('Invalid response structure: missing actions array');
    }

    return parsed as UMLActionResponse;
  } catch (error) {
    console.error('Error modifying diagram from text:', error);
    return getMockModificationActions(currentDiagram, text);
  }
}

function getMockSuggestions(umlData: any): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Check for missing ID fields
  umlData.classes?.forEach((cls: any) => {
    const hasId = cls.attributes?.some((attr: any) => attr.isId);
      if (!hasId) {
      suggestions.push({
        type: 'attribute',
        title: 'Missing Primary Key',
        description: `La clase "${cls.name}" debería tener un campo clave primaria (id)`,
        suggestion: {
          name: 'id',
          type: 'Long',
          isId: true
        },
        priority: 'high'
      });
    }
  });

  // Check for missing timestamps
  umlData.classes?.forEach((cls: any) => {
    const hasTimestamps = cls.attributes?.some((attr: any) => 
      attr.name === 'createdAt' || attr.name === 'updatedAt'
    );
    if (!hasTimestamps) {
      suggestions.push({
        type: 'attribute',
        title: 'Missing Timestamps',
        description: `La clase "${cls.name}" podría beneficiarse de los campos createdAt y updatedAt`,
        suggestion: [
          { name: 'createdAt', type: 'LocalDateTime', nullable: false },
          { name: 'updatedAt', type: 'LocalDateTime', nullable: false }
        ],
        priority: 'medium'
      });
    }
  });

  // Check naming conventions
  umlData.classes?.forEach((cls: any) => {
    cls.attributes?.forEach((attr: any) => {
      if (attr.name !== attr.name.charAt(0).toLowerCase() + attr.name.slice(1)) {
        suggestions.push({
          type: 'naming',
          title: 'Naming Convention',
          description: `El atributo "${attr.name}" debería estar en camelCase`,
          suggestion: {
            oldName: attr.name,
            newName: attr.name.charAt(0).toLowerCase() + attr.name.slice(1)
          },
          priority: 'low'
        });
      }
    });
  });

  return suggestions;
}

function getMockGeneratedClass(text: string): GeneratedUMLClass {
  // Simple mock implementation
  const words = text.toLowerCase().split(' ');
  const className = words.find(word => word.includes('class') || word.includes('entity')) || 'GeneratedClass';
  
  return {
    name: className.charAt(0).toUpperCase() + className.slice(1),
    attributes: [
      { name: 'id', type: 'Long', isId: true },
      { name: 'name', type: 'String', nullable: false },
      { name: 'createdAt', type: 'LocalDateTime', nullable: false },
      { name: 'updatedAt', type: 'LocalDateTime', nullable: false }
    ],
    methods: [
      { name: 'save', returnType: 'void', parameters: [] },
      { name: 'findById', returnType: className, parameters: [{ name: 'id', type: 'Long' }] },
      { name: 'delete', returnType: 'void', parameters: [] }
    ],
    relations: []
  };
}

function getMockDiagramResponse(text: string): UMLDiagramResponse {
  // Mock implementation para diagramas completos
  const words = text.toLowerCase().split(' ');
  
  // Detectar clases mencionadas en el texto
  const classKeywords = ['usuario', 'user', 'articulo', 'article', 'producto', 'product', 'cliente', 'client', 'pedido', 'order'];
  const detectedClasses = classKeywords.filter(keyword => 
    words.some(word => word.includes(keyword))
  );
  
  // Si no se detectan clases específicas, usar clases por defecto
  const classes = detectedClasses.length > 0 ? detectedClasses : ['Usuario', 'Articulo'];
  
  const mockClasses = classes.map((className, index) => ({
    name: className.charAt(0).toUpperCase() + className.slice(1),
    attributes: [
      { name: 'id', type: 'Long', isId: true },
      { name: 'nombre', type: 'String', nullable: false },
      { name: 'createdAt', type: 'LocalDateTime', nullable: false },
      { name: 'updatedAt', type: 'LocalDateTime', nullable: false }
    ],
    methods: [
      { name: 'guardar', returnType: 'void', parameters: [] },
      { name: 'buscarPorId', returnType: className.charAt(0).toUpperCase() + className.slice(1), parameters: [{ name: 'id', type: 'Long' }] },
      { name: 'eliminar', returnType: 'void', parameters: [] }
    ]
  }));
  
  // Generar relaciones si hay múltiples clases
  const mockRelations = classes.length > 1 ? [
    {
      id: 'relacion_1',
      source: classes[0].charAt(0).toUpperCase() + classes[0].slice(1),
      target: classes[1].charAt(0).toUpperCase() + classes[1].slice(1),
      type: 'ONE_TO_MANY' as const,
      sourceLabel: 'tiene',
      targetLabel: 'pertenece',
      mappedBy: 'usuario',
      joinColumn: 'usuario_id'
    }
  ] : [];
  
  return {
    classes: mockClasses,
    relations: mockRelations
  };
}

function getMockModificationActions(currentDiagram: any, text: string): UMLActionResponse {
  const actions: UMLAction[] = [];
  const lower = (text || '').toLowerCase();

  // Heurística simple: "añade/agrega/agregar" + atributo a la clase X
  const addAttrMatch = lower.match(/(añade|agrega|agregar|add)\s+(\w+)\s+a\s+la\s+clase\s+(\w+)/);
  if (addAttrMatch) {
    const [, , attribute, classNameRaw] = addAttrMatch;
    const className = classNameRaw.charAt(0).toUpperCase() + classNameRaw.slice(1);
    const exists = currentDiagram?.classes?.some((c: any) => c.name === className);
    if (exists) {
      actions.push({
        type: 'ADD_ATTRIBUTE',
        target: { className },
        payload: { name: attribute, type: 'String', nullable: false }
      });
      return { actions };
    }
  }

  // Heurística: renombrar clase "Usuario" a "Cliente"
  const renameMatch = lower.match(/renombra(r)?\s+la\s+clase\s+(\w+)\s+a\s+(\w+)/);
  if (renameMatch) {
    const [, , fromRaw, toRaw] = renameMatch;
    const from = fromRaw.charAt(0).toUpperCase() + fromRaw.slice(1);
    const to = toRaw.charAt(0).toUpperCase() + toRaw.slice(1);
    actions.push({ type: 'RENAME_CLASS', target: { className: from, newClassName: to } });
    return { actions };
  }

  // Por defecto no hacer nada
  return { actions };
}

