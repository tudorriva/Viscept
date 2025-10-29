/**
 * API client for communication with backend.
 */

import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// use VITE_API_TIMEOUT (ms) or fallback to 120000 (2 min)
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '120000', 10);

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
}

export interface GenerateResponse {
  code: string;
  language: string;
  timestamp: string;
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

/**
 * Generate diagram code from prompt.
 */
export async function generateDiagram(req: GenerateRequest): Promise<GenerateResponse> {
  const response = await client.post<GenerateResponse>('/api/generate', req);
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
