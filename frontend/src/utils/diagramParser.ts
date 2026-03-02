/**
 * Diagram Parser — converts diagram DSL code into React Flow nodes & edges.
 *
 * Supports Mermaid (flowchart, classDiagram, sequenceDiagram, erDiagram),
 * DBML (Table definitions), and Graphviz (DOT digraph/graph).
 *
 * The parser extracts structural information (nodes, edges, labels) and
 * produces positions via a simple auto-layout algorithm.
 */

import type { Node, Edge } from '@xyflow/react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedDiagram {
  nodes: Node[];
  edges: Edge[];
  diagramType: string;
  subType: string; // e.g. "flowchart", "classDiagram", "erDiagram"
}

interface RawNode {
  id: string;
  label: string;
  shape?: string;
  fields?: string[];   // for class/table nodes
  methods?: string[];   // for class nodes
}

interface RawEdge {
  source: string;
  target: string;
  label?: string;
  type?: string; // "arrow" | "dashed" | "thick" | "dotted"
}

// ── Auto-Layout ────────────────────────────────────────────────────────────────

/**
 * Simple grid-based auto-layout for parsed nodes.
 * Places nodes in a grid pattern with spacing.
 */
function autoLayout(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  options: { colWidth?: number; rowHeight?: number; cols?: number } = {}
): Node[] {
  const { colWidth = 280, rowHeight = 160, cols = 3 } = options;

  // Try topological ordering for a better layout
  const ordered = topologicalSort(rawNodes, rawEdges);

  return ordered.map((rn, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Determine the node type based on whether it has fields
    let nodeType = 'editableNode';
    let data: Record<string, unknown> = { label: rn.label };

    if (rn.fields && rn.fields.length > 0) {
      nodeType = 'tableNode';
      data = {
        label: rn.label,
        fields: rn.fields,
        methods: rn.methods || [],
      };
    }

    return {
      id: rn.id,
      type: nodeType,
      position: { x: 60 + col * colWidth, y: 60 + row * rowHeight },
      data,
      style: {
        minWidth: 160,
      },
    } as Node;
  });
}

/**
 * Topological sort (Kahn's algorithm) for directed graphs.
 * Falls back to insertion order if the graph has cycles.
 */
