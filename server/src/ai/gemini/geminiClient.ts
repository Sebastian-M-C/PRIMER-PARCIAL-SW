import dotenv from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config(); // carga .env para que process.env.GOOGLE_API_KEY esté disponible

export interface GeminiResponse {
  normalized?: any;
  raw?: any;
}

/**
 * Llamada wrapper a un endpoint LLM/Gemini.
 * - Si existe GEMINI_ENDPOINT y/o GEMINI_API_KEY en env, intenta la petición.
 * - Si no, puede usar GOOGLE_API_KEY como fallback para credenciales (no cambia la lógica del endpoint).
 * - Si no hay endpoint válido, devuelve un objeto de fallback para testing offline.
 */
export async function callGemini(opts: { prompt: string; imagePath?: string; timeoutMs?: number }): Promise<GeminiResponse> {
  const endpoint = process.env.GEMINI_ENDPOINT;
  // acepta GEMINI_API_KEY o, en su defecto, GOOGLE_API_KEY del .env
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const timeout = opts.timeoutMs ?? 30_000;

  if (!endpoint || !apiKey) {
    // Fallback: no hay endpoint/clave -> devolver prompt para debugging
    return { normalized: null, raw: { note: 'no endpoint or api key configured', usedEnv: { GEMINI_ENDPOINT: !!process.env.GEMINI_ENDPOINT, GEMINI_API_KEY: !!process.env.GEMINI_API_KEY, GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY }, prompt: opts.prompt } };
  }

  try {
    const formData: any = {
      prompt: opts.prompt,
      // additional metadata
    };

    // Si se soporta enviar imagen como base64
    if (opts.imagePath && fs.existsSync(opts.imagePath)) {
      const buf = fs.readFileSync(opts.imagePath);
      formData.image_base64 = buf.toString('base64');
      formData.image_name = path.basename(opts.imagePath);
    }

    const res = await axios.post(endpoint, formData, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout,
    });

    // Intentar normalizar respuesta conocida (ajusta según API real)
    const raw = res.data;
    // Si la API devuelve JSON estructurado en `data.normalized` lo usamos
    if (raw && raw.normalized) {
      return { normalized: raw.normalized, raw };
    }

    // Si no, intentamos parsear texto a JSON si viene en raw.text
    if (raw && raw.text) {
      try {
        const parsed = JSON.parse(raw.text);
        return { normalized: parsed, raw };
      } catch {
        return { normalized: null, raw };
      }
    }

    return { normalized: null, raw };
  } catch (err: any) {
    return { normalized: null, raw: { error: err?.toString?.() ?? String(err) } };
  }
}