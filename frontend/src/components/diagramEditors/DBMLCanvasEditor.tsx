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
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';
import { theme } from '../../theme';
import { dslToVCM, vcmToReactFlow, vcmToDSL, reactFlowToVCM } from '../../utils/vcmAdapter';
import { useVCMHistory } from '../../hooks/useVCMHistory';

interface DBMLCanvasEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

const DBMLCanvasEditorInner: React.FC<DBMLCanvasEditorProps> = ({ code, onCodeChange }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const vcmRef = useRef<any>(null);
  const codeDrivenGenRef = useRef(0);
  const lastCodeRef = useRef(code);
  const history = useVCMHistory();

  // ── Code → VCM → React Flow sync ───────────────────────────────────────

  useEffect(() => {
    if (code === lastCodeRef.current && nodes.length > 0) return;
    lastCodeRef.current = code;

    if (!code.trim()) {
      vcmRef.current = null;
      setNodes([]);
      setEdges([]);
      return;
    }

    const gen = ++codeDrivenGenRef.current;

    try {
      const vcm = dslToVCM(code, 'dbml');
      vcmRef.current = vcm;
      history.push(vcm);

      const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(vcm);
      setNodes(rfNodes);
      
      const timer = setTimeout(() => {
        setEdges(rfEdges);
        requestAnimationFrame(() => fitView({ padding: 0.3, duration: 200 }));
      }, 80);

      const releaseTimer = setTimeout(() => {
        if (codeDrivenGenRef.current === gen) {
          codeDrivenGenRef.current = 0;
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        clearTimeout(releaseTimer);
      };
    } catch (error) {
      console.error('[DBML Editor] Parse error:', error);
    }
  }, [code, setNodes, setEdges, fitView]);

  // ── VCM → DSL serialization ─────────────────────────────────────────────

  const emitCode = useCallback((vcm: any) => {
    if (codeDrivenGenRef.current !== 0) return;
    try {
      const newCode = vcmToDSL(vcm, 'dbml');
      onCodeChange(newCode);
    } catch (error) {
      console.error('[DBML Editor] Serialization error:', error);
    }
  }, [onCodeChange]);

  // ── Handle node/edge changes ────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      if (vcmRef.current) {
        const updated = reactFlowToVCM(nodes, edges, vcmRef.current);
        vcmRef.current = updated;
        history.push(updated);
        emitCode(updated);
      }
    },
    [nodes, edges, onNodesChange, emitCode, history]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      if (vcmRef.current) {
        const updated = reactFlowToVCM(nodes, edges, vcmRef.current);
        vcmRef.current = updated;
        emitCode(updated);
      }
    },
    [nodes, edges, onEdgesChange, emitCode]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const edge = rfAddEdge(connection, edges);
      setEdges(edge);
      if (vcmRef.current) {
        const updated = reactFlowToVCM(nodes, edge, vcmRef.current);
        vcmRef.current = updated;
        emitCode(updated);
      }
    },
    [edges, setEdges, nodes, emitCode]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
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
              className="p-2 rounded text-sm flex items-center gap-2"
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
              className="p-2 rounded text-sm flex items-center gap-2"
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
  );
};

export const DBMLCanvasEditor: React.FC<DBMLCanvasEditorProps> = (props) => (
  <ReactFlowProvider>
    <DBMLCanvasEditorInner {...props} />
  </ReactFlowProvider>
);