function topologicalSort(nodes: RawNode[], edges: RawEdge[]): RawNode[] {
  const idSet = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    sorted.push(cur);
    for (const neighbor of adj.get(cur) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If not all nodes were sorted (cycles), append the unsorted ones
  const sortedSet = new Set(sorted);
  for (const n of nodes) {
    if (!sortedSet.has(n.id)) sorted.push(n.id);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sorted.map((id) => nodeMap.get(id)!).filter(Boolean);
}

// ── Mermaid Parser ─────────────────────────────────────────────────────────────

function parseMermaid(code: string): ParsedDiagram {
  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return emptyDiagram('mermaid', 'flowchart');

  const firstLine = lines[0].toLowerCase();

  if (firstLine.startsWith('classdiagram') || firstLine.startsWith('class')) {
    return parseMermaidClass(lines);
  }
  if (firstLine.startsWith('erdiagram')) {
    return parseMermaidER(lines);
  }
  if (firstLine.startsWith('sequencediagram')) {
    return parseMermaidSequence(lines);
  }
  if (firstLine.startsWith('statediagram')) {
    return parseMermaidState(lines);
  }
  // Default: flowchart / graph
  return parseMermaidFlowchart(lines);
}

/**
 * Parse Mermaid flowchart / graph.
 * Handles: graph TD, flowchart LR, node definitions, edges with labels.
 */
function parseMermaidFlowchart(lines: string[]): ParsedDiagram {
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];
  const nodeIds = new Set<string>();

  // Skip first line (graph directive)
  const contentLines = lines.slice(1);

  for (const line of contentLines) {
    // Skip subgraph / end / style / class lines
    if (/^(subgraph|end|style|class|click|linkStyle)\b/i.test(line)) continue;

    // Match edges: A --> B, A -->|label| B, A -- text --> B, A -.-> B
    const edgeMatch = line.match(
      /^(\w+)(?:\[.*?\]|{.*?}|>.*?]|[^\s\[{>-]*)?\s*(-+(?:\.-+)?-?>|=+>|--+>?|~~>|--+\|[^|]*\|--+>?|-+>?\|[^|]*\|)\s*(\w+)(?:\[.*?\]|{.*?}|>.*?])?/
    );

    if (edgeMatch) {
      const [, srcId, edgePart, tgtId] = edgeMatch;

      // Extract edge label from |label| syntax
      const labelMatch = edgePart.match(/\|([^|]*)\|/);
      const edgeLabel = labelMatch ? labelMatch[1].trim() : undefined;

      // Ensure source node exists
      if (!nodeIds.has(srcId)) {
        const srcLabel = extractNodeLabel(line, srcId) || srcId;
        rawNodes.push({ id: srcId, label: srcLabel });
        nodeIds.add(srcId);
      }

      // Ensure target node exists
      if (!nodeIds.has(tgtId)) {
        const tgtLabel = extractNodeLabelFromRest(line, tgtId) || tgtId;
        rawNodes.push({ id: tgtId, label: tgtLabel });
        nodeIds.add(tgtId);
      }

      rawEdges.push({ source: srcId, target: tgtId, label: edgeLabel });
      continue;
    }

    // Match standalone node definitions: A["Label"], B{Decision}, C(Rounded)
    const nodeMatch = line.match(/^(\w+)\s*[\[({]"?([^"\]})]+)"?[\])}]/);
    if (nodeMatch && !nodeIds.has(nodeMatch[1])) {
      rawNodes.push({ id: nodeMatch[1], label: nodeMatch[2] });
      nodeIds.add(nodeMatch[1]);
    }
  }

  const nodes = autoLayout(rawNodes, rawEdges);
  const edges: Edge[] = rawEdges.map((re, i) => ({
    id: `e-${re.source}-${re.target}-${i}`,
    source: re.source,
    target: re.target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    label: re.label,
    type: 'smoothstep',
    animated: re.type === 'dashed',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#64748b' },
    labelStyle: { fill: '#cbd5e1', fontSize: 11 },
  }));

  return { nodes, edges, diagramType: 'mermaid', subType: 'flowchart' };
}

/** Extract a Mermaid node label from inline definition like A["Label"] */
function extractNodeLabel(line: string, nodeId: string): string | null {
  const re = new RegExp(`${nodeId}\\s*[\\[({]"?([^"\\]})]+)"?[\\])}]`);
  const m = line.match(re);
  return m ? m[1].trim() : null;
}

