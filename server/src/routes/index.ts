import { Express } from 'express';
import { generatorRoutes } from './generator';
import { aiRoutes } from './ai';

export function setupRoutes(app: Express) {
  // API routes with /api prefix
  app.use('/api/generator', generatorRoutes);
  app.use('/api/ai', aiRoutes);
}

