/**
 * Self-Correction Loop Service — Autonomous diagram generation pipeline.
 *
 * Implements the full Generate → Render → Inspect → Auto-Correct cycle
 * described in the Viscept research paper. This service orchestrates the
 * interaction between the generative model (Qwen2.5-Coder) and the visual
 * judge (Qwen2.5-VL) to produce high-quality diagram code.
 *
 * Sequential Loading Strategy:
 *   On hardware-limited systems, Ollama manages model loading. The pipeline
 *   calls the generative model first, then (after a brief cooldown) the VLM.
 *   This avoids VRAM contention on GPUs with ≤4GB.
 */

import { generateWithOllama, OllamaResponse } from './ollamaService.js';
import { renderDiagramToImage, RenderResult } from './renderingService.js';
import {
  validateDiagramVisually,
  buildCorrectionPrompt,
  ValidationResult,
} from './visualValidationService.js';

// ── Configuration ──────────────────────────────────────────────────────────────

const MAX_RETRIES = parseInt(process.env.MAX_VALIDATION_RETRIES || '2', 10);
const COOLDOWN_MS = parseInt(process.env.MODEL_COOLDOWN_MS || '2000', 10);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PipelineResult {
  /** Final diagram code (best attempt) */
  code: string;
  /** Diagram language */
  language: string;
  /** Timestamp of completion */
  timestamp: string;
  /** Visual validation result (null if validation was skipped) */
  validation: ValidationResult | null;
  /** Number of generation attempts (1 = first try was accepted) */
  attempts: number;
  /** History of all attempts for debugging */
  history: PipelineAttempt[];
}

export interface PipelineAttempt {
  attempt: number;
  code: string;
  validation: ValidationResult | null;
  rendered: boolean;
}

export interface PipelineOptions {
  /** Enable visual validation (default: true) */
  enableValidation?: boolean;
  /** Maximum correction retries (default: MAX_RETRIES env or 2) */
  maxRetries?: number;
  /** Custom generative model override */
  model?: string;
  /** Custom VLM override */
  vlmModel?: string;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Pipeline ───────────────────────────────────────────────────────────────────

/**
 * Run the full self-correction pipeline:
 *
 * 1. Generate initial diagram code with the generative model.
 * 2. Render the code to a PNG image.
 * 3. Send the image to the VLM for visual inspection.
 * 4. If the VLM reports FAIL, build a correction prompt and re-generate.
 * 5. Repeat up to maxRetries times.
 * 6. Return the best result.
 */
export async function runPipeline(
  prompt: string,
  diagramType: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const {
    enableValidation = true,
    maxRetries = MAX_RETRIES,
  } = options;

  const history: PipelineAttempt[] = [];
  let bestCode = '';
  let bestValidation: ValidationResult | null = null;
  let currentPrompt = prompt;
  let attempts = 0;

  const maxAttempts = enableValidation ? 1 + maxRetries : 1;

  for (let i = 0; i < maxAttempts; i++) {
    attempts = i + 1;

    console.log(
      `[Pipeline] Attempt ${attempts}/${maxAttempts} for ${diagramType} diagram`
    );

    // ── Step 1: Generate ───────────────────────────────────────────────────

    let generated: OllamaResponse;
    try {
      generated = await generateWithOllama(currentPrompt, diagramType);
    } catch (error) {
      console.error(`[Pipeline] Generation failed on attempt ${attempts}:`, error);
      // If generation fails, stop the loop
      break;
    }

    bestCode = generated.code;

    // If validation is disabled, return immediately
    if (!enableValidation) {
      history.push({
        attempt: attempts,
        code: bestCode,
        validation: null,
        rendered: false,
      });

      return {
        code: bestCode,
        language: diagramType,
        timestamp: new Date().toISOString(),
        validation: null,
        attempts,
        history,
      };
    }

    // ── Step 2: Render to PNG ──────────────────────────────────────────────

    let renderResult: RenderResult;
    try {
      // Brief cooldown to let Ollama release the generative model from VRAM
      // (Sequential Loading Strategy for hardware-limited systems)
      await sleep(COOLDOWN_MS);

      renderResult = await renderDiagramToImage(bestCode, diagramType);
    } catch (error) {
      console.warn(`[Pipeline] Rendering failed on attempt ${attempts}:`, error);
      history.push({
        attempt: attempts,
        code: bestCode,
        validation: null,
        rendered: false,
      });
      // Can't render → can't validate → return what we have
      break;
    }

    // ── Step 3: Visual Inspection ──────────────────────────────────────────

    let validation: ValidationResult;
    try {
      validation = await validateDiagramVisually({
        imageBase64: renderResult.imageBase64,
        diagramType,
        originalPrompt: prompt,
        diagramCode: bestCode,
      });
    } catch (error) {
      console.warn(`[Pipeline] Validation failed on attempt ${attempts}:`, error);
      history.push({
        attempt: attempts,
        code: bestCode,
        validation: null,
        rendered: true,
      });
      break;
    }

    bestValidation = validation;

    history.push({
      attempt: attempts,
      code: bestCode,
      validation,
      rendered: true,
    });

    console.log(
      `[Pipeline] Attempt ${attempts}: ${validation.status} (confidence: ${validation.confidence}) — ${validation.reason}`
    );

    // ── Step 4: Check if PASS or stop ──────────────────────────────────────

    if (validation.status === 'PASS') {
      console.log(`[Pipeline] Diagram PASSED visual validation on attempt ${attempts}`);
      break;
    }

    if (validation.status === 'ERROR') {
      console.log(`[Pipeline] VLM error — skipping further validation`);
      break;
    }

    // ── Step 5: Build correction prompt for next attempt ───────────────────

    if (i < maxAttempts - 1) {
      currentPrompt = buildCorrectionPrompt(
        prompt,
        bestCode,
        diagramType,
        validation
      );
      console.log(`[Pipeline] Sending correction prompt for retry...`);
    }
  }

  return {
    code: bestCode,
    language: diagramType,
    timestamp: new Date().toISOString(),
    validation: bestValidation,
    attempts,
    history,
  };
}

/**
 * Run a standalone validation on existing diagram code (for the "Check Diagram"
 * button in the frontend).
 */
export async function validateExistingDiagram(
  code: string,
  diagramType: string,
  originalPrompt: string
): Promise<ValidationResult> {
  try {
    // Render
    const renderResult = await renderDiagramToImage(code, diagramType);

    // Brief cooldown for sequential loading
    await sleep(COOLDOWN_MS);

    // Validate
    const validation = await validateDiagramVisually({
      imageBase64: renderResult.imageBase64,
      diagramType,
      originalPrompt,
      diagramCode: code,
    });

    return validation;
  } catch (error) {
    return {
      status: 'ERROR',
      reason: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      suggestions: [],
      timestamp: new Date().toISOString(),
    };
  }
}