function extractNodeLabelFromRest(line: string, nodeId: string): string | null {
  // Look for the target node definition after the arrow
  const re = new RegExp(`${nodeId}\\s*[\\[({]"?([^"\\]})]+)"?[\\])}]`);
  const m = line.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Parse Mermaid classDiagram.
 */
function parseMermaidClass(lines: string[]): ParsedDiagram {
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];
  const nodeMap = new Map<string, RawNode>();

  let currentClass: RawNode | null = null;
  let inBlock = false;

  for (const line of lines.slice(1)) {
    // Class definition start: class Animal {
    const classStart = line.match(/^(?:abstract\s+)?class\s+(\w+)\s*\{?\s*$/i);
    if (classStart) {
      const name = classStart[1];
      currentClass = { id: name, label: name, fields: [], methods: [] };
      nodeMap.set(name, currentClass);
      inBlock = line.includes('{');
      continue;
    }

    // End of class block
    if (inBlock && line === '}') {
      if (currentClass) rawNodes.push(currentClass);
      currentClass = null;
      inBlock = false;
      continue;
    }

    // Inside class block — field or method
    if (inBlock && currentClass) {
      if (line.includes('(') && line.includes(')')) {
        currentClass.methods!.push(line);
      } else if (line.trim()) {
        currentClass.fields!.push(line);
      }
      continue;
    }

    // Relationship: Animal <|-- Dog, A "1" --> "*" B : has
    const relMatch = line.match(/(\w+)\s+([<>|.*o-]+)\s+(\w+)(?:\s*:\s*(.+))?/);
    if (relMatch) {
      const [, left, rel, right, label] = relMatch;
      // Ensure both nodes exist
      if (!nodeMap.has(left)) {
        const n = { id: left, label: left, fields: [], methods: [] };
        nodeMap.set(left, n);
        rawNodes.push(n);
      }
      if (!nodeMap.has(right)) {
        const n = { id: right, label: right, fields: [], methods: [] };
        nodeMap.set(right, n);
        rawNodes.push(n);
      }

      rawEdges.push({
        source: left,
        target: right,
        label: label?.trim(),
        type: rel.includes('..') ? 'dashed' : 'arrow',
      });
    }
  }

  // If the last class was not closed
  if (currentClass && !rawNodes.find((n) => n.id === currentClass!.id)) {
    rawNodes.push(currentClass);
  }

  const nodes = autoLayout(rawNodes, rawEdges, { colWidth: 300, rowHeight: 220, cols: 3 });
  const edges: Edge[] = rawEdges.map((re, i) => ({
    id: `e-${re.source}-${re.target}-${i}`,
    source: re.source,
    target: re.target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    label: re.label,
    type: 'smoothstep',
    animated: re.type === 'dashed',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#64748b' },
    labelStyle: { fill: '#cbd5e1', fontSize: 11 },
  }));

  return { nodes, edges, diagramType: 'mermaid', subType: 'classDiagram' };
}

/**
 * Parse Mermaid erDiagram.
 */
function parseMermaidER(lines: string[]): ParsedDiagram {
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];
  const nodeIds = new Set<string>();
  let currentEntity: RawNode | null = null;
  let inBlock = false;

  for (const line of lines.slice(1)) {
    // Entity block start: CUSTOMER {
    const entityStart = line.match(/^\s*(\w+)\s*\{$/);
    if (entityStart) {
      const name = entityStart[1];
      currentEntity = { id: name, label: name, fields: [] };
      inBlock = true;
      continue;
    }

    if (inBlock && line.trim() === '}') {
      if (currentEntity) {
        rawNodes.push(currentEntity);
        nodeIds.add(currentEntity.id);
      }
      currentEntity = null;
      inBlock = false;
      continue;
    }

    if (inBlock && currentEntity) {
      currentEntity.fields!.push(line.trim());
      continue;
    }

    // Relationship: CUSTOMER ||--o{ ORDER : places
    const relMatch = line.match(/(\w+)\s+(\|{1,2}[o|}{-]+)\s+(\w+)\s*:\s*"?([^"]*)"?/);
    if (relMatch) {
      const [, left, , right, label] = relMatch;
      if (!nodeIds.has(left)) {
        rawNodes.push({ id: left, label: left, fields: [] });
        nodeIds.add(left);
      }
      if (!nodeIds.has(right)) {
        rawNodes.push({ id: right, label: right, fields: [] });
        nodeIds.add(right);
      }
      rawEdges.push({ source: left, target: right, label: label.trim() });
    }
  }

  const nodes = autoLayout(rawNodes, rawEdges, { colWidth: 300, rowHeight: 200, cols: 3 });
  const edges: Edge[] = rawEdges.map((re, i) => ({
    id: `e-${re.source}-${re.target}-${i}`,
    source: re.source,
    target: re.target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    label: re.label,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#64748b' },
    labelStyle: { fill: '#cbd5e1', fontSize: 11 },
  }));

  return { nodes, edges, diagramType: 'mermaid', subType: 'erDiagram' };
}

/**
 * Parse Mermaid sequenceDiagram.
 * Participants become nodes arranged horizontally.
 */
