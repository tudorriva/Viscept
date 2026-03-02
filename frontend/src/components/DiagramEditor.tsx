/**
 * DiagramEditor — Interactive visual diagram editor using React Flow.
 *
 * Features:
 *   - Drag & drop nodes to reposition them
 *   - Draw connections between nodes by dragging from handles
 *   - Double-click to edit node labels inline
 *   - Add new nodes via the toolbar
 *   - Delete selected nodes/edges with Backspace/Delete
 *   - Bidirectional sync: visual changes → code updates
 *   - Minimap, controls, and background grid
 *
 * Key design decisions:
 *   - A monotonic counter (`codeDrivenGenRef`) replaces the boolean `isCodeDriven`
 *     flag to avoid the race-condition where React Flow's internal dimension
 *     changes would fire between the two rAF frames.
 *   - Edges are set in a setTimeout callback *after* nodes so that React Flow
 *     has measured node dimensions — the root cause of edges not appearing.
 *   - ReactFlowProvider wrapper enables `useReactFlow().fitView()`.
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
  addEdge,
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
import { parseDiagramCode } from '../utils/diagramParser';
import { serializeDiagram } from '../utils/diagramSerializer';

// ── Default edge appearance ────────────────────────────────────────────────────

const EDGE_STYLE = { stroke: '#64748b', strokeWidth: 2 };
const EDGE_MARKER: Edge['markerEnd'] = { type: MarkerType.ArrowClosed, color: '#64748b' };
const LABEL_STYLE = { fill: '#cbd5e1', fontSize: 11 };

function normalizeEdge(e: Edge): Edge {
  return {
    ...e,
    type: e.type || 'smoothstep',
    style: { ...EDGE_STYLE, ...(e.style || {}) },
    markerEnd: e.markerEnd || EDGE_MARKER,
    labelStyle: LABEL_STYLE,
  };
}

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
  const [subType, setSubType] = useState('flowchart');
  const { fitView } = useReactFlow();

  // Monotonic generation counter — any changes while !== 0 are suppressed
  const codeDrivenGenRef = useRef(0);
  const lastCodeRef = useRef(code);
  const serializeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable label-change callback
  const labelChangeRef = useRef<(id: string, label: string) => void>(() => {});
  const stableOnLabelChange = useCallback((nodeId: string, newLabel: string) => {
    labelChangeRef.current(nodeId, newLabel);
  }, []);

  // ── Code → Visual sync ──────────────────────────────────────────────────

  useEffect(() => {
    if (code === lastCodeRef.current && nodes.length > 0) return undefined;
    lastCodeRef.current = code;

    if (!code.trim()) {
      setNodes([]);
      setEdges([]);
      return undefined;
    }

    const gen = ++codeDrivenGenRef.current;

    const parsed = parseDiagramCode(code, language);
    setSubType(parsed.subType || 'flowchart');

    const nodesWithCallbacks = parsed.nodes.map((n: Node) => ({
      ...n,
      data: { ...n.data, onLabelChange: stableOnLabelChange },
    }));

    // Step 1: set nodes — React Flow measures them in the next paint
    setNodes(nodesWithCallbacks);

    // Step 2: set edges *after* nodes are measured
    const normalizedEdges = parsed.edges.map(normalizeEdge);
    const timer = setTimeout(() => {
      setEdges(normalizedEdges);

      requestAnimationFrame(() => {
        fitView({ padding: 0.3, duration: 200 });
        if (codeDrivenGenRef.current === gen) {
          codeDrivenGenRef.current = 0;
        }
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [code, language, stableOnLabelChange, fitView]);

  // ── Visual → Code serialisation ─────────────────────────────────────────

  const emitCodeChange = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[]) => {
      if (codeDrivenGenRef.current !== 0) return;

      if (serializeTimeout.current) clearTimeout(serializeTimeout.current);

      serializeTimeout.current = setTimeout(() => {
        const newCode = serializeDiagram(updatedNodes, updatedEdges, language, subType);
        if (newCode && newCode !== lastCodeRef.current) {
          lastCodeRef.current = newCode;
          onCodeChange(newCode);
        }
      }, 300);
    },
    [language, subType, onCodeChange],
  );

  // Keep label-change ref up to date
  useEffect(() => {
    labelChangeRef.current = (nodeId: string, newLabel: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n,
        ),
      );
      requestAnimationFrame(() => {
        setNodes((cur) => {
          setEdges((curEdges) => {
            emitCodeChange(cur, curEdges);
            return curEdges;
          });
          return cur;
        });
      });
    };
  });

  // ── Node changes ────────────────────────────────────────────────────────

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
              emitCodeChange(cur, curEdges);
              return curEdges;
            });
            return cur;
          });
        });
      }
    },
    [onNodesChange, emitCodeChange],
  );

  // ── Edge changes ────────────────────────────────────────────────────────

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      if (changes.some((c) => c.type === 'remove')) {
        requestAnimationFrame(() => {
          setNodes((cur) => {
            setEdges((curEdges) => {
              emitCodeChange(cur, curEdges);
              return curEdges;
            });
            return cur;
          });
        });
      }
    },
    [onEdgesChange, emitCodeChange],
  );

  // ── New connection ──────────────────────────────────────────────────────

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge = normalizeEdge({
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      } as Edge);

      setEdges((eds) => {
        const updated = addEdge(newEdge, eds);
        setNodes((cur) => {
          emitCodeChange(cur, updated);
          return cur;
        });
        return updated;
      });
    },
    [setEdges, emitCodeChange],
  );

  // ── Add node ────────────────────────────────────────────────────────────

  const handleAddNode = useCallback(() => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'editableNode',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: { label: 'New Node', onLabelChange: stableOnLabelChange },
      style: { minWidth: 120 },
    };

    setNodes((nds) => {
      const updated = [...nds, newNode];
      setEdges((curEdges) => {
        emitCodeChange(updated, curEdges);
        return curEdges;
      });
      return updated;
    });
  }, [setNodes, emitCodeChange, stableOnLabelChange]);

  // ── Delete selected ─────────────────────────────────────────────────────

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => {
      const remaining = nds.filter((n) => !n.selected);
      const removedIds = new Set(nds.filter((n) => n.selected).map((n) => n.id));

      setEdges((eds) => {
        const rem = eds.filter(
          (e) => !e.selected && !removedIds.has(e.source) && !removedIds.has(e.target),
        );
        emitCodeChange(remaining, rem);
        return rem;
      });

      return remaining;
    });
  }, [setNodes, setEdges, emitCodeChange]);

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
