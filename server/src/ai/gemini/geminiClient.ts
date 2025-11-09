import dotenv from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

dotenv.config(); // carga .env para que process.env.GOOGLE_API_KEY esté disponible

export interface GeminiResponse {
  normalized?: any;
  raw?: any;
}

/**
 * Llamada a la API de Gemini usando el endpoint oficial de Google.
 * - Usa GEMINI_API_KEY o GOOGLE_API_KEY del .env
 * - Soporta Gemini 1.5 Pro con visión para analizar imágenes y generar diagramas UML
 * - Si no hay API key, devuelve un objeto de fallback para testing offline.
 */
export async function callGemini(opts: { prompt: string; imagePath?: string; timeoutMs?: number }): Promise<GeminiResponse> {
  // acepta GEMINI_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY (por compatibilidad) o OPENAI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.OPENAI_API_KEY;
  const timeout = opts.timeoutMs ?? 45_000;

  if (!apiKey) {
    // Fallback: no hay clave -> devolver prompt para debugging
    return { 
      normalized: null, 
      raw: { 
        note: 'no API key configured', 
        usedEnv: { 
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY, 
          GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
        }, 
        prompt: opts.prompt 
      } 
    };
  }

  try {
    // Endpoint oficial de Gemini API
    // Usar v1beta con modelos compatibles: gemini-pro-vision o gemini-1.5-pro-latest
    // Modelos disponibles en v1beta: gemini-pro, gemini-pro-vision, gemini-1.5-pro-latest, gemini-1.5-flash-latest
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
    
    // Validar modelo
    const validModels = [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-pro-vision',
      'gemini-pro',
      'gemini-2.5-flash'
    ];
    
    const finalModelName = validModels.includes(modelName) 
      ? modelName 
      : (console.warn(`[Gemini] Modelo ${modelName} no está en la lista de modelos válidos. Usando gemini-1.5-pro-latest.`), 'gemini-1.5-pro-latest');
    
    // Soporte para URL configurable (opcional)
    const apiUrl = process.env.GEMINI_API_URL?.trim();
    let endpoint: string;
    
    if (apiUrl) {
      // Si se proporciona URL completa, usarla directamente
      endpoint = apiUrl.includes('?key=') 
        ? apiUrl.replace(/\?key=.*/, `?key=${apiKey}`)
        : `${apiUrl}?key=${apiKey}`;
      console.log(`[Gemini] Usando URL configurable: ${apiUrl}`);
    } else {
      // Construir endpoint estándar
      endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${finalModelName}:generateContent?key=${apiKey}`;
    }

    // Construir el payload según la especificación de Gemini API
    const parts: any[] = [{ text: opts.prompt }];

    // Si hay imagen, agregarla como inline_data
    if (opts.imagePath && fs.existsSync(opts.imagePath)) {
      const buf = fs.readFileSync(opts.imagePath);
      const base64Image = buf.toString('base64');
      const mimeType = mime.lookup(opts.imagePath) || 'image/jpeg';

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Image,
        },
      });
    }

    const payload = {
      contents: [{
        parts: parts,
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    };

    const res = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout,
    });

    // Procesar respuesta de Gemini
    const raw = res.data;
    
    // Extraer el texto de la respuesta
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return { normalized: null, raw };
    }

    // Intentar parsear el texto como JSON (el prompt debería pedir JSON)
    try {
      // Buscar JSON en el texto (puede venir con markdown code blocks)
      let jsonText = text.trim();
      
      // Remover markdown code blocks si existen
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      // Intentar parsear
      const parsed = JSON.parse(jsonText);
      return { normalized: parsed, raw };
    } catch (parseErr) {
      // Si no es JSON válido, devolver el texto crudo
      console.warn('Gemini response is not valid JSON, returning raw text:', parseErr);
      return { 
        normalized: null, 
        raw: { 
          text, 
          parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
          fullResponse: raw 
        } 
      };
    }
  } catch (err: any) {
    const errorMessage = err?.response?.data?.error?.message || err?.message || String(err);
    const statusCode = err?.response?.status;
    
    // Si el modelo no se encuentra (404), intentar con gemini-pro-vision como fallback
    if (statusCode === 404 && errorMessage?.includes('not found')) {
      console.warn('[Gemini] Modelo no encontrado, intentando con gemini-pro-vision como fallback...');
      try {
        const fallbackModel = 'gemini-pro-vision';
        const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
        
        // Usar URL configurable si está disponible, sino construir endpoint estándar
        const apiUrl = process.env.GEMINI_API_URL?.trim();
        const fallbackEndpoint = apiUrl
          ? apiUrl.replace(/models\/[^/]+/, `models/${fallbackModel}`).replace(/\?key=.*/, `?key=${apiKey}`)
          : `https://generativelanguage.googleapis.com/${apiVersion}/models/${fallbackModel}:generateContent?key=${apiKey}`;
        
        const parts: any[] = [{ text: opts.prompt }];
        if (opts.imagePath && fs.existsSync(opts.imagePath)) {
          const buf = fs.readFileSync(opts.imagePath);
          const base64Image = buf.toString('base64');
          const mimeType = mime.lookup(opts.imagePath) || 'image/jpeg';
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          });
        }

        const payload = {
          contents: [{ parts: parts }],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        };

        const res = await axios.post(fallbackEndpoint, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout,
        });

        const raw = res.data;
        const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          try {
            let jsonText = text.trim();
            const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) jsonText = jsonMatch[1].trim();
            const parsed = JSON.parse(jsonText);
            return { normalized: parsed, raw };
          } catch {
            return { normalized: null, raw: { text, fullResponse: raw } };
          }
        }
        return { normalized: null, raw };
      } catch (fallbackErr: any) {
        console.error('Fallback también falló:', fallbackErr?.message || fallbackErr);
      }
    }
    
    console.error('[Gemini] API error:', errorMessage);
    console.error('[Gemini] Status code:', statusCode);
    if (err?.response?.data) {
      console.error('[Gemini] Error details:', JSON.stringify(err.response.data, null, 2));
    }
    
    return { 
      normalized: null, 
      raw: { 
        error: errorMessage,
        status: statusCode,
        details: err?.response?.data,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro-latest'
      } 
    };
  }
}