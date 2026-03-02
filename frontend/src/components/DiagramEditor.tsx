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
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
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
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, MousePointer, Maximize2 } from 'lucide-react';
import { theme } from '../theme';
import { customNodeTypes } from './DiagramNodes';
import { parseDiagramCode, type ParsedDiagram } from '../utils/diagramParser';
import { serializeDiagram } from '../utils/diagramSerializer';

// ── Props ──────────────────────────────────────────────────────────────────────

interface DiagramEditorProps {
  /** Current diagram code */
  code: string;
  /** Diagram language: mermaid, dbml, graphviz */
  language: string;
  /** Callback fired when the visual editor changes the diagram */
  onCodeChange: (newCode: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  code,
  language,
  onCodeChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [subType, setSubType] = useState('flowchart');

  // Track whether the last change came from code (to avoid infinite loops)
  const isCodeDriven = useRef(false);
  const lastCodeRef = useRef(code);
  const serializeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable label-change callback passed to every node via data.onLabelChange
  const labelChangeRef = useRef<(id: string, label: string) => void>(() => {});
  const stableOnLabelChange = useCallback((nodeId: string, newLabel: string) => {
    labelChangeRef.current(nodeId, newLabel);
  }, []);

  // ── Parse code → nodes/edges (Code → Visual) ────────────────────────────

  useEffect(() => {
    // Only re-parse if the code actually changed externally
    if (code === lastCodeRef.current && nodes.length > 0) return;
    lastCodeRef.current = code;

    if (!code.trim()) {
      setNodes([]);
      setEdges([]);
      return;
    }

    isCodeDriven.current = true;

    const parsed = parseDiagramCode(code, language);
    setSubType(parsed.subType || 'flowchart');

    // Inject onLabelChange callback into every node
    const nodesWithCallbacks = parsed.nodes.map((n: Node) => ({
      ...n,
      data: { ...n.data, onLabelChange: stableOnLabelChange },
    }));
    setNodes(nodesWithCallbacks);

    // Normalize edge styles so they're visible on the dark background
    const normalizedEdges = parsed.edges.map((e: Edge) => ({
      ...e,
      style: { stroke: '#64748b', strokeWidth: 2, ...(e.style || {}) },
      markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, color: '#64748b' },
    }));
    setEdges(normalizedEdges);

    // Reset the flag after React Flow has finished measuring nodes and
    // processing the initial dimension changes.  A single rAF fires too
    // early — React Flow's internal node measurement also uses rAF, so we
    // wait two frames to be safe.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isCodeDriven.current = false;
      });
    });
  }, [code, language, stableOnLabelChange]);

  // ── Serialize nodes/edges → code (Visual → Code) ────────────────────────

  const emitCodeChange = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[]) => {
      if (isCodeDriven.current) return;

      // Debounce serialization to avoid spamming during drag
      if (serializeTimeout.current) {
        clearTimeout(serializeTimeout.current);
      }

      serializeTimeout.current = setTimeout(() => {
        const newCode = serializeDiagram(updatedNodes, updatedEdges, language, subType);
        if (newCode && newCode !== lastCodeRef.current) {
          lastCodeRef.current = newCode;
          onCodeChange(newCode);
        }
      }, 300);
    },
    [language, subType, onCodeChange]
  );

  // Keep label-change ref in sync with latest emitCodeChange
  useEffect(() => {
    labelChangeRef.current = (nodeId: string, newLabel: string) => {
      setNodes(nds => nds.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, label: newLabel } }
          : n
      ));
      requestAnimationFrame(() => {
        setNodes(current => {
          setEdges(currEdges => {
            emitCodeChange(current, currEdges);
            return currEdges;
          });
          return current;
        });
      });
    };
  });

  // ── Node change handler ──────────────────────────────────────────────────

  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Emit code change after position/dimension changes
      const significantChange = changes.some(
        (c) => c.type === 'position' || c.type === 'remove' || c.type === 'dimensions'
      );
      if (significantChange) {
        // We need the updated nodes — schedule after state update
        requestAnimationFrame(() => {
          setNodes((currentNodes) => {
            setEdges((currentEdges) => {
              emitCodeChange(currentNodes, currentEdges);
              return currentEdges;
            });
            return currentNodes;
          });
        });
      }
    },
    [onNodesChange, emitCodeChange]
  );

  // ── Edge change handler ──────────────────────────────────────────────────

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      const significantChange = changes.some(
        (c) => c.type === 'remove'
      );
      if (significantChange) {
        requestAnimationFrame(() => {
          setNodes((currentNodes) => {
            setEdges((currentEdges) => {
              emitCodeChange(currentNodes, currentEdges);
              return currentEdges;
            });
            return currentNodes;
          });
        });
      }
    },
    [onEdgesChange, emitCodeChange]
  );

  // ── Connect handler (draw new edge) ──────────────────────────────────────

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      } as Edge;

      setEdges((eds) => {
        const updated = addEdge(newEdge, eds);
        setNodes((currentNodes) => {
          emitCodeChange(currentNodes, updated);
          return currentNodes;
        });
        return updated;
      });
    },
    [setEdges, emitCodeChange]
  );

  // ── Add new node ─────────────────────────────────────────────────────────

  const handleAddNode = useCallback(() => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'editableNode',
      position: {
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 200,
      },
      data: { label: 'New Node', onLabelChange: stableOnLabelChange },
      style: { minWidth: 120 },
    };

    setNodes((nds) => {
      const updated = [...nds, newNode];
      setEdges((currentEdges) => {
        emitCodeChange(updated, currentEdges);
        return currentEdges;
      });
      return updated;
    });
  }, [setNodes, emitCodeChange]);

  // ── Delete selected ──────────────────────────────────────────────────────

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => {
      const remaining = nds.filter((n) => !n.selected);
      const removedIds = new Set(nds.filter((n) => n.selected).map((n) => n.id));

      setEdges((eds) => {
        const remainingEdges = eds.filter(
          (e) => !e.selected && !removedIds.has(e.source) && !removedIds.has(e.target)
        );
        emitCodeChange(remaining, remainingEdges);
        return remainingEdges;
      });

      return remaining;
    });
  }, [setNodes, setEdges, emitCodeChange]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not editing an input
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          handleDeleteSelected();
        }
      }
    },
    [handleDeleteSelected]
  );

  // ── Fit view on first render ─────────────────────────────────────────────

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 0.85 }), []);

  // ── Custom styles ────────────────────────────────────────────────────────

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

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
        defaultViewport={defaultViewport}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        proOptions={proOptions}
        style={{ backgroundColor: theme.colors.bg.primary }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        }}
      >
        {/* Background grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={theme.colors.border.medium}
        />

        {/* Controls */}
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

        {/* Minimap */}
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

        {/* Toolbar Panel */}
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
              title="Add Node (click to place)"
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

        {/* Info Panel */}
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
