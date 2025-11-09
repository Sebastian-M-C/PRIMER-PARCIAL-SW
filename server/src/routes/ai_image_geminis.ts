import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { handleImageToDiagram, handleImageBufferToDiagram } from '../ai/gemini/orchestrator';

const router = Router();

// Configurar multer con memoryStorage (como el código del amigo)
let useMulter = false;
let upload: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const multer = require('multer');
  const storage = multer.memoryStorage();
  upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB límite
  });
  useMulter = true;
} catch (err) {
  useMulter = false;
}

/**
 * POST /api/ai/image-to-diagram
 * - multipart form: field "file" (imagen en buffer)
 * - or JSON body: { "imagePath": "/absolute/or/server/path/to/image.jpg" }
 */
router.post(
  '/image-to-diagram',
  useMulter ? upload.single('file') : (req: Request, _res: Response, next) => next(),
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      
      // Opciones opcionales (como el código del amigo)
      const language = (req.body?.lang as string) || 'es';
      const useLLM = req.body?.useLLM !== 'false'; // default true

      // Si hay archivo en buffer (multer memoryStorage)
      if (useMulter && (req as any).file && (req as any).file.buffer) {
        const file = (req as any).file;
        const imageBuffer = file.buffer;
        const imageSize = (imageBuffer.length / 1024).toFixed(2);

        console.log(`[image-to-diagram] Received image: ${file.originalname || 'unknown'}`);
        console.log(`[image-to-diagram] Image size: ${imageSize} KB`);
        console.log(`[image-to-diagram] MIME type: ${file.mimetype}`);
        console.log(`[image-to-diagram] Options: language=${language}, useLLM=${useLLM}`);

        // Usar buffer directamente
        const result = await handleImageBufferToDiagram(imageBuffer, {
          language,
          useLLM,
          mimeType: file.mimetype,
          originalName: file.originalname
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[image-to-diagram] Analysis completed in ${elapsed}s`);
        console.log(`[image-to-diagram] Result: ${result.diagram?.classes?.length || 0} classes, ${result.diagram?.relations?.length || 0} relations`);

        // Construir metadata con información de error si hay fallback
        const meta = {
          engine: result.geminiNormalized ? 'gemini' : 'fallback',
          model: result.geminiRaw?.model || 'heuristic',
          elapsed: `${elapsed}s`,
          imageSize: `${imageSize} KB`,
          language,
          useLLM,
          ...(result.geminiRaw?.error && { error: result.geminiRaw.error }),
          ...(result.geminiRaw?.status && { statusCode: result.geminiRaw.status })
        };

        // Si el motor de IA falló y estamos usando el fallback, notificarlo en la respuesta
        if (meta.engine === 'fallback' && (result.geminiRaw?.error || !result.geminiNormalized)) {
          return res.status(502).json({ 
            error: 'AI provider failed', 
            details: result.geminiRaw?.error || 'Gemini API returned no valid response',
            diagram: result.diagram, 
            meta 
          });
        }

        // Formato de respuesta similar al del amigo
        return res.json({
          diagram: result.diagram,
          meta
        });
      }

      // Fallback: usar imagePath (ruta de archivo)
      if (req.body && typeof req.body.imagePath === 'string') {
        const imagePath = req.body.imagePath;
        console.log(`[image-to-diagram] Using image path: ${imagePath}`);
        console.log(`[image-to-diagram] Options: language=${language}, useLLM=${useLLM}`);
        
        const result = await handleImageToDiagram(imagePath, { useLLM });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[image-to-diagram] Analysis completed in ${elapsed}s`);
        console.log(`[image-to-diagram] Result: ${result.diagram?.classes?.length || 0} classes, ${result.diagram?.relations?.length || 0} relations`);

        // Construir metadata con información de error si hay fallback
        const meta = {
          engine: result.geminiNormalized ? 'gemini' : 'fallback',
          model: result.geminiRaw?.model || 'heuristic',
          elapsed: `${elapsed}s`,
          language,
          useLLM,
          ...(result.geminiRaw?.error && { error: result.geminiRaw.error }),
          ...(result.geminiRaw?.status && { statusCode: result.geminiRaw.status })
        };

        // Si el motor de IA falló y estamos usando el fallback, notificarlo en la respuesta
        if (meta.engine === 'fallback' && (result.geminiRaw?.error || !result.geminiNormalized)) {
          return res.status(502).json({ 
            error: 'AI provider failed', 
            details: result.geminiRaw?.error || 'Gemini API returned no valid response',
            diagram: result.diagram, 
            meta 
          });
        }

        return res.json({
          diagram: result.diagram,
          meta
        });
      }

      return res.status(400).json({ error: 'No image provided. Use multipart form "file" or JSON { imagePath }' });
    } catch (err: any) {
      console.error('[image-to-diagram] Error processing image:', err);
      
      // Determinar código de estado apropiado
      let statusCode = 500;
      if (err?.response?.status) {
        statusCode = err.response.status;
      } else if (err?.message?.includes('API key')) {
        statusCode = 401;
      } else if (err?.message?.includes('timeout')) {
        statusCode = 504;
      }
      
      return res.status(statusCode).json({ 
        error: 'Error processing image', 
        details: err?.message || String(err),
        ...(err?.response?.data && { apiError: err.response.data })
      });
    }
  }
);

export default router;