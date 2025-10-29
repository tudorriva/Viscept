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
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10);
const STRICT_MODE = process.env.STRICT_MODE === 'true';
const MAX_OUTPUT_LENGTH = parseInt(process.env.MAX_OUTPUT_LENGTH || '10000', 10);

/**
 * Build system prompt for the LLM based on diagram type.
 */
function buildSystemPrompt(diagramType: string): string {
  const typeInstructions: Record<string, string> = {
    mermaid: `You are a Mermaid diagram code generator. Generate only valid Mermaid code. Do not include markdown fences, explanations, or any text outside the code. Start directly with graph, flowchart, sequenceDiagram, classDiagram, or other Mermaid keyword. The output must be syntactically correct Mermaid code only.`,
    plantuml: `You are a PlantUML diagram code generator. Generate only valid PlantUML code. Do not include markdown fences, explanations, or any text outside the code. Start directly with @startuml and end with @enduml. The output must be syntactically correct PlantUML code only.`,
    dbml: `You are a DBML (Database Markup Language) code generator. Generate only valid DBML code for database schemas. Do not include markdown fences, explanations, or any text outside the code. The output must be syntactically correct DBML code only.`,
    graphviz: `You are a Graphviz (DOT language) diagram code generator. Generate only valid DOT syntax. Do not include markdown fences, explanations, or any text outside the code. Start directly with 'graph' or 'digraph'. The output must be syntactically correct DOT code only.`,
  };

  return (
    typeInstructions[diagramType] ||
    'Generate code. Do not include explanations or markdown fences. Code only.'
  );
}

/**
 * Extract code from LLM response, removing markdown fences and extra text.
 */
function extractCodeFromResponse(response: string, diagramType: string): string {
  let code = response.trim();

  // Remove markdown code fences
  code = code.replace(/```[\w]*\n?/g, '');
  code = code.replace(/```/g, '');

  // For PlantUML, ensure @startuml/@enduml are present
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