function parseMermaidSequence(lines: string[]): ParsedDiagram {
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];
  const nodeIds = new Set<string>();
  let edgeIndex = 0;

  for (const line of lines.slice(1)) {
    // Participant declarations
    const partMatch = line.match(/^(?:participant|actor)\s+(\w+)(?:\s+as\s+(.+))?/i);
    if (partMatch) {
      const id = partMatch[1];
      const label = partMatch[2] || id;
      if (!nodeIds.has(id)) {
        rawNodes.push({ id, label });
        nodeIds.add(id);
      }
      continue;
    }

    // Messages: A->>B: text, A-->>B: text
    const msgMatch = line.match(/^(\w+)\s*(->>|-->>|->|-->)\s*(\w+)\s*:\s*(.+)/);
    if (msgMatch) {
      const [, src, arrow, tgt, label] = msgMatch;
      if (!nodeIds.has(src)) {
        rawNodes.push({ id: src, label: src });
        nodeIds.add(src);
      }
      if (!nodeIds.has(tgt)) {
        rawNodes.push({ id: tgt, label: tgt });
        nodeIds.add(tgt);
      }
      rawEdges.push({
        source: src,
        target: tgt,
        label: label.trim(),
        type: arrow.includes('--') ? 'dashed' : 'arrow',
      });
    }
  }

  // Lay out sequence participants horizontally
  const nodes: Node[] = rawNodes.map((rn, i) => ({
    id: rn.id,
    type: 'editableNode',
    position: { x: 60 + i * 250, y: 80 },
    data: { label: rn.label },
    style: { minWidth: 120 },
  }));

  const edges: Edge[] = rawEdges.map((re, i) => ({
    id: `e-${re.source}-${re.target}-${i}`,
    source: re.source,
    target: re.target,
    sourceHandle: 'right',
    targetHandle: 'left',
    label: re.label,
    type: 'smoothstep',
    animated: re.type === 'dashed',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#64748b' },
    labelStyle: { fill: '#cbd5e1', fontSize: 11 },
  }));

  return { nodes, edges, diagramType: 'mermaid', subType: 'sequenceDiagram' };
}

/**
 * Parse Mermaid stateDiagram (basic support).
 */
function parseMermaidState(lines: string[]): ParsedDiagram {
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];
  const nodeIds = new Set<string>();

  for (const line of lines.slice(1)) {
    // State transition: StateA --> StateB : event
    const transMatch = line.match(/(\w+|\[\*\])\s*-->\s*(\w+|\[\*\])(?:\s*:\s*(.+))?/);
    if (transMatch) {
      let [, src, tgt, label] = transMatch;
      // Normalize [*] to special start/end nodes
      if (src === '[*]') src = '__start__';
      if (tgt === '[*]') tgt = '__end__';

      if (!nodeIds.has(src)) {
        rawNodes.push({ id: src, label: src === '__start__' ? '●' : src });
        nodeIds.add(src);
      }
      if (!nodeIds.has(tgt)) {
        rawNodes.push({ id: tgt, label: tgt === '__end__' ? '◎' : tgt });
        nodeIds.add(tgt);
      }

      rawEdges.push({ source: src, target: tgt, label: label?.trim() });
    }
  }

  const nodes = autoLayout(rawNodes, rawEdges);
  const edges: Edge[] = rawEdges.map((re, i) => ({
    id: `e-${re.source}-${re.target}-${i}`,
    source: re.source,
    target: re.target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    label: re.label,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#64748b' },
    labelStyle: { fill: '#cbd5e1', fontSize: 11 },
  }));

  return { nodes, edges, diagramType: 'mermaid', subType: 'stateDiagram' };
}

// ── DBML Parser ────────────────────────────────────────────────────────────────

function parseDBML(code: string): ParsedDiagram {
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];

  const lines = code.split('\n');
  let currentTable: RawNode | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Table definition
    const tableMatch = trimmed.match(/^Table\s+(\w+)\s*\{/i);
    if (tableMatch) {
      currentTable = {
        id: tableMatch[1],
        label: tableMatch[1],
        fields: [],
      };
      continue;
    }

    // End of table
    if (trimmed === '}' && currentTable) {
      rawNodes.push(currentTable);
      currentTable = null;
      continue;
    }

    // Inside table — field definition
    if (currentTable && trimmed && !trimmed.startsWith('//')) {
      currentTable.fields!.push(trimmed);

      // Extract foreign key references
      const refMatch = trimmed.match(/\[ref:\s*[><-]\s*(\w+)\.(\w+)\]/i);
      if (refMatch) {
        rawEdges.push({
          source: currentTable.id,
          target: refMatch[1],
          label: refMatch[2],
        });
      }
    }

    // Standalone Ref: users.id < posts.user_id
    const standaloneRef = trimmed.match(
      /^Ref:\s*(\w+)\.(\w+)\s*([><-])\s*(\w+)\.(\w+)/i
    );
    if (standaloneRef) {
      const [, srcTable, , dir, tgtTable] = standaloneRef;
      rawEdges.push({
        source: dir === '<' ? tgtTable : srcTable,
        target: dir === '<' ? srcTable : tgtTable,
        label: 'FK',
      });
    }
  }

  const nodes = autoLayout(rawNodes, rawEdges, { colWidth: 320, rowHeight: 240, cols: 3 });
  const edges: Edge[] = rawEdges.map((re, i) => ({
    id: `e-${re.source}-${re.target}-${i}`,
    source: re.source,
    target: re.target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    label: re.label,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#64748b' },
    labelStyle: { fill: '#cbd5e1', fontSize: 11 },
  }));

  return { nodes, edges, diagramType: 'dbml', subType: 'erDiagram' };
}

