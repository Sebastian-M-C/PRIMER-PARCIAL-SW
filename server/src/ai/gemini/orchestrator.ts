import path from 'path';
import fs from 'fs';
import { preprocessImage, PreprocessResult } from './ImageProcessor';
import { callGemini } from './geminiClient';
import { v4 as uuidv4 } from 'uuid';

export interface DiagramModel {
  classes: Array<{
    id: string;
    name: string;
    attributes: string[];
  }>;
  relations: Array<{
    from?: string;
    to?: string;
    source?: string;  // Alias para from
    target?: string;  // Alias para to
    type?: string;
    sourceCardinality?: string;
    targetCardinality?: string;
  }>;
}

export interface OrchestratorResult {
  pre?: PreprocessResult;
  diagram: DiagramModel;
  geminiRaw?: any;
  geminiNormalized?: DiagramModel | null;
}

/**
 * Flujo simplificado: confía 100% en Gemini para analizar la imagen
 * Solo preprocesa la imagen (opcional) y llama a Gemini directamente
 */
export async function handleImageToDiagram(inputPath: string, options?: { useLLM?: boolean }): Promise<OrchestratorResult> {
  const useLLM = options?.useLLM !== false; // default true
  
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // 1) Preprocess image (opcional, para optimizar tamaño)
  const pre = await preprocessImage(inputPath, { maxWidth: 1600, quality: 85, format: 'jpeg' });

  // 2) Si useLLM es false, devolver diagrama vacío (fallback deshabilitado)
  if (!useLLM) {
    return {
      pre,
      diagram: { classes: [], relations: [] },
      geminiNormalized: null,
    };
  }

  // 3) Prompt mejorado para Gemini - análisis directo de la imagen
  const prompt = [
    'Eres un experto en análisis de diagramas UML de clases.',
    'Analiza esta imagen que contiene un diagrama de clases UML y extrae TODA la información.',
    '',
    'INSTRUCCIONES DETALLADAS:',
    '',
    '1. CLASES:',
    '   - Identifica TODAS las clases en el diagrama',
    '   - Para cada clase, extrae:',
    '     * El nombre completo de la clase',
    '     * TODOS los atributos (con visibilidad: +, -, #, ~)',
    '     * TODOS los métodos (con visibilidad y parámetros si están visibles)',
    '   - Si una clase tiene atributos o métodos, DEBES incluirlos todos',
    '   - Si hay una clase intermedia (join class) para relaciones muchos a muchos, inclúyela también',
    '',
    '2. RELACIONES:',
    '   - Identifica TODAS las relaciones entre clases',
    '   - Tipos de relación UML soportados:',
    '     * "INHERITANCE" o "inheritance" o "extends" para herencia (flecha con triángulo apuntando a la clase padre)',
    '     * "COMPOSITION" o "composition" para composición (diamante lleno/relleno, relación parte-todo fuerte)',
    '     * "AGGREGATION" o "aggregation" para agregación (diamante vacío, relación parte-todo débil)',
    '     * "ONE_TO_ONE" o "one_to_one" para relación uno a uno (cardinalidad 1:1)',
    '     * "ONE_TO_MANY" o "one_to_many" para relación uno a muchos (cardinalidad 1:* o 1..*)',
    '     * "MANY_TO_ONE" o "many_to_one" para relación muchos a uno (cardinalidad *:1 o *..1)',
    '     * "MANY_TO_MANY" o "many_to_many" para relación muchos a muchos (cardinalidad *:* o *..*)',
    '     * "association" como fallback para asociación simple (línea simple sin adornos)',
    '',
    '   - CARDINALIDADES:',
    '     * Observa las etiquetas de cardinalidad en los extremos de las relaciones',
    '     * Cardinalidades comunes: "1", "*", "0..1", "1..*", "0..*", "n", "m"',
    '     * Si hay cardinalidad "1" en origen y "*" en destino → ONE_TO_MANY',
    '     * Si hay cardinalidad "*" en origen y "1" en destino → MANY_TO_ONE',
    '     * Si hay cardinalidad "1" en ambos extremos → ONE_TO_ONE',
    '     * Si hay cardinalidad "*" en ambos extremos → MANY_TO_MANY',
    '',
    '   - RELACIONES MUCHOS A MUCHOS:',
    '     * Si hay una clase intermedia (join class) entre dos clases principales,',
    '       identifica las dos relaciones ONE_TO_MANY desde las clases principales hacia la clase intermedia',
    '     * Si hay una relación directa con cardinalidad *:* entre dos clases,',
    '       identifica el tipo como MANY_TO_MANY',
    '',
    '   - DIRECCIÓN:',
    '     * "from" (origen): ID de la clase origen',
    '     * "to" (destino): ID de la clase destino',
    '     * Para herencia: "from" es la clase hija, "to" es la clase padre',
    '     * Para composición/agregación: "from" es la parte, "to" es el todo',
    '',
    '3. FORMATO DE RESPUESTA:',
    '   - Devuelve SOLO un objeto JSON válido',
    '   - NO incluyas texto adicional, explicaciones ni markdown',
    '   - El JSON debe tener esta estructura exacta:',
    '',
    '{',
    '  "classes": [',
    '    {',
    '      "id": "c1",',
    '      "name": "NombreClase",',
    '      "attributes": ["+atributo1: String", "-atributo2: int", "#atributo3: boolean"]',
    '    }',
    '  ],',
    '  "relations": [',
    '    {',
    '      "from": "c1",',
    '      "to": "c2",',
    '      "type": "INHERITANCE|COMPOSITION|AGGREGATION|ONE_TO_ONE|ONE_TO_MANY|MANY_TO_ONE|MANY_TO_MANY|association",',
    '      "sourceCardinality": "1|*|0..1|1..*|0..*",',
    '      "targetCardinality": "1|*|0..1|1..*|0..*"',
    '    }',
    '  ]',
    '}',
    '',
    '4. IMPORTANTE:',
    '   - Si una clase tiene atributos visibles en la imagen, DEBES incluirlos',
    '   - Si hay relaciones visibles entre clases, DEBES incluirlas con sus tipos y cardinalidades',
    '   - Observa cuidadosamente los adornos visuales (flechas, diamantes) para determinar el tipo de relación',
    '   - Observa las etiquetas de cardinalidad para determinar ONE_TO_MANY, MANY_TO_ONE, etc.',
    '   - No inventes información que no esté en la imagen',
    '   - Sé preciso y completo',
    '',
    'Responde SOLO con el JSON, sin texto adicional.'
  ].join('\n');

  // 4) Llamada a Gemini con la imagen
  const gemini = await callGemini({ 
    prompt, 
    imagePath: pre.processedPath, 
    timeoutMs: 60_000 // 60 segundos para análisis completo
  });

  // Función para normalizar tipos de relación de Gemini a tipos estándar
  const normalizeRelationType = (type: string): string => {
    if (!type) return 'ONE_TO_MANY';
    
    const normalized = type.toUpperCase().trim();
    
    // Mapear tipos de Gemini a tipos estándar
    if (normalized.includes('INHERITANCE') || normalized.includes('EXTENDS') || normalized === 'INHERIT') {
      return 'INHERITANCE';
    }
    if (normalized.includes('COMPOSITION') || normalized.includes('COMPOSE')) {
      return 'COMPOSITION';
    }
    if (normalized.includes('AGGREGATION') || normalized.includes('AGGREGATE')) {
      return 'AGGREGATION';
    }
    if (normalized === 'ONE_TO_ONE' || normalized === '1_TO_1' || normalized === '1:1') {
      return 'ONE_TO_ONE';
    }
    if (normalized === 'ONE_TO_MANY' || normalized === '1_TO_MANY' || normalized === '1:N' || normalized === '1:*') {
      return 'ONE_TO_MANY';
    }
    if (normalized === 'MANY_TO_ONE' || normalized === 'MANY_TO_1' || normalized === 'N:1' || normalized === '*:1') {
      return 'MANY_TO_ONE';
    }
    if (normalized === 'MANY_TO_MANY' || normalized === 'MANY_TO_MANY' || normalized === 'N:M' || normalized === '*:*' || normalized === 'M:N') {
      return 'MANY_TO_MANY';
    }
    
    // Fallback: si es association, intentar determinar por cardinalidades
    if (normalized.includes('ASSOCIATION') || normalized === 'ASSOC') {
      return 'ONE_TO_MANY'; // Por defecto
    }
    
    return 'ONE_TO_MANY'; // Por defecto
  };

  // Función para normalizar cardinalidades
  const normalizeCardinality = (card: string | undefined): string => {
    if (!card) return '*';
    const normalized = card.trim();
    // Normalizar variaciones comunes
    if (normalized === 'n' || normalized === 'N' || normalized === '*' || normalized === 'many') return '*';
    if (normalized === '1' || normalized === 'one' || normalized === 'uno') return '1';
    if (normalized === '0..1' || normalized === '0-1' || normalized === '0 to 1') return '0..1';
    if (normalized === '1..*' || normalized === '1-*' || normalized === '1 to many' || normalized === '1..n') return '1..*';
    if (normalized === '0..*' || normalized === '0-*' || normalized === '0 to many' || normalized === '0..n') return '0..*';
    return normalized; // Mantener si ya está normalizada
  };

  // 5) Validar y normalizar respuesta de Gemini
  let gemNormalized: DiagramModel | null = null;
  let finalDiagram: DiagramModel = { classes: [], relations: [] };

  if (gemini.normalized) {
    // Validar estructura básica
    if (gemini.normalized.classes && Array.isArray(gemini.normalized.classes)) {
      gemNormalized = {
        classes: gemini.normalized.classes.map((c: any, index: number) => ({
          id: c.id || `c${index + 1}`,
          name: c.name || `Class${index + 1}`,
          attributes: Array.isArray(c.attributes) ? c.attributes : [],
        })),
        relations: Array.isArray(gemini.normalized.relations) 
          ? gemini.normalized.relations.map((r: any) => {
              const normalizedType = normalizeRelationType(r.type);
              const sourceCard = normalizeCardinality(r.sourceCardinality);
              const targetCard = normalizeCardinality(r.targetCardinality);
              
              // Si no hay cardinalidades pero hay tipo, inferir cardinalidades por defecto
              let finalSourceCard = sourceCard;
              let finalTargetCard = targetCard;
              
              if (sourceCard === '*' && targetCard === '*') {
                // Si ambas son *, usar las proporcionadas o inferir según tipo
                switch (normalizedType) {
                  case 'ONE_TO_ONE':
                    finalSourceCard = '1';
                    finalTargetCard = '1';
                    break;
                  case 'ONE_TO_MANY':
                    finalSourceCard = '1';
                    finalTargetCard = '*';
                    break;
                  case 'MANY_TO_ONE':
                    finalSourceCard = '*';
                    finalTargetCard = '1';
                    break;
                  case 'MANY_TO_MANY':
                    finalSourceCard = '*';
                    finalTargetCard = '*';
                    break;
                  case 'INHERITANCE':
                  case 'COMPOSITION':
                  case 'AGGREGATION':
                    finalSourceCard = '1';
                    finalTargetCard = '*';
                    break;
                }
              }
              
              return {
                from: r.from || r.fromId || r.source,
                to: r.to || r.toId || r.target,
                type: normalizedType,
                sourceCardinality: finalSourceCard,
                targetCardinality: finalTargetCard,
              };
            })
          : [],
      };
      finalDiagram = gemNormalized;
    }
  }

  // Si Gemini no devolvió un resultado válido, intentar parsear el texto crudo
  if (!gemNormalized && gemini.raw?.text) {
    try {
      let jsonText = gemini.raw.text.trim();
      // Remover markdown code blocks si existen
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      const parsed = JSON.parse(jsonText);
      if (parsed.classes && Array.isArray(parsed.classes)) {
        gemNormalized = {
          classes: parsed.classes.map((c: any, index: number) => ({
            id: c.id || `c${index + 1}`,
            name: c.name || `Class${index + 1}`,
            attributes: Array.isArray(c.attributes) ? c.attributes : [],
          })),
          relations: Array.isArray(parsed.relations) 
            ? parsed.relations.map((r: any) => {
                const normalizedType = normalizeRelationType(r.type);
                const sourceCard = normalizeCardinality(r.sourceCardinality);
                const targetCard = normalizeCardinality(r.targetCardinality);
                
                // Si no hay cardinalidades pero hay tipo, inferir cardinalidades por defecto
                let finalSourceCard = sourceCard;
                let finalTargetCard = targetCard;
                
                if (sourceCard === '*' && targetCard === '*') {
                  // Si ambas son *, usar las proporcionadas o inferir según tipo
                  switch (normalizedType) {
                    case 'ONE_TO_ONE':
                      finalSourceCard = '1';
                      finalTargetCard = '1';
                      break;
                    case 'ONE_TO_MANY':
                      finalSourceCard = '1';
                      finalTargetCard = '*';
                      break;
                    case 'MANY_TO_ONE':
                      finalSourceCard = '*';
                      finalTargetCard = '1';
                      break;
                    case 'MANY_TO_MANY':
                      finalSourceCard = '*';
                      finalTargetCard = '*';
                      break;
                    case 'INHERITANCE':
                    case 'COMPOSITION':
                    case 'AGGREGATION':
                      finalSourceCard = '1';
                      finalTargetCard = '*';
                      break;
                  }
                }
                
                return {
                  from: r.from || r.fromId || r.source,
                  to: r.to || r.toId || r.target,
                  type: normalizedType,
                  sourceCardinality: finalSourceCard,
                  targetCardinality: finalTargetCard,
                };
              })
            : [],
        };
        finalDiagram = gemNormalized;
      }
    } catch (parseErr) {
      console.warn('No se pudo parsear la respuesta de Gemini:', parseErr);
    }
  }

  return {
    pre,
    diagram: finalDiagram,
    geminiRaw: gemini.raw,
    geminiNormalized: gemNormalized,
  };
}

