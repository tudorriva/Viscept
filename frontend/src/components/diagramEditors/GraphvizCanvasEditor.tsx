/**
 * Graphviz Canvas Editor — Visual editor optimized for graph layouts.
 *
 * Features:
 * - Directed and undirected graphs
 * - Node styling (shape, color, size)
 * - Edge styling (style, weight, color)
 * - Automatic layout (hierarchical, circular, spring)
 * - Graph clustering/subgraphs
 */

import React, { useCallback, useEffect, useRef } from 'react';
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
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';
import { theme } from '../../theme';
import { dslToVCM, vcmToReactFlow, vcmToDSL, reactFlowToVCM } from '../../utils/vcmAdapter';
import { autoLayout } from '../../utils/layoutEngine';
import { useVCMHistory } from '../../hooks/useVCMHistory';

interface GraphvizCanvasEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

const GraphvizCanvasEditorInner: React.FC<GraphvizCanvasEditorProps> = ({ code, onCodeChange }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const vcmRef = useRef<any>(null);
  const codeDrivenGenRef = useRef(0);
  const lastCodeRef = useRef(code);
  const history = useVCMHistory();

  function handleInlineNodeLabelChange(nodeId: string, newLabel: string) {
    if (!vcmRef.current) return;

    const updated = {
      ...vcmRef.current,
      nodes: vcmRef.current.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, label: newLabel } : node
      ),
      version: (vcmRef.current.version || 0) + 1,
    };

    vcmRef.current = updated;
    history.push(updated);
    const { nodes: rfNodes, edges: rfEdges } = vcmToReactFlow(updated, handleInlineNodeLabelChange);
    setNodes(rfNodes);
    setEdges(rfEdges);
    emitCode(updated, true);
  }

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

    try {
      const vcm = dslToVCM(code, 'graphviz');
      
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
      console.error('[Graphviz Editor] Parse error:', error);
      return undefined;
    }
  }, [code, setNodes, setEdges, fitView]);

  // ── VCM → DSL serialization ─────────────────────────────────────────────

  const emitCode = useCallback((vcm: any, force = false) => {
    if (!force && codeDrivenGenRef.current !== 0) return;
    try {
      const newCode = vcmToDSL(vcm);
      onCodeChange(newCode);
    } catch (error) {
      console.error('[Graphviz Editor] Serialization error:', error);
    }
  }, [onCodeChange]);

  // ── Handle node/edge changes ────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: any) => {
      const nextNodes = applyNodeChanges(changes, nodes);
      onNodesChange(changes);
      if (vcmRef.current) {
        const updated = reactFlowToVCM(nextNodes, edges, vcmRef.current);
        vcmRef.current = updated;
        history.push(updated);
        emitCode(updated, true);
      }
    },
    [nodes, edges, onNodesChange, emitCode, history]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      const nextEdges = applyEdgeChanges(changes, edges);
      onEdgesChange(changes);
      if (vcmRef.current) {
        const updated = reactFlowToVCM(nodes, nextEdges, vcmRef.current);
        vcmRef.current = updated;
        emitCode(updated, true);
      }
    },
    [nodes, edges, onEdgesChange, emitCode]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const nextEdges = rfAddEdge(connection, edges);
      setEdges(nextEdges);
      if (vcmRef.current) {
        const updated = reactFlowToVCM(nodes, nextEdges, vcmRef.current);
        vcmRef.current = updated;
        emitCode(updated, true);
      }
    },
    [edges, setEdges, nodes, emitCode]
  );

  const handleAutoLayout = useCallback(() => {
    if (vcmRef.current) {
      const layouted = autoLayout(vcmRef.current, { direction: 'TB' });
      const { nodes: rfNodes } = vcmToReactFlow(layouted, handleInlineNodeLabelChange);
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
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap />

        {/* Graphviz-specific toolbar */}
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
              onClick={handleAutoLayout}
              className="p-2 rounded text-sm flex items-center gap-2"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.accent.primary,
                border: `1px solid ${theme.colors.border.medium}`,
              }}
              title="Auto-layout with Graphviz algorithm"
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
            💡 Graphviz (DOT): Directed/Undirected Graphs, Node Styling, Subgraphs
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const GraphvizCanvasEditor: React.FC<GraphvizCanvasEditorProps> = (props) => (
  <ReactFlowProvider>
    <GraphvizCanvasEditorInner {...props} />
  </ReactFlowProvider>
);
