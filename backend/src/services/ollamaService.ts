/**
 * Ollama service - handles communication with local Ollama endpoint.
 */

import 'dotenv/config'; // Ensure env vars are loaded before module-level constants
import axios from 'axios';

export interface OllamaResponse {
  code: string;
  language: string;
  timestamp: string;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const OLLAMA_VLM_MODEL = process.env.OLLAMA_VLM_MODEL || 'moondream:latest';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '300000', 10);
const STRICT_MODE = process.env.STRICT_MODE === 'true';
const MAX_OUTPUT_LENGTH = parseInt(process.env.MAX_OUTPUT_LENGTH || '10000', 10);
const MAX_VALIDATION_RETRIES = parseInt(process.env.MAX_VALIDATION_RETRIES || '2', 10);

/**
 * Build system prompt for the LLM based on diagram type.
 */
function buildSystemPrompt(diagramType: string): string {
  const typeInstructions: Record<string, string> = {
      mermaid: `You are a Mermaid diagram code generator. Output ONLY valid Mermaid diagram code.
RULES:
- No explanations, no prose, no markdown fences, no comments.
- Start the first line with the diagram keyword: flowchart, classDiagram, sequenceDiagram, stateDiagram-v2, erDiagram, or graph.
- Node IDs must be single camelCase words with NO spaces (e.g. woodFactory, userLogin).
- Use square brackets for labels: nodeId["Human Readable Label"]
- For flowcharts use: A["Label"] --> B["Label"] or A -->|"edge label"| B
- For erDiagram use: TableA ||--o{ TableB : "relationship"
- Never mix flowchart arrows (-->) with erDiagram syntax.
- Output code only.`,
      plantuml: `You are a code generator. Output ONLY valid PlantUML code. No explanations, no prose, no markdown fences. Start with @startuml and end with @enduml. Every line must be valid PlantUML syntax. Output code only.`,
      dbml: `You are a code generator. Output ONLY valid DBML code for database schemas. No explanations, no prose, no markdown fences. Start with Table definitions. Every line must be valid DBML syntax. Output code only.`,
      graphviz: `You are a code generator. Output ONLY valid Graphviz DOT code. No explanations, no prose, no markdown fences. Start with 'digraph' or 'graph'. Every line must be valid DOT syntax. Output code only.`,
  };

  return (
    typeInstructions[diagramType] ||
    'Output code only. No explanations or markdown fences.'
  );
}

/**
 * Extract code from LLM response, removing markdown fences and extra text.
 */
