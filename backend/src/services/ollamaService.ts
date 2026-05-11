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

function normalizeOllamaBaseUrl(raw?: string): string {
  const value = (raw || 'http://localhost:11434').trim().replace(/\/+$/, '');
  // Accept either http://host:11434 or http://host:11434/api/generate
  return value.replace(/\/api\/(generate|chat)$/i, '');
}

const OLLAMA_BASE_URL = normalizeOllamaBaseUrl(process.env.OLLAMA_URL);
const OLLAMA_URL = `${OLLAMA_BASE_URL}/api/generate`;
// Default generative model options: 'viscept', 'qwen2.5-coder:7b', 'mistral', 'neural-chat', 'codellama', etc.
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'viscept';
// Default VLM (vision) model options: 'qwen2.5vl:3b', 'llava', 'bakllava', etc.
const OLLAMA_VLM_MODEL = process.env.OLLAMA_VLM_MODEL || 'qwen2.5vl:3b';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '300000', 10);
const OLLAMA_MODIFY_TIMEOUT = parseInt(process.env.OLLAMA_MODIFY_TIMEOUT || '600000', 10); // 10 min for modifications
const STRICT_MODE = process.env.STRICT_MODE === 'true';
const MAX_OUTPUT_LENGTH = parseInt(process.env.MAX_OUTPUT_LENGTH || '15000', 10);
const MAX_VALIDATION_RETRIES = parseInt(process.env.MAX_VALIDATION_RETRIES || '2', 10);
const NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX || '8192', 10);

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
- STYLING: Use "style nodeId fill:#hex,stroke:#hex,stroke-width:2px". ALWAYS provide a hex color or named color after "fill:". NEVER leave a colon at the end of a line.
- For erDiagram use: TableA ||--o{ TableB : "relationship"
- Never mix flowchart arrows (-->) with erDiagram syntax.
- LAYOUT: For complex diagrams, use subgraph blocks. Set direction with TB or LR.
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

      // --- Style declaration fixes ---
      // Fix "style node fill:" (missing color) or "style node fill:#"
      if (line.match(/^\s*style\s+\w+\s+/i)) {
        // Ensure every key has a value. If not, provide a default or strip it.
        line = line.replace(/(\w+):\s*(?=\s|,|$)/g, '$1:#ccc');
        // Fix trailing colon at end of line
        line = line.replace(/:\s*$/g, ':#ccc');
      }

      // --- Flowchart: fix node labels with special characters ---
      if (isFlowchart && line.includes('|') && !line.includes('["') && !line.includes('erDiagram')) {
        // If it looks like a node with a label but missing quotes: node|Label| -> node["Label"]
        line = line.replace(/(\w+)\|([^|]+)\|/g, '$1["$2"]');
      }

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
        options: { num_ctx: NUM_CTX },
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
    if (axios.isAxiosError(error)) {
      console.error('[Ollama] Error:', error.message, 'status=', error.response?.status, 'data=', error.response?.data);
    } else {
      console.error('[Ollama] Error:', error instanceof Error ? error.message : String(error));
    }

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
        options: { num_ctx: NUM_CTX },
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
    if (axios.isAxiosError(error)) {
      console.error('[Ollama] Correction error:', error.message, 'status=', error.response?.status, 'data=', error.response?.data);
    } else {
      console.error('[Ollama] Correction error:', error instanceof Error ? error.message : String(error));
    }
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

// ── v2.0 Chat-Based Diagram Modification ───────────────────────────────────────

/**
 * Build a system prompt for modifying an existing diagram (follow-up messages).
 */
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
- Modify the existing code — do NOT rewrite from scratch unless the user explicitly asks for a full redesign.
- Preserve the overall structure, styling, and layout of the original.
- Only add, remove, or change the specific elements the user asked about.
- Keep the diagram readable and well-organized. Use subgraphs for grouping if appropriate.
- Prefer short labels and concise edge annotations.
- No explanations, no prose, no markdown fences, no comments.
- Output code only.`;
}

/**
 * Modify an existing diagram based on a user instruction.
 * Sends the current code + user request to the LLM.
 */
export async function modifyDiagramWithOllama(
  currentCode: string,
  userRequest: string,
  diagramType: string,
): Promise<OllamaResponse> {
  const systemPrompt = buildModificationSystemPrompt(diagramType);
  const userMessage = [
    `CURRENT ${diagramType.toUpperCase()} DIAGRAM CODE:`,
    currentCode,
    '',
    `USER REQUEST:`,
    userRequest,
    '',
    `Output ONLY the updated ${diagramType} code with the requested changes applied.`,
  ].join('\n');

  try {
    console.log(`[Ollama] Modifying ${diagramType} diagram for: "${userRequest.substring(0, 60)}..."`);

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: OLLAMA_MODEL,
        prompt: userMessage,
        system: systemPrompt,
        stream: false,
        temperature: 0.25,
        options: { num_ctx: NUM_CTX },
      },
      {
        timeout: OLLAMA_MODIFY_TIMEOUT,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const responseText = response.data.response || '';
    const code = extractCodeFromResponse(responseText, diagramType);

    console.log(`[Ollama] Modified diagram: ${code.length} chars`);

    return {
      code,
      language: diagramType,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (axios.isAxiosError(error)) {
      console.error('[Ollama] Modification error:', errMsg, 'status=', error.response?.status, 'data=', error.response?.data);
    } else {
      console.error('[Ollama] Modification error:', errMsg);
    }
    // Propagate error so the frontend can show it to the user
    throw new Error(`Diagram modification failed: ${errMsg}`);
  }
}

/**
 * Classify the best diagram DSL type for a user prompt.
 * Returns one of: mermaid | dbml | graphviz
 */
export async function classifyDiagramTypeWithOllama(
  prompt: string,
): Promise<string> {
  const systemPrompt = `You are a diagram type classifier. Based on the user's description, choose the most appropriate diagram DSL.

Available types:
- dbml: for database schemas, entity-relationship diagrams, data models, tables with columns and foreign keys
- mermaid: for flowcharts, sequence diagrams, class diagrams, state machines, architecture overviews, process flows
- graphviz: for complex graph relationships, network topologies, dependency trees, hierarchical structures with many interconnections

Respond with ONLY a JSON object: {"diagramType": "mermaid"} or {"diagramType": "dbml"} or {"diagramType": "graphviz"}
No explanations. JSON only.`;

  try {
    console.log(`[Ollama] Classifying diagram type for: "${prompt.substring(0, 60)}..."`);

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: OLLAMA_MODEL,
        prompt: `Classify the diagram type for: ${prompt}`,
        system: systemPrompt,
        stream: false,
        temperature: 0.1,
        format: 'json',
      },
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const raw = (response.data.response || '').trim();
    let cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(cleaned);
    const type = parsed.diagramType?.toLowerCase();

    if (['mermaid', 'dbml', 'graphviz'].includes(type)) {
      console.log(`[Ollama] Classified as: ${type}`);
      return type;
    }

    console.warn(`[Ollama] Unknown classification "${type}", defaulting to mermaid`);
    return 'mermaid';
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Ollama] Classification error:', error.message, 'status=', error.response?.status, 'data=', error.response?.data);
    } else {
      console.error('[Ollama] Classification error:', error instanceof Error ? error.message : String(error));
    }

    // Simple heuristic fallback
    const lower = prompt.toLowerCase();
    if (/\b(database|schema|table|column|foreign.?key|erd|entity|relation)\b/.test(lower)) {
      return 'dbml';
    }
    if (/\b(graph|network|topology|dependenc|hierarchi|tree)\b/.test(lower)) {
      return 'graphviz';
    }
    return 'mermaid';
  }
}
