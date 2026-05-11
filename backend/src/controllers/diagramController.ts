/**
 * Diagram controller - handles request/response for diagram endpoints.
 */

import { Request, Response } from 'express';
import { generateWithOllama, correctWithOllama, modifyDiagramWithOllama, classifyDiagramTypeWithOllama, getModelConfig, listOllamaModels, checkOllamaHealth } from '../services/ollamaService.js';
import { formatCode as formatCodeService } from '../services/formatterService.js';
import { getDemoData as getDemoDataService } from '../services/demoService.js';
import { runPipeline, validateExistingDiagram, PipelineResult } from '../services/pipelineService.js';
import { checkVLMHealth } from '../services/visualValidationService.js';
import { checkRenderingCapabilities } from '../services/renderingService.js';

interface GenerateRequest {
  prompt: string;
  diagramType: string;
  enableValidation?: boolean;
  maxRetries?: number;
}

interface ValidateRequest {
  code: string;
  diagramType: string;
  originalPrompt: string;
}

interface CorrectRequest {
  code: string;
  diagramType: string;
  renderError: string;
  originalPrompt?: string;
}

interface FormatRequest {
  code: string;
  language: string;
}

/**
 * POST /api/generate - Generate diagram code from a prompt.
 * Optionally runs the full self-correction pipeline with visual validation.
 */
