/**
 * AI routing service - chooses Gemini or Ollama based on configuration/model.
 */

import {
  generateWithGemini,
  modifyDiagramWithGemini,
  correctWithGemini,
  classifyDiagramTypeWithGemini,
  validateDiagramVisuallyWithGemini,
  checkGeminiHealth,
  getGeminiConfig,
} from './geminiService.js';
import {
  generateWithGroq,
  modifyDiagramWithGroq,
  correctWithGroq,
  classifyDiagramTypeWithGroq,
  validateDiagramVisuallyWithGroq,
  checkGroqHealth,
  getGroqConfig,
} from './groqService.js';
import {
  generateWithOllama,
  modifyDiagramWithOllama,
  correctWithOllama,
  classifyDiagramTypeWithOllama,
  checkOllamaHealth,
  getModelConfig as getOllamaConfig,
  listOllamaModels,
  detectExplicitDiagramLanguage,
} from './ollamaService.js';
import { validateDiagramVisually } from './visualValidationService.js';

export interface AIRequestOptions {
  model?: string;
  visionModel?: string;
}

const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const GEMINI_MODEL_FAMILY = /^gemini-/i;
const GROQ_MODEL_FAMILY = /^(openai\/gpt-oss-|qwen\/qwen3-|meta-llama\/llama-4-|llama-3\.3-70b-versatile|groq\/compound)/i;

function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function shouldUseGemini(model?: string): boolean {
  if (model && GEMINI_MODEL_FAMILY.test(model)) {
    return true;
  }

  if (model && GROQ_MODEL_FAMILY.test(model)) {
    return false;
  }

  if (model && !['viscept', 'gemini', 'groq', 'default'].includes(model.toLowerCase())) {
    return false;
  }

  return DEFAULT_PROVIDER === 'gemini' && isGeminiConfigured();
}

export function shouldUseGroq(model?: string): boolean {
  if (model && GROQ_MODEL_FAMILY.test(model)) {
    return true;
  }

  if (model && GEMINI_MODEL_FAMILY.test(model)) {
    return false;
  }

  if (model && !['viscept', 'groq', 'default'].includes(model.toLowerCase())) {
    return false;
  }

  return DEFAULT_PROVIDER === 'groq' && isGroqConfigured();
}

export function resolveGenerationModel(model?: string): string | undefined {
  if (model && model !== 'viscept' && model !== 'gemini' && model !== 'groq' && model !== 'default') {
    return model;
  }

  if (shouldUseGroq(model)) {
    return process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }

  return shouldUseGemini(model)
    ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
    : undefined;
}

export function resolveVisionModel(model?: string): string | undefined {
  if (model && model !== 'viscept' && model !== 'gemini' && model !== 'groq' && model !== 'default') {
    return model;
  }

  if (shouldUseGroq(model)) {
    return process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
  }

  return shouldUseGemini(model)
    ? (process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash')
    : undefined;
}

export async function generateDiagramWithAI(
  prompt: string,
  diagramType: string,
  options: AIRequestOptions = {},
) {
  const model = resolveGenerationModel(options.model);
  if (shouldUseGroq(options.model)) {
    return generateWithGroq(prompt, diagramType, model);
  }
  return shouldUseGemini(options.model)
    ? generateWithGemini(prompt, diagramType, model)
    : generateWithOllama(prompt, diagramType, model);
}

export async function modifyDiagramWithAI(
  currentCode: string,
  userRequest: string,
  diagramType: string,
  options: AIRequestOptions = {},
) {
  const model = resolveGenerationModel(options.model);
  if (shouldUseGroq(options.model)) {
    return modifyDiagramWithGroq(currentCode, userRequest, diagramType, model);
  }
  return shouldUseGemini(options.model)
    ? modifyDiagramWithGemini(currentCode, userRequest, diagramType, model)
    : modifyDiagramWithOllama(currentCode, userRequest, diagramType, model);
}

export async function correctDiagramWithAI(
  originalCode: string,
  diagramType: string,
  renderError: string,
  originalPrompt?: string,
  options: AIRequestOptions = {},
) {
  const model = resolveGenerationModel(options.model);
  if (shouldUseGroq(options.model)) {
    return correctWithGroq(originalCode, diagramType, renderError, originalPrompt, model);
  }
  return shouldUseGemini(options.model)
    ? correctWithGemini(originalCode, diagramType, renderError, originalPrompt, model)
    : correctWithOllama(originalCode, diagramType, renderError, originalPrompt, model);
}

export async function classifyDiagramTypeWithAI(
  prompt: string,
  options: AIRequestOptions = {},
): Promise<string> {
  const explicitLanguage = detectExplicitDiagramLanguage(prompt);
  if (explicitLanguage) {
    return explicitLanguage;
  }

  const model = resolveGenerationModel(options.model);
  if (shouldUseGroq(options.model)) {
    return classifyDiagramTypeWithGroq(prompt, model);
  }
  return shouldUseGemini(options.model)
    ? classifyDiagramTypeWithGemini(prompt, model)
    : classifyDiagramTypeWithOllama(prompt, model);
}

export async function validateDiagramVisuallyWithAI(
  imageBase64: string,
  diagramType: string,
  originalPrompt: string,
  diagramCode: string,
  options: AIRequestOptions = {},
) {
  const model = resolveVisionModel(options.visionModel);
  if (shouldUseGroq(options.visionModel || options.model)) {
    return validateDiagramVisuallyWithGroq(imageBase64, diagramType, originalPrompt, model);
  }
  return shouldUseGemini(options.visionModel || options.model)
    ? validateDiagramVisuallyWithGemini(imageBase64, diagramType, originalPrompt, model)
    : validateDiagramVisually({
      imageBase64,
      diagramType,
      originalPrompt,
      diagramCode,
    });
}

export async function checkPrimaryAIHealth(): Promise<boolean> {
  return DEFAULT_PROVIDER === 'groq' && isGroqConfigured()
    ? checkGroqHealth(resolveGenerationModel('viscept'))
    : DEFAULT_PROVIDER === 'gemini' && isGeminiConfigured()
    ? checkGeminiHealth(resolveGenerationModel('viscept'))
    : checkOllamaHealth();
}

export async function getAvailableModelInfo() {
  const ollamaModels = await listOllamaModels();
  const geminiModels = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  ];
  const groqModels = [
    process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    'qwen/qwen3-32b',
    'llama-3.3-70b-versatile',
    process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
  ];

  return {
    provider: DEFAULT_PROVIDER,
    availableModels: Array.from(new Set([...groqModels, ...geminiModels, ...ollamaModels, 'viscept'])),
    config: shouldUseGroq('viscept')
      ? getGroqConfig()
      : shouldUseGemini('viscept')
        ? { provider: 'gemini', ...getGeminiConfig() }
        : { provider: 'ollama', ...getOllamaConfig() },
  };
}
