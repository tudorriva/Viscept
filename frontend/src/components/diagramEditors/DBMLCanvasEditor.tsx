/**
 * DBML Canvas Editor — Visual editor optimized for database schemas (ER diagrams).
 *
 * Features:
 * - Table nodes with fields
 * - Relationship edges (one-to-many, many-to-many, etc.)
 * - Field editing
 * - Quick table/relationship creation
 * - Auto-layout for ER diagrams
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
  useOnSelectionChange,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, LayoutGrid, Undo2, Redo2, X } from 'lucide-react';
import { theme } from '../../theme';
import { dslToVCM, vcmToReactFlow, vcmToDSL, reactFlowToVCM } from '../../utils/vcmAdapter';
import { useVCMHistory } from '../../hooks/useVCMHistory';
import { useEditorKeyboardShortcuts } from '../../hooks/useEditorKeyboardShortcuts';
import { customNodeTypes } from '../DiagramNodes';
import { VisualEditorEngine } from '../editors/VisualEditorEngine';
import { DBMLFieldEditor } from '../editors/DBMLFieldEditor';
import { EditorStatusBar } from '../editors/EditorStatusBar';

interface DBMLCanvasEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

const DBMLCanvasEditorInner: React.FC<DBMLCanvasEditorProps> = ({ code, onCodeChange }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView, getNode } = useReactFlow();

  const vcmRef = useRef<any>(null);
  const engineRef = useRef<VisualEditorEngine | null>(null);
  const codeDrivenGenRef = useRef(0);
  const lastCodeRef = useRef(code);
  const addingTableRef = useRef(false);
  const history = useVCMHistory();

  // Selected table for field editing
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    engineRef.current = new VisualEditorEngine({ history, language: 'dbml' });
  }, [history]);

  function handleInlineNodeLabelChange(nodeId: string, newLabel: string) {
    if (!vcmRef.current || !engineRef.current) return;

    const updated = engineRef.current.updateNodeLabel(vcmRef.current, nodeId, newLabel);
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(updated, true);
  }

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
      const vcm = dslToVCM(currentCode, 'dbml');
      
      const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(vcm, handleInlineNodeLabelChange);
      
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
      console.error('[DBML Editor] Parse error:', error);
      setNodes([]);
      setEdges([]);
      return undefined;
    }
  }, [code, setNodes, setEdges, fitView, history]);

  // ── VCM → DSL serialization ─────────────────────────────────────────────

  const emitCode = useCallback((vcm: any, force = false) => {
    if (!force && codeDrivenGenRef.current !== 0) return;
    try {
      const newCode = vcmToDSL(vcm);
      onCodeChange(newCode);
    } catch (error) {
      console.error('[DBML Editor] Serialization error:', error);
    }
  }, [onCodeChange]);

  // ── Toolbar Actions ────────────────────────────────────────────────────

  const handleAddTable = useCallback(() => {
    if (!vcmRef.current || !engineRef.current) return;

    addingTableRef.current = true;
    try {
      const position = {
        x: 120 + nodes.length * 30,
        y: 120 + nodes.length * 30,
      };

      let updated = engineRef.current.addNode(vcmRef.current, {
        x: position.x,
        y: position.y,
        shape: 'table',
        label: 'new_table',
        fields: [],
      });

      vcmRef.current = updated;
      engineRef.current.recordState(updated);
      const createdTableId = updated.nodes[updated.nodes.length - 1]?.id;

      const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
      setNodes(rfNodes);
      setEdges(rfEdges);
      if (createdTableId) {
        setSelectedTableId(createdTableId);
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitView({ padding: 0.25, duration: 200 });
        });
      });
      emitCode(updated, true);
    } finally {
      addingTableRef.current = false;
    }
  }, [nodes, emitCode, setNodes, setEdges, fitView]);

  const handleDeleteSelected = useCallback(() => {
    if (!vcmRef.current || !engineRef.current) return;

    const updated = engineRef.current.deleteSelected(vcmRef.current);
    if (updated === vcmRef.current) return; // Nothing was selected

    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(updated, true);
  }, [emitCode, setNodes, setEdges]);

  const handleAutoLayout = useCallback(() => {
    if (!vcmRef.current || !engineRef.current) return;

    const updated = engineRef.current.autoLayoutDiagram(vcmRef.current, 'TB');
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    requestAnimationFrame(() => fitView({ padding: 0.3, duration: 200 }));
    emitCode(updated, true);
  }, [emitCode, setNodes, fitView]);

  const handleUndo = useCallback(() => {
    if (!engineRef.current) return;

    const previous = engineRef.current.undo();
    if (!previous) return;

    vcmRef.current = previous;
    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(previous, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(previous, true);
  }, [emitCode, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (!engineRef.current) return;

    const next = engineRef.current.redo();
    if (!next) return;

    vcmRef.current = next;
    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(next, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(next, true);
  }, [emitCode, setNodes, setEdges]);

  // Keyboard shortcuts (now after handlers are defined)
  useEditorKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDeleteSelected: handleDeleteSelected,
    onAddNode: handleAddTable,
  });

  // Track selection from React Flow
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (engineRef.current) {
        engineRef.current.setSelection(
          selectedNodes.map((n) => n.id),
          selectedEdges.map((e) => e.id)
        );
        // Select first table if available
        const tableNode = selectedNodes.find((n) => n.type === 'tableNode');
        setSelectedTableId(tableNode?.id || null);
      }
    },
  });

  // ── Handle node/edge changes ────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: any) => {
      const nextNodes = applyNodeChanges(changes, nodes);
      onNodesChange(changes);
      if (!vcmRef.current || addingTableRef.current) return;

      const updated = reactFlowToVCM(nextNodes, edges, vcmRef.current);
      vcmRef.current = updated;
      history.push(updated);
      emitCode(updated, true);
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
      emitCode(updated, true);
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
          cardinality: 'one',
        });
        vcmRef.current = updated;
        engineRef.current.recordState(updated);
        emitCode(updated, true);
      }
    },
    [edges, setEdges, emitCode]
  );

  // ── DBML Field Editing ──────────────────────────────────────────────────

  const handleAddField = useCallback((fieldName: string, dataType: string) => {
    if (!vcmRef.current || !engineRef.current || !selectedTableId) return;

    let updated = engineRef.current.addFieldToTable(vcmRef.current, selectedTableId, fieldName, dataType);
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(updated, true);
  }, [selectedTableId, emitCode, setNodes, setEdges]);

  const handleRemoveField = useCallback((fieldIndex: number) => {
    if (!vcmRef.current || !engineRef.current || !selectedTableId) return;

    let updated = engineRef.current.removeFieldFromTable(vcmRef.current, selectedTableId, fieldIndex);
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(updated, true);
  }, [selectedTableId, emitCode, setNodes, setEdges]);

  const handleCreateRelationship = useCallback((targetTableId: string, sourceColumn: string) => {
    if (!vcmRef.current || !engineRef.current || !selectedTableId) return;

    let updated = engineRef.current.createTableRelationship(
      vcmRef.current,
      selectedTableId,
      targetTableId,
      sourceColumn
    );
    vcmRef.current = updated;
    engineRef.current.recordState(updated);

    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(updated, true);
  }, [selectedTableId, emitCode, setNodes, setEdges]);

  const selectedTable = selectedTableId && vcmRef.current
    ? vcmRef.current.nodes.find((n: any) => n.id === selectedTableId)
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

          {/* DBML-specific toolbar */}
          <Panel position="top-left">
            <div
              className="flex gap-2 p-3 rounded-lg backdrop-blur-sm"
              style={{ backgroundColor: `${theme.colors.bg.secondary}99` }}
            >
              <button
                onClick={handleAddTable}
                className="p-2 rounded text-sm flex items-center gap-2 hover:opacity-80 transition"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
                title="Add Table"
              >
                <Plus size={16} />
                Table
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-2 rounded text-sm flex items-center gap-2 hover:opacity-80 transition"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
                title="Delete Selected"
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
                title="Auto-layout"
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
                title="Undo"
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
                title="Redo"
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
              💡 DBML: Tables → Fields → Relationships (1-to-1, 1-to-many, many-to-many)
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right sidebar: Field Editor */}
      {selectedTable && vcmRef.current && (
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
              Edit Table
            </span>
            <button
              onClick={() => setSelectedTableId(null)}
              className="p-1 hover:opacity-80 transition"
              style={{ color: theme.colors.text.tertiary }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <DBMLFieldEditor
              node={selectedTable}
              allTables={vcmRef.current.nodes}
              diagram={vcmRef.current}
              onAddField={handleAddField}
              onRemoveField={handleRemoveField}
              onUpdateField={() => {}} // TODO: implement update
              onCreateRelationship={handleCreateRelationship}
            />
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

export const DBMLCanvasEditor: React.FC<DBMLCanvasEditorProps> = (props) => (
  <ReactFlowProvider>
    <DBMLCanvasEditorInner {...props} />
  </ReactFlowProvider>
);
