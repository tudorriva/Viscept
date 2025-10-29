/**
 * Ollama service - handles communication with local Ollama endpoint.
 */

import axios from 'axios';

export interface OllamaResponse {
  code: string;
  language: string;
  timestamp: string;
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '300000', 10);
const STRICT_MODE = process.env.STRICT_MODE === 'true';
const MAX_OUTPUT_LENGTH = parseInt(process.env.MAX_OUTPUT_LENGTH || '10000', 10);

/**
 * Build system prompt for the LLM based on diagram type.
 */
function buildSystemPrompt(diagramType: string): string {
  const typeInstructions: Record<string, string> = {
    mermaid: `You are a code generator. Output ONLY valid Mermaid diagram code. No explanations, no prose, no markdown fences. Start immediately with the diagram keyword (graph, flowchart, classDiagram, sequenceDiagram, stateDiagram, erDiagram). Every line must be valid Mermaid syntax. Output code only.`,
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

  // Sanitize Mermaid-specific issues: remove trailing prose and move relationship
  // lines out of class bodies so Mermaid parser can accept the code.
  function sanitizeMermaid(codeText: string): string {
    const lines = codeText.split('\n');

    // 1) Truncate at the first obvious English sentence or prose line
    let truncateIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;

      // Skip code patterns
      const isCodeLine = /^\s*(classDiagram|graph|flowchart|sequenceDiagram|stateDiagram|erDiagram|\w+\s*[<\-:|*_]|[\w<>|:*-]+\s*$)/.test(t);
      
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

    // 2) Normalize: remove empty lines, ensure single spacing
    const normalized: string[] = [];
    for (const raw of usefulLines) {
      const trimmed = raw.trim();
      if (trimmed) {
        normalized.push(trimmed);
      }
    }

    // 3) Insert newlines after class definitions to prevent concatenation
    const out: string[] = [];
    let inBlock = false;

    for (let i = 0; i < normalized.length; i++) {
      const line = normalized[i];

      // classDiagram or class definition
      if (/^\s*(classDiagram|abstract\s+class|class)\b/i.test(line)) {
        out.push(line);
        if (line.includes('{')) {
          inBlock = true;
        }
        continue;
      }

      if (inBlock) {
        out.push(line);
        if (line === '}') {
          inBlock = false;
          out.push(''); // blank line after block
        }
        continue;
      }

      // Relationships and other lines
      out.push(line);
    }

    return out.join('\n').trim();
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
        temperature: 0.3, // Lower temperature for more consistent code
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
    const healthUrl = OLLAMA_URL.replace('/api/generate', '/api/tags');
    await axios.get(healthUrl, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