// ── Graphviz (DOT) Parser ──────────────────────────────────────────────────────

function parseGraphviz(code: string): ParsedDiagram {
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];
  const nodeIds = new Set<string>();

  const lines = code.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Skip graph/digraph and closing braces
    if (/^(strict\s+)?(di)?graph\b/i.test(line)) continue;
    if (line === '{' || line === '}') continue;
    if (/^(rankdir|node|edge|graph|label|fontname|fontsize|size)\b/i.test(line)) continue;
    if (/^\/\//.test(line)) continue;

    // Edge: A -> B [label="text"]
    const edgeMatch = line.match(
      /["']?(\w+)["']?\s*(-[->])\s*["']?(\w+)["']?\s*(?:\[([^\]]*)\])?/
    );
    if (edgeMatch) {
      const [, src, , tgt, attrs] = edgeMatch;

      // Ensure source and target nodes exist
      if (!nodeIds.has(src)) {
        rawNodes.push({ id: src, label: src });
        nodeIds.add(src);
      }
      if (!nodeIds.has(tgt)) {
        rawNodes.push({ id: tgt, label: tgt });
        nodeIds.add(tgt);
      }

      // Extract label from attributes
      let edgeLabel: string | undefined;
      if (attrs) {
        const labelMatch = attrs.match(/label\s*=\s*"([^"]*)"/);
        if (labelMatch) edgeLabel = labelMatch[1];
      }

      rawEdges.push({ source: src, target: tgt, label: edgeLabel });
      continue;
    }

    // Node definition: A [label="Start", shape=box]
    const nodeMatch = line.match(
      /["']?(\w+)["']?\s*\[([^\]]*)\]/
    );
    if (nodeMatch && !nodeIds.has(nodeMatch[1])) {
      const id = nodeMatch[1];
      const attrs = nodeMatch[2];
      let label = id;

      const labelMatch = attrs.match(/label\s*=\s*"([^"]*)"/);
      if (labelMatch) label = labelMatch[1];

      rawNodes.push({ id, label });
      nodeIds.add(id);
    }
  }

  const nodes = autoLayout(rawNodes, rawEdges);
  const edges: Edge[] = rawEdges.map((re, i) => ({
    id: `e-${re.source}-${re.target}-${i}`,
    source: re.source,
    target: re.target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    label: re.label,
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as any, color: '#64748b' },
    labelStyle: { fill: '#cbd5e1', fontSize: 11 },
  }));

  return { nodes, edges, diagramType: 'graphviz', subType: 'digraph' };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function emptyDiagram(diagramType: string, subType: string): ParsedDiagram {
  return { nodes: [], edges: [], diagramType, subType };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Parse diagram code into React Flow nodes and edges.
 */
export function parseDiagramCode(
  code: string,
  language: string
): ParsedDiagram {
  if (!code.trim()) return emptyDiagram(language, '');

  try {
    switch (language) {
      case 'mermaid':
        return parseMermaid(code);
      case 'dbml':
        return parseDBML(code);
      case 'graphviz':
        return parseGraphviz(code);
      default:
        return emptyDiagram(language, '');
    }
  } catch (err) {
    console.warn('[DiagramParser] Parse error:', err);
    return emptyDiagram(language, '');
  }
}
