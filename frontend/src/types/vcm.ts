/**
 * Visual Canonical Model (VCM)
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * A single, language-agnostic intermediate representation for every diagram the
 * editor understands.  All DSL parsers produce a VisualDiagram, all renderers
 * consume one, and every visual mutation operates directly on VCM objects.
 *
 * Supported DSLs:
 *   • Mermaid  — flowchart, classDiagram, erDiagram, sequenceDiagram, stateDiagram
 *   • DBML     — Table / Ref definitions
 *   • Graphviz — DOT digraph / graph (with clusters)
 *
 * Design goals:
 *   1. Full round-trip fidelity  (parse → VCM → serialize = identity)
 *   2. Every visual property that React Flow needs is pre-computed here
 *   3. Immutable-friendly (plain objects, no class instances)
 */

// ─── Diagram Languages & Sub-types ─────────────────────────────────────────────

/** Top-level diagram languages the app supports. */
export type DiagramLanguage = 'mermaid' | 'dbml' | 'graphviz';

/** Mermaid sub-types that influence parsing / serialisation / rendering. */
export type MermaidSubType =
  | 'flowchart'
  | 'classDiagram'
  | 'erDiagram'
  | 'sequenceDiagram'
  | 'stateDiagram';

/** Graphviz sub-types. */
export type GraphvizSubType = 'digraph' | 'graph';

/** Union of all sub-types for convenience. */
export type DiagramSubType = MermaidSubType | GraphvizSubType | 'erDiagram' /* DBML reuses ER */;

// ─── Node Shapes ────────────────────────────────────────────────────────────────

/**
 * Canonical node shapes.  React Flow custom nodes will select their geometry /
 * SVG path based on this discriminator.
 *
 *   rect        – default box (flowchart, DOT)
 *   roundedRect – rounded corners (flowchart)
 *   diamond     – decision / condition (flowchart)
 *   cylinder    – database / store (flowchart, DOT)
 *   circle      – start / end state (stateDiagram)
 *   doubleCircle – final state (stateDiagram)
 *   hexagon     – preparation step (flowchart)
 *   parallelogram – input / output (flowchart)
 *   stadium     – pill shape (flowchart)
 *   trapezoid   – manual operation (flowchart)
 *   lifeline    – sequence diagram actor + dashed vertical line
 *   table       – entity / class with columnar fields (class, ER, DBML)
 *   record      – Graphviz record node (multiple compartments)
 *   note        – annotation / comment
 *   subroutine  – double-bordered rect (flowchart)
 *   ellipse     – generic ellipse (DOT)
 */
export type NodeShape =
  | 'rect'
  | 'roundedRect'
  | 'diamond'
  | 'cylinder'
  | 'circle'
  | 'doubleCircle'
  | 'hexagon'
  | 'parallelogram'
  | 'stadium'
  | 'trapezoid'
  | 'lifeline'
  | 'table'
  | 'record'
  | 'note'
  | 'subroutine'
  | 'ellipse';

// ─── Ports ──────────────────────────────────────────────────────────────────────

/**
 * A VisualPort is a named connection point on a node.
 * Handles in React Flow map 1-to-1 to VisualPorts.
 */
export interface VisualPort {
  /** Unique within the parent node (e.g. "top", "field-userId"). */
  id: string;
  /** Compass position on the node boundary. */
  position: 'top' | 'bottom' | 'left' | 'right';
  /** Whether this port accepts incoming edges, outgoing, or both. */
  type: 'source' | 'target' | 'both';
  /** Optional display label next to the handle. */
  label?: string;
}

// ─── Node Fields (Table / Class / ER) ───────────────────────────────────────────

/** A single field row inside a table / class / entity node. */
export interface NodeField {
  /** Raw text as it appears in the DSL (e.g. "string name PK"). */
  raw: string;
  /** Parsed field name, if available. */
  name?: string;
  /** Parsed data type, if available. */
  dataType?: string;
  /** Constraints / annotations (e.g. "PK", "FK", "NOT NULL"). */
  constraints?: string[];
  /** Visibility modifier for class diagrams (+, -, #, ~). */
  visibility?: '+' | '-' | '#' | '~';
  /** If true, this is a method rather than a field. */
  isMethod?: boolean;
}

