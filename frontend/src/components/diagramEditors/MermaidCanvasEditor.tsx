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
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, LayoutGrid, GitBranch } from 'lucide-react';
import { theme } from '../../theme';
import { dslToVCM, vcmToReactFlow, vcmToDSL, reactFlowToVCM } from '../../utils/vcmAdapter';
import { autoLayout } from '../../utils/layoutEngine';
import { useVCMHistory } from '../../hooks/useVCMHistory';
import { customNodeTypes } from '../DiagramNodes';

interface MermaidCanvasEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

const MermaidCanvasEditorInner: React.FC<MermaidCanvasEditorProps> = ({ code, onCodeChange }) => {
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
      const vcm = dslToVCM(code, 'mermaid');
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
      console.error('[Mermaid Editor] Parse error:', error);
    }
  }, [code, setNodes, setEdges, fitView]);

  // ── VCM → DSL serialization ─────────────────────────────────────────────

  const emitCode = useCallback((vcm: any) => {
    if (codeDrivenGenRef.current !== 0) return;
    try {
      const newCode = vcmToDSL(vcm, 'mermaid');
      onCodeChange(newCode);
    } catch (error) {
      console.error('[Mermaid Editor] Serialization error:', error);
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

  const handleAutoLayout = useCallback(() => {
    if (vcmRef.current) {
      const layouted = autoLayout(vcmRef.current, { direction: 'TB' });
      const { nodes: rfNodes } = vcmToReactFlow(layouted);
      setNodes(rfNodes);
      requestAnimationFrame(() => fitView({ padding: 0.3, duration: 200 }));
    }
  }, [setNodes, fitView]);

  return (
    <div className="w-full h-full">
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
              className="p-2 rounded text-sm flex items-center gap-2"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.accent.primary,
                border: `1px solid ${theme.colors.border.medium}`,
              }}
              title="Add Node"
            >
              <Plus size={16} />
              Node
            </button>
            <button
              className="p-2 rounded text-sm flex items-center gap-2"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.accent.primary,
                border: `1px solid ${theme.colors.border.medium}`,
              }}
              title="Create Subgraph"
            >
              <GitBranch size={16} />
              Group
            </button>
            <button
              onClick={handleAutoLayout}
              className="p-2 rounded text-sm flex items-center gap-2"
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
  );
};

export const MermaidCanvasEditor: React.FC<MermaidCanvasEditorProps> = (props) => (
  <ReactFlowProvider>
    <MermaidCanvasEditorInner {...props} />
  </ReactFlowProvider>
);
