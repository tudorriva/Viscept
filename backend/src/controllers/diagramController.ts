/**
 * Diagram controller - handles request/response for diagram endpoints.
 */

import { Request, Response } from 'express';
import { generateWithOllama } from '../services/ollamaService.js';
import { formatCode as formatCodeService } from '../services/formatterService.js';
import { getDemoData as getDemoDataService } from '../services/demoService.js';

interface GenerateRequest {
  prompt: string;
  diagramType: string;
}

interface FormatRequest {
  code: string;
  language: string;
}

/**
 * POST /api/generate - Generate diagram code from a prompt.
 */
export async function generateDiagram(req: Request, res: Response): Promise<void> {
  const { prompt, diagramType } = req.body as GenerateRequest;

  // Validate input
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt is required and must be a string' });
    return;
  }

  if (!diagramType || typeof diagramType !== 'string') {
    res.status(400).json({ error: 'diagramType is required and must be a string' });
    return;
  }

  const validTypes = ['mermaid', 'plantuml', 'dbml', 'graphviz'];
  if (!validTypes.includes(diagramType)) {
    res.status(400).json({
      error: `Invalid diagramType. Must be one of: ${validTypes.join(', ')}`,
    });
    return;
  }

  try {
    console.log(`[Controller] Generating ${diagramType} for prompt: "${prompt.substring(0, 50)}..."`);

    const result = await generateWithOllama(prompt, diagramType);

    res.json(result);
  } catch (error) {
    console.error('[Controller] Error in generateDiagram:', error);
    res.status(500).json({
      error: 'Failed to generate diagram',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/format - Format diagram code.
 */
export async function formatCode(req: Request, res: Response): Promise<void> {
  const { code, language } = req.body as FormatRequest;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'code is required and must be a string' });
    return;
  }

  if (!language || typeof language !== 'string') {
    res.status(400).json({ error: 'language is required and must be a string' });
    return;
  }

  try {
    console.log(`[Controller] Formatting ${language} code (${code.length} chars)`);

    const formatted = formatCodeService(code, language);

    res.json({
      formatted,
      language,
      originalLength: code.length,
      formattedLength: formatted.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Controller] Error in formatCode:', error);
    res.status(500).json({
      error: 'Failed to format code',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/demo - Get sample diagrams for each type.
 */
export async function getDemoData(_req: Request, res: Response): Promise<void> {
  try {
    console.log('[Controller] Serving demo data');

    const demoData = getDemoDataService();

    res.json({
      ...demoData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Controller] Error in getDemoData:', error);
    res.status(500).json({
      error: 'Failed to retrieve demo data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
