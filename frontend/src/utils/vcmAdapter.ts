/**
 * VCM Adapter — bidirectional bridge between the existing parser/serializer
 * layer and the Visual Canonical Model.
 *
 * ┌──────────┐    parsedDiagramToVCM()    ┌─────────────┐
 * │ DSL Text │ ──── parseDiagramCode() ──▶ │ ParsedDiagram│ ──▶ VisualDiagram
 * └──────────┘                             └─────────────┘
 *
 * ┌───────────────┐  vcmToReactFlow()  ┌──────────────────┐
 * │ VisualDiagram  │ ─────────────────▶ │ RF nodes + edges │
 * └───────────────┘                     └──────────────────┘
 *
 * ┌───────────────┐  vcmToDSL()        ┌──────────┐
 * │ VisualDiagram  │ ─────────────────▶ │ DSL Text │
 * └───────────────┘                     └──────────┘
 *
 * Convenience round-trip:
 *   dslToVCM(code, language)   — one-shot code → VCM
 *   vcmToDSL(diagram)          — one-shot VCM → code
 *
 * Visual edits (React Flow events):
 *   reactFlowToVCM(rfNodes, rfEdges, prev)  — patch an existing VCM from RF state
 *
 * All conversions are pure functions.  No mutation of inputs.
 */

import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

import {
  type VisualDiagram,
  type VisualNode,
  type VisualEdge,
  type VisualGroup,
  type VisualPort,
  type NodeShape,
  type EdgeLineType,
  type ArrowShape,
  type Cardinality,
  type DiagramLanguage,
  type DiagramSubType,
  type NodeField,
  type VisualStyle,
  createVisualDiagram,
  createVisualNode,
  createVisualEdge,
  createVisualGroup,
  DEFAULT_PORTS,
  updateDiagram,
} from '../types/vcm';

import { parseDiagramCode, type ParsedDiagram } from './diagramParser';
import { serializeDiagram, serializeGraphvizVCM } from './diagramSerializer';

// ═══════════════════════════════════════════════════════════════════════════════
// 1.  ParsedDiagram → VisualDiagram
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infer the VCM `NodeShape` from a React Flow node produced by the parser.
 *
 * The current parser stores node type as either 'editableNode' or 'tableNode'
 * and does not persist Mermaid bracket syntax.  We recover shape from:
 *   • node.type === 'tableNode'  → 'table'
 *   • subType hints (sequenceDiagram → lifeline, stateDiagram → circle for start/end)
 *   • metadata.mermaidBracket stored during parsing (future enhancement)
 *   • fall through → 'roundedRect'
 */
function inferShape(
  rfNode: Node,
  subType: string,
  originalCode?: string,
): NodeShape {
  // Table / class / entity
  if (rfNode.type === 'tableNode') return 'table';

  // Sequence diagram participants → lifeline
  if (subType === 'sequenceDiagram') return 'lifeline';

  // State diagram special nodes
  if (subType === 'stateDiagram') {
    const label = String(rfNode.data?.label ?? '');
    if (label === '●' || rfNode.id === '__start__') return 'circle';
    if (label === '◎' || rfNode.id === '__end__') return 'doubleCircle';
    return 'roundedRect';
  }

  // Flowchart — try to recover shape from original DSL code
  if (subType === 'flowchart' && originalCode) {
    const shape = inferFlowchartShapeFromCode(rfNode.id, originalCode);
    if (shape) return shape;
  }

  return 'roundedRect';
}

/**
 * Scan the original Mermaid flowchart DSL for the node's bracket style to
 * recover the intended shape:
 *
 *   A["Label"]   → rect        (square brackets)
 *   B("Label")   → roundedRect (parentheses)
 *   C{"Label"}   → diamond     (curly braces)
 *   D[("Label")] → cylinder    (brackets + parens)
 *   E(["Label"]) → stadium     (paren + brackets)
 *   F[["Label"]] → subroutine  (double brackets)
 *   G{{"Label"}} → hexagon     (double curlies)
 *   H[/"Label"/] → parallelogram
 *   I[\"Label"\] → trapezoid
 *   J(("Label")) → circle      (double parens)
 *
 * Returns undefined if no bracket syntax is found.
 */
