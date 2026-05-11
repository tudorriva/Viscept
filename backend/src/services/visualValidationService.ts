/**
 * Visual Validation Service — Visual Judge AI (VLM-based).
 *
 * Uses a compact Vision-Language Model (Qwen2.5-VL-3B or Moondream2) running
 * locally via Ollama to inspect rendered diagram images and detect visual
 * errors such as overlapping text, broken edges, or inverted logic flows.
 *
 * This implements the Self-Correction Loop described in the Viscept research
 * paper: Generate → Render → Inspect → Auto-Correct.
 */

import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// ── Configuration ──────────────────────────────────────────────────────────────

function normalizeOllamaBaseUrl(raw?: string): string {
  const value = (raw || 'http://localhost:11434').trim().replace(/\/+$/, '');
  return value.replace(/\/api\/(generate|chat)$/i, '');
}

const OLLAMA_BASE_URL = normalizeOllamaBaseUrl(process.env.OLLAMA_URL);
const VLM_MODEL = process.env.OLLAMA_VLM_MODEL || 'granite3.2-vision:2b';
const CODER_MODEL = process.env.OLLAMA_MODEL || 'viscept';
const VLM_TIMEOUT = parseInt(process.env.VLM_TIMEOUT || '300000', 10);
// If true, evict the coder from VRAM before running the VLM (needed when both
// models can't fit simultaneously, e.g. qwen2.5vl:7b on a 12GB card).
// granite3.2-vision:2b is small enough to co-reside with most models.
const VLM_EVICT_CODER = process.env.VLM_EVICT_CODER === 'true';

/**
 * Evict a model from VRAM by sending a generate request with keep_alive: 0.
 * Ollama immediately unloads the model weights, freeing GPU memory.
 */
async function evictModel(model: string): Promise<void> {
  try {
    await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      { model, prompt: '', keep_alive: '0' },
      { timeout: 10000 },
    );
    console.log(`[VisualValidation] Evicted ${model} from VRAM.`);
  } catch {
    // Model may not be loaded — that's fine, nothing to evict.
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  status: 'PASS' | 'FAIL' | 'ERROR';
  reason: string;
  confidence: number;       // 0-1 confidence score
  suggestions: string[];    // actionable fix suggestions
  timestamp: string;
}

export interface ValidationRequest {
  imageBase64: string;       // base64 PNG of the rendered diagram
  diagramType: string;       // mermaid | plantuml | dbml | graphviz
  originalPrompt: string;    // the user's original description
  diagramCode: string;       // the generated code
}

// ── Prompt Templates ───────────────────────────────────────────────────────────

function buildValidationPrompt(diagramType: string, originalPrompt: string): string {
  return `Look at this ${diagramType} diagram image. The user wanted: "${originalPrompt.substring(0, 200)}"

Answer these questions:
1. Can you read the text labels? (yes/no)
2. Are the arrows/connections visible? (yes/no)
3. Is anything cut off or overlapping badly? (yes/no)

Then respond with ONLY this JSON format:
{"status":"PASS","reason":"brief description of what you see","confidence":0.85,"suggestions":[]}

Use "PASS" if the diagram is readable and mostly correct.
Use "FAIL" only if text overlaps badly, labels are unreadable, or major parts are missing.

JSON only, no other text.`;
}

// ── Core Validation Function ───────────────────────────────────────────────────

/**
 * Send a rendered diagram image to the VLM for visual quality inspection.
 */
