/**
 * DiagramEditor — Interactive visual diagram editor using React Flow.
 *
 * Architecture (Steps 2 – 4):
 *   The Visual Canonical Model (VCM) is the single source of truth.
 *   Data flow:
 *     DSL text → dslToVCM() → vcmRef  → vcmToReactFlow() → React Flow state
 *     RF events → reactFlowToVCM(prev) → vcmRef  → vcmToDSL() → onCodeChange()
 *
 *   Loop prevention:
 *     codeDrivenGenRef (monotonic counter) gates visual→code serialisation
 *     while a code→visual sync is in flight.
 *
 * Features (Step 4 additions):
 *   - Undo / Redo (Ctrl+Z / Ctrl+Shift+Z) via useVCMHistory
 *   - Auto-layout (topological & grid) via layoutEngine
 *   - Group collapse / expand toggle
 *   - Node style customisation (fill, stroke, font-size, shape) via NodeStyleToolbar
 *   - All previous features: shape rendering, drag, connect, inline edit, etc.
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
import {
  Plus,
  Trash2,
  MousePointer,
  Undo2,
  Redo2,
  LayoutGrid,
  GitBranch,
} from 'lucide-react';
import { theme } from '../theme';
import { customNodeTypes } from './DiagramNodes';
import { NodeStyleToolbar, type StyleChange } from './NodeStyleToolbar';

// VCM imports
import type { VisualDiagram, VisualNode, VisualStyle, NodeShape } from '../types/vcm';
import {
  createVisualNode,
  createVisualEdge,
  addNode as vcmAddNode,
  replaceNode,
  updateDiagram,
  findNode,
} from '../types/vcm';
import {
  dslToVCM,
  vcmToReactFlow,
  vcmToDSL,
  reactFlowToVCM,
} from '../utils/vcmAdapter';
import { autoLayout, type LayoutOptions } from '../utils/layoutEngine';
import { useVCMHistory } from '../hooks/useVCMHistory';

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

  // ── Undo / Redo ─────────────────────────────────────────────────────────

  const history = useVCMHistory();

  // ── Selected-node tracking (for style toolbar) ──────────────────────────

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeShape, setSelectedNodeShape] = useState<NodeShape | undefined>();
  const [selectedNodeStyle, setSelectedNodeStyle] = useState<VisualStyle | undefined>();

  // ── Stable label-change callback (ref-based) ───────────────────────────

  const labelChangeRef = useRef<(id: string, label: string) => void>(() => {});
  const stableOnLabelChange = useCallback((nodeId: string, newLabel: string) => {
    labelChangeRef.current(nodeId, newLabel);
  }, []);

  // ── Stable group-toggle callback (ref-based) ──────────────────────────

  const groupToggleRef = useRef<(groupId: string) => void>(() => {});
  const stableOnGroupToggle = useCallback((groupId: string) => {
    groupToggleRef.current(groupId);
  }, []);

  // ── Helper: push VCM to React Flow ──────────────────────────────────────

  const applyVCMToRF = useCallback(
    (vcm: VisualDiagram, fit = false) => {
      const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(
        vcm,
        stableOnLabelChange,
        stableOnGroupToggle,
      );
      setNodes(rfNodes);
      const timer = setTimeout(() => {
        setEdges(rfEdges);
        if (fit) {
          requestAnimationFrame(() => fitView({ padding: 0.3, duration: 200 }));
        }
      }, 80);
      return timer;
    },
    [setNodes, setEdges, fitView, stableOnLabelChange, stableOnGroupToggle],
  );

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
    history.push(vcm);

    // 2.  VCM → React Flow nodes + edges
    const timer = applyVCMToRF(vcm, true);

    // 3. Release the gate after RF settles
    const releaseTimer = setTimeout(() => {
      if (codeDrivenGenRef.current === gen) {
        codeDrivenGenRef.current = 0;
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      clearTimeout(releaseTimer);
    };
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
   * Read current RF state, patch VCM, record history, and emit DSL.
   */
  const syncVCMFromRF = useCallback(
    (curNodes: Node[], curEdges: Edge[]) => {
      if (codeDrivenGenRef.current !== 0 || !vcmRef.current) return;

      const updated = reactFlowToVCM(curNodes, curEdges, vcmRef.current);
      vcmRef.current = updated;
      history.push(updated);
      emitCodeFromVCM(updated);
    },
    [emitCodeFromVCM, history],
  );

  // ── Label change handler (keeps VCM in sync) ───────────────────────────

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
            syncVCMFromRF(cur, curEdges);
            return curEdges;
          });
          return cur;
        });
      });
    };
  });

  // ── Group collapse/expand handler ───────────────────────────────────────

  useEffect(() => {
    groupToggleRef.current = (groupId: string) => {
      if (!vcmRef.current) return;

      const grp = vcmRef.current.groups.find((g) => g.id === groupId);
      if (!grp) return;

      const updatedGroups = vcmRef.current.groups.map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed } : g,
      );
      const newVCM = updateDiagram(vcmRef.current, { groups: updatedGroups });
      vcmRef.current = newVCM;
      history.push(newVCM);
      applyVCMToRF(newVCM);
      emitCodeFromVCM(newVCM);
    };
  });

  // ── Track selection for style toolbar ───────────────────────────────────

  useEffect(() => {
    const sel = nodes.find((n) => n.selected && !n.id.startsWith('__group__'));
    if (sel && vcmRef.current) {
      const vNode = findNode(vcmRef.current, sel.id);
      setSelectedNodeId(sel.id);
      setSelectedNodeShape(vNode?.shape);
      setSelectedNodeStyle(vNode?.style);
    } else {
      setSelectedNodeId(null);
      setSelectedNodeShape(undefined);
      setSelectedNodeStyle(undefined);
    }
  }, [nodes]);

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

    const vNode = createVisualNode({
      id,
      label: 'New Node',
      shape: 'roundedRect',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
    });

    if (vcmRef.current) {
      vcmRef.current = vcmAddNode(vcmRef.current, vNode);
      history.push(vcmRef.current);
    }

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
  }, [setNodes, syncVCMFromRF, stableOnLabelChange, history]);

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

  // ── Undo / Redo handlers ─────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    const snapshot = history.undo();
    if (!snapshot) return;

    vcmRef.current = snapshot;
    applyVCMToRF(snapshot);

    const newCode = vcmToDSL(snapshot);
    if (newCode && newCode !== lastCodeRef.current) {
      lastCodeRef.current = newCode;
      onCodeChange(newCode);
    }
  }, [history, applyVCMToRF, onCodeChange]);

  const handleRedo = useCallback(() => {
    const snapshot = history.redo();
    if (!snapshot) return;

    vcmRef.current = snapshot;
    applyVCMToRF(snapshot);

    const newCode = vcmToDSL(snapshot);
    if (newCode && newCode !== lastCodeRef.current) {
      lastCodeRef.current = newCode;
      onCodeChange(newCode);
    }
  }, [history, applyVCMToRF, onCodeChange]);

  // ── Auto-layout ─────────────────────────────────────────────────────────

  const handleAutoLayout = useCallback(
    (algorithm: 'topological' | 'grid') => {
      if (!vcmRef.current) return;

      const laid = autoLayout(vcmRef.current, { algorithm });
      vcmRef.current = laid;
      history.push(laid);
      applyVCMToRF(laid, true);
      emitCodeFromVCM(laid);
    },
    [applyVCMToRF, emitCodeFromVCM, history],
  );

  // ── Style change handler ────────────────────────────────────────────────

  const handleStyleChange = useCallback(
    (change: StyleChange) => {
      if (!vcmRef.current) return;

      let newVCM = vcmRef.current;

      if (change.style) {
        const existing = findNode(newVCM, change.nodeId);
        if (existing) {
          const mergedStyle: VisualStyle = {
            ...(existing.style ?? {}),
            ...change.style,
          };
          // Remove undefined keys (reset to default)
          for (const key of Object.keys(mergedStyle) as (keyof VisualStyle)[]) {
            if (mergedStyle[key] === undefined) delete mergedStyle[key];
          }
          newVCM = replaceNode(newVCM, change.nodeId, { style: mergedStyle });
        }
      }

      if (change.shape) {
        newVCM = replaceNode(newVCM, change.nodeId, { shape: change.shape });
      }

      vcmRef.current = newVCM;
      history.push(newVCM);
      applyVCMToRF(newVCM);
      emitCodeFromVCM(newVCM);
    },
    [applyVCMToRF, emitCodeFromVCM, history],
  );

  // ── Keyboard ────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isInput) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !isInput
      ) {
        handleDeleteSelected();
      }
    },
    [handleDeleteSelected, handleUndo, handleRedo],
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

  // ── Toolbar button style helper ─────────────────────────────────────────

  const tbBtn = (
    color: string,
    disabled = false,
  ): React.CSSProperties => ({
    backgroundColor: theme.colors.bg.tertiary,
    color: disabled ? theme.colors.text.muted : color,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'default' : 'pointer',
  });

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

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <Panel position="top-right">
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-lg shadow-lg"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={!history.canUndo}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={tbBtn(theme.colors.text.secondary, !history.canUndo)}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>

            {/* Redo */}
            <button
              onClick={handleRedo}
              disabled={!history.canRedo}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={tbBtn(theme.colors.text.secondary, !history.canRedo)}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>

            {/* Separator */}
            <div
              style={{
                width: 1,
                height: 20,
                backgroundColor: theme.colors.border.medium,
              }}
            />

            {/* Topological layout */}
            <button
              onClick={() => handleAutoLayout('topological')}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={tbBtn(theme.colors.accent.tertiary)}
              title="Auto-layout (topological)"
            >
              <GitBranch size={16} />
            </button>

            {/* Grid layout */}
            <button
              onClick={() => handleAutoLayout('grid')}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={tbBtn(theme.colors.accent.tertiary)}
              title="Auto-layout (grid)"
            >
              <LayoutGrid size={16} />
            </button>

            {/* Separator */}
            <div
              style={{
                width: 1,
                height: 20,
                backgroundColor: theme.colors.border.medium,
              }}
            />

            {/* Add node */}
            <button
              onClick={handleAddNode}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={tbBtn(theme.colors.accent.primary)}
              title="Add Node"
            >
              <Plus size={16} />
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteSelected}
              className="p-2 rounded-md transition-all hover:scale-105"
              style={tbBtn(theme.colors.status.error)}
              title="Delete Selected (Del)"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </Panel>

        {/* ── Node style toolbar (contextual) ─────────────────────────── */}
        <Panel position="top-center">
          <NodeStyleToolbar
            selectedNodeId={selectedNodeId}
            currentShape={selectedNodeShape}
            currentStyle={selectedNodeStyle}
            onChange={handleStyleChange}
          />
        </Panel>

        {/* ── Info bar ─────────────────────────────────────────────────── */}
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
            {history.length > 1 && (
              <>
                <span>·</span>
                <span className="text-[10px] opacity-50">
                  history: {history.length}
                </span>
              </>
            )}
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