// ─── Style ──────────────────────────────────────────────────────────────────────

/**
 * Visual style overrides that can be attached to any node or edge.
 * All properties are optional — the renderer falls back to theme defaults.
 */
export interface VisualStyle {
  /** Fill / background colour (CSS value). */
  fill?: string;
  /** Stroke / border colour. */
  stroke?: string;
  /** Stroke width in px. */
  strokeWidth?: number;
  /** Stroke dash-array (e.g. "5,5" for dashed). */
  strokeDasharray?: string;
  /** Border radius in px (only nodes). */
  borderRadius?: number;
  /** Text colour. */
  color?: string;
  /** Font size in px. */
  fontSize?: number;
  /** Font weight (CSS value). */
  fontWeight?: number | string;
  /** Font family. */
  fontFamily?: string;
  /** CSS opacity 0–1. */
  opacity?: number;
  /** Min width in px. */
  minWidth?: number;
  /** Min height in px. */
  minHeight?: number;
  /** Extra CSS class names. */
  className?: string;
}

// ─── Visual Node ────────────────────────────────────────────────────────────────

/**
 * A single visual node.  This is the *canonical* representation — the React
 * Flow `Node` object is derived from it at render time.
 */
export interface VisualNode {
  /** Globally unique within the diagram. */
  id: string;

  /** Human-readable label (rendered inside the shape). */
  label: string;

  /** Canonical shape — drives the custom React Flow node component. */
  shape: NodeShape;

  /** Position on the canvas (px). Set by parser auto-layout or user drag. */
  position: { x: number; y: number };

  /** Explicit width/height if known (e.g. from Graphviz). */
  size?: { width: number; height: number };

  /** Connection ports exposed by this node. */
  ports: VisualPort[];

  /**
   * Structured fields for table / class / entity shapes.
   * Ignored for simple shapes (rect, diamond, circle …).
   */
  fields?: NodeField[];

  /**
   * Structured methods (class diagrams only).
   */
  methods?: NodeField[];

  /**
   * ID of the VisualGroup this node belongs to (if any).
   * A node may only belong to one group.
   */
  parentGroupId?: string;

  /** Style overrides (merged on top of theme defaults). */
  style?: VisualStyle;

  /**
   * Opaque metadata bucket for DSL-specific data that must survive round-trip
   * but has no visual meaning (e.g. Graphviz attributes, Mermaid class styling).
   */
  metadata?: Record<string, unknown>;
}

// ─── Edge Types ─────────────────────────────────────────────────────────────────

/**
 * Logical edge/arrow type.
 *   solid   — default arrow
 *   dashed  — dependency / async
 *   dotted  — weak / optional
 *   thick   — bold emphasis
 */
export type EdgeLineType = 'solid' | 'dashed' | 'dotted' | 'thick';

/**
 * Arrow-head shape at either end of the edge.
 */
export type ArrowShape =
  | 'none'
  | 'arrow'         // simple open arrowhead ▸
  | 'arrowClosed'   // filled arrowhead ▶
  | 'diamond'       // composition ◆
  | 'diamondOpen'   // aggregation ◇
  | 'circle'        // ●  (association)
  | 'circleOpen'    // ○
  | 'triangle'      // inheritance △
  | 'triangleFilled'// ▲
  | 'crow'          // crow's foot  (ER "many")
  | 'tee';          // perpendicular bar  (ER "one")

// ─── Edge Cardinalities (ER diagrams) ───────────────────────────────────────────

/**
 * ER cardinality notation for one end of a relationship.
 * `min` and `max` follow standard (0, 1, n) notation.
 *
 * Examples:
 *   ||   → exactly one  → { min: '1', max: '1' }
 *   o{   → zero-or-many → { min: '0', max: 'n' }
 *   |{   → one-or-many  → { min: '1', max: 'n' }
 *   o|   → zero-or-one  → { min: '0', max: '1' }
 */
