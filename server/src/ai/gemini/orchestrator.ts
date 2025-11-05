import path from 'path';
import fs from 'fs';
import { preprocessImage, PreprocessResult } from './ImageProcessor';
import { runOCR, OCRText } from './ocr';
import { parseVisionShapes, Shape } from './visionParser';
import { buildDiagram, DiagramModel } from './diagramBuilder';
import { callGemini } from './geminiClient';

export interface OrchestratorResult {
  pre?: PreprocessResult;
  ocr?: OCRText[];
  shapes?: Shape[];
  diagram: DiagramModel;
  geminiRaw?: any;
  geminiNormalized?: any;
}

/** Utils local para normalizar/mergear rects */
function iou(a: { x:number;y:number;w:number;h:number }, b: { x:number;y:number;w:number;h:number }) {
  const ax2 = a.x + a.w, ay2 = a.y + a.h;
  const bx2 = b.x + b.w, by2 = b.y + b.h;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

function mergeRects(rects: Array<{ x:number;y:number;w:number;h:number }>, threshold = 0.35) {
  const out: typeof rects = [];
  const used = new Array(rects.length).fill(false);
  for (let i = 0; i < rects.length; i++) {
    if (used[i]) continue;
    let base = { ...rects[i] };
    used[i] = true;
    for (let j = i + 1; j < rects.length; j++) {
      if (used[j]) continue;
      if (iou(base, rects[j]) > threshold) {
        const minX = Math.min(base.x, rects[j].x);
        const minY = Math.min(base.y, rects[j].y);
        const maxX = Math.max(base.x + base.w, rects[j].x + rects[j].w);
        const maxY = Math.max(base.y + base.h, rects[j].y + rects[j].h);
        base = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        used[j] = true;
      }
    }
    out.push(base);
  }
  return out;
}

/**
 * Flujo principal: preprocesa imagen, corre OCR, detecta shapes, construye diagrama
 * y opcionalmente consulta a Gemini (LLM/visión) para normalizar/interpretar.
 */
export async function handleImageToDiagram(inputPath: string): Promise<OrchestratorResult> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // 1) Preprocess image (resize/convert)
  const pre = await preprocessImage(inputPath, { maxWidth: 1600, quality: 70, format: 'jpeg' });

  // 2) OCR
  const ocrRaw = await runOCR(pre.processedPath);

  // normalize OCR: trim strings and ensure numeric bbox
  const ocr: OCRText[] = (ocrRaw || []).map(t => {
    const bbox = t.bbox ? {
      x: Math.round(t.bbox.x ?? 0),
      y: Math.round(t.bbox.y ?? 0),
      w: Math.round(t.bbox.w ?? 0),
      h: Math.round(t.bbox.h ?? 0),
    } : undefined;
    return { text: (t.text ?? '').toString().trim(), bbox };
  });

  // 3) Vision parser: detectar rects/lines/etc.
  const shapesRaw = await parseVisionShapes(pre.processedPath);

  // 3a) Normalize shapes: merge overlapping rects and filter tiny boxes
  const rects = shapesRaw
    .filter(s => s.type === 'rect' && s.bbox)
    .map(s => ({ x: Math.round(s.bbox!.x), y: Math.round(s.bbox!.y), w: Math.round(s.bbox!.w), h: Math.round(s.bbox!.h) }))
    .filter(r => r.w > 20 && r.h > 12); // filter tiny

  const mergedRects = mergeRects(rects, 0.30);

  // Recreate normalized shapes array preserving non-rect shapes (lines)
  const normalizedShapes: Shape[] = mergedRects.map(r => ({ type: 'rect', bbox: r }));
  const lines = shapesRaw.filter(s => s.type === 'line' && s.points && s.points.length >= 2);
  normalizedShapes.push(...lines);

  // 4) Asociar OCR a rects mediante heurística (mejorar matching antes de build)
  // buildDiagram already associates texts, but we ensure OCR bboxes that fall inside a rect are kept.
  // If OCR has no bbox, keep as-is.
  const ocrFiltered = ocr.map(t => {
    if (!t.bbox) return t;
    // try to nudge text bbox center if needed
    const cx = t.bbox.x + t.bbox.w / 2;
    const cy = t.bbox.y + t.bbox.h / 2;
    // if center not in any rect, try expanding search radius to include nearby rects
    const inRect = mergedRects.some(r => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h);
    if (inRect) return t;
    // nudge: if close to any rect center within 0.5 * max(w,h), keep it (so buildDiagram can still match by center)
    const close = mergedRects.some(r => {
      const rcx = r.x + r.w / 2;
      const rcy = r.y + r.h / 2;
      const d = Math.hypot(rcx - cx, rcy - cy);
      return d < Math.max(r.w, r.h) * 0.6;
    });
    return t; // keep anyway; buildDiagram uses center-in-rect check primarily
  });

  // 5) Construir diagrama heurístico localmente usando estructuras normalizadas
  // If no shapes were found, try to parse the OCR text into classes/attributes
  let diagram: DiagramModel;
  if (!normalizedShapes.length) {
    // combine OCR texts and split into lines
    const fullText = (ocrFiltered || []).map(t => t.text).join('\n\n');
    const rawLines = fullText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    const classes: Array<{ id: string; name: string; attributes: string[] }> = [];
    let current: { id: string; name: string; attributes: string[] } | null = null;

    const isProbableClassTitle = (ln: string) => {
      // uppercase words with length > 2 or words that look like "CLIENTE", "PRODUCTO", etc.
      return /^[A-ZÁÉÍÓÚÑ0-9 _-]{3,}$/.test(ln) && !/[-:]/.test(ln);
    };

    const attrMatch = (ln: string) => {
      // "- name: type" or "name: type" or "-name: type"
      const m = ln.match(/^-?\s*([\wñÑáéíóúÁÉÍÓÚ_]+)\s*:\s*([^\s].*)$/i);
      if (m) return `${m[1].trim()}: ${m[2].trim()}`;
      // fallback: line that starts with '-' keep as attribute text
      if (/^[-•]\s*/.test(ln)) return ln.replace(/^[-•]\s*/, '').trim();
      return null;
    };

    for (const ln of rawLines) {
      // skip obvious header lines
      if (/class\s+diagrama/i.test(ln)) continue;
      if (isProbableClassTitle(ln)) {
        // start new class
        current = { id: `c_blk_${classes.length + 1}`, name: ln.trim(), attributes: [] };
        classes.push(current);
        continue;
      }
      const attr = attrMatch(ln);
      if (attr && current) {
        current.attributes.push(attr);
        continue;
      }
      // If line looks like a title but not all-caps, treat as small title
      if (!current && ln.length < 30 && /^[A-Za-z][A-Za-z0-9 _]+$/.test(ln)) {
        current = { id: `c_blk_${classes.length + 1}`, name: ln.trim(), attributes: [] };
        classes.push(current);
        continue;
      }
      // otherwise if current exists and line is short, append as attribute
      if (current && ln.length < 80) {
        current.attributes.push(ln);
      }
    }

    // If nothing parsed as classes, fallback to buildDiagram with shapes (even if empty)
    if (!classes.length) {
      diagram = buildDiagram(normalizedShapes, ocrFiltered);
    } else {
      diagram = { classes: classes.map(c => ({ id: c.id, name: c.name, attributes: c.attributes })), relations: [] };
    }
  } else {
    diagram = buildDiagram(normalizedShapes, ocrFiltered);
  }
 
  // 6) Preparar prompt para LLM/Gemini (si está configurado)
  const prompt = [
    'Eres un asistente que convierte datos de visión OCR en un diagrama UML JSON.',
    'Entrada intermedia (shapes + ocr):',
    JSON.stringify({ shapes: normalizedShapes, ocr: ocrFiltered, diagram }, null, 2),
    'Devuelve JSON con la estructura: { classes: [{ id,name,attributes }], relations:[{from,to,type}] }'
  ].join('\n\n');

  // 7) Llamada a Gemini (puede devolver "normalized" o raw)
  const gemini = await callGemini({ prompt, imagePath: pre.processedPath, timeoutMs: 45_000 });

  const gemNormalized = gemini.normalized ?? null;
  const finalDiagram: DiagramModel = gemNormalized ?? diagram;

  return {
    pre,
    ocr: ocrFiltered,
    shapes: normalizedShapes,
    diagram: finalDiagram,
    geminiRaw: gemini.raw,
    geminiNormalized: gemNormalized,
  };
}