/**
 * Gemini service - handles communication with Google AI Studio / Gemini API.
 */

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

export type DiagramLanguage = 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';

export interface GeminiResponse {
  code: string;
  language: string;
  timestamp: string;
}

export interface GeminiValidationResult {
  status: 'PASS' | 'FAIL' | 'ERROR';
  reason: string;
  confidence: number;
  suggestions: string[];
  timestamp: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || GEMINI_MODEL;
const GEMINI_TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT || '300000', 10);
const GEMINI_MODIFY_TIMEOUT = parseInt(process.env.GEMINI_MODIFY_TIMEOUT || '300000', 10);
const MAX_OUTPUT_LENGTH = parseInt(process.env.MAX_OUTPUT_LENGTH || '15000', 10);
const MAX_VALIDATION_RETRIES = parseInt(process.env.MAX_VALIDATION_RETRIES || '2', 10);

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  return cachedClient;
}

function buildSystemPrompt(diagramType: string): string {
  const typeInstructions: Record<string, string> = {
    mermaid: `You are a Mermaid diagram code generator. Output ONLY valid Mermaid diagram code.
RULES:
- No explanations, no prose, no markdown fences, no comments.
- Start the first line with the diagram keyword: flowchart, classDiagram, sequenceDiagram, stateDiagram-v2, erDiagram, or graph.
- Node IDs must be single camelCase words with NO spaces (e.g. woodFactory, userLogin).
- Use square brackets for labels: nodeId["Human Readable Label"]
- For flowcharts use: A["Label"] --> B["Label"] or A -->|"edge label"| B
- STYLING: Use "style nodeId fill:#hex,stroke:#hex,stroke-width:2px". ALWAYS provide a hex color or named color after "fill:".
- For erDiagram use: TableA ||--o{ TableB : "relationship"
- Never mix flowchart arrows (-->) with erDiagram syntax.
- LAYOUT: For complex diagrams, use subgraph blocks. Set direction with TB or LR.
- Output code only.`,
    plantuml: `You are a PlantUML diagram code generator. Output ONLY valid PlantUML code.
RULES:
- No explanations, no prose, no markdown fences, no comments.
- Start with @startuml and end with @enduml.
- Use valid PlantUML syntax only.
- For sequence diagrams, declare actors/participants explicitly.
- For branching flows in sequence diagrams, use alt / else / end blocks.
- Output code only.`,
    dbml: 'You are a code generator. Output ONLY valid DBML code for database schemas. No explanations, no prose, no markdown fences. Start with Table definitions. Every line must be valid DBML syntax. Output code only.',
    graphviz: `You are a code generator. Output ONLY valid Graphviz DOT code. No explanations, no prose, no markdown fences. Start with 'digraph' or 'graph'. Every line must be valid DOT syntax. Output code only.`,
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

  return `You are modifying an existing ${label} diagram. You will receive the current diagram code and a user request describing desired changes.

RULES:
- Output ONLY the updated ${label} code.
- Modify the existing code; do NOT rewrite from scratch unless the user explicitly asks for a full redesign.
- Preserve the overall structure, styling, and layout of the original.
- Only add, remove, or change the specific elements the user asked about.
- Keep the diagram readable and well-organized.
- No explanations, no prose, no markdown fences, no comments.
- Output code only.`;
}

function extractText(response: unknown): string {
  if (response && typeof response === 'object' && 'text' in response && typeof response.text === 'string') {
    return response.text;
  }
  return '';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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

  const tokens = tokensByType[diagramType] || [/@startuml/i, /^\s*Table\s+/im, /\b(digraph|graph)\b/i];

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

function parseJsonObject<T>(raw: string): T {
  const cleaned = raw.trim().replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as T;
}

async function generateText(args: {
  model: string;
  systemInstruction: string;
  contents: string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  temperature: number;
  timeoutMs: number;
  responseMimeType?: 'application/json';
  responseJsonSchema?: Record<string, unknown>;
}): Promise<string> {
  const client = getGeminiClient();
  const response = await withTimeout(
    client.models.generateContent({
      model: args.model,
      contents: args.contents,
      config: {
        systemInstruction: args.systemInstruction,
        temperature: args.temperature,
        responseMimeType: args.responseMimeType,
        responseJsonSchema: args.responseJsonSchema,
      },
    }),
    args.timeoutMs,
    `Gemini request (${args.model})`,
  );

  return extractText(response);
}

export async function generateWithGemini(
  prompt: string,
  diagramType: string,
  model = GEMINI_MODEL,
): Promise<GeminiResponse> {
  const responseText = await generateText({
    model,
    systemInstruction: buildSystemPrompt(diagramType),
    contents: `Generate a ${diagramType} diagram for: ${prompt}`,
    temperature: 0.3,
    timeoutMs: GEMINI_TIMEOUT,
  });

  return {
    code: extractCodeFromResponse(responseText, diagramType),
    language: diagramType,
    timestamp: new Date().toISOString(),
  };
}

export async function modifyDiagramWithGemini(
  currentCode: string,
  userRequest: string,
  diagramType: string,
  model = GEMINI_MODEL,
): Promise<GeminiResponse> {
  const prompt = [
    `CURRENT ${diagramType.toUpperCase()} DIAGRAM CODE:`,
    currentCode,
    '',
    'USER REQUEST:',
    userRequest,
    '',
    `Output ONLY the updated ${diagramType} code with the requested changes applied.`,
  ].join('\n');

  const responseText = await generateText({
    model,
    systemInstruction: buildModificationSystemPrompt(diagramType),
    contents: prompt,
    temperature: 0.25,
    timeoutMs: GEMINI_MODIFY_TIMEOUT,
  });

  return {
    code: extractCodeFromResponse(responseText, diagramType),
    language: diagramType,
    timestamp: new Date().toISOString(),
  };
}

export async function correctWithGemini(
  originalCode: string,
  diagramType: string,
  renderError: string,
  originalPrompt?: string,
  model = GEMINI_MODEL,
): Promise<GeminiResponse> {
  const prompt = [
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
  ].join('\n');

  const responseText = await generateText({
    model,
    systemInstruction: buildSystemPrompt(diagramType),
    contents: prompt,
    temperature: 0.15,
    timeoutMs: GEMINI_TIMEOUT,
  });

  return {
    code: extractCodeFromResponse(responseText, diagramType),
    language: diagramType,
    timestamp: new Date().toISOString(),
  };
}

export async function classifyDiagramTypeWithGemini(
  prompt: string,
  model = GEMINI_MODEL,
): Promise<string> {
  const responseText = await generateText({
    model,
    systemInstruction: `You are a diagram type classifier.
Choose the most appropriate DSL and respond with JSON only.
Allowed values: mermaid, plantuml, dbml, graphviz.`,
    contents: `Classify the diagram type for: ${prompt}`,
    temperature: 0.1,
    timeoutMs: 30000,
    responseMimeType: 'application/json',
    responseJsonSchema: {
      type: 'object',
      properties: {
        diagramType: {
          type: 'string',
          enum: ['mermaid', 'plantuml', 'dbml', 'graphviz'],
        },
      },
      required: ['diagramType'],
    },
  });

  const parsed = parseJsonObject<{ diagramType?: string }>(responseText);
  const type = parsed.diagramType?.toLowerCase();
  if (type && ['mermaid', 'plantuml', 'dbml', 'graphviz'].includes(type)) {
    return type;
  }
  return 'mermaid';
}

export async function validateDiagramVisuallyWithGemini(
  imageBase64: string,
  diagramType: string,
  originalPrompt: string,
  model = GEMINI_VISION_MODEL,
): Promise<GeminiValidationResult> {
  const responseText = await generateText({
    model,
    systemInstruction: `Look at the diagram image and answer with JSON only.
Use PASS if the diagram is readable and mostly correct.
Use FAIL only if text overlaps badly, labels are unreadable, or major parts are missing.`,
    contents: [
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64,
        },
      },
      {
        text: `Inspect this ${diagramType} diagram. The user wanted: "${originalPrompt.substring(0, 200)}"`,
      },
    ],
    temperature: 0.1,
    timeoutMs: GEMINI_TIMEOUT,
    responseMimeType: 'application/json',
    responseJsonSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['PASS', 'FAIL', 'ERROR'] },
        reason: { type: 'string' },
        confidence: { type: 'number' },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['status', 'reason', 'confidence', 'suggestions'],
    },
  });

  const parsed = parseJsonObject<{
    status?: string;
    reason?: string;
    confidence?: number;
    suggestions?: string[];
  }>(responseText);

  return {
    status: parsed.status === 'FAIL' ? 'FAIL' : parsed.status === 'PASS' ? 'PASS' : 'ERROR',
    reason: parsed.reason || 'No reason provided',
    confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    timestamp: new Date().toISOString(),
  };
}

export async function checkGeminiHealth(model = GEMINI_MODEL): Promise<boolean> {
  if (!GEMINI_API_KEY) {
    return false;
  }

  try {
    await generateText({
      model,
      systemInstruction: 'Reply with OK only.',
      contents: 'OK',
      temperature: 0,
      timeoutMs: 15000,
    });
    return true;
  } catch {
    return false;
  }
}

export function getGeminiConfig() {
  return {
    generativeModel: GEMINI_MODEL,
    visionModel: GEMINI_VISION_MODEL,
    timeout: GEMINI_TIMEOUT,
    apiKeyConfigured: Boolean(GEMINI_API_KEY),
    maxValidationRetries: MAX_VALIDATION_RETRIES,
  };
}
