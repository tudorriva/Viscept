/**
 * layoutEngine — automatic layout algorithms for the VCM.
 *
 * Provides two strategies:
 *   1. **Topological (layered)**:  Uses Dagre to assign layers, nodes are
 *      spread within each layer.  Works well for DAGs (flowcharts, pipelines).
 *   2. **Grid**:  Simple row/column grid for non-directional diagrams (ER, class).
 *
 * Both respect `VisualGroup` — grouped nodes are clustered together and the
 * group bounds are computed after placement.
 *
 * Usage:
 *   const laid = autoLayout(diagram, { algorithm: 'topological', direction: 'TB' });
 *   // → new VisualDiagram with updated node positions + group bounds
 */

import type { VisualDiagram, VisualNode, VisualGroup } from '../types/vcm';
import { updateDiagram } from '../types/vcm';
import dagre from 'dagre';

// ── Configuration ──────────────────────────────────────────────────────────────

export interface LayoutOptions {
  /** Layout algorithm. Defaults to 'topological'. */
  algorithm?: 'topological' | 'grid';

  /** Direction for topological layout. */
  direction?: 'TB' | 'LR' | 'RL' | 'BT';

  /** Horizontal gap between nodes (px). */
  nodeGapX?: number;

  /** Vertical gap between nodes (px). */
  nodeGapY?: number;

  /** Padding inside group bounding boxes. */
  groupPadding?: number;

  /** Estimated node width for spacing calculations. */
  nodeWidth?: number;

  /** Estimated node height for spacing calculations. */
  nodeHeight?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  algorithm: 'topological',
  direction: 'TB',
  nodeGapX: 120, // Reduced from 200 since dagre nodesep handles it better
  nodeGapY: 100, // ranksep
  groupPadding: 40,
  nodeWidth: 160,
  nodeHeight: 60,
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Run automatic layout on the given diagram, returning a new diagram with
 * updated node positions and group bounds.
 */
export function autoLayout(
  diagram: VisualDiagram,
  opts?: LayoutOptions,
): VisualDiagram {
  const cfg = { ...DEFAULTS, ...opts };

  // Respect diagram direction hint
  if (diagram.direction && !opts?.direction) {
    cfg.direction = diagram.direction;
  }

  if (diagram.nodes.length === 0) return diagram;

  const positioned =
    cfg.algorithm === 'grid'
      ? gridLayout(diagram, cfg)
      : topologicalLayout(diagram, cfg);

  // Recompute group bounds
  const groups = computeGroupBounds(positioned.nodes, diagram.groups, cfg);

  return updateDiagram(positioned, { groups });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Topological (layered) layout  — Dagre layout
// ═══════════════════════════════════════════════════════════════════════════════

function topologicalLayout(
  diagram: VisualDiagram,
  cfg: Required<LayoutOptions>,
): VisualDiagram {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: cfg.direction,
    ranksep: cfg.nodeGapY,
    nodesep: cfg.nodeGapX,
    edgesep: cfg.nodeGapX / 2,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  diagram.nodes.forEach((n) => {
    // We add some extra width if the label is long, so Dagre can avoid overlaps.
    const estimatedWidth = Math.max(cfg.nodeWidth, (n.label.length * 8) + 40);
    g.setNode(n.id, { width: estimatedWidth, height: cfg.nodeHeight });
  });

  diagram.edges.forEach((e) => {
    // If the edge has a label, tell Dagre it needs some space.
    const minlen = e.label ? 2 : 1; 
    const weight = 1;
    // Estimate label width so edges don't overlap as much
    const labelWidth = e.label ? e.label.length * 7 : 0;
    const labelHeight = e.label ? 20 : 0;

    g.setEdge(e.sourceNodeId, e.targetNodeId, {
      minlen,
      weight,
      width: labelWidth,
      height: labelHeight,
      labelpos: 'c',
    });
  });

  dagre.layout(g);

  const nodes: VisualNode[] = diagram.nodes.map((n) => {
    const nodeWithPosition = g.node(n.id);
    if (!nodeWithPosition) return n;
    
    // Dagre returns the center position, but React Flow expects the top-left corner.
    const x = nodeWithPosition.x - nodeWithPosition.width / 2;
    const y = nodeWithPosition.y - nodeWithPosition.height / 2;
    
    return { ...n, position: { x, y } };
  });

  return updateDiagram(diagram, { nodes });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Grid layout
// ═══════════════════════════════════════════════════════════════════════════════

function gridLayout(
  diagram: VisualDiagram,
  cfg: Required<LayoutOptions>,
): VisualDiagram {
  const cols = Math.max(1, Math.ceil(Math.sqrt(diagram.nodes.length)));

  const nodes: VisualNode[] = diagram.nodes.map((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...n,
      position: {
        x: 40 + col * cfg.nodeGapX,
        y: 40 + row * cfg.nodeGapY,
      },
    };
  });

  return updateDiagram(diagram, { nodes });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group bounding boxes
// ═══════════════════════════════════════════════════════════════════════════════

function computeGroupBounds(
  nodes: VisualNode[],
  groups: VisualGroup[],
  cfg: Required<LayoutOptions>,
): VisualGroup[] {
  if (groups.length === 0) return groups;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return groups.map((g) => {
    const memberNodes = g.nodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is VisualNode => n != null);

    if (memberNodes.length === 0) return g;

    const xs = memberNodes.map((n) => n.position.x);
    const ys = memberNodes.map((n) => n.position.y);
    const minX = Math.min(...xs) - cfg.groupPadding;
    const minY = Math.min(...ys) - cfg.groupPadding - 28; // 28 for header
    const maxX = Math.max(...xs) + cfg.nodeWidth + cfg.groupPadding;
    const maxY = Math.max(...ys) + cfg.nodeHeight + cfg.groupPadding;

    return {
      ...g,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
    };
  });
}