export interface Cardinality {
  min: '0' | '1';
  max: '1' | 'n';
}

// ─── Visual Edge ────────────────────────────────────────────────────────────────

/**
 * A single visual edge / connection between two nodes (or ports).
 */
export interface VisualEdge {
  /** Globally unique within the diagram. */
  id: string;

  /** Source node ID. */
  sourceNodeId: string;
  /** Optional source port ID (defaults to nearest). */
  sourcePortId?: string;

  /** Target node ID. */
  targetNodeId: string;
  /** Optional target port ID (defaults to nearest). */
  targetPortId?: string;

  /** Edge label text (rendered at midpoint). */
  label?: string;

  /** Logical line style. */
  lineType: EdgeLineType;

  /** Arrow heads. */
  sourceArrow: ArrowShape;
  targetArrow: ArrowShape;

  /** ER cardinality at source end (only for erDiagram / DBML). */
  sourceCardinality?: Cardinality;
  /** ER cardinality at target end. */
  targetCardinality?: Cardinality;

  /** Is the edge animated (moving dashes)? */
  animated: boolean;

  /** Style overrides. */
  style?: VisualStyle;

  /** Opaque DSL-specific metadata. */
  metadata?: Record<string, unknown>;
}

// ─── Visual Group / Cluster ─────────────────────────────────────────────────────

/**
 * Represents a Mermaid subgraph, a Graphviz cluster, or any logical grouping
 * of nodes.  Groups can be nested (parentGroupId → another group).
 */
export interface VisualGroup {
  /** Globally unique group ID. */
  id: string;

  /** Display label for the group (rendered as a header). */
  label: string;

  /** Direct child node IDs. */
  nodeIds: string[];

  /** Direct child group IDs (nested subgraphs). */
  childGroupIds: string[];

  /** Parent group ID, if nested. */
  parentGroupId?: string;

  /**
   * Position & size of the group bounding box.
   * Auto-calculated from children if not set.
   */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** Whether the group is visually collapsed (nodes hidden). */
  collapsed: boolean;

  /** Style overrides for the group container. */
  style?: VisualStyle;

  /** Opaque DSL-specific metadata. */
  metadata?: Record<string, unknown>;
}

// ─── Visual Theme ───────────────────────────────────────────────────────────────

/**
 * Theme overrides applied to the entire diagram.
 * Shape-level defaults can override the global theme on a per-shape basis.
 */
export interface VisualTheme {
  /** Background colour of the canvas. */
  canvasBackground?: string;
  /** Default node style (applied to all shapes unless overridden). */
  nodeDefaults?: VisualStyle;
  /** Per-shape default overrides, keyed by `NodeShape`. */
  shapeDefaults?: Partial<Record<NodeShape, VisualStyle>>;
  /** Default edge style. */
  edgeDefaults?: VisualStyle;
  /** Default group/cluster style. */
  groupDefaults?: VisualStyle;
  /** Grid snap size in px. */
  gridSize?: number;
}

// ─── Visual Diagram (top-level container) ───────────────────────────────────────

/**
 * The root VCM object.  This is the **single source of truth** that sits
 * between the DSL text and the React Flow renderer.
 *
 * Data flow:
 *   DSL text → parser adapter → VisualDiagram → React Flow nodes/edges
 *   React Flow events → mutate VisualDiagram → serialiser adapter → DSL text
 */
export interface VisualDiagram {
  /** Top-level diagram language. */
  language: DiagramLanguage;

  /** Sub-type within the language. */
  subType: DiagramSubType;

  /** All nodes in the diagram. */
  nodes: VisualNode[];

  /** All edges in the diagram. */
  edges: VisualEdge[];

  /** Groups / clusters (may be empty). */
  groups: VisualGroup[];

  /** Diagram-level theme overrides. */
  theme?: VisualTheme;

  /**
   * Monotonically-increasing version counter.
   * Bumped on every mutation — used for change-detection and undo/redo.
   */
  version: number;

