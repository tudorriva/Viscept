/**
 * Mermaid Canvas Editor — Visual editor optimized for Mermaid diagrams.
 *
 * Features:
 * - Support for flowcharts, class diagrams, ER diagrams
 * - Node types: process, decision, IO, database, etc.
 * - Edge labels and types
 * - Subgraph support for grouping
 * - Auto-layout (top-to-bottom, left-to-right)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  useOnSelectionChange,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, LayoutGrid, GitBranch, Undo2, Redo2, X } from 'lucide-react';
import { theme } from '../../theme';
import { dslToVCM, vcmToReactFlow, vcmToDSL, reactFlowToVCM } from '../../utils/vcmAdapter';
import { useVCMHistory } from '../../hooks/useVCMHistory';
import { useEditorKeyboardShortcuts } from '../../hooks/useEditorKeyboardShortcuts';
import { customNodeTypes } from '../DiagramNodes';
import { VisualEditorEngine } from '../editors/VisualEditorEngine';
import { MermaidNodeEditor } from '../editors/MermaidNodeEditor';
import { MermaidEdgeEditor } from '../editors/MermaidEdgeEditor';
import { EditorStatusBar } from '../editors/EditorStatusBar';

interface MermaidCanvasEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

const MermaidCanvasEditorInner: React.FC<MermaidCanvasEditorProps> = ({ code, onCodeChange }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const vcmRef = useRef<any>(null);
  const engineRef = useRef<VisualEditorEngine | null>(null);
  const codeDrivenGenRef = useRef(0);
  const lastCodeRef = useRef(code);
  const addingNodeRef = useRef(false);
  const history = useVCMHistory();

  // Selection state for editors
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    engineRef.current = new VisualEditorEngine({ history, language: 'mermaid' });
  }, [history]);

  // ── Code → VCM → React Flow sync ───────────────────────────────────────

  useEffect(() => {
    const currentCode = code.trim();
    if (currentCode === lastCodeRef.current && nodes.length > 0) return undefined;
    lastCodeRef.current = currentCode;

    if (!currentCode) {
      vcmRef.current = null;
      setNodes([]);
      setEdges([]);
      return undefined;
    }

    const gen = ++codeDrivenGenRef.current;

    try {
      const vcm = dslToVCM(currentCode, 'mermaid');
      
      const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(vcm);
      
      setNodes(rfNodes);
      setEdges(rfEdges);
      vcmRef.current = vcm;
      history.push(vcm);
      
      // Fit view after React Flow has fully rendered nodes and calculated their dimensions
      // Use multiple frames to account for async React state updates and DOM layout
      const fitTimer = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitView({ padding: 0.3, duration: 200 });
          });
        });
      }, 0);

      const releaseTimer = setTimeout(() => {
        if (codeDrivenGenRef.current === gen) {
          codeDrivenGenRef.current = 0;
        }
      }, 300);

      return () => {
        clearTimeout(fitTimer);
        clearTimeout(releaseTimer);
      };
    } catch (error) {
      console.error('[Mermaid Editor] Parse error:', error);
      setNodes([]);
      setEdges([]);
      return undefined;
    }
  }, [code, setNodes, setEdges, fitView, history]);

  // ── VCM → DSL serialization ─────────────────────────────────────────────

  const emitCode = useCallback((vcm: any) => {
    if (codeDrivenGenRef.current !== 0) return;
    try {
      const newCode = vcmToDSL(vcm);
      onCodeChange(newCode);
    } catch (error) {
      console.error('[Mermaid Editor] Serialization error:', error);
    }
  }, [onCodeChange]);

  // ── Toolbar Actions ────────────────────────────────────────────────────

  const handleAddNode = useCallback(() => {
    if (!vcmRef.current || !engineRef.current) return;

    addingNodeRef.current = true;
    try {
      let updated = engineRef.current.addNode(vcmRef.current, {
        x: 250,
        y: 250,
        shape: 'rect',
        label: 'New Node',
      });

      vcmRef.current = updated;
      engineRef.current.recordState(updated);

      const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated);
      setNodes(rfNodes);
      setEdges(rfEdges);
      emitCode(updated);
    } finally {
      addingNodeRef.current = false;
    }
  }, [emitCode, setNodes, setEdges]);

  const handleDeleteSelected = useCallback(() => {
    if (!vcmRef.current || !engineRef.current) return;

    const updated = engineRef.current.deleteSelected(vcmRef.current);
    if (updated === vcmRef.current) return; // Nothing was selected

    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(updated);
  }, [emitCode, setNodes, setEdges]);

  const handleAutoLayout = useCallback(() => {
    if (!vcmRef.current || !engineRef.current) return;

    const updated = engineRef.current.autoLayoutDiagram(vcmRef.current, 'TB');
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes } = vcmToReactFlow(updated);
    setNodes(rfNodes);
    requestAnimationFrame(() => fitView({ padding: 0.3, duration: 200 }));
    emitCode(updated);
  }, [emitCode, setNodes, fitView]);

  const handleUndo = useCallback(() => {
    if (!engineRef.current) return;

    const previous = engineRef.current.undo();
    if (!previous) return;

    vcmRef.current = previous;
    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(previous);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(previous);
  }, [emitCode, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (!engineRef.current) return;

    const next = engineRef.current.redo();
    if (!next) return;

    vcmRef.current = next;
    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(next);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(next);
  }, [emitCode, setNodes, setEdges]);

  // Keyboard shortcuts (now after handlers are defined)
  useEditorKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDeleteSelected: handleDeleteSelected,
    onAddNode: handleAddNode,
  });

  // Track selection from React Flow
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (engineRef.current) {
        engineRef.current.setSelection(
          selectedNodes.map((n) => n.id),
          selectedEdges.map((e) => e.id)
        );
        // Set editor panel based on selection
        if (selectedNodes.length === 1) {
          setSelectedNodeId(selectedNodes[0].id);
          setSelectedEdgeId(null);
        } else if (selectedEdges.length === 1) {
          setSelectedEdgeId(selectedEdges[0].id);
          setSelectedNodeId(null);
        } else {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }
      }
    },
  });


  const handleNodesChange = useCallback(
    (changes: any) => {
      const nextNodes = applyNodeChanges(changes, nodes);
      onNodesChange(changes);
      if (!vcmRef.current || addingNodeRef.current) return;

      const updated = reactFlowToVCM(nextNodes, edges, vcmRef.current);
      vcmRef.current = updated;
      history.push(updated);
      emitCode(updated);
    },
    [nodes, edges, onNodesChange, emitCode, history]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      const nextEdges = applyEdgeChanges(changes, edges);
      onEdgesChange(changes);
      if (!vcmRef.current) return;

      const updated = reactFlowToVCM(nodes, nextEdges, vcmRef.current);
      vcmRef.current = updated;
      history.push(updated);
      emitCode(updated);
    },
    [nodes, edges, onEdgesChange, emitCode, history]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const edge = rfAddEdge(connection, edges);
      setEdges(edge);
      if (vcmRef.current && engineRef.current) {
        const updated = engineRef.current.addEdge(vcmRef.current, {
          source: connection.source!,
          target: connection.target!,
        });
        vcmRef.current = updated;
        engineRef.current.recordState(updated);
        emitCode(updated);
      }
    },
    [edges, setEdges, emitCode]
  );

  // ── Mermaid-specific Editing ────────────────────────────────────────────

  const handleNodeLabelChange = useCallback((newLabel: string) => {
    if (!vcmRef.current || !engineRef.current || !selectedNodeId) return;

    let updated = engineRef.current.updateNodeLabel(vcmRef.current, selectedNodeId, newLabel);
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes } = vcmToReactFlow(updated);
    setNodes(rfNodes);
    emitCode(updated);
  }, [selectedNodeId, emitCode, setNodes]);

  const handleNodeShapeChange = useCallback((newShape: any) => {
    if (!vcmRef.current || !engineRef.current || !selectedNodeId) return;

    let updated = engineRef.current.updateNodeShape(vcmRef.current, selectedNodeId, newShape);
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes } = vcmToReactFlow(updated);
    setNodes(rfNodes);
    emitCode(updated);
  }, [selectedNodeId, emitCode, setNodes]);

  const handleEdgeLabelChange = useCallback((newLabel: string) => {
    if (!vcmRef.current || !engineRef.current || !selectedEdgeId) return;

    let updated = engineRef.current.updateEdgeLabel(vcmRef.current, selectedEdgeId, newLabel);
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { edges: rfEdges } = vcmToReactFlow(updated);
    setEdges(rfEdges);
    emitCode(updated);
  }, [selectedEdgeId, emitCode, setEdges]);

  const handleEdgeDelete = useCallback(() => {
    if (!vcmRef.current || !engineRef.current || !selectedEdgeId) return;

    let updated = engineRef.current.deleteEdge(vcmRef.current, selectedEdgeId);
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { edges: rfEdges } = vcmToReactFlow(updated);
    setEdges(rfEdges);
    setSelectedEdgeId(null);
    emitCode(updated);
  }, [selectedEdgeId, emitCode, setEdges]);

  // Get selected node/edge data from VCM
  const selectedNode = selectedNodeId && vcmRef.current
    ? vcmRef.current.nodes.find((n: any) => n.id === selectedNodeId)
    : null;

  const selectedEdge = selectedEdgeId && vcmRef.current
    ? vcmRef.current.edges.find((e: any) => e.id === selectedEdgeId)
    : null;

  return (
    <div className="w-full h-full flex gap-3 flex-col">
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            nodeTypes={customNodeTypes}
            fitView
          >
          <Background variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap />

          {/* Mermaid-specific toolbar */}
          <Panel position="top-left">
            <div
              className="flex gap-2 p-3 rounded-lg backdrop-blur-sm"
              style={{ backgroundColor: `${theme.colors.bg.secondary}99` }}
            >
              <button
                onClick={handleAddNode}
                className="p-2 rounded text-sm flex items-center gap-2 hover:opacity-80 transition"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
                title="Add Node (Ctrl+N)"
              >
                <Plus size={16} />
                Node
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-2 rounded text-sm flex items-center gap-2 hover:opacity-80 transition"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
                title="Delete Selected (Del)"
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                onClick={handleAutoLayout}
                className="p-2 rounded text-sm flex items-center gap-2 hover:opacity-80 transition"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
                title="Auto-layout diagram"
              >
                <LayoutGrid size={16} />
                Layout
              </button>

              {/* Divider */}
              <div
                style={{
                  width: '1px',
                  backgroundColor: theme.colors.border.medium,
                  opacity: 0.3,
                }}
              />

              {/* Undo/Redo */}
              <button
                onClick={handleUndo}
                disabled={!engineRef.current?.canUndo()}
                className="p-2 rounded text-sm flex items-center gap-2 hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={handleRedo}
                disabled={!engineRef.current?.canRedo()}
                className="p-2 rounded text-sm flex items-center gap-2 hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={16} />
              </button>
            </div>
          </Panel>

          <Panel position="bottom-left">
            <div
              className="text-xs p-2 rounded"
              style={{
                backgroundColor: `${theme.colors.bg.secondary}99`,
                color: theme.colors.text.tertiary,
              }}
            >
              💡 Mermaid: Flowcharts, Class Diagrams, Sequence, ER, State Machines
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right sidebar: Node/Edge Editor */}
      {(selectedNode || selectedEdge) && vcmRef.current && (
        <div
          className="w-80 rounded-lg border overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            borderColor: theme.colors.border.medium,
          }}
        >
          <div
            className="flex items-center justify-between p-3 border-b"
            style={{ borderColor: theme.colors.border.medium }}
          >
            <span className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
              {selectedNode ? 'Edit Node' : 'Edit Connection'}
            </span>
            <button
              onClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              className="p-1 hover:opacity-80 transition"
              style={{ color: theme.colors.text.tertiary }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {selectedNode && (
              <MermaidNodeEditor
                nodeId={selectedNode.id}
                label={selectedNode.label}
                shape={selectedNode.shape}
                onLabelChange={handleNodeLabelChange}
                onShapeChange={handleNodeShapeChange}
              />
            )}
            {selectedEdge && (
              <MermaidEdgeEditor
                edgeId={selectedEdge.id}
                source={selectedEdge.source}
                target={selectedEdge.target}
                label={selectedEdge.label}
                onLabelChange={handleEdgeLabelChange}
                onDelete={handleEdgeDelete}
              />
            )}
          </div>
        </div>
      )}
      </div>

      {/* Status bar */}
      <EditorStatusBar
        nodeCount={vcmRef.current?.nodes?.length || 0}
        edgeCount={vcmRef.current?.edges?.length || 0}
        selectedNodeCount={Array.from(engineRef.current?.getSelection().selectedNodeIds || []).length}
        selectedEdgeCount={Array.from(engineRef.current?.getSelection().selectedEdgeIds || []).length}
        canUndo={engineRef.current?.canUndo() || false}
        canRedo={engineRef.current?.canRedo() || false}
      />
    </div>
  );
};

export const MermaidCanvasEditor: React.FC<MermaidCanvasEditorProps> = (props) => (
  <ReactFlowProvider>
    <MermaidCanvasEditorInner {...props} />
  </ReactFlowProvider>
);
