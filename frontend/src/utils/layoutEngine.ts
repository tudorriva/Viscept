/**
 * layoutEngine — automatic layout algorithms for the VCM.
 *
 * Provides two strategies:
 *   1. **Topological (layered)**:  Kahn's algorithm assigns layers, nodes are
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
  nodeGapX: 200,
  nodeGapY: 120,
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
// Topological (layered) layout  — Kahn's algorithm
// ═══════════════════════════════════════════════════════════════════════════════

function topologicalLayout(
  diagram: VisualDiagram,
  cfg: Required<LayoutOptions>,
): VisualDiagram {
  const nodeIds = diagram.nodes.map((n) => n.id);
  const nodeSet = new Set(nodeIds);

  // Build adjacency
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const e of diagram.edges) {
    if (!nodeSet.has(e.sourceNodeId) || !nodeSet.has(e.targetNodeId)) continue;
    adj.get(e.sourceNodeId)!.push(e.targetNodeId);
    inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) ?? 0) + 1);
  }

  // Kahn's BFS to assign layers
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const layers: string[][] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const layer: string[] = [...queue];
    layers.push(layer);
    const nextQueue: string[] = [];

    for (const id of layer) {
      visited.add(id);
      for (const neighbour of adj.get(id) ?? []) {
        const newDeg = (inDegree.get(neighbour) ?? 1) - 1;
        inDegree.set(neighbour, newDeg);
        if (newDeg === 0 && !visited.has(neighbour)) {
          nextQueue.push(neighbour);
        }
      }
    }

    queue.length = 0;
    queue.push(...nextQueue);
  }

  // Any nodes not reached (cycles) go into an extra layer
  const unvisited = nodeIds.filter((id) => !visited.has(id));
  if (unvisited.length > 0) layers.push(unvisited);

  // Assign positions based on layer & index within layer
  const posMap = new Map<string, { x: number; y: number }>();
  const isHorizontal = cfg.direction === 'LR' || cfg.direction === 'RL';
  const isReversed = cfg.direction === 'RL' || cfg.direction === 'BT';

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    // Centre the layer
    const layerWidth = layer.length * (isHorizontal ? cfg.nodeGapY : cfg.nodeGapX);
    const startOffset = -layerWidth / 2;

    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      let primary = layerIdx * (isHorizontal ? cfg.nodeGapX : cfg.nodeGapY);
      if (isReversed) primary = (layers.length - 1 - layerIdx) * (isHorizontal ? cfg.nodeGapX : cfg.nodeGapY);
      const cross = startOffset + nodeIdx * (isHorizontal ? cfg.nodeGapY : cfg.nodeGapX);

      const x = isHorizontal ? primary : cross;
      const y = isHorizontal ? cross : primary;

      posMap.set(layer[nodeIdx], { x, y });
    }
  }

  // Normalise positions so top-left is (40, 40)
  const allPositions = Array.from(posMap.values());
  const minX = Math.min(...allPositions.map((p) => p.x));
  const minY = Math.min(...allPositions.map((p) => p.y));
  const offsetX = 40 - minX;
  const offsetY = 40 - minY;

  const nodes: VisualNode[] = diagram.nodes.map((n) => {
    const pos = posMap.get(n.id);
    if (!pos) return n;
    return { ...n, position: { x: pos.x + offsetX, y: pos.y + offsetY } };
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