  /**
   * Optional direction hint for layout (TB, LR, RL, BT).
   * Mermaid flowchart uses this directly; other DSLs interpret as needed.
   */
  direction?: 'TB' | 'LR' | 'RL' | 'BT';

  /** Opaque DSL-specific metadata (e.g. Graphviz graph attributes). */
  metadata?: Record<string, unknown>;
}

// ─── Factory Helpers ────────────────────────────────────────────────────────────

/** Default ports for simple (non-table) shapes. */
export const DEFAULT_PORTS: VisualPort[] = [
  { id: 'top',    position: 'top',    type: 'target' },
  { id: 'bottom', position: 'bottom', type: 'source' },
  { id: 'left',   position: 'left',   type: 'target' },
  { id: 'right',  position: 'right',  type: 'source' },
];

/** Create a blank VisualNode with sensible defaults. */
export function createVisualNode(
  overrides: Partial<VisualNode> & Pick<VisualNode, 'id' | 'label'>
): VisualNode {
  return {
    shape: 'roundedRect',
    position: { x: 0, y: 0 },
    ports: [...DEFAULT_PORTS],
    ...overrides,
  };
}

/** Create a blank VisualEdge with sensible defaults. */
export function createVisualEdge(
  overrides: Partial<VisualEdge> & Pick<VisualEdge, 'id' | 'sourceNodeId' | 'targetNodeId'>
): VisualEdge {
  return {
    lineType: 'solid',
    sourceArrow: 'none',
    targetArrow: 'arrowClosed',
    animated: false,
    ...overrides,
  };
}

/** Create an empty VisualGroup. */
export function createVisualGroup(
  overrides: Partial<VisualGroup> & Pick<VisualGroup, 'id' | 'label'>
): VisualGroup {
  return {
    nodeIds: [],
    childGroupIds: [],
    collapsed: false,
    ...overrides,
  };
}

/** Create an empty VisualDiagram. */
export function createVisualDiagram(
  language: DiagramLanguage = 'mermaid',
  subType: DiagramSubType = 'flowchart'
): VisualDiagram {
  return {
    language,
    subType,
    nodes: [],
    edges: [],
    groups: [],
    version: 0,
  };
}

// ─── Look-up Helpers ────────────────────────────────────────────────────────────

/** Find a node by ID (returns undefined if missing). */
export function findNode(diagram: VisualDiagram, id: string): VisualNode | undefined {
  return diagram.nodes.find((n) => n.id === id);
}

/** Find an edge by ID. */
export function findEdge(diagram: VisualDiagram, id: string): VisualEdge | undefined {
  return diagram.edges.find((e) => e.id === id);
}

/** Find a group by ID. */
export function findGroup(diagram: VisualDiagram, id: string): VisualGroup | undefined {
  return diagram.groups.find((g) => g.id === id);
}

/** Return all nodes that belong to a given group. */
export function nodesInGroup(diagram: VisualDiagram, groupId: string): VisualNode[] {
  return diagram.nodes.filter((n) => n.parentGroupId === groupId);
}

/** Return all edges connected to a given node (as source or target). */
export function edgesForNode(diagram: VisualDiagram, nodeId: string): VisualEdge[] {
  return diagram.edges.filter(
    (e) => e.sourceNodeId === nodeId || e.targetNodeId === nodeId
  );
}

// ─── Immutable Mutation Helpers ─────────────────────────────────────────────────

/**
 * Return a new VisualDiagram with an incremented version counter and the
 * supplied partial overrides merged in.  Does NOT mutate the original.
 */
export function updateDiagram(
  diagram: VisualDiagram,
  patch: Partial<Omit<VisualDiagram, 'version'>>
): VisualDiagram {
  return {
    ...diagram,
    ...patch,
    version: diagram.version + 1,
  };
}

/**
 * Replace a single node by ID, returning a new diagram.
 * If the node is not found, the diagram is returned unchanged (but version still bumps).
 */
