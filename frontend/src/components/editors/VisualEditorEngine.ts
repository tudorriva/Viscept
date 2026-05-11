/**
 * VisualEditorEngine — Shared editing controller for all DSL-based canvas editors.
 *
 * This class encapsulates all visual editing operations (node/edge CRUD, selection,
 * layout, undo/redo) so that Mermaid, DBML, Graphviz, and PlantUML editors share
 * identical behavior.
 *
 * Design:
 *   • Methods are synchronous; caller manages React state updates
 *   • All state mutations return the new VCM; caller applies to refs and emits code
 *   • History integration via useVCMHistory hook (passed in options)
 *   • Selection tracked here; call getSelection() to query or setSelection() to update
 *   • Auto-layout uses layoutEngine.ts
 */

import { generateId } from '../../lib/utils';
import {
  type VisualDiagram,
  type VisualNode,
  type VisualEdge,
  type NodeShape,
  type VisualPort,
  type Cardinality,
} from '../../types/vcm';
import { autoLayout } from '../../utils/layoutEngine';
import { reactFlowToVCM, vcmToReactFlow } from '../../utils/vcmAdapter';
import { type VCMHistory } from '../../hooks/useVCMHistory';
import type { Node, Edge } from '@xyflow/react';

// ───────────────────────────────────────────────────────────────────────────────

export interface VisualEditorEngineOptions {
  history: VCMHistory;
  language: 'mermaid' | 'dbml' | 'graphviz' | 'plantuml';
}

export interface SelectionState {
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
}

// ───────────────────────────────────────────────────────────────────────────────

export class VisualEditorEngine {
  private history: VCMHistory;
  private language: 'mermaid' | 'dbml' | 'graphviz' | 'plantuml';
  private selection: SelectionState = {
    selectedNodeIds: new Set(),
    selectedEdgeIds: new Set(),
  };

  constructor(opts: VisualEditorEngineOptions) {
    this.history = opts.history;
    this.language = opts.language;
  }

  // ───── Node CRUD ─────────────────────────────────────────────────────────────

  /**
   * Create a new node at (x, y) with the given shape.
   * Returns the updated VCM; caller should apply to refs, emit code, and push history.
   */
  addNode(
    vcm: VisualDiagram,
    opts: {
      x: number;
      y: number;
      shape?: NodeShape;
      label?: string;
      fields?: any[];
    }
  ): VisualDiagram {
    const nodeId = generateId();

    const newNode: VisualNode = {
      id: nodeId,
      label: opts.label || `Node ${(vcm.nodes.length + 1)}`,
      shape: opts.shape || 'roundedRect',
      position: { x: opts.x, y: opts.y },
      size: { width: 120, height: 60 },
      ports: this.getDefaultPorts(opts.shape || 'rect'),
      fields: opts.fields,
      metadata: {
        source: 'user',
      },
    };

    return {
      ...vcm,
      nodes: [...vcm.nodes, newNode],
      version: vcm.version + 1,
    };
  }