function inferFlowchartShapeFromCode(nodeId: string, code: string): NodeShape | undefined {
  // Escape the ID for regex
  const esc = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Order matters — check more specific patterns first
  const patterns: Array<[RegExp, NodeShape]> = [
    [new RegExp(`${esc}\\s*\\[\\(`),     'cylinder'],       // [(
    [new RegExp(`${esc}\\s*\\(\\[`),     'stadium'],        // ([
    [new RegExp(`${esc}\\s*\\[\\[`),     'subroutine'],     // [[
    [new RegExp(`${esc}\\s*\\{\\{`),     'hexagon'],        // {{
    [new RegExp(`${esc}\\s*\\(\\(`),     'circle'],         // ((
    [new RegExp(`${esc}\\s*\\[\\/`),     'parallelogram'],  // [/
    [new RegExp(`${esc}\\s*\\[\\\\`),    'trapezoid'],      // [\
    [new RegExp(`${esc}\\s*\\{`),        'diamond'],        // {
    [new RegExp(`${esc}\\s*\\(`),        'roundedRect'],    // (
    [new RegExp(`${esc}\\s*>`),          'rect'],           // >  (flag / asymmetric)
    [new RegExp(`${esc}\\s*\\[`),        'rect'],           // [
  ];

  for (const [re, shape] of patterns) {
    if (re.test(code)) return shape;
  }

  return undefined;
}

/**
 * Convert the React Flow edge type/style into a VCM EdgeLineType.
 */
function inferEdgeLineType(rfEdge: Edge): EdgeLineType {
  if (rfEdge.animated) return 'dashed';

  const dash = (rfEdge.style as Record<string, unknown>)?.strokeDasharray;
  if (dash) return 'dashed';

  const sw = (rfEdge.style as Record<string, unknown>)?.strokeWidth;
  if (typeof sw === 'number' && sw >= 3) return 'thick';

  return 'solid';
}

/**
 * Infer VCM ArrowShape from a React Flow markerEnd / markerStart object.
 */
function inferArrowShape(marker: Edge['markerEnd'] | Edge['markerStart']): ArrowShape {
  if (!marker) return 'none';
  if (typeof marker === 'string') {
    if (marker === 'arrowclosed' || marker === 'ArrowClosed') return 'arrowClosed';
    if (marker === 'arrow' || marker === 'Arrow') return 'arrow';
    return 'arrowClosed';
  }
  // Object form: { type: MarkerType.ArrowClosed, ... }
  if (marker.type === MarkerType.ArrowClosed || marker.type === ('arrowclosed' as any)) {
    return 'arrowClosed';
  }
  if (marker.type === MarkerType.Arrow || marker.type === ('arrow' as any)) {
    return 'arrow';
  }
  return 'arrowClosed';
}

/**
 * Parse NodeField[] from raw string arrays (parser output for table/class nodes).
 */
