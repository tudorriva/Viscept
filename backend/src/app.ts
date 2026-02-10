/**
 * Express application setup with middleware and route configuration.
 */

import express, { Express } from 'express';
import cors from 'cors';
import diagramRoutes from './routes/diagramRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { checkOllamaHealth, getModelConfig } from './services/ollamaService.js';
import { checkVLMHealth } from './services/visualValidationService.js';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint with system capabilities
app.get('/api/health', async (req, res) => {
  const ollamaOnline = await checkOllamaHealth();
  const vlm = await checkVLMHealth();
  const config = getModelConfig();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollama: {
      online: ollamaOnline,
      generativeModel: config.generativeModel,
      visionModel: config.visionModel,
    },
    vlm: {
      available: vlm.available,
      model: vlm.model,
    },
    pipeline: {
      maxRetries: config.maxValidationRetries,
    },
  });
});

// API Routes
app.use('/api', diagramRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Global error handler
app.use(errorHandler);

export default app;