  /**
   * Update a node's label.
   */
  updateNodeLabel(vcm: VisualDiagram, nodeId: string, label: string): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
      version: vcm.version + 1,
    };
  }

  /**
   * Update a node's shape.
   */
  updateNodeShape(vcm: VisualDiagram, nodeId: string, shape: NodeShape): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              shape,
              ports: this.getDefaultPorts(shape),
            }
          : n
      ),
      version: vcm.version + 1,
    };
  }

  /**
   * Delete a node and all its incident edges.
   */
  deleteNode(vcm: VisualDiagram, nodeId: string): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.filter((n) => n.id !== nodeId),
      edges: vcm.edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
      version: vcm.version + 1,
    };
  }

  /**
   * Update node position (for drag operations).
   */
  updateNodePosition(
    vcm: VisualDiagram,
    nodeId: string,
    x: number,
    y: number
  ): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.map((n) => (n.id === nodeId ? { ...n, position: { x, y } } : n)),
      version: vcm.version + 1,
    };
  }

  // ───── Edge CRUD ─────────────────────────────────────────────────────────────

  /**
   * Create a new edge between two nodes.
   */
  addEdge(
    vcm: VisualDiagram,
    opts: {
      source: string;
      target: string;
      label?: string;
      cardinality?: string;
      portSource?: string;
      portTarget?: string;
    }
  ): VisualDiagram {
    const edgeId = generateId();

    const cardinalityMap: Record<string, { sourceCardinality?: Cardinality; targetCardinality?: Cardinality }> = {
      one: { sourceCardinality: { min: '1', max: '1' }, targetCardinality: { min: '1', max: '1' } },
      'one-to-one': { sourceCardinality: { min: '1', max: '1' }, targetCardinality: { min: '1', max: '1' } },
      'one-to-many': { sourceCardinality: { min: '1', max: '1' }, targetCardinality: { min: '1', max: 'n' } },
      'many-to-one': { sourceCardinality: { min: '1', max: 'n' }, targetCardinality: { min: '1', max: '1' } },
      'many-to-many': { sourceCardinality: { min: '1', max: 'n' }, targetCardinality: { min: '1', max: 'n' } },
    };
    const mappedCardinality = opts.cardinality ? cardinalityMap[opts.cardinality] : undefined;

    const newEdge: VisualEdge = {
      id: edgeId,
      sourceNodeId: opts.source,
      targetNodeId: opts.target,
      label: opts.label || '',
      sourcePortId: opts.portSource,
      targetPortId: opts.portTarget,
      lineType: 'solid',
      sourceArrow: 'none',
      targetArrow: 'arrowClosed',
      animated: false,
      sourceCardinality: mappedCardinality?.sourceCardinality,
      targetCardinality: mappedCardinality?.targetCardinality,
      metadata: {
        source: 'user',
        cardinality: opts.cardinality || 'one',
      },
    };

    return {
      ...vcm,
      edges: [...vcm.edges, newEdge],
      version: vcm.version + 1,
    };
  }

  /**
   * Update an edge's label.
   */
  updateEdgeLabel(vcm: VisualDiagram, edgeId: string, label: string): VisualDiagram {
    return {
      ...vcm,
      edges: vcm.edges.map((e) => (e.id === edgeId ? { ...e, label } : e)),
      version: vcm.version + 1,
    };
  }

  /**
   * Update an edge's cardinality (for ER/DBML diagrams).
   */
  updateEdgeCardinality(
    vcm: VisualDiagram,
    edgeId: string,
    cardinality: string
  ): VisualDiagram {
    const cardinalityMap: Record<string, { sourceCardinality?: Cardinality; targetCardinality?: Cardinality }> = {
      one: { sourceCardinality: { min: '1', max: '1' }, targetCardinality: { min: '1', max: '1' } },
      'one-to-one': { sourceCardinality: { min: '1', max: '1' }, targetCardinality: { min: '1', max: '1' } },
      'one-to-many': { sourceCardinality: { min: '1', max: '1' }, targetCardinality: { min: '1', max: 'n' } },
      'many-to-one': { sourceCardinality: { min: '1', max: 'n' }, targetCardinality: { min: '1', max: '1' } },
      'many-to-many': { sourceCardinality: { min: '1', max: 'n' }, targetCardinality: { min: '1', max: 'n' } },
    };
    const mappedCardinality = cardinalityMap[cardinality];

    return {
      ...vcm,
      edges: vcm.edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              sourceCardinality: mappedCardinality?.sourceCardinality,
              targetCardinality: mappedCardinality?.targetCardinality,
              metadata: {
                ...(e.metadata || {}),
                cardinality,
              },
            }
          : e
      ),
      version: vcm.version + 1,
    };
  }

  /**
   * Delete an edge.
   */
  deleteEdge(vcm: VisualDiagram, edgeId: string): VisualDiagram {
    return {
      ...vcm,
      edges: vcm.edges.filter((e) => e.id !== edgeId),
      version: vcm.version + 1,
    };
  }

  // ───── Batch Operations ──────────────────────────────────────────────────────

  /**
   * Delete all selected nodes and edges.
   */
  deleteSelected(vcm: VisualDiagram): VisualDiagram {
    let result = vcm;

    // Delete selected nodes
    for (const nodeId of this.selection.selectedNodeIds) {
      result = this.deleteNode(result, nodeId);
    }

    // Delete selected edges
    for (const edgeId of this.selection.selectedEdgeIds) {
      result = this.deleteEdge(result, edgeId);
    }

    this.selection.selectedNodeIds.clear();
    this.selection.selectedEdgeIds.clear();

    return result;
  }

  /**
   * Apply auto-layout to all nodes.
   */
  autoLayoutDiagram(vcm: VisualDiagram, direction: 'TB' | 'LR' | 'RL' | 'BT' = 'TB'): VisualDiagram {
    return autoLayout(vcm, { direction });
  }

  // ───── Selection Management ──────────────────────────────────────────────────

  /**
   * Get current selection state.
   */
  getSelection(): SelectionState {
    return {
      selectedNodeIds: new Set(this.selection.selectedNodeIds),
      selectedEdgeIds: new Set(this.selection.selectedEdgeIds),
    };
  }

  /**
   * Set selection to specific nodes and edges.
   */
  setSelection(nodeIds: string[], edgeIds: string[]): void {
    this.selection.selectedNodeIds = new Set(nodeIds);
    this.selection.selectedEdgeIds = new Set(edgeIds);
  }

  /**
   * Clear all selection.
   */
  clearSelection(): void {
    this.selection.selectedNodeIds.clear();
    this.selection.selectedEdgeIds.clear();
  }

  /**
   * Toggle selection of a node (add if not selected, remove if already selected).
   */
  toggleNodeSelection(nodeId: string, multiSelect: boolean = false): void {
    if (!multiSelect) {
      this.selection.selectedNodeIds.clear();
      this.selection.selectedEdgeIds.clear();
    }

    if (this.selection.selectedNodeIds.has(nodeId)) {
      this.selection.selectedNodeIds.delete(nodeId);
    } else {
      this.selection.selectedNodeIds.add(nodeId);
    }
  }

  /**
   * Toggle selection of an edge.
   */
  toggleEdgeSelection(edgeId: string, multiSelect: boolean = false): void {
    if (!multiSelect) {
      this.selection.selectedNodeIds.clear();
      this.selection.selectedEdgeIds.clear();
    }

    if (this.selection.selectedEdgeIds.has(edgeId)) {
      this.selection.selectedEdgeIds.delete(edgeId);
    } else {
      this.selection.selectedEdgeIds.add(edgeId);
    }
  }

  // ───── DBML-Specific Operations ──────────────────────────────────────────────

  /**
   * Add a field to a table (DBML-specific).
   */
  addFieldToTable(
    vcm: VisualDiagram,
    tableNodeId: string,
    fieldName: string = 'new_field',
    dataType: string = 'string'
  ): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.map((n) =>
        n.id === tableNodeId
          ? {
              ...n,
              fields: [
                ...(n.fields || []),
                {
                  raw: `${fieldName} ${dataType}`,
                  name: fieldName,
                  dataType,
                  constraints: [],
                },
              ],
            }
          : n
      ),
      version: vcm.version + 1,
    };
  }

  /**
   * Remove a field from a table (DBML-specific).
   */
  removeFieldFromTable(
    vcm: VisualDiagram,
    tableNodeId: string,
    fieldIndex: number
  ): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.map((n) =>
        n.id === tableNodeId
          ? {
              ...n,
              fields: n.fields ? n.fields.filter((_, i) => i !== fieldIndex) : [],
            }
          : n
      ),
      version: vcm.version + 1,
    };
  }

  /**
   * Update a field in a table (DBML-specific).
   */
  updateFieldInTable(
    vcm: VisualDiagram,
    tableNodeId: string,
    fieldIndex: number,
    fieldName: string,
    dataType: string,
    constraints: string[] = []
  ): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.map((n) =>
        n.id === tableNodeId && n.fields
          ? {
              ...n,
              fields: n.fields.map((f, i) =>
                i === fieldIndex
                  ? {
                      raw: `${fieldName} ${dataType}${constraints.length > 0 ? ` [${constraints.join(', ')}]` : ''}`,
                      name: fieldName,
                      dataType,
                      constraints,
                    }
                  : f
              ),
            }
          : n
      ),
      version: vcm.version + 1,
    };
  }

  /**
   * Toggle PK constraint on a field (DBML-specific).
   */
  toggleFieldConstraint(
    vcm: VisualDiagram,
    tableNodeId: string,
    fieldIndex: number,
    constraint: 'PK' | 'FK' | 'NOT NULL' | 'UNIQUE'
  ): VisualDiagram {
    return {
      ...vcm,
      nodes: vcm.nodes.map((n) =>
        n.id === tableNodeId && n.fields
          ? {
              ...n,
              fields: n.fields.map((f, i) =>
                i === fieldIndex
                  ? {
                      ...f,
                      constraints: (f.constraints || []).includes(constraint)
                        ? (f.constraints || []).filter((c) => c !== constraint)
                        : [...(f.constraints || []), constraint],
                    }
                  : f
              ),
            }
          : n
      ),
      version: vcm.version + 1,
    };
  }

  /**
   * Create a relationship between two tables with optional column reference (DBML-specific).
   */
  createTableRelationship(
    vcm: VisualDiagram,
    sourceTableId: string,
    targetTableId: string,
    sourceColumn?: string,
    targetColumn?: string,
    cardinality: string = 'many-to-one'
  ): VisualDiagram {
    const label = sourceColumn || 'references';

    return this.addEdge(vcm, {
      source: sourceTableId,
      target: targetTableId,
      label,
      cardinality,
    });
  }

  // ───── Undo / Redo ───────────────────────────────────────────────────────────

  /**
   * Record current VCM state into history.
   */
  recordState(vcm: VisualDiagram): void {
    this.history.push(vcm);
  }

  /**
   * Undo to previous state.
   */
  undo(): VisualDiagram | null {
    return this.history.undo();
  }

  /**
   * Redo to next state.
   */
  redo(): VisualDiagram | null {
    return this.history.redo();
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.history.canUndo;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.history.canRedo;
  }

  // ───── Utility: Default Ports ────────────────────────────────────────────────

  /**
   * Get default ports for a given shape.
   */
  private getDefaultPorts(shape: NodeShape): VisualPort[] {
    const basePort = (position: 'top' | 'bottom' | 'left' | 'right') => ({
      id: `port-${position}`,
      position,
      type: 'both' as const,
    });

    // Different shapes have different port configurations
    switch (shape) {
      case 'table':
        // Tables get field-specific ports; return empty here
        return [];
      case 'lifeline':
        // Lifelines only have bottom port for sequence diagrams
        return [basePort('bottom')];
      case 'circle':
      case 'doubleCircle':
        // Circles get all 4 ports for flexibility
        return [
          basePort('top'),
          basePort('bottom'),
          basePort('left'),
          basePort('right'),
        ];
      default:
        // Most shapes get standard 4 ports
        return [
          basePort('top'),
          basePort('bottom'),
          basePort('left'),
          basePort('right'),
        ];
    }
  }

  // ───── React Flow ↔ VCM Sync ────────────────────────────────────────────────

  /**
   * Convert React Flow nodes/edges to updated VCM (called after user edits RF state).
   * This is used when node/edge positions change or other RF-tracked state is updated.
   */
  syncFromReactFlow(
    rfNodes: Node[],
    rfEdges: Edge[],
    vcm: VisualDiagram
  ): VisualDiagram {
    // reactFlowToVCM handles position sync and other conversions
    return reactFlowToVCM(rfNodes, rfEdges, vcm);
  }

  /**
   * Get initial React Flow nodes/edges from VCM (used when loading diagram).
   */
  getInitialReactFlow(vcm: VisualDiagram): { nodes: Node[]; edges: Edge[] } {
    return vcmToReactFlow(vcm);
  }
}
