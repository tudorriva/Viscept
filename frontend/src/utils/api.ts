/**
 * API client for communication with backend.
 */

import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// use VITE_API_TIMEOUT (ms) or fallback to 300000 (5 min)
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '300000', 10);

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GenerateRequest {
  prompt: string;
  diagramType: 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';
  enableValidation?: boolean;
  maxRetries?: number;
}

export interface ValidationResult {
  status: 'PASS' | 'FAIL' | 'ERROR';
  reason: string;
  confidence: number;
  suggestions: string[];
  timestamp: string;
}

export interface PipelineAttempt {
  attempt: number;
  code: string;
  validation: ValidationResult | null;
  rendered: boolean;
}

export interface GenerateResponse {
  code: string;
  language: string;
  timestamp: string;
  /** Present when enableValidation was true */
  validation?: ValidationResult | null;
  /** Number of generation attempts (1 = first try accepted) */
  attempts?: number;
  /** History of all attempts when validation was enabled */
  history?: PipelineAttempt[];
}

export interface ValidateRequest {
  code: string;
  diagramType: 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';
  originalPrompt?: string;
}

export interface FormatRequest {
  code: string;
  language: string;
}

export interface FormatResponse {
  formatted: string;
  language: string;
  originalLength: number;
  formattedLength: number;
  timestamp: string;
}

export interface DemoResponse {
  mermaid: string;
  plantuml: string;
  dbml: string;
  graphviz: string;
  timestamp: string;
}

export interface ModelConfig {
  generativeModel: string;
  visionModel: string;
  ollamaUrl: string;
  timeout: number;
  maxValidationRetries: number;
}

export interface VLMHealth {
  available: boolean;
  model: string;
  models: string[];
}

export interface ModelsResponse {
  config: ModelConfig;
  availableModels: string[];
  ollamaOnline: boolean;
  vlm: VLMHealth;
  renderingCapabilities: Record<string, boolean>;
  timestamp: string;
}

/**
 * Generate diagram code from prompt.
 * When enableValidation is true, the backend runs the full Self-Correction
 * Loop (Generate → Render → Inspect → Correct).
 */
export async function generateDiagram(req: GenerateRequest): Promise<GenerateResponse> {
  const response = await client.post<GenerateResponse>('/api/generate', req);
  return response.data;
}

export interface CorrectRequest {
  code: string;
  diagramType: 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';
  renderError: string;
  originalPrompt?: string;
}

/**
 * Send diagram code + render error to the AI for correction.
 */
export async function correctDiagram(req: CorrectRequest): Promise<GenerateResponse> {
  const response = await client.post<GenerateResponse>('/api/correct', req);
  return response.data;
}

/**
 * Validate existing diagram code visually using the VLM.
 */
export async function validateDiagram(req: ValidateRequest): Promise<ValidationResult> {
  const response = await client.post<ValidationResult>('/api/validate', req);
  return response.data;
}

/**
 * Format diagram code.
 */
export async function formatCode(req: FormatRequest): Promise<FormatResponse> {
  const response = await client.post<FormatResponse>('/api/format', req);
  return response.data;
}

/**
 * Fetch demo data.
 */
export async function fetchDemo(): Promise<DemoResponse> {
  const response = await client.get<DemoResponse>('/api/demo');
  return response.data;
}

/**
 * Get available models and system capabilities.
 */
export async function fetchModels(): Promise<ModelsResponse> {
  const response = await client.get<ModelsResponse>('/api/models');
  return response.data;
}

/**
 * Check backend health.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    await client.get('/api/health');
    return true;
  } catch {
    return false;
  }
}