function extractCodeFromResponse(response: string, diagramType: string): string {
  let code = response.trim();

  // Remove markdown code fences
  code = code.replace(/```[\w-]*\n?/g, '');
  code = code.replace(/```/g, '');

  // If the model prepended prose (e.g. "Here's the Mermaid code..."), strip text
  // before the first recognized diagram token for the requested diagram type.
  const tokensByType: Record<string, RegExp[]> = {
    mermaid: [/\b(classDiagram|graph|flowchart|sequenceDiagram|stateDiagram|erDiagram)\b/i],
    plantuml: [/@startuml/i],
    dbml: [/^\s*Table\s+/im],
    graphviz: [/\b(digraph|graph)\b/i],
  };

  const tokens = tokensByType[diagramType] || [
    /\b(classDiagram|graph|flowchart|sequenceDiagram|stateDiagram|erDiagram)\b/i,
    /@startuml/i,
    /^\s*Table\s+/im,
    /\b(digraph|graph)\b/i,
  ];

  let firstIndex = -1;
  for (const rx of tokens) {
    const m = code.match(rx);
    if (m && m.index !== undefined) {
      const idx = m.index;
      if (firstIndex === -1 || idx < firstIndex) firstIndex = idx;
    }
  }

  if (firstIndex > 0) {
    code = code.substring(firstIndex).trim();
    console.log('[Ollama] Stripped leading prose, keeping code from index', firstIndex);
  }

  // Sanitize Mermaid-specific issues: fix node IDs, relationship syntax,
  // remove trailing prose, and normalise class bodies.
  function sanitizeMermaid(codeText: string): string {
    const lines = codeText.split('\n');

    // 1) Truncate at the first obvious English sentence or prose line
    let truncateIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;

      // Skip code patterns
      const isCodeLine = /^\s*(classDiagram|graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|\w+\s*[<\-:|*_{}]|[\w<>|:*{}\[\]"-]+\s*$|\s*\w+\s*\|\|)/.test(t);
      
      // Detect prose: 3+ words, looks like English sentence
      const wordCount = t.split(/\s+/).length;
      const looksLikeSentence = /^[A-Z][a-z]+ [a-z]+ [a-z]+/.test(t);
      const isProseLine = looksLikeSentence && !isCodeLine && wordCount >= 3;
      
      if (isProseLine) {
        console.log(`[Ollama] Truncating at line ${i}: "${t.substring(0, 50)}..."`);
        truncateIndex = i;
        break;
      }
    }

    const usefulLines = truncateIndex >= 0 ? lines.slice(0, truncateIndex) : lines;

    // Detect diagram sub-type from the first meaningful line
    const firstLine = usefulLines.find(l => l.trim())?.trim() || '';
    const isERDiagram = /^erDiagram/i.test(firstLine);
    const isFlowchart = /^(flowchart|graph)\b/i.test(firstLine);
    const isClassDiagram = /^classDiagram/i.test(firstLine);

    // 2) Per-line fixes
    const fixed: string[] = [];
    let inBlock = false;

    for (const raw of usefulLines) {
      let line = raw.trimEnd();
      const trimmed = line.trim();
      if (!trimmed) { fixed.push(''); continue; }

      // --- classDiagram fixes ---
      if (isClassDiagram && !(/^classDiagram/i.test(trimmed))) {
        // Strip flowchart-style labels ["..."] from class names — invalid in classDiagram
        // e.g. WoodcuttingFactory["Woodcutting Factory"] --> Machine  →  WoodcuttingFactory --> Machine
        line = line.replace(/(\w+)\s*\["[^"]*"\]/g, '$1');
        // Also strip single-quoted variant
        line = line.replace(/(\w+)\s*\['[^']*'\]/g, '$1');
        // Strip plain bracket labels: NodeId[Label Text]
        line = line.replace(/(\w+)\s*\[[^\]]*\]/g, '$1');
        console.log(`[Ollama] classDiagram line sanitized: ${trimmed} → ${line.trim()}`);
      }

      // --- erDiagram fixes ---
      if (isERDiagram && !(/^erDiagram/i.test(trimmed))) {
        // Fix flowchart-style arrows in erDiagram: A -->|has| B  →  A ||--o{ B : "has"
        const arrowInER = trimmed.match(/^(\w+)\s*-->\|([^|]+)\|\s*(\w+)/);
        if (arrowInER) {
          const [, src, label, tgt] = arrowInER;
          line = `  ${src} ||--o{ ${tgt} : "${label}"`;
          console.log(`[Ollama] Fixed erDiagram arrow: ${trimmed} → ${line.trim()}`);
        }
        // Fix missing quotes on relationship label: A ||--o{ B : has  →  A ||--o{ B : "has"
        const unquotedRel = line.match(/^(\s*\w+\s+\|\|--[o|{}<>]+\s+\w+\s+:\s+)([^"'].+)$/);
        if (unquotedRel) {
          line = `${unquotedRel[1]}"${unquotedRel[2].trim()}"`;
        }
      }

      // --- Flowchart fixes ---
      if (isFlowchart && !(/^(flowchart|graph)\b/i.test(trimmed))) {
        // Fix node IDs with spaces: "Wood Factory" --> B  →  WoodFactory["Wood Factory"] --> B
        // Only fix if the ID portion before an arrow has spaces and no brackets
        line = line.replace(
          /(?<=^\s*|-->\s*|---\s*)(\w+(?:\s+\w+)+)(?=\s*-->|\s*---)/g,
          (match) => {
            const id = match.replace(/\s+/g, '');
            return `${id}["${match.trim()}"]`;
          }
        );
      }

      // --- Common: strip inline comments that break Mermaid ---
      line = line.replace(/\s*\/\/.*$/, '');
      line = line.replace(/\s*#.*$/, function(m) {
        // Don't strip hex colours
        return /^\s*#[0-9a-fA-F]{3,8}$/.test(m.trim()) ? m : '';
      });

      // --- Class diagram block tracking ---
      if (/^\s*(classDiagram|abstract\s+class|class)\b/i.test(trimmed)) {
        fixed.push(line);
        if (trimmed.includes('{')) inBlock = true;
        continue;
      }
      if (inBlock) {
        fixed.push(line);
        if (trimmed === '}') {
          inBlock = false;
          fixed.push(''); // blank line after block
        }
        continue;
      }

      fixed.push(line);
    }

    return fixed.join('\n').trim();
  }

  if (diagramType === 'mermaid') {
    try {
      code = sanitizeMermaid(code);
    } catch (err) {
      console.warn('[Ollama] Mermaid sanitization failed:', err);
    }
  }

  // For PlantUML ensure boundaries are present
  if (diagramType === 'plantuml') {
    if (!code.includes('@startuml')) {
      code = '@startuml\n' + code;
    }
    if (!code.includes('@enduml')) {
      code = code + '\n@enduml';
    }
  }

  // Trim and enforce max length
  code = code.trim();
  if (code.length > MAX_OUTPUT_LENGTH) {
    code = code.substring(0, MAX_OUTPUT_LENGTH);
  }

  return code;
}

/**
 * Call Ollama to generate diagram code.
 */
export async function generateWithOllama(
  prompt: string,
  diagramType: string
): Promise<OllamaResponse> {
  const systemPrompt = buildSystemPrompt(diagramType);
  const userMessage = `Generate a ${diagramType} diagram for: ${prompt}`;

  try {
    console.log(`[Ollama] Requesting ${diagramType} diagram generation...`);

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: OLLAMA_MODEL,
        prompt: userMessage,
        system: systemPrompt,
        stream: false,
        temperature: 0.3,
      },
      {
        timeout: OLLAMA_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const responseText = response.data.response || '';
    const code = extractCodeFromResponse(responseText, diagramType);

    console.log(`[Ollama] Generated ${code.length} chars of ${diagramType} code`);

    return {
      code,
      language: diagramType,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Ollama] Error:', error instanceof Error ? error.message : String(error));

    // Return fallback template
    console.log(`[Ollama] Falling back to template for ${diagramType}`);
    return getFallbackTemplate(diagramType);
  }
}

/**
 * Call Ollama to correct diagram code using a renderer error message.
 * Sends the original code + error so the LLM can fix the syntax.
 */
export async function correctWithOllama(
  originalCode: string,
  diagramType: string,
  renderError: string,
  originalPrompt?: string,
): Promise<OllamaResponse> {
  const systemPrompt = buildSystemPrompt(diagramType);
  const userMessage = [
    `The following ${diagramType} diagram code has a rendering error. Fix it and output ONLY the corrected code.`,
    ``,
    `ORIGINAL CODE:`,
    originalCode,
    ``,
    `RENDER ERROR:`,
    renderError,
    ``,
    originalPrompt ? `The diagram was meant to: ${originalPrompt}` : '',
    ``,
    `Output ONLY the corrected ${diagramType} code. No explanations.`,
  ].join('\n');

  try {
    console.log(`[Ollama] Requesting ${diagramType} correction for render error...`);

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: OLLAMA_MODEL,
        prompt: userMessage,
        system: systemPrompt,
        stream: false,
        temperature: 0.2, // Even lower for corrections
      },
      {
        timeout: OLLAMA_TIMEOUT,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const responseText = response.data.response || '';
    const code = extractCodeFromResponse(responseText, diagramType);

    console.log(`[Ollama] Corrected code: ${code.length} chars`);

    return {
      code,
      language: diagramType,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Ollama] Correction error:', error instanceof Error ? error.message : String(error));
    // Return the original code if correction fails
    return {
      code: originalCode,
      language: diagramType,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Return a fallback template if Ollama is unavailable.
 */
export function getFallbackTemplate(diagramType: string): OllamaResponse {
  const templates: Record<string, string> = {
    mermaid: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`,

    plantuml: `@startuml
actor User
User --> (Login)
(Login) --> (View Dashboard)
(View Dashboard) --> (Logout)
@enduml`,

    dbml: `Table users {
  id integer [primary key]
  username varchar
  email varchar
  created_at timestamp
}

Table posts {
  id integer [primary key]
  user_id integer [ref: > users.id]
  title varchar
  content text
}`,

    graphviz: `digraph {
  A [label="Start"];
  B [label="Process"];
  C [label="End"];
  A -> B;
  B -> C;
}`,
  };

  return {
    code: templates[diagramType] || templates.mermaid,
    language: diagramType,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if Ollama is available.
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * List available Ollama models.
 */
export async function listOllamaModels(): Promise<string[]> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    return (response.data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

/**
 * Get the currently configured models.
 */
export function getModelConfig() {
  return {
    generativeModel: OLLAMA_MODEL,
    visionModel: OLLAMA_VLM_MODEL,
    ollamaUrl: OLLAMA_BASE_URL,
    timeout: OLLAMA_TIMEOUT,
    maxValidationRetries: MAX_VALIDATION_RETRIES,
  };
}
