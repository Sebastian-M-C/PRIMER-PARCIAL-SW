import { Router } from 'express';
import { getAISuggestions, generateFromText, generateDiagramFromText, modifyDiagramFromText } from '../ai/openaiService';

const router = Router();

router.post('/suggest', async (req, res): Promise<void> => {
  try {
    const umlData = req.body;
    
    if (!umlData || !umlData.classes) {
      res.status(400).json({ 
        error: 'Invalid UML data. Required: classes array' 
      });
      return;
    }

    console.log('Getting AI suggestions for UML diagram');
    
    const suggestions = await getAISuggestions(umlData);
    
    res.json({ suggestions });

  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to get AI suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/from-text', async (req, res): Promise<void> => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      res.status(400).json({ 
        error: 'Invalid input. Required: text string' 
      });
      return;
    }

    console.log('Generating UML class from text:', text);
    
    const umlClass = await generateFromText(text);
    
    res.json(umlClass);

  } catch (error) {
    console.error('Error generating from text:', error);
    res.status(500).json({ 
      error: 'Failed to generate UML from text',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/generate-diagram', async (req, res): Promise<void> => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      res.status(400).json({ 
        error: 'Invalid input. Required: text string' 
      });
      return;
    }

    console.log('Generating UML diagram from text:', text);
    
    const diagramResponse = await generateDiagramFromText(text);
    
    res.json(diagramResponse);

  } catch (error) {
    console.error('Error generating diagram from text:', error);
    res.status(500).json({ 
      error: 'Failed to generate UML diagram from text',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as aiRoutes };

// Nueva ruta: modificar diagrama a partir de texto + estado actual
router.post('/modify-diagram', async (req, res): Promise<void> => {
  try {
    const { text, diagram } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ 
        error: 'Invalid input. Required: text string' 
      });
      return;
    }

    if (!diagram || typeof diagram !== 'object') {
      res.status(400).json({ 
        error: 'Invalid input. Required: diagram object' 
      });
      return;
    }

    console.log('Modifying UML diagram from text');
    const actionResponse = await modifyDiagramFromText(diagram, text);
    res.json(actionResponse);
  } catch (error) {
    console.error('Error modifying diagram from text:', error);
    res.status(500).json({ 
      error: 'Failed to modify UML diagram from text',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