function parseFields(rawFields: string[]): NodeField[] {
  return rawFields.map((raw) => {
    const trimmed = raw.trim();
    const field: NodeField = { raw: trimmed };

    // Try to parse "visibility type name [constraints]"  or  "type name PK"
    // Class diagram visibility prefixes: +, -, #, ~
    const visMatch = trimmed.match(/^([+\-#~])\s*(.*)/);
    let rest = trimmed;
    if (visMatch) {
      field.visibility = visMatch[1] as NodeField['visibility'];
      rest = visMatch[2];
    }

    // Check for method signature
    if (rest.includes('(') && rest.includes(')')) {
      field.isMethod = true;
      field.name = rest;
      return field;
    }

    // Try "dataType name [constraints]" or "name dataType [constraints]"
    const parts = rest.split(/\s+/);
    if (parts.length >= 2) {
      field.dataType = parts[0];
      field.name = parts[1];
      if (parts.length > 2) {
        field.constraints = parts.slice(2).map((p) =>
          p.replace(/[\[\]]/g, '').trim()
        ).filter(Boolean);
      }
    } else if (parts.length === 1) {
      field.name = parts[0];
    }

    return field;
  });
}

/**
 * Convert a single React Flow Node into a VCM VisualNode.
 */
function rfNodeToVisualNode(
  rfNode: Node,
  subType: string,
  originalCode?: string,
): VisualNode {
  const shape = inferShape(rfNode, subType, originalCode);
  const label = String(rfNode.data?.label ?? rfNode.id);

  // Build structured fields/methods if present
  const rawFields = (rfNode.data?.fields as string[]) || [];
  const rawMethods = (rfNode.data?.methods as string[]) || [];

  const fields = rawFields.length > 0 ? parseFields(rawFields) : undefined;
  const methods = rawMethods.length > 0 ? parseFields(rawMethods) : undefined;

  // Ports — table nodes get one port per field, simple shapes get defaults
  let ports: VisualPort[];
  if (shape === 'table' && fields) {
    ports = [
      ...DEFAULT_PORTS,
      ...fields.map((f, i) => ({
        id: `field-${i}`,
        position: 'right' as const,
        type: 'source' as const,
        label: f.name,
      })),
    ];
  } else {
    ports = [...DEFAULT_PORTS];
  }

  // Style from React Flow node
  const style: VisualStyle | undefined = rfNode.style
    ? {
        minWidth: typeof rfNode.style.minWidth === 'number'
          ? rfNode.style.minWidth
          : rfNode.style.minWidth
            ? parseInt(String(rfNode.style.minWidth), 10)
            : undefined,
      }
    : undefined;

  return createVisualNode({
    id: rfNode.id,
    label,
    shape,
    position: { ...rfNode.position },
    ports,
    fields,
    methods,
    style: (style?.minWidth != null) ? style : undefined,
    metadata: {
      // Preserve the original RF node type for round-trip
      rfNodeType: rfNode.type,
    },
  });
}

/**
 * Convert a single React Flow Edge into a VCM VisualEdge.
 */
function rfEdgeToVisualEdge(rfEdge: Edge): VisualEdge {
  return createVisualEdge({
    id: rfEdge.id,
    sourceNodeId: rfEdge.source,
    sourcePortId: rfEdge.sourceHandle ?? undefined,
    targetNodeId: rfEdge.target,
    targetPortId: rfEdge.targetHandle ?? undefined,
    label: rfEdge.label ? String(rfEdge.label) : undefined,
    lineType: inferEdgeLineType(rfEdge),
    sourceArrow: inferArrowShape(rfEdge.markerStart),
    targetArrow: inferArrowShape(rfEdge.markerEnd),
    animated: rfEdge.animated ?? false,
  });
}

/**
 * Convert a ParsedDiagram (output of parseDiagramCode) into a VisualDiagram.
 *
 * @param parsed   — the ParsedDiagram returned by the existing parser
 * @param code     — original DSL code (used to recover flowchart shapes)
 */
export function parsedDiagramToVCM(
  parsed: ParsedDiagram,
  code?: string,
): VisualDiagram {
  const language = (parsed.diagramType || 'mermaid') as DiagramLanguage;
  const subType = (parsed.subType || 'flowchart') as DiagramSubType;

  const nodes = parsed.nodes.map((n) => rfNodeToVisualNode(n, subType, code));
  const edges = parsed.edges.map((e) => rfEdgeToVisualEdge(e));

  // Detect direction from first line of Mermaid code
  let direction: VisualDiagram['direction'];
  if (language === 'mermaid' && code) {
    const firstLine = code.trim().split('\n')[0]?.trim().toLowerCase() ?? '';
    if (firstLine.includes(' lr')) direction = 'LR';
    else if (firstLine.includes(' rl')) direction = 'RL';
    else if (firstLine.includes(' bt') || firstLine.includes(' bu')) direction = 'BT';
    else direction = 'TB'; // default for Mermaid
  }

  const diagram = createVisualDiagram(language, subType);
  return updateDiagram(diagram, {
    nodes,
    edges,
    direction,
    groups: [], // TODO: Step 2+ will extract subgraph info
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2.  VisualDiagram → React Flow nodes + edges
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map VCM NodeShape → React Flow custom node type string.
 * Each shape maps to a dedicated custom component registered in DiagramNodes.tsx.
 */
function shapeToRFNodeType(shape: NodeShape): string {
  switch (shape) {
    case 'table':
    case 'record':
      return 'tableNode';
    case 'diamond':
      return 'diamondNode';
    case 'cylinder':
      return 'cylinderNode';
    case 'circle':
      return 'circleNode';
    case 'doubleCircle':
      return 'doubleCircleNode';
    case 'lifeline':
      return 'lifelineNode';
    case 'stadium':
      return 'stadiumNode';
    case 'hexagon':
      return 'hexagonNode';
    case 'parallelogram':
    case 'trapezoid':
      return 'parallelogramNode';
    case 'ellipse':
      return 'ellipseNode';
    case 'rect':
    case 'roundedRect':
    case 'subroutine':
    case 'note':
    default:
      return 'editableNode';
  }
}

/** Default edge colour. */
const EDGE_STROKE = '#64748b';

/**
 * Map VCM ArrowShape → React Flow MarkerType.
 * Returns undefined for 'none' (no marker).
 */
function arrowToMarker(
  arrow: ArrowShape,
  color: string = EDGE_STROKE,
): Edge['markerEnd'] | undefined {
  switch (arrow) {
    case 'none':
      return undefined;
    case 'arrow':
      return { type: MarkerType.Arrow, color };
    case 'arrowClosed':
    case 'triangle':
    case 'triangleFilled':
      return { type: MarkerType.ArrowClosed, color };
    // React Flow only supports Arrow / ArrowClosed natively.
    // Custom SVG markers for diamond, crow, tee, etc. will be added in Step 2.
    default:
      return { type: MarkerType.ArrowClosed, color };
  }
}

/**
 * Map VCM EdgeLineType to React Flow style props.
 */
function lineTypeToRFStyle(lineType: EdgeLineType): Record<string, unknown> {
  switch (lineType) {
    case 'dashed':
      return { strokeDasharray: '6,3' };
    case 'dotted':
      return { strokeDasharray: '2,3' };
    case 'thick':
      return { strokeWidth: 3 };
    default:
      return {};
  }
}

/**
 * Build cardinality label string from source/target cardinalities.
 * Used for ER diagrams — produces strings like "1..n" or "0..1".
 */
function cardinalityLabel(c?: Cardinality): string | undefined {
  if (!c) return undefined;
  const min = c.min;
  const max = c.max === 'n' ? '*' : c.max;
  if (min === max) return min;
  return `${min}..${max}`;
}

/**
 * Convert a single VisualNode → React Flow Node.
 *
 * @param vNode    — the VCM node
 * @param onLabelChange — callback for inline editing (passed via data)
 */
export function visualNodeToRF(
  vNode: VisualNode,
  onLabelChange?: (id: string, label: string) => void,
): Node {
  const rfType = shapeToRFNodeType(vNode.shape);

  // Build data payload
  const data: Record<string, unknown> = {
    label: vNode.label,
    onLabelChange,
    // Carry the VCM shape so custom node components can access it
    vcmShape: vNode.shape,
  };

  if (vNode.fields) {
    data.fields = vNode.fields.map((f) => f.raw);
  }
  if (vNode.methods) {
    data.methods = vNode.methods.map((f) => f.raw);
  }

  const style: Record<string, unknown> = {};
  if (vNode.style?.minWidth) style.minWidth = vNode.style.minWidth;
  else style.minWidth = rfType === 'tableNode' ? 180 : 120;

  return {
    id: vNode.id,
    type: rfType,
    position: { ...vNode.position },
    data,
    style,
  } as Node;
}

/**
 * Convert a single VisualEdge → React Flow Edge.
 */
export function visualEdgeToRF(vEdge: VisualEdge): Edge {
  const strokeColor = vEdge.style?.stroke ?? EDGE_STROKE;
  const strokeWidth = vEdge.style?.strokeWidth ?? 2;

  // Compose label: base label + cardinality annotations
  let composedLabel = vEdge.label ?? '';
  const srcCard = cardinalityLabel(vEdge.sourceCardinality);
  const tgtCard = cardinalityLabel(vEdge.targetCardinality);
  if (srcCard || tgtCard) {
    const parts: string[] = [];
    if (srcCard) parts.push(srcCard);
    if (composedLabel) parts.push(composedLabel);
    if (tgtCard) parts.push(tgtCard);
    composedLabel = parts.join(' ');
  }

  return {
    id: vEdge.id,
    source: vEdge.sourceNodeId,
    sourceHandle: vEdge.sourcePortId ?? null,
    target: vEdge.targetNodeId,
    targetHandle: vEdge.targetPortId ?? null,
    label: composedLabel || undefined,
    type: 'smoothstep',
    animated: vEdge.animated,
    style: {
      stroke: strokeColor,
      strokeWidth,
      ...lineTypeToRFStyle(vEdge.lineType),
    },
    markerStart: arrowToMarker(vEdge.sourceArrow, strokeColor),
    markerEnd: arrowToMarker(vEdge.targetArrow, strokeColor),
    labelShowBg: true,
    labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9, color: '#f8fafc', stroke: '#334155', strokeWidth: 1, rx: 4, ry: 4 },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    labelStyle: { fill: '#f8fafc', fontSize: 11, fontWeight: 500 },
  } as Edge;
}

/**
 * Convert an entire VisualDiagram into React Flow nodes + edges.
 *
 * Handles group collapsing: when a group is collapsed, its member nodes are
 * hidden and any edges to/from those nodes are removed from the output.
 *
 * Groups themselves are emitted as RF nodes with type 'groupNode'.
 *
 * @param diagram  — the VCM
 * @param onLabelChange — stable callback for inline label editing
 * @param onGroupToggle — callback when a group collapse/expand is toggled
 */
export function vcmToReactFlow(
  diagram: VisualDiagram,
  onLabelChange?: (id: string, label: string) => void,
  onGroupToggle?: (groupId: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  // Determine which nodes are hidden due to group collapse
  const hiddenNodeIds = new Set<string>();
  for (const group of diagram.groups) {
    if (group.collapsed) {
      for (const nid of group.nodeIds) {
        hiddenNodeIds.add(nid);
      }
    }
  }

  // Convert visible nodes
  const nodes: Node[] = [];
  for (const n of diagram.nodes) {
    if (hiddenNodeIds.has(n.id)) continue;
    nodes.push(visualNodeToRF(n, onLabelChange));
  }

  // Emit group nodes (always visible — they show collapsed indicator)
  for (const group of diagram.groups) {
    const groupNode: Node = {
      id: `__group__${group.id}`,
      type: 'groupNode',
      position: group.bounds
        ? { x: group.bounds.x, y: group.bounds.y }
        : { x: 0, y: 0 },
      data: {
        label: group.label,
        collapsed: group.collapsed,
        childCount: group.nodeIds.length,
        onGroupToggle,
        groupId: group.id,
      },
      style: group.bounds
        ? { width: group.bounds.width, height: group.bounds.height }
        : { minWidth: 200, minHeight: 100 },
      // Groups render behind other nodes
      zIndex: -1,
    } as Node;
    nodes.push(groupNode);
  }

  // Filter edges that reference hidden nodes
  const edges: Edge[] = [];
  
  // Detect parallel edges to optionally change their type so they don't overlap completely
  const edgePairCounts = new Map<string, number>();
  for (const e of diagram.edges) {
    if (hiddenNodeIds.has(e.sourceNodeId) || hiddenNodeIds.has(e.targetNodeId)) continue;
    const pairKey = [e.sourceNodeId, e.targetNodeId].sort().join('|');
    edgePairCounts.set(pairKey, (edgePairCounts.get(pairKey) || 0) + 1);
  }

  const currentPairIndexes = new Map<string, number>();

  for (const e of diagram.edges) {
    if (hiddenNodeIds.has(e.sourceNodeId) || hiddenNodeIds.has(e.targetNodeId)) continue;
    
    const rfEdge = visualEdgeToRF(e);
    
    const pairKey = [e.sourceNodeId, e.targetNodeId].sort().join('|');
    const totalInPair = edgePairCounts.get(pairKey) || 1;
    const currentIndex = currentPairIndexes.get(pairKey) || 0;
    
    if (totalInPair > 1) {
      // Parallel edges: we switch them to 'default' (bezier) or adjust handles if we had a custom edge.
      // For now, making them 'default' helps them curve a bit differently depending on handles.
      // We will also pass the index via data so a custom edge could read it if registered later.
      rfEdge.type = 'default';
      rfEdge.data = { ...rfEdge.data, parallelIndex: currentIndex, totalParallel: totalInPair };
    }
    
    currentPairIndexes.set(pairKey, currentIndex + 1);
    edges.push(rfEdge);
  }

  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3.  VisualDiagram → DSL text  (serialise)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map VCM NodeShape back to the React Flow node type the serializer expects.
 * The serializer only distinguishes 'tableNode' vs 'editableNode'.
 */
function shapeToSerializerNodeType(shape: NodeShape): string {
  switch (shape) {
    case 'table':
    case 'record':
      return 'tableNode';
    default:
      return 'editableNode';
  }
}

/**
 * Wrap a node label in the appropriate Mermaid bracket syntax for its shape.
 * Only applies to Mermaid flowcharts.
 */
function wrapLabelForShape(label: string, shape: NodeShape): string {
  switch (shape) {
    case 'rect':           return `["${label}"]`;
    case 'roundedRect':    return `("${label}")`;
    case 'diamond':        return `{"${label}"}`;
    case 'cylinder':       return `[("${label}")]`;
    case 'stadium':        return `(["${label}"])`;
    case 'subroutine':     return `[["${label}"]]`;
    case 'hexagon':        return `{{"${label}"}}`;
    case 'parallelogram':  return `[/"${label}"/]`;
    case 'trapezoid':      return `[\\"${label}"\\]`;
    case 'circle':         return `(("${label}"))`;
    default:               return `["${label}"]`;
  }
}

/**
 * Serialize a VisualDiagram directly to DSL text.
 *
 * Strategy: convert VCM → React Flow nodes/edges, then delegate to the
 * existing `serializeDiagram()` for maximum backward compatibility.
 *
 * For Mermaid flowcharts we post-process to inject shape brackets, since the
 * existing serializer only emits `["label"]` (rect) for all nodes.
 */
export function vcmToDSL(diagram: VisualDiagram): string {
  // Graphviz now has a direct VCM-to-DSL serializer that preserves edge directions perfectly.
  if (diagram.language === 'graphviz') {
    return serializeGraphvizVCM(diagram);
  }

  const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(diagram);

  const rawDSL = serializeDiagram(
    rfNodes,
    rfEdges,
    diagram.language,
    diagram.subType,
  );

  // Post-process: replace rect brackets with shape-specific brackets
  if (diagram.language === 'mermaid' && diagram.subType === 'flowchart') {
    return postProcessFlowchartShapes(rawDSL, diagram);
  }

  return rawDSL;
}

/**
 * Replace the default `["label"]` bracket in serialised Mermaid flowchart
 * with the correct shape bracket for each node.
 */
function postProcessFlowchartShapes(
  dsl: string,
  diagram: VisualDiagram,
): string {
  let result = dsl;

  // Also inject direction if non-default
  if (diagram.direction && diagram.direction !== 'TB') {
    result = result.replace(/^flowchart\s+\w+/m, `flowchart ${diagram.direction}`);
  }

  for (const vNode of diagram.nodes) {
    if (vNode.shape === 'roundedRect' || vNode.shape === 'rect') continue; // default, skip

    // Replace:  nodeId["label"]  with  nodeId{shape-bracket}
    const esc = vNode.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${esc})\\["([^"]*)"\\]`);
    const replacement = `$1${wrapLabelForShape('$2', vNode.shape)}`;
    result = result.replace(pattern, replacement);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.  Convenience: DSL text → VCM (one-shot)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse raw DSL code into a VisualDiagram in one call.
 */
export function dslToVCM(code: string, language: string): VisualDiagram {
  const parsed = parseDiagramCode(code, language);
  return parsedDiagramToVCM(parsed, code);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5.  React Flow state → VCM  (for visual edits)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patch an existing VisualDiagram using the current React Flow node/edge
 * arrays.  Preserves VCM-only data (shapes, cardinalities, groups, metadata)
 * that React Flow doesn't know about, while picking up position/label/
 * connection changes from the visual editor.
 *
 * @param rfNodes  — current React Flow nodes
 * @param rfEdges  — current React Flow edges
 * @param prev     — the previous VisualDiagram (carries shapes, cardinalities, etc.)
 */
export function reactFlowToVCM(
  rfNodes: Node[],
  rfEdges: Edge[],
  prev: VisualDiagram,
): VisualDiagram {
  // Build a map of existing VCM nodes for look-up
  const prevNodeMap = new Map(prev.nodes.map((n) => [n.id, n]));
  const prevEdgeMap = new Map(prev.edges.map((e) => [e.id, e]));

  // Merge RF nodes with existing VCM data
  const nodes: VisualNode[] = rfNodes.map((rfn) => {
    const existing = prevNodeMap.get(rfn.id);

    if (existing) {
      // Preserve VCM-only fields, update position + label from RF
      return {
        ...existing,
        label: String(rfn.data?.label ?? existing.label),
        position: { ...rfn.position },
        // Update fields/methods if they changed in RF
        fields: rfn.data?.fields
          ? parseFields(rfn.data.fields as string[])
          : existing.fields,
        methods: rfn.data?.methods
          ? parseFields(rfn.data.methods as string[])
          : existing.methods,
      };
    }

    // Brand-new node added in the visual editor
    return rfNodeToVisualNode(rfn, prev.subType);
  });

  // Merge RF edges with existing VCM data
  const edges: VisualEdge[] = rfEdges.map((rfe) => {
    const existing = prevEdgeMap.get(rfe.id);

    if (existing) {
      // Preserve cardinalities, custom arrows, metadata; update label/animated
      return {
        ...existing,
        sourceNodeId: rfe.source,
        targetNodeId: rfe.target,
        sourcePortId: rfe.sourceHandle ?? existing.sourcePortId,
        targetPortId: rfe.targetHandle ?? existing.targetPortId,
        label: rfe.label ? String(rfe.label) : existing.label,
        animated: rfe.animated ?? existing.animated,
        lineType: inferEdgeLineType(rfe),
      };
    }

    // Brand-new edge drawn in the visual editor
    return rfEdgeToVisualEdge(rfe);
  });

  return updateDiagram(prev, { nodes, edges });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6.  Full round-trip helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full DSL → VCM → DSL round-trip.
 * Useful for normalizing / reformatting code.
 */
export function roundTrip(code: string, language: string): string {
  const vcm = dslToVCM(code, language);
  return vcmToDSL(vcm);
}

/**
 * Diff two VisualDiagrams and return a summary of changes.
 * Useful for debugging sync issues.
 */
export function diffDiagrams(
  a: VisualDiagram,
  b: VisualDiagram,
): {
  addedNodes: string[];
  removedNodes: string[];
  movedNodes: string[];
  renamedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
} {
  const aNodeIds = new Set(a.nodes.map((n) => n.id));
  const bNodeIds = new Set(b.nodes.map((n) => n.id));
  const aEdgeIds = new Set(a.edges.map((e) => e.id));
  const bEdgeIds = new Set(b.edges.map((e) => e.id));

  const aNodeMap = new Map(a.nodes.map((n) => [n.id, n]));
  const bNodeMap = new Map(b.nodes.map((n) => [n.id, n]));

  const addedNodes = b.nodes.filter((n) => !aNodeIds.has(n.id)).map((n) => n.id);
  const removedNodes = a.nodes.filter((n) => !bNodeIds.has(n.id)).map((n) => n.id);

  const movedNodes: string[] = [];
  const renamedNodes: string[] = [];

  for (const [id, bNode] of bNodeMap) {
    const aNode = aNodeMap.get(id);
    if (!aNode) continue;
    if (aNode.position.x !== bNode.position.x || aNode.position.y !== bNode.position.y) {
      movedNodes.push(id);
    }
    if (aNode.label !== bNode.label) {
      renamedNodes.push(id);
    }
  }

  return {
    addedNodes,
    removedNodes,
    movedNodes,
    renamedNodes,
    addedEdges: b.edges.filter((e) => !aEdgeIds.has(e.id)).map((e) => e.id),
    removedEdges: a.edges.filter((e) => !bEdgeIds.has(e.id)).map((e) => e.id),
  };
}
