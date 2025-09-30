import { Router } from 'express';
import { generateSpringBootProject } from '../generator/springBootGenerator';

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

export { router as generatorRoutes };

