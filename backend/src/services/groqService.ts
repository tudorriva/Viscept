/**
 * Groq service - handles communication with Groq's OpenAI-compatible API.
 */

import '../env.js';
import axios from 'axios';

export interface GroqResponse {
  code: string;
  language: string;
  timestamp: string;
}

export interface GroqValidationResult {
  status: 'PASS' | 'FAIL' | 'ERROR';
  reason: string;
  confidence: number;
  suggestions: string[];
  timestamp: string;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_BASE_URL = (process.env.GROQ_API_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TIMEOUT = parseInt(process.env.GROQ_TIMEOUT || '300000', 10);
const GROQ_MODIFY_TIMEOUT = parseInt(process.env.GROQ_MODIFY_TIMEOUT || '300000', 10);
const GROQ_MIN_RESPONSE_MS = parseInt(process.env.GROQ_MIN_RESPONSE_MS || '1800', 10);
const MAX_OUTPUT_LENGTH = parseInt(process.env.MAX_OUTPUT_LENGTH || '15000', 10);

const DEFAULT_GROQ_MODEL_CANDIDATES = [
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
  'llama-3.3-70b-versatile',
];
const DEFAULT_GROQ_STRUCTURED_MODEL_CANDIDATES = [
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

const DEFAULT_GROQ_VISION_MODEL_CANDIDATES = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
];
const GROQ_DEBUG = process.env.GROQ_DEBUG === 'true' || process.env.AI_DEBUG === 'true';
const GROQ_HEALTH_CACHE_MS = parseInt(process.env.GROQ_HEALTH_CACHE_MS || String(30 * 60 * 1000), 10);
const groqHealthCache = new Map<string, { value: boolean; expiresAt: number }>();

function supportsReasoningEffort(model: string): boolean {
  return /^(openai\/gpt-oss-|qwen\/qwen3-)/i.test(model);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMinimumDuration(startedAt: number, minMs: number): Promise<void> {
  if (minMs <= 0) {
    return;
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < minMs) {
    await sleep(minMs - elapsed);
  }
}

function assertGroqConfigured(): void {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }
}

function buildSystemPrompt(diagramType: string): string {
  const typeInstructions: Record<string, string> = {
    mermaid: `You are a Mermaid diagram code generator. Output ONLY valid Mermaid diagram code.
RULES:
- No explanations, no prose, no markdown fences, no comments.
- Start the first line with the diagram keyword: flowchart, classDiagram, sequenceDiagram, stateDiagram-v2, erDiagram, or graph.
- Node IDs must be single camelCase words with NO spaces.
- Use square brackets for labels: nodeId["Human Readable Label"]
- For flowcharts use: A["Label"] --> B["Label"] or A -->|"edge label"| B
- For erDiagram use: TableA ||--o{ TableB : "relationship"
- Never mix flowchart arrows (-->) with erDiagram syntax.
- Output code only.`,
    plantuml: `You are a PlantUML diagram code generator. Output ONLY valid PlantUML code.
RULES:
- No explanations, no prose, no markdown fences, no comments.
- Start with @startuml and end with @enduml.
- Use valid PlantUML syntax only.
- Output code only.`,
    dbml: 'You are a code generator. Output ONLY valid DBML code for database schemas. No explanations, no prose, no markdown fences. Start with Table definitions. Output code only.',
    graphviz: `You are a code generator. Output ONLY valid Graphviz DOT code. No explanations, no prose, no markdown fences. Start with 'digraph' or 'graph'. Output code only.`,
  };

  return typeInstructions[diagramType] || 'Output code only. No explanations or markdown fences.';
}

function buildModificationSystemPrompt(diagramType: string): string {
  const typeLabel: Record<string, string> = {
    mermaid: 'Mermaid',
    plantuml: 'PlantUML',
    dbml: 'DBML',
    graphviz: 'Graphviz DOT',
  };
  const label = typeLabel[diagramType] || diagramType;

  return `You are modifying an existing ${label} diagram.
RULES:
- Output ONLY the updated ${label} code.
- Modify the existing code rather than rewriting from scratch unless explicitly asked.
- Preserve the overall structure, styling, and layout.
- No explanations, no prose, no markdown fences, no comments.
- Output code only.`;
}

function extractCodeFromResponse(response: string, diagramType: string): string {
  let code = response.trim();
  code = code.replace(/```[\w-]*\n?/g, '');
  code = code.replace(/```/g, '');

  const tokensByType: Record<string, RegExp[]> = {
    mermaid: [/\b(classDiagram|graph|flowchart|sequenceDiagram|stateDiagram|erDiagram)\b/i],
    plantuml: [/@startuml/i],
    dbml: [/^\s*Table\s+/im],
    graphviz: [/\b(digraph|graph)\b/i],
  };

  const tokens = tokensByType[diagramType] || [];
  let firstIndex = -1;
  for (const rx of tokens) {
    const match = code.match(rx);
    if (match?.index !== undefined) {
      firstIndex = firstIndex === -1 ? match.index : Math.min(firstIndex, match.index);
    }
  }

  if (firstIndex > 0) {
    code = code.substring(firstIndex).trim();
  }

  if (diagramType === 'plantuml') {
    if (!code.includes('@startuml')) code = `@startuml\n${code}`;
    if (!code.includes('@enduml')) code = `${code}\n@enduml`;
  }

  if (code.length > MAX_OUTPUT_LENGTH) {
    code = code.substring(0, MAX_OUTPUT_LENGTH);
  }

  return code.trim();
}

function extractChatText(data: unknown): string {
  if (
    data &&
    typeof data === 'object' &&
    'choices' in data &&
    Array.isArray((data as { choices?: unknown[] }).choices) &&
    (data as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message?.content
  ) {
    const content = (data as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
  }
  return '';
}

function parseJsonObject<T>(raw: string): T {
  const cleaned = raw.trim().replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as T;
}

function shouldRetryGroqModel(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  const message = typeof error.response?.data === 'string'
    ? error.response.data
    : JSON.stringify(error.response?.data || {});

  return status === 429 || status === 503 || /blocked at the organization level|model .* is blocked|rate limit|over capacity/i.test(message);
}

function summarizeContentForLogs(content: unknown): unknown {
  if (typeof content === 'string') {
    return content.length > 180 ? `${content.slice(0, 180)}...` : content;
  }

  if (Array.isArray(content)) {
    return content.map((item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const record = item as Record<string, unknown>;
      if (record.type === 'image_url') {
        const imageUrl = record.image_url as { url?: string } | undefined;
        const url = imageUrl?.url || '';
        return {
          type: 'image_url',
          urlPreview: url.startsWith('data:')
            ? `${url.slice(0, 32)}...<base64:${Math.max(0, url.length - 32)} chars>`
            : url,
        };
      }

      if (record.type === 'text') {
        const text = typeof record.text === 'string' ? record.text : '';
        return {
          type: 'text',
          text: text.length > 180 ? `${text.slice(0, 180)}...` : text,
        };
      }

      return record;
    });
  }

  return content;
}

function formatGroqAxiosError(error: unknown, model: string): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const status = error.response?.status;
  const data = error.response?.data;
  const dataText = typeof data === 'string' ? data : JSON.stringify(data || {});
  const message = `[Groq:${model}] ${status || 'ERR'} ${dataText || error.message}`;
  return new Error(message);
}

async function createGroqChatCompletion(args: {
  modelCandidates: string[];
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: unknown }>;
  temperature: number;
  timeoutMs: number;
  responseFormat?: Record<string, unknown>;
  reasoningEffort?: 'low' | 'medium' | 'high';
  minimumDurationMs?: number;
}) {
  assertGroqConfigured();

  let lastError: unknown;
  const startedAt = Date.now();

  for (const model of args.modelCandidates) {
    try {
      if (GROQ_DEBUG) {
        console.log('[Groq] Request:', JSON.stringify({
          model,
          temperature: args.temperature,
          reasoningEffort: args.reasoningEffort,
          responseFormatType: args.responseFormat?.type,
          messages: args.messages.map((message) => ({
            role: message.role,
            content: summarizeContentForLogs(message.content),
          })),
        }));
      }

      const response = await axios.post(
        `${GROQ_API_BASE_URL}/chat/completions`,
        {
          model,
          messages: args.messages,
          temperature: args.temperature,
          response_format: args.responseFormat,
          ...(args.reasoningEffort && supportsReasoningEffort(model)
            ? { reasoning_effort: args.reasoningEffort }
            : {}),
        },
        {
          timeout: args.timeoutMs,
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      await waitForMinimumDuration(startedAt, args.minimumDurationMs ?? 0);

      return {
        model,
        text: extractChatText(response.data),
      };
    } catch (error) {
      lastError = error;
      const formatted = formatGroqAxiosError(error, model);
      console.error('[Groq] Request failed:', formatted.message);
      if (GROQ_DEBUG && axios.isAxiosError(error)) {
        console.error('[Groq] Error response payload:', JSON.stringify(error.response?.data || {}));
      }
      if (!shouldRetryGroqModel(error)) {
        throw formatted;
      }
    }
  }

  throw lastError ? formatGroqAxiosError(lastError, args.modelCandidates[args.modelCandidates.length - 1] || 'unknown') : new Error('All Groq model candidates failed');
}

function resolveModelCandidates(model?: string): string[] {
  if (model && model !== 'viscept' && model !== 'groq' && model !== 'default') {
    return [model];
  }

  return Array.from(new Set([GROQ_MODEL, ...DEFAULT_GROQ_MODEL_CANDIDATES]));
}

function resolveVisionModelCandidates(model?: string): string[] {
  if (model && model !== 'viscept' && model !== 'groq' && model !== 'default') {
    return [model];
  }

  return Array.from(new Set([GROQ_VISION_MODEL, ...DEFAULT_GROQ_VISION_MODEL_CANDIDATES]));
}

function resolveStructuredModelCandidates(model?: string): string[] {
  if (model && model !== 'viscept' && model !== 'groq' && model !== 'default') {
    return [model];
  }

  return Array.from(new Set([GROQ_MODEL, ...DEFAULT_GROQ_STRUCTURED_MODEL_CANDIDATES]));
}

export async function generateWithGroq(
  prompt: string,
  diagramType: string,
  model?: string,
): Promise<GroqResponse> {
  const completion = await createGroqChatCompletion({
    modelCandidates: resolveModelCandidates(model),
    messages: [
      { role: 'system', content: buildSystemPrompt(diagramType) },
      { role: 'user', content: `Generate a ${diagramType} diagram for: ${prompt}` },
    ],
    temperature: 0.2,
    timeoutMs: GROQ_TIMEOUT,
    reasoningEffort: 'medium',
    minimumDurationMs: GROQ_MIN_RESPONSE_MS,
  });

  return {
    code: extractCodeFromResponse(completion.text, diagramType),
    language: diagramType,
    timestamp: new Date().toISOString(),
  };
}

export async function modifyDiagramWithGroq(
  currentCode: string,
  userRequest: string,
  diagramType: string,
  model?: string,
): Promise<GroqResponse> {
  const completion = await createGroqChatCompletion({
    modelCandidates: resolveModelCandidates(model),
    messages: [
      { role: 'system', content: buildModificationSystemPrompt(diagramType) },
      {
        role: 'user',
        content: [
          `CURRENT ${diagramType.toUpperCase()} DIAGRAM CODE:`,
          currentCode,
          '',
          'USER REQUEST:',
          userRequest,
          '',
          `Output ONLY the updated ${diagramType} code with the requested changes applied.`,
        ].join('\n'),
      },
    ],
    temperature: 0.15,
    timeoutMs: GROQ_MODIFY_TIMEOUT,
    reasoningEffort: 'medium',
    minimumDurationMs: GROQ_MIN_RESPONSE_MS,
  });

  return {
    code: extractCodeFromResponse(completion.text, diagramType),
    language: diagramType,
    timestamp: new Date().toISOString(),
  };
}

export async function correctWithGroq(
  originalCode: string,
  diagramType: string,
  renderError: string,
  originalPrompt?: string,
  model?: string,
): Promise<GroqResponse> {
  const completion = await createGroqChatCompletion({
    modelCandidates: resolveModelCandidates(model),
    messages: [
      { role: 'system', content: buildSystemPrompt(diagramType) },
      {
        role: 'user',
        content: [
          `The following ${diagramType} diagram code has a rendering error. Fix it and output ONLY the corrected code.`,
          '',
          'ORIGINAL CODE:',
          originalCode,
          '',
          'RENDER ERROR:',
          renderError,
          '',
          originalPrompt ? `The diagram was meant to: ${originalPrompt}` : '',
          '',
          `Output ONLY the corrected ${diagramType} code. No explanations.`,
        ].join('\n'),
      },
    ],
    temperature: 0.1,
    timeoutMs: GROQ_TIMEOUT,
    reasoningEffort: 'medium',
    minimumDurationMs: GROQ_MIN_RESPONSE_MS,
  });

  return {
    code: extractCodeFromResponse(completion.text, diagramType),
    language: diagramType,
    timestamp: new Date().toISOString(),
  };
}

export async function classifyDiagramTypeWithGroq(
  prompt: string,
  model?: string,
): Promise<string> {
  const completion = await createGroqChatCompletion({
    modelCandidates: resolveStructuredModelCandidates(model),
    messages: [
      {
        role: 'system',
        content: [
          'You are a diagram type classifier.',
          'Choose the most appropriate DSL.',
          'Respond with JSON only: {"diagramType":"mermaid"}',
          'Allowed values: mermaid, plantuml, dbml, graphviz.',
        ].join(' '),
      },
      { role: 'user', content: `Classify the diagram type for: ${prompt}` },
    ],
    temperature: 0,
    timeoutMs: 30000,
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: 'diagram_type_classification',
        schema: {
          type: 'object',
          properties: {
            diagramType: {
              type: 'string',
              enum: ['mermaid', 'plantuml', 'dbml', 'graphviz'],
            },
          },
          required: ['diagramType'],
          additionalProperties: false,
        },
        strict: false,
      },
    },
    reasoningEffort: 'low',
    minimumDurationMs: GROQ_MIN_RESPONSE_MS,
  });

  const parsed = parseJsonObject<{ diagramType?: string }>(completion.text);
  const type = parsed.diagramType?.toLowerCase();
  if (type && ['mermaid', 'plantuml', 'dbml', 'graphviz'].includes(type)) {
    return type;
  }
  return 'mermaid';
}

export async function validateDiagramVisuallyWithGroq(
  imageBase64: string,
  diagramType: string,
  originalPrompt: string,
  model?: string,
): Promise<GroqValidationResult> {
  console.log('[Groq] Validating diagram visually:', JSON.stringify({
    diagramType,
    model: model || GROQ_VISION_MODEL,
    imageBase64Length: imageBase64.length,
    promptPreview: originalPrompt.substring(0, 120),
  }));

  const completion = await createGroqChatCompletion({
    modelCandidates: resolveVisionModelCandidates(model),
    messages: [
      {
        role: 'system',
        content: [
          'Inspect the diagram image and answer with JSON only.',
          'Use PASS if the diagram is readable and mostly correct.',
          'Use FAIL only if text overlaps badly, labels are unreadable, or major parts are missing.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Inspect this ${diagramType} diagram. The user wanted: "${originalPrompt.substring(0, 200)}"`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    temperature: 0,
    timeoutMs: GROQ_TIMEOUT,
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: 'diagram_visual_validation',
        schema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PASS', 'FAIL', 'ERROR'] },
            reason: { type: 'string' },
            confidence: { type: 'number' },
            suggestions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['status', 'reason', 'confidence', 'suggestions'],
          additionalProperties: false,
        },
        strict: false,
      },
    },
    reasoningEffort: 'low',
    minimumDurationMs: GROQ_MIN_RESPONSE_MS,
  });

  const parsed = parseJsonObject<{
    status?: string;
    reason?: string;
    confidence?: number;
    suggestions?: string[];
  }>(completion.text);

  return {
    status: parsed.status === 'FAIL' ? 'FAIL' : parsed.status === 'PASS' ? 'PASS' : 'ERROR',
    reason: parsed.reason || 'No reason provided',
    confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    timestamp: new Date().toISOString(),
  };
}

export async function checkGroqHealth(model?: string): Promise<boolean> {
  if (!GROQ_API_KEY) {
    return false;
  }

  const cacheKey = model || GROQ_MODEL;
  const cached = groqHealthCache.get(cacheKey);
  const now = Date.now();
  if (cached && now < cached.expiresAt) {
    return cached.value;
  }

  try {
    await createGroqChatCompletion({
      modelCandidates: resolveModelCandidates(model),
      messages: [
        { role: 'system', content: 'Reply with OK only.' },
        { role: 'user', content: 'OK' },
      ],
      temperature: 0,
      timeoutMs: 15000,
      reasoningEffort: 'low',
      minimumDurationMs: 0,
    });
    groqHealthCache.set(cacheKey, {
      value: true,
      expiresAt: now + GROQ_HEALTH_CACHE_MS,
    });
    return true;
  } catch {
    groqHealthCache.set(cacheKey, {
      value: false,
      expiresAt: now + Math.min(GROQ_HEALTH_CACHE_MS, 5 * 60 * 1000),
    });
    return false;
  }
}

export function getGroqConfig() {
  return {
    provider: 'groq',
    generativeModel: GROQ_MODEL,
    visionModel: GROQ_VISION_MODEL,
    timeout: GROQ_TIMEOUT,
    apiKeyConfigured: Boolean(GROQ_API_KEY),
    maxValidationRetries: parseInt(process.env.MAX_VALIDATION_RETRIES || '2', 10),
  };
}