export function replaceNode(
  diagram: VisualDiagram,
  nodeId: string,
  patch: Partial<VisualNode>
): VisualDiagram {
  return updateDiagram(diagram, {
    nodes: diagram.nodes.map((n) =>
      n.id === nodeId ? { ...n, ...patch } : n
    ),
  });
}

/**
 * Replace a single edge by ID, returning a new diagram.
 */
export function replaceEdge(
  diagram: VisualDiagram,
  edgeId: string,
  patch: Partial<VisualEdge>
): VisualDiagram {
  return updateDiagram(diagram, {
    edges: diagram.edges.map((e) =>
      e.id === edgeId ? { ...e, ...patch } : e
    ),
  });
}

/**
 * Add a node, returning a new diagram.
 */
export function addNode(diagram: VisualDiagram, node: VisualNode): VisualDiagram {
  return updateDiagram(diagram, {
    nodes: [...diagram.nodes, node],
  });
}

/**
 * Add an edge, returning a new diagram.
 */
export function addEdge(diagram: VisualDiagram, edge: VisualEdge): VisualDiagram {
  return updateDiagram(diagram, {
    edges: [...diagram.edges, edge],
  });
}

/**
 * Remove a node (and all connected edges), returning a new diagram.
 */
export function removeNode(diagram: VisualDiagram, nodeId: string): VisualDiagram {
  return updateDiagram(diagram, {
    nodes: diagram.nodes.filter((n) => n.id !== nodeId),
    edges: diagram.edges.filter(
      (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
    ),
    groups: diagram.groups.map((g) => ({
      ...g,
      nodeIds: g.nodeIds.filter((id) => id !== nodeId),
    })),
  });
}

/**
 * Remove an edge, returning a new diagram.
 */
export function removeEdge(diagram: VisualDiagram, edgeId: string): VisualDiagram {
  return updateDiagram(diagram, {
    edges: diagram.edges.filter((e) => e.id !== edgeId),
  });
}

/**
 * Move a node to a new position, returning a new diagram.
 */
export function moveNode(
  diagram: VisualDiagram,
  nodeId: string,
  position: { x: number; y: number }
): VisualDiagram {
  return replaceNode(diagram, nodeId, { position });
}

/**
 * Update a node's label, returning a new diagram.
 */
export function updateNodeLabel(
  diagram: VisualDiagram,
  nodeId: string,
  label: string
): VisualDiagram {
  return replaceNode(diagram, nodeId, { label });
}

// ─── Validation ─────────────────────────────────────────────────────────────────

/** Structural integrity checks.  Returns an array of human-readable warnings. */
export function validateDiagram(diagram: VisualDiagram): string[] {
  const warnings: string[] = [];
  const nodeIds = new Set(diagram.nodes.map((n) => n.id));
  const groupIds = new Set(diagram.groups.map((g) => g.id));

  // Check for duplicate node IDs
  if (nodeIds.size !== diagram.nodes.length) {
    warnings.push('Duplicate node IDs detected');
  }

  // Check edge references
  for (const edge of diagram.edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      warnings.push(`Edge "${edge.id}" references missing source node "${edge.sourceNodeId}"`);
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      warnings.push(`Edge "${edge.id}" references missing target node "${edge.targetNodeId}"`);
    }
  }

  // Check group references
  for (const group of diagram.groups) {
    for (const nid of group.nodeIds) {
      if (!nodeIds.has(nid)) {
        warnings.push(`Group "${group.id}" references missing node "${nid}"`);
      }
    }
    for (const cid of group.childGroupIds) {
      if (!groupIds.has(cid)) {
        warnings.push(`Group "${group.id}" references missing child group "${cid}"`);
      }
    }
    if (group.parentGroupId && !groupIds.has(group.parentGroupId)) {
      warnings.push(`Group "${group.id}" references missing parent group "${group.parentGroupId}"`);
    }
  }

  // Check node → group back-references
  for (const node of diagram.nodes) {
    if (node.parentGroupId && !groupIds.has(node.parentGroupId)) {
      warnings.push(`Node "${node.id}" references missing group "${node.parentGroupId}"`);
    }
  }

  return warnings;
}
