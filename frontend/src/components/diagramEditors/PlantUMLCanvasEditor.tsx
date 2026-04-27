/**
 * PlantUML Canvas Editor — Visual editor optimized for UML diagrams.
 *
 * Features:
 * - Class diagrams with inheritance
 * - Sequence diagrams with actors
 * - State diagrams with transitions
 * - Component/deployment diagrams
 * - Use case diagrams
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

interface PlantUMLCanvasEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

const PlantUMLCanvasEditorInner: React.FC<PlantUMLCanvasEditorProps> = ({ code, onCodeChange }) => {
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
      const vcm = dslToVCM(code, 'plantuml');
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
      console.error('[PlantUML Editor] Parse error:', error);
    }
  }, [code, setNodes, setEdges, fitView]);

  // ── VCM → DSL serialization ─────────────────────────────────────────────

  const emitCode = useCallback((vcm: any) => {
    if (codeDrivenGenRef.current !== 0) return;
    try {
      const newCode = vcmToDSL(vcm);
      onCodeChange(newCode);
    } catch (error) {
      console.error('[PlantUML Editor] Serialization error:', error);
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
        emitCode(updated);
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
        emitCode(updated);
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
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap />

        {/* PlantUML-specific toolbar */}
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
              title="Add Class/Element"
            >
              <Plus size={16} />
              Element
            </button>
            <button
              onClick={handleAutoLayout}
              className="p-2 rounded text-sm flex items-center gap-2"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.accent.primary,
                border: `1px solid ${theme.colors.border.medium}`,
              }}
              title="Auto-layout UML diagram"
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
            💡 PlantUML: Class, Sequence, State, Component, Deployment, Use Case Diagrams
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const PlantUMLCanvasEditor: React.FC<PlantUMLCanvasEditorProps> = (props) => (
  <ReactFlowProvider>
    <PlantUMLCanvasEditorInner {...props} />
  </ReactFlowProvider>
);