export async function generateDiagram(req: Request, res: Response): Promise<void> {
  const { prompt, diagramType, enableValidation = false, maxRetries } = req.body as GenerateRequest;

  console.log('[Controller] Request body:', JSON.stringify(req.body));

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
    console.log(`[Controller] Generating ${diagramType} for prompt: "${prompt.substring(0, 50)}..." (validation: ${enableValidation})`);

    if (enableValidation) {
      // Full Self-Correction Pipeline: Generate → Render → Inspect → Correct
      const result = await runPipeline(prompt, diagramType, {
        enableValidation: true,
        maxRetries: maxRetries ?? 2,
      });

      res.json({
        code: result.code,
        language: result.language,
        timestamp: result.timestamp,
        validation: result.validation,
        attempts: result.attempts,
        history: result.history,
      });
    } else {
      // Standard generation (no visual validation)
      const result = await generateWithOllama(prompt, diagramType);
      res.json(result);
    }
  } catch (error) {
    console.error('[Controller] Error in generateDiagram:', error);
    res.status(500).json({
      error: 'Failed to generate diagram',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/correct - Correct diagram code using a render error message.
 * Sends the original code + error to the AI to fix syntax issues.
 */
export async function correctDiagram(req: Request, res: Response): Promise<void> {
  const { code, diagramType, renderError, originalPrompt } = req.body as CorrectRequest;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'code is required and must be a string' });
    return;
  }
  if (!diagramType || typeof diagramType !== 'string') {
    res.status(400).json({ error: 'diagramType is required and must be a string' });
    return;
  }
  if (!renderError || typeof renderError !== 'string') {
    res.status(400).json({ error: 'renderError is required and must be a string' });
    return;
  }

  const validTypes = ['mermaid', 'plantuml', 'dbml', 'graphviz'];
  if (!validTypes.includes(diagramType)) {
    res.status(400).json({ error: `Invalid diagramType. Must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    console.log(`[Controller] Correcting ${diagramType} diagram (error: "${renderError.substring(0, 80)}...")`);

    const result = await correctWithOllama(code, diagramType, renderError, originalPrompt);
    res.json(result);
  } catch (error) {
    console.error('[Controller] Error in correctDiagram:', error);
    res.status(500).json({
      error: 'Failed to correct diagram',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/validate - Validate existing diagram code visually.
 * Renders the code to an image and sends it to the VLM for inspection.
 */
export async function validateDiagram(req: Request, res: Response): Promise<void> {
  const { code, diagramType, originalPrompt } = req.body as ValidateRequest;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'code is required and must be a string' });
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
    console.log(`[Controller] Validating ${diagramType} diagram (${code.length} chars)`);

    const result = await validateExistingDiagram(
      code,
      diagramType,
      originalPrompt || 'User diagram'
    );

    res.json(result);
  } catch (error) {
    console.error('[Controller] Error in validateDiagram:', error);
    res.status(500).json({
      error: 'Failed to validate diagram',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/models - List available Ollama models and current configuration.
 */
export async function getModels(_req: Request, res: Response): Promise<void> {
  try {
    const config = getModelConfig();
    const models = await listOllamaModels();
    const vlmHealth = await checkVLMHealth();
    const ollamaHealthy = await checkOllamaHealth();
    const renderCaps = await checkRenderingCapabilities();

    res.json({
      config,
      availableModels: models,
      ollamaOnline: ollamaHealthy,
      vlm: vlmHealth,
      renderingCapabilities: renderCaps,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Controller] Error in getModels:', error);
    res.status(500).json({
      error: 'Failed to retrieve model information',
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

// ── v2.0 Chat-Based Endpoints ──────────────────────────────────────────────────

interface ChatMessageRequest {
  chatId: string;
  message: string;
  diagramType: string;
  currentDiagramCode?: string;
  isFirstMessage: boolean;
  enableValidation?: boolean;
  maxRetries?: number;
}

/**
 * POST /api/chat/message - Process a chat message and return updated diagram.
 *
 * First message  → generates a new diagram from the prompt.
 * Follow-ups     → modifies the existing diagram based on the instruction.
 */
export async function handleChatMessage(req: Request, res: Response): Promise<void> {
  const {
    chatId,
    message,
    diagramType,
    currentDiagramCode,
    isFirstMessage,
    enableValidation = false,
    maxRetries,
  } = req.body as ChatMessageRequest;

  if (!chatId || typeof chatId !== 'string') {
    res.status(400).json({ error: 'chatId is required' });
    return;
  }
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  if (!diagramType || typeof diagramType !== 'string') {
    res.status(400).json({ error: 'diagramType is required' });
    return;
  }

  const validTypes = ['mermaid', 'plantuml', 'dbml', 'graphviz'];
  if (!validTypes.includes(diagramType)) {
    res.status(400).json({ error: `Invalid diagramType. Must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    let code: string;
    let assistantMessage: string;
    let result: PipelineResult;

    if (enableValidation) {
      // ── Use Self-Correction Pipeline (v2.0) ──────────────────────────────
      console.log(`[Controller] Chat ${chatId}: processing with pipeline (isFirst: ${isFirstMessage})`);
      
      result = await runPipeline(message, diagramType, {
        enableValidation: true,
        maxRetries: maxRetries ?? 2,
        baseCode: isFirstMessage ? undefined : currentDiagramCode,
      });
      
      code = result.code;
      assistantMessage = isFirstMessage 
        ? 'Here is your diagram. Feel free to ask me to modify it.'
        : 'I\'ve updated the diagram based on your request.';

      res.json({
        code,
        message: assistantMessage,
        language: diagramType,
        timestamp: new Date().toISOString(),
        validation: result.validation,
        attempts: result.attempts,
      });
      return;
    }

    if (isFirstMessage || !currentDiagramCode) {
      // ── Standard Generation (no pipeline) ────────────────────────────────
      console.log(`[Controller] Chat ${chatId}: first message, generating ${diagramType} diagram`);

      const genResult = await generateWithOllama(message, diagramType);
      code = genResult.code;
      assistantMessage = 'Here is your diagram. You can ask me to add, remove, or change any part of it.';
    } else {
      // ── Standard Modification (no pipeline) ──────────────────────────────
      console.log(`[Controller] Chat ${chatId}: modifying ${diagramType} diagram`);

      const modResult = await modifyDiagramWithOllama(
        currentDiagramCode,
        message,
        diagramType,
      );
      code = modResult.code;
      assistantMessage = 'I\'ve updated the diagram based on your request.';
    }

    res.json({
      code,
      message: assistantMessage,
      language: diagramType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Controller] Error in handleChatMessage:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

interface ClassifyRequest {
  prompt: string;
}

/**
 * POST /api/classify - Auto-detect the best diagram type for a user prompt.
 */
export async function handleClassifyDiagramType(req: Request, res: Response): Promise<void> {
  const { prompt } = req.body as ClassifyRequest;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  try {
    console.log(`[Controller] Classifying diagram type for: "${prompt.substring(0, 60)}..."`);
    const diagramType = await classifyDiagramTypeWithOllama(prompt);

    res.json({
      diagramType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Controller] Error in handleClassifyDiagramType:', error);
    res.status(500).json({
      error: 'Failed to classify diagram type',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
