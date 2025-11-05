import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { handleImageToDiagram } from '../ai/gemini/orchestrator';

const router = Router();

// Intentar usar multer si está disponible; si no, aceptar JSON { imagePath }
let useMulter = false;
let upload: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const multer = require('multer');
  const tmp = path.join(process.cwd(), 'tmp', 'uploads');
  fs.mkdirSync(tmp, { recursive: true });
  upload = multer({ dest: tmp });
  useMulter = true;
} catch (err) {
  useMulter = false;
}

/**
 * POST /ai/image-to-diagram
 * - multipart form: field "file"
 * - or JSON body: { "imagePath": "/absolute/or/server/path/to/image.jpg" }
 */
router.post(
  '/image-to-diagram',
  useMulter ? upload.single('file') : (req: Request, _res: Response, next) => next(),
  async (req: Request, res: Response) => {
    try {
      let imagePath: string | undefined;
      if (useMulter && (req as any).file) {
        imagePath = (req as any).file.path as string;
      } else if (req.body && typeof req.body.imagePath === 'string') {
        imagePath = req.body.imagePath;
      } else {
        return res.status(400).json({ error: 'No image provided. Use multipart form "file" or JSON { imagePath }' });
      }

      const result = await handleImageToDiagram(imagePath!);
      return res.json(result);
    } catch (err: any) {
      console.error('ai/image-to-diagram error', err);
      return res.status(500).json({ error: err?.message ?? String(err) });
    }
  }
);

export default router;