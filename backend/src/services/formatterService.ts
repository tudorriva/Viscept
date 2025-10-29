/**
 * Formatter service - handles code formatting for different diagram types.
 */

/**
 * Format code based on language/diagram type.
 * Applies basic indentation and whitespace normalization.
 */
export function formatCode(code: string, language: string): string {
  switch (language) {
    case 'mermaid':
      return formatMermaid(code);
    case 'plantuml':
      return formatPlantUML(code);
    case 'dbml':
      return formatDBML(code);
    case 'graphviz':
      return formatGraphviz(code);
    default:
      return code.trim();
  }
}

/**
 * Format Mermaid code - normalize indentation and line breaks.
 */
function formatMermaid(code: string): string {
  let lines = code.split('\n').map((line) => line.trim()).filter((line) => line);

  // Ensure proper graph declaration
  if (lines[0] && !lines[0].match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram)/)) {
    lines.unshift('graph TD');
  }

  return lines.join('\n');
}

/**
 * Format PlantUML code - ensure @startuml/@enduml boundaries.
 */
function formatPlantUML(code: string): string {
  let formatted = code.trim();

  if (!formatted.includes('@startuml')) {
    formatted = '@startuml\n' + formatted;
  }
  if (!formatted.includes('@enduml')) {
    formatted = formatted + '\n@enduml';
  }

  const lines = formatted.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result.join('\n');
}

/**
 * Format DBML code - normalize table and field definitions.
 */
function formatDBML(code: string): string {
  const lines = code.split('\n');
  const result: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue; // Skip empty lines
    }

    if (trimmed.startsWith('Table')) {
      inTable = true;
      result.push(trimmed);
    } else if (inTable && trimmed === '}') {
      inTable = false;
      result.push(trimmed);
    } else if (inTable) {
      result.push('  ' + trimmed);
    } else {
      result.push(trimmed);
    }
  }

  return result.join('\n');
}

/**
 * Format Graphviz (DOT) code - normalize nodes and edges.
 */
function formatGraphviz(code: string): string {
  let formatted = code.trim();

  // Ensure it starts with graph or digraph
  if (!formatted.match(/^(graph|digraph)/)) {
    formatted = 'digraph {\n  ' + formatted;
    if (!formatted.endsWith('}')) {
      formatted += '\n}';
    }
  }

  const lines = formatted.split('\n');
  const result: string[] = [];
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.includes('{')) {
      braceDepth++;
    }
    if (trimmed.includes('}')) {
      braceDepth--;
    }

    const indent = braceDepth > 0 ? '  ' : '';
    result.push(indent + trimmed);
  }

  return result.join('\n');
}