/**
 * Versión que acepta buffer de imagen directamente (como el código del amigo)
 */
export async function handleImageBufferToDiagram(
  imageBuffer: Buffer,
  options: {
    language?: string;
    useLLM?: boolean;
    mimeType?: string;
    originalName?: string;
  } = {}
): Promise<OrchestratorResult> {
  // Guardar buffer temporalmente en un archivo
  const tmpDir = path.join(process.cwd(), 'tmp', 'uploads');
  fs.mkdirSync(tmpDir, { recursive: true });
  
  // Determinar extensión del archivo basado en mimeType o usar .jpg por defecto
  let ext = 'jpg';
  if (options.mimeType) {
    if (options.mimeType.includes('png')) ext = 'png';
    else if (options.mimeType.includes('jpeg') || options.mimeType.includes('jpg')) ext = 'jpg';
    else if (options.mimeType.includes('webp')) ext = 'webp';
  }
  
  const tempFileName = `${uuidv4()}.${ext}`;
  const tempFilePath = path.join(tmpDir, tempFileName);
  
  try {
    // Escribir buffer a archivo temporal
    await fs.promises.writeFile(tempFilePath, imageBuffer);
    
    // Procesar con la función existente, pasando useLLM como opción
    const result = await handleImageToDiagram(tempFilePath, { useLLM: options.useLLM });
    
    return result;
  } finally {
    // Limpiar archivo temporal después de procesar
    fs.promises.unlink(tempFilePath).catch(() => {
      // Ignorar errores al eliminar archivo temporal
    });
    
    // También limpiar archivo procesado si existe
    const processedPath = tempFilePath.replace(`.${ext}`, `-processed.jpg`);
    fs.promises.unlink(processedPath).catch(() => {
      // Ignorar errores al eliminar archivo procesado
    });
  }
}