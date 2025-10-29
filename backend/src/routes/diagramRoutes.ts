/**
 * Diagram routes - handle /api/generate, /api/format, /api/demo endpoints.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  generateDiagram,
  formatCode,
  getDemoData,
} from '../controllers/diagramController.js';

const router = Router();

/**
 * POST /api/generate
 * Generate diagram code from a natural-language prompt using Ollama.
 *
 * Request body:
 *   {
 *     prompt: string,
 *     diagramType: "mermaid" | "plantuml" | "dbml" | "graphviz"
 *   }
 */
router.post(
  '/generate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await generateDiagram(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/format
 * Format/pretty-print diagram code.
 *
 * Request body:
 *   {
 *     code: string,
 *     language: "mermaid" | "plantuml" | "dbml" | "graphviz" | "plain"
 *   }
 */
router.post(
  '/format',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await formatCode(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/demo
 * Get sample diagrams for each supported type.
 */
router.get(
  '/demo',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getDemoData(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
