/**
 * Diagram routes - handle /api/generate, /api/format, /api/demo,
 * /api/validate, and /api/models endpoints.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  generateDiagram,
  correctDiagram,
  formatCode,
  getDemoData,
  validateDiagram,
  getModels,
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
 * POST /api/correct
 * Correct diagram code using a render error — sends the code + error to the AI.
 *
 * Request body:
 *   {
 *     code: string,
 *     diagramType: "mermaid" | "plantuml" | "dbml" | "graphviz",
 *     renderError: string,
 *     originalPrompt?: string
 *   }
 */
router.post(
  '/correct',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await correctDiagram(req, res);
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

/**
 * POST /api/validate
 * Validate existing diagram code using the Visual Judge (VLM).
 * Renders the diagram to an image and checks for visual errors.
 *
 * Request body:
 *   {
 *     code: string,
 *     diagramType: "mermaid" | "plantuml" | "dbml" | "graphviz",
 *     originalPrompt?: string
 *   }
 */
router.post(
  '/validate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await validateDiagram(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/models
 * List available models, VLM health, and rendering capabilities.
 */
router.get(
  '/models',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getModels(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
