import { Router } from 'express';
import { generateSpringBootProject } from '../generator/springBootGenerator';
import { generateFlutterFromDiagram } from '../generator_flutter/flutterGenerator';
import path from 'path';
import fs from 'fs';

const router = Router();

router.post('/spring', async (req, res) => {
  try {
    const umlData = req.body;
    
    if (!umlData || !umlData.package || !umlData.classes) {
      return res.status(400).json({ 
        error: 'Invalid UML data. Required: package, classes' 
      });
    }

    console.log('Generating Spring Boot project for:', umlData.package);
    
    const zipBuffer = await generateSpringBootProject(umlData);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${umlData.package.replace(/\./g, '-')}-project.zip"`);
    return res.send(zipBuffer);
    
  } catch (error) {
    console.error('Error generating Spring Boot project:', error);
    return res.status(500).json({ 
      error: 'Failed to generate Spring Boot project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


/**
 * POST /api/generator/flutter
 * Body: UMLDiagramJSON
 * Response: application/zip (attachment)
 */
router.post('/flutter', async (req, res) => {
  try {
    const diagram = req.body;
    if (!diagram || !Array.isArray(diagram.classes)) {
      return res.status(400).json({ error: 'Diagrama inválido' });
    }
    const zipPath = await generateFlutterFromDiagram(diagram);
    // Asegurar que la ruta always retorna: añadimos return aquí
    return res.download(zipPath, path.basename(zipPath), (err) => {
      if (err) {
        console.error('Error sending zip:', err);
        // Si hay error al enviar, intentar responder con 500 si no se ha enviado nada
        try {
          if (!res.headersSent) res.status(500).json({ error: 'Error enviando ZIP' });
        } catch (e) { /* ignore */ }
      }
      // opcional: limpieza de ficheros temporales aquí
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error generando app Flutter' });
  }
});

export { router as generatorRoutes };

