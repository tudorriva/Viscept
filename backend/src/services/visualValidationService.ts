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

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const VLM_MODEL = process.env.OLLAMA_VLM_MODEL || 'qwen2.5-vl:3b';
const VLM_TIMEOUT = parseInt(process.env.VLM_TIMEOUT || '120000', 10);

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
  return `You are a Visual Quality Assurance inspector for ${diagramType} diagrams.

Analyse the rendered diagram image carefully. The user requested: "${originalPrompt}"

Check for the following issues:
1. TEXT READABILITY: Is any text overlapping, truncated, or unreadable?
2. STRUCTURAL INTEGRITY: Are edges/arrows properly connected? Any orphaned nodes?
3. LAYOUT QUALITY: Is the flow logical (e.g., top-to-bottom, left-to-right)?
4. LOGIC CORRECTNESS: Does the diagram accurately represent the user's request?
5. VISUAL CLUTTER: Are elements unnecessarily crowded together?
6. COMPLETENESS: Is any part of the diagram cut off, clipped, or extending beyond the visible area? Are all nodes fully visible with no edges disappearing off-screen?

If ANY part of the diagram is cut off, clipped at edges, or visually incomplete, you MUST return FAIL with confidence 0.9 or higher.

Respond in EXACTLY this JSON format (no markdown fences, no extra text):
{
  "status": "PASS" or "FAIL",
  "reason": "Brief explanation of the verdict",
  "confidence": 0.0 to 1.0,
  "suggestions": ["suggestion1", "suggestion2"]
}`;
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

    const prompt = buildValidationPrompt(request.diagramType, request.originalPrompt);

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: VLM_MODEL,
        prompt,
        images: [request.imageBase64],
        stream: false,
        temperature: 0.1, // Very low temperature for deterministic judgement
        format: 'json',
      },
      {
        timeout: VLM_TIMEOUT,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const rawResponse = response.data.response || '';
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
function parseValidationResponse(raw: string): ValidationResult {
  const timestamp = new Date().toISOString();

  try {
    // Strip any markdown fencing the model may have added
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```/g, '');

    const parsed = JSON.parse(cleaned);

    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));
    const rawStatus = String(parsed.status).toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';

    // A PASS with low confidence is unreliable — treat as FAIL
    const CONFIDENCE_THRESHOLD = 0.75;
    const status: 'PASS' | 'FAIL' =
      rawStatus === 'PASS' && confidence < CONFIDENCE_THRESHOLD ? 'FAIL' : rawStatus;

    const reason =
      rawStatus === 'PASS' && confidence < CONFIDENCE_THRESHOLD
        ? `Low-confidence pass (${(confidence * 100).toFixed(0)}%) — treated as FAIL. ${String(parsed.reason || '')}`
        : String(parsed.reason || 'No reason provided');

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
