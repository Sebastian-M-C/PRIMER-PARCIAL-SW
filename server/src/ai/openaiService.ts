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

function getMockSuggestions(umlData: any): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Check for missing ID fields
  umlData.classes?.forEach((cls: any) => {
    const hasId = cls.attributes?.some((attr: any) => attr.isId);
    if (!hasId) {
      suggestions.push({
        type: 'attribute',
        title: 'Missing Primary Key',
        description: `Class "${cls.name}" should have a primary key field`,
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
        description: `Class "${cls.name}" could benefit from createdAt and updatedAt fields`,
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
          description: `Attribute "${attr.name}" should be in camelCase`,
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

