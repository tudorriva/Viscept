/**
 * Diagram Serializer — converts React Flow nodes & edges back to diagram code.
 *
 * This is the reverse of diagramParser.ts and enables bidirectional sync:
 * when the user moves nodes, adds boxes, or draws connections in the visual
 * editor, the code editor is updated in real-time.
 */

import type { Node, Edge } from '@xyflow/react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TableNodeData {
  label: string;
  fields?: string[];
  methods?: string[];
}

// ── Mermaid Serializers ────────────────────────────────────────────────────────

/**
 * Serialize flowchart nodes & edges to Mermaid flowchart syntax.
 */
function serializeMermaidFlowchart(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['flowchart TD'];

  // Node definitions - always output each node with its label
  for (const node of nodes) {
    const label = String(node.data?.label || node.id);
    lines.push(`    ${node.id}["${label}"]`);
  }

  // Edge definitions
  for (const edge of edges) {
    if (edge.label) {
      lines.push(`    ${edge.source} -->|${edge.label}| ${edge.target}`);
    } else {
      lines.push(`    ${edge.source} --> ${edge.target}`);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize classDiagram nodes & edges to Mermaid classDiagram syntax.
 */
function serializeMermaidClass(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['classDiagram'];

  for (const node of nodes) {
    const data = node.data as unknown as TableNodeData;
    const name = data?.label || node.id;
    const fields = data?.fields || [];
    const methods = data?.methods || [];

    if (fields.length > 0 || methods.length > 0) {
      lines.push(`    class ${name} {`);
      for (const f of fields) lines.push(`        ${f}`);
      for (const m of methods) lines.push(`        ${m}`);
      lines.push('    }');
      lines.push('');
    } else {
      lines.push(`    class ${name}`);
    }
  }

  for (const edge of edges) {
    const label = edge.label ? ` : ${edge.label}` : '';
    const arrow = edge.animated ? '..' : '--';
    lines.push(`    ${edge.source} ${arrow}> ${edge.target}${label}`);
  }

  return lines.join('\n');
}

/**
 * Serialize erDiagram nodes & edges to Mermaid erDiagram syntax.
 */
function serializeMermaidER(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['erDiagram'];

  for (const node of nodes) {
    const data = node.data as unknown as TableNodeData;
    const name = node.id;
    const fields = data?.fields || [];

    if (fields.length > 0) {
      lines.push(`    ${name} {`);
      for (const f of fields) lines.push(`        ${f}`);
      lines.push('    }');
    } else {
      lines.push(`    ${name} {`);
      lines.push('        id integer');
      lines.push('    }');
    }
  }

  for (const edge of edges) {
    const label = edge.label || 'relates';
    lines.push(`    ${edge.source} ||--o{ ${edge.target} : "${label}"`);
  }

  return lines.join('\n');
}

/**
 * Serialize sequenceDiagram nodes & edges.
 */
function serializeMermaidSequence(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['sequenceDiagram'];

  // Participants
  for (const node of nodes) {
    const label = String(node.data?.label || node.id);
    if (label !== node.id) {
      lines.push(`    participant ${node.id} as ${label}`);
    } else {
      lines.push(`    participant ${node.id}`);
    }
  }

  // Messages
  for (const edge of edges) {
    const arrow = edge.animated ? '-->>' : '->>';
    const label = edge.label || 'message';
    lines.push(`    ${edge.source}${arrow}${edge.target}: ${label}`);
  }

  return lines.join('\n');
}

/**
 * Serialize stateDiagram nodes & edges.
 */
function serializeMermaidState(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['stateDiagram-v2'];

  for (const edge of edges) {
    const src = edge.source === '__start__' ? '[*]' : edge.source;
    const tgt = edge.target === '__end__' ? '[*]' : edge.target;
    const label = edge.label ? ` : ${edge.label}` : '';
    lines.push(`    ${src} --> ${tgt}${label}`);
  }

  return lines.join('\n');
}

// ── DBML Serializer ────────────────────────────────────────────────────────────

function serializeDBML(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = [];

  for (const node of nodes) {
    const data = node.data as unknown as TableNodeData;
    const tableName = node.id;
    const fields = data?.fields || [];

    lines.push(`Table ${tableName} {`);

    if (fields.length > 0) {
      for (const f of fields) {
        lines.push(`  ${f}`);
      }
    } else {
      lines.push(`  id integer [primary key]`);
    }

    lines.push('}');
    lines.push('');
  }

  // Standalone refs
  for (const edge of edges) {
    const label = edge.label || 'id';
    lines.push(`Ref: ${edge.source}.${label} > ${edge.target}.id`);
  }

  return lines.join('\n');
}

// ── Graphviz Serializer ────────────────────────────────────────────────────────

function serializeGraphviz(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = ['digraph {', '    rankdir=LR;'];

  // Node definitions
  for (const node of nodes) {
    const label = String(node.data?.label || node.id);
    lines.push(`    ${node.id} [label="${label}"];`);
  }

  lines.push('');

  // Edge definitions
  for (const edge of edges) {
    if (edge.label) {
      lines.push(`    ${edge.source} -> ${edge.target} [label="${edge.label}"];`);
    } else {
      lines.push(`    ${edge.source} -> ${edge.target};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Serialize React Flow nodes & edges back to diagram code.
 *
 * @param nodes - React Flow nodes
 * @param edges - React Flow edges
 * @param language - The diagram language ("mermaid", "dbml", "graphviz")
 * @param subType - The Mermaid sub-type (e.g. "flowchart", "classDiagram", "erDiagram")
 */
export function serializeDiagram(
  nodes: Node[],
  edges: Edge[],
  language: string,
  subType: string = 'flowchart'
): string {
  try {
    switch (language) {
      case 'mermaid':
        return serializeMermaidBySubType(nodes, edges, subType);
      case 'dbml':
        return serializeDBML(nodes, edges);
      case 'graphviz':
        return serializeGraphviz(nodes, edges);
      default:
        return serializeMermaidFlowchart(nodes, edges);
    }
  } catch (err) {
    console.warn('[DiagramSerializer] Error:', err);
    return '';
  }
}

function serializeMermaidBySubType(
  nodes: Node[],
  edges: Edge[],
  subType: string
): string {
  switch (subType) {
    case 'classDiagram':
      return serializeMermaidClass(nodes, edges);
    case 'erDiagram':
      return serializeMermaidER(nodes, edges);
    case 'sequenceDiagram':
      return serializeMermaidSequence(nodes, edges);
    case 'stateDiagram':
      return serializeMermaidState(nodes, edges);
    case 'flowchart':
    default:
      return serializeMermaidFlowchart(nodes, edges);
  }
}