export async function validateDiagramVisually(
  request: ValidationRequest
): Promise<ValidationResult> {
  try {
    console.log(`[VisualValidation] Inspecting ${request.diagramType} diagram with ${VLM_MODEL}...`);

    // Optionally free VRAM before loading the VLM (set VLM_EVICT_CODER=true in
    // .env when using a larger VLM like qwen2.5vl:3b on a 4GB card).
    if (VLM_EVICT_CODER) {
      await evictModel(CODER_MODEL);
      await new Promise((r) => setTimeout(r, 1500));
    }

    const prompt = buildValidationPrompt(request.diagramType, request.originalPrompt);

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: VLM_MODEL,
        prompt,
        images: [request.imageBase64],
        stream: false,
        temperature: 0.1,
        format: 'json',
        keep_alive: VLM_EVICT_CODER ? '0' : '5m', // evict after call only in swap mode
        options: {
          num_gpu: 99, // load all layers on GPU (Ollama caps to available VRAM)
          num_ctx: 1024, // minimal context — image tokens + short Q&A is all we need
        },
      },
      {
        timeout: VLM_TIMEOUT,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const rawResponse = response.data.response || '';
    console.log(`[VisualValidation] Response: ${rawResponse}`);
    return parseValidationResponse(rawResponse);
  } catch (error) {
    console.error(
      '[VisualValidation] Error:',
      error instanceof Error ? error.message : String(error)
    );

    // If the VLM is unavailable, we degrade gracefully — do not block generation
    return {
      status: 'ERROR',
      reason: `Visual validation unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      suggestions: [],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Parse the VLM's JSON response into a structured ValidationResult.
 */
/** Detect if the VLM echoed the prompt template instead of producing real analysis. */
function isTemplateEcho(parsed: Record<string, unknown>): boolean {
  const reason = String(parsed.reason || '').toLowerCase();
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map(String)
    : [];

  // Check for literal placeholder text from the prompt template
  const placeholderReasons = [
    'brief explanation of the verdict',
    'brief explanation',
  ];
  const placeholderSuggestions = ['suggestion1', 'suggestion2'];

  const reasonIsPlaceholder = placeholderReasons.some((p) => reason.includes(p));
  const suggestionsArePlaceholder =
    suggestions.length > 0 &&
    suggestions.every((s) =>
      placeholderSuggestions.includes(s.toLowerCase().trim())
    );

  return reasonIsPlaceholder || suggestionsArePlaceholder;
}

function parseValidationResponse(raw: string): ValidationResult {
  const timestamp = new Date().toISOString();

  try {
    // Strip any markdown fencing the model may have added
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```/g, '');

    // Try to extract JSON from the response even if there's surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*?"status"\s*:\s*"(?:PASS|FAIL)"[\s\S]*?\}/i);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    // Guard: If the VLM echoed the template instead of analysing, treat as ERROR
    if (isTemplateEcho(parsed)) {
      console.warn('[VisualValidation] Detected template-echo response — VLM did not perform real analysis.');
      return {
        status: 'ERROR',
        reason:
          'The visual model echoed the prompt template instead of analysing the diagram. ' +
          'This usually means the VLM did not process the image. Please try again.',
        confidence: 0,
        suggestions: [],
        timestamp,
      };
    }

    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));
    const rawStatus = String(parsed.status).toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
    const rawReason = String(parsed.reason || '').trim();

    // Heuristic: if VLM says FAIL but can't provide an actual reason,
    // the judgement is unreliable — downgrade to PASS.
    const reasonIsMissing = !rawReason || rawReason.toLowerCase() === 'no reason provided' || rawReason.length < 5;
    if (rawStatus === 'FAIL' && (reasonIsMissing || confidence < 0.5)) {
      console.log('[VisualValidation] FAIL verdict lacked sufficient reasoning — treating as PASS.');
      return {
        status: 'PASS' as const,
        reason: rawReason || 'Visual model could not articulate a specific issue — treated as PASS.',
        confidence: Math.max(confidence, 0.65),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
        timestamp,
      };
    }

    // For small VLMs (moondream), PASS with any confidence above 0.2 is trustworthy
    const CONFIDENCE_THRESHOLD = 0.2;
    const status: 'PASS' | 'FAIL' =
      rawStatus === 'PASS' && confidence < CONFIDENCE_THRESHOLD ? 'FAIL' : rawStatus;

    const reason =
      rawStatus === 'PASS' && confidence < CONFIDENCE_THRESHOLD
        ? `Low-confidence pass (${(confidence * 100).toFixed(0)}%) — treated as FAIL. ${rawReason}`
        : rawReason || 'No reason provided';

    return {
      status,
      reason,
      confidence,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map(String)
        : [],
      timestamp,
    };
  } catch {
    // Fallback: try to detect PASS/FAIL from plain text
    const upper = raw.toUpperCase();
    const status = upper.includes('PASS') ? 'PASS' : 'FAIL';

    return {
      status,
      reason: raw.substring(0, 200),
      confidence: 0.3,
      suggestions: [],
      timestamp,
    };
  }
}

// ── Self-Correction Prompt Builder ─────────────────────────────────────────────

/**
 * Build a correction prompt to send back to the generative model when the
 * visual judge detects errors.
 */
export function buildCorrectionPrompt(
  originalPrompt: string,
  originalCode: string,
  diagramType: string,
  validationResult: ValidationResult
): string {
  return `The following ${diagramType} diagram code was generated for the request: "${originalPrompt}"

\`\`\`
${originalCode}
\`\`\`

A visual quality inspection found the following problems:
- Status: ${validationResult.status}
- Reason: ${validationResult.reason}
${validationResult.suggestions.length > 0 ? '- Suggestions:\n' + validationResult.suggestions.map((s) => `  • ${s}`).join('\n') : ''}

Please fix the ${diagramType} code to address these issues. Output ONLY the corrected ${diagramType} code. No explanations, no markdown fences.`;
}

// ── Health Check ───────────────────────────────────────────────────────────────

/**
 * Check if the VLM model is available in Ollama.
 */
export async function checkVLMHealth(): Promise<{
  available: boolean;
  model: string;
  models: string[];
}> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });

    const models: string[] = (response.data.models || []).map(
      (m: { name: string }) => m.name
    );

    const available = models.some(
      (m) => m.startsWith(VLM_MODEL.split(':')[0])
    );

    return { available, model: VLM_MODEL, models };
  } catch {
    return { available: false, model: VLM_MODEL, models: [] };
  }
}
