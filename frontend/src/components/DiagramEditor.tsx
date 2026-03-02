/**
 * DiagramEditor — Interactive visual diagram editor using React Flow.
 *
 * Architecture (Steps 2 + 3):
 *   The Visual Canonical Model (VCM) is the single source of truth.
 *   Data flow:
 *     DSL text → dslToVCM() → vcmRef  → vcmToReactFlow() → React Flow state
 *     RF events → reactFlowToVCM(prev) → vcmRef  → vcmToDSL() → onCodeChange()
 *
 *   Loop prevention:
 *     codeDrivenGenRef (monotonic counter) gates visual→code serialisation
 *     while a code→visual sync is in flight.
 *
 * Features:
 *   - Shape-accurate rendering (diamond, cylinder, lifeline, circle, table, …)
 *   - Drag & drop nodes to reposition them
 *   - Draw connections between nodes by dragging from handles
 *   - Double-click to edit node labels inline
 *   - Add new nodes via the toolbar
 *   - Delete selected nodes/edges with Backspace/Delete
 *   - Bidirectional sync: visual ↔ code via VCM
 *   - Minimap, controls, and background grid
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge as rfAddEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  MarkerType,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, MousePointer } from 'lucide-react';
import { theme } from '../theme';
import { customNodeTypes } from './DiagramNodes';

// VCM imports
import type { VisualDiagram } from '../types/vcm';
import { createVisualNode, createVisualEdge, addNode as vcmAddNode } from '../types/vcm';
import {
  dslToVCM,
  vcmToReactFlow,
  vcmToDSL,
  reactFlowToVCM,
} from '../utils/vcmAdapter';

// ── Default edge appearance ────────────────────────────────────────────────────

const EDGE_STYLE = { stroke: '#64748b', strokeWidth: 2 };
const EDGE_MARKER: Edge['markerEnd'] = { type: MarkerType.ArrowClosed, color: '#64748b' };

// ── Props ──────────────────────────────────────────────────────────────────────

interface DiagramEditorProps {
  code: string;
  language: string;
  onCodeChange: (newCode: string) => void;
}

// ── Inner component (must be inside ReactFlowProvider) ─────────────────────────

const DiagramEditorInner: React.FC<DiagramEditorProps> = ({
  code,
  language,
  onCodeChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  /**
   * The VCM is the source of truth.  Stored in a ref so that event handlers
   * always see the latest version without causing re-renders.
   */
  const vcmRef = useRef<VisualDiagram | null>(null);

  // Monotonic generation counter — any changes while !== 0 are suppressed
  const codeDrivenGenRef = useRef(0);
  const lastCodeRef = useRef(code);
  const serializeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stable label-change callback ────────────────────────────────────────

  const labelChangeRef = useRef<(id: string, label: string) => void>(() => {});
  const stableOnLabelChange = useCallback((nodeId: string, newLabel: string) => {
    labelChangeRef.current(nodeId, newLabel);
  }, []);

  // ── Code → VCM → React Flow sync ───────────────────────────────────────

  useEffect(() => {
    if (code === lastCodeRef.current && nodes.length > 0) return undefined;
    lastCodeRef.current = code;

    if (!code.trim()) {
      vcmRef.current = null;
      setNodes([]);
      setEdges([]);
      return undefined;
    }

    const gen = ++codeDrivenGenRef.current;

    // 1.  Parse DSL → VCM
    const vcm = dslToVCM(code, language);
    vcmRef.current = vcm;

    // 2.  VCM → React Flow nodes + edges
    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(vcm, stableOnLabelChange);

    // 3.  Set nodes first — React Flow needs to measure them
    setNodes(rfNodes);

    // 4.  Set edges after a frame so RF has dimensions
    const timer = setTimeout(() => {
      setEdges(rfEdges);

      requestAnimationFrame(() => {
        fitView({ padding: 0.3, duration: 200 });
        if (codeDrivenGenRef.current === gen) {
          codeDrivenGenRef.current = 0;
        }
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [code, language, stableOnLabelChange, fitView]);

  // ── VCM → DSL serialisation (debounced) ─────────────────────────────────

  const emitCodeFromVCM = useCallback(
    (vcm: VisualDiagram) => {
      if (codeDrivenGenRef.current !== 0) return;

      if (serializeTimeout.current) clearTimeout(serializeTimeout.current);

      serializeTimeout.current = setTimeout(() => {
        const newCode = vcmToDSL(vcm);
        if (newCode && newCode !== lastCodeRef.current) {
          lastCodeRef.current = newCode;
          onCodeChange(newCode);
        }
      }, 300);
    },
    [onCodeChange],
  );

  /**
   * Read current RF state, patch VCM, and emit DSL.
   * Used by node/edge change handlers.
   */
  const syncVCMFromRF = useCallback(
    (curNodes: Node[], curEdges: Edge[]) => {
      if (codeDrivenGenRef.current !== 0 || !vcmRef.current) return;

      const updated = reactFlowToVCM(curNodes, curEdges, vcmRef.current);
      vcmRef.current = updated;
      emitCodeFromVCM(updated);
    },
    [emitCodeFromVCM],
  );

  // ── Label change handler (keeps VCM in sync) ───────────────────────────

  useEffect(() => {
    labelChangeRef.current = (nodeId: string, newLabel: string) => {
      // Update RF nodes
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n,
        ),
      );
      // Sync VCM after RF state settles
      requestAnimationFrame(() => {
        setNodes((cur) => {
          setEdges((curEdges) => {
            syncVCMFromRF(cur, curEdges);
            return curEdges;
          });
          return cur;
        });
      });
    };
  });

  // ── Node changes (drag, remove) ─────────────────────────────────────────

  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      const significant = changes.some(
        (c) => c.type === 'position' || c.type === 'remove',
      );
      if (significant) {
        requestAnimationFrame(() => {
          setNodes((cur) => {
            setEdges((curEdges) => {
              syncVCMFromRF(cur, curEdges);
              return curEdges;
            });
            return cur;
          });
        });
      }
    },
    [onNodesChange, syncVCMFromRF],
  );

  // ── Edge changes (remove) ───────────────────────────────────────────────

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      if (changes.some((c) => c.type === 'remove')) {
        requestAnimationFrame(() => {
          setNodes((cur) => {
            setEdges((curEdges) => {
              syncVCMFromRF(cur, curEdges);
              return curEdges;
            });
            return cur;
          });
        });
      }
    },
    [onEdgesChange, syncVCMFromRF],
  );

  // ── New connection ──────────────────────────────────────────────────────

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'smoothstep',
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
        labelStyle: { fill: '#cbd5e1', fontSize: 11 },
      } as Edge;

      setEdges((eds) => {
        const updated = rfAddEdge(newEdge, eds);
        setNodes((cur) => {
          syncVCMFromRF(cur, updated);
          return cur;
        });
        return updated;
      });
    },
    [setEdges, syncVCMFromRF],
  );

  // ── Add node ────────────────────────────────────────────────────────────

  const handleAddNode = useCallback(() => {
    const id = `node_${Date.now()}`;

    // Create in VCM first
    const vNode = createVisualNode({
      id,
      label: 'New Node',
      shape: 'roundedRect',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
    });

    // If we have a VCM, add to it; the RF node is derived
    if (vcmRef.current) {
      vcmRef.current = vcmAddNode(vcmRef.current, vNode);
    }

    // Also add directly to RF for immediate visual feedback
    const rfNode: Node = {
      id,
      type: 'editableNode',
      position: { ...vNode.position },
      data: { label: 'New Node', onLabelChange: stableOnLabelChange, vcmShape: 'roundedRect' },
      style: { minWidth: 120 },
    };

    setNodes((nds) => {
      const updated = [...nds, rfNode];
      setEdges((curEdges) => {
        syncVCMFromRF(updated, curEdges);
        return curEdges;
      });
      return updated;
    });
  }, [setNodes, syncVCMFromRF, stableOnLabelChange]);

  // ── Delete selected ─────────────────────────────────────────────────────

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => {
      const remaining = nds.filter((n) => !n.selected);
      const removedIds = new Set(nds.filter((n) => n.selected).map((n) => n.id));

      setEdges((eds) => {
        const rem = eds.filter(
          (e) => !e.selected && !removedIds.has(e.source) && !removedIds.has(e.target),
        );
        syncVCMFromRF(remaining, rem);
        return rem;
      });

      return remaining;
    });
  }, [setNodes, setEdges, syncVCMFromRF]);

  // ── Keyboard ────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        (e.target as HTMLElement).tagName !== 'INPUT'
      ) {
        handleDeleteSelected();
      }
    },
    [handleDeleteSelected],
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      animated: false,
      style: EDGE_STYLE,
      markerEnd: EDGE_MARKER,
    }),
    [],
  );

  // ── Diagram info for status bar ─────────────────────────────────────────

  const subType = vcmRef.current?.subType ?? 'flowchart';

  return (
    <div
      className="w-full h-full"
      style={{ backgroundColor: theme.colors.bg.primary }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        nodeTypes={customNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        proOptions={proOptions}
        style={{ backgroundColor: theme.colors.bg.primary }}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={theme.colors.border.medium}
        />

        <Controls
          style={{
            button: {
              backgroundColor: theme.colors.bg.secondary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
              borderRadius: 6,
            },
          } as any}
        />

        <MiniMap
          style={{
            backgroundColor: theme.colors.bg.secondary,
            border: `1px solid ${theme.colors.border.medium}`,
            borderRadius: 8,
          }}
          nodeColor={(n) =>
            n.selected ? theme.colors.accent.primary : theme.colors.bg.quaternary
          }
          maskColor={`${theme.colors.bg.primary}90`}
        />

        {/* Toolbar */}
        <Panel position="top-right">
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-lg shadow-lg"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            <button
              onClick={handleAddNode}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.accent.primary,
              }}
              title="Add Node"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={handleDeleteSelected}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.status.error,
              }}
              title="Delete Selected (Del)"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </Panel>

        {/* Info bar */}
        <Panel position="bottom-left">
          <div
            className="flex items-center gap-3 text-xs px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: `${theme.colors.bg.secondary}dd`,
              color: theme.colors.text.tertiary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            <span>{nodes.length} nodes</span>
            <span>·</span>
            <span>{edges.length} edges</span>
            <span>·</span>
            <span className="text-[10px] opacity-60">{subType}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MousePointer size={10} />
              Drag to move, handles to connect
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// ── Public wrapper (provides ReactFlowProvider) ────────────────────────────────

export const DiagramEditor: React.FC<DiagramEditorProps> = (props) => (
  <ReactFlowProvider>
    <DiagramEditorInner {...props} />
  </ReactFlowProvider>
);
