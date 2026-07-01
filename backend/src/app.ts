/**
 * Express application setup with middleware and route configuration.
 */

import express, { Express } from 'express';
import cors from 'cors';
import diagramRoutes from './routes/diagramRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { checkPrimaryAIHealth, getAvailableModelInfo } from './services/aiRoutingService.js';
import { checkVLMHealth } from './services/visualValidationService.js';

const app: Express = express();
const HEALTH_CACHE_TTL_MS = (process.env.AI_PROVIDER || '').toLowerCase() === 'groq'
  ? 30 * 60 * 1000
  : 15_000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware — skip noisy health-check polls
app.use((req, res, next) => {
  if (req.path !== '/api/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ── Health check cache — avoids hammering providers on every browser poll
let healthCache: { result: Record<string, unknown>; expiresAt: number } | null = null;
let healthInFlight: Promise<Record<string, unknown>> | null = null;

// Health check endpoint with system capabilities
app.get('/api/health', async (req, res) => {
  const now = Date.now();
  if (healthCache && now < healthCache.expiresAt) {
    res.json(healthCache.result);
    return;
  }

  if (!healthInFlight) {
    healthInFlight = (async () => {
      const primaryAIOnline = await checkPrimaryAIHealth();
      const vlm = await checkVLMHealth();
      const { config } = await getAvailableModelInfo();

      const payload = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        ollama: {
          online: primaryAIOnline,
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
      };

      healthCache = { result: payload, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS };
      return payload;
    })().finally(() => {
      healthInFlight = null;
    });
  }

  res.json(await healthInFlight);
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
