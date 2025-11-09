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
    type?: string;
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
    '',
    '2. RELACIONES:',
    '   - Identifica TODAS las relaciones entre clases',
    '   - Tipos de relación:',
    '     * "inheritance" o "extends" para herencia (flecha con triángulo)',
    '     * "association" para asociación (línea simple)',
    '     * "aggregation" para agregación (diamante vacío)',
    '     * "composition" para composición (diamante lleno)',
    '     * "dependency" para dependencia (línea punteada)',
    '   - Incluye la dirección: "from" (origen) y "to" (destino)',
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
    '      "type": "inheritance"',
    '    }',
    '  ]',
    '}',
    '',
    '4. IMPORTANTE:',
    '   - Si una clase tiene atributos visibles en la imagen, DEBES incluirlos',
    '   - Si hay relaciones visibles entre clases, DEBES incluirlas',
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
          ? gemini.normalized.relations.map((r: any) => ({
              from: r.from || r.fromId,
              to: r.to || r.toId,
              type: r.type || 'association',
            }))
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
          relations: Array.isArray(parsed.relations) ? parsed.relations : [],
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