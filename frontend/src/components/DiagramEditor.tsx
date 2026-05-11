/**
 * DiagramEditor — Smart visual editor router that selects DSL-specific canvas editors.
 *
 * Routes to language-specific visual editors optimized for each DSL:
 * - DBML → DBMLCanvasEditor (ER diagrams with tables and relationships)
 * - Mermaid → MermaidCanvasEditor (flowcharts, class diagrams, sequence diagrams)
 * - Graphviz → GraphvizCanvasEditor (directed/undirected graphs)
 * - PlantUML → PlantUMLCanvasEditor (UML diagrams: class, sequence, state, etc.)
 *
 * Each editor provides:
 * - DSL-specific node types and connection rules
 * - DSL-specific validation and constraints
 * - Optimized layout algorithms for that diagram type
 * - Language-specific UI features (toolbars, helpers)
 *
 * Architecture:
 *   code → dslToVCM() → vcmToReactFlow() → DSL-specific React Flow canvas
 *   canvas edits → reactFlowToVCM() → vcmToDSL() → code
 */

import React from 'react';
import { DBMLCanvasEditor } from './diagramEditors/DBMLCanvasEditor';
import { MermaidCanvasEditor } from './diagramEditors/MermaidCanvasEditor';
import { GraphvizCanvasEditor } from './diagramEditors/GraphvizCanvasEditor';
import { Wand2 } from 'lucide-react';

interface DiagramEditorProps {
  code: string;
  language: string;
  onCodeChange: (newCode: string) => void;
}

export const DiagramEditor: React.FC<DiagramEditorProps> = ({
  code,
  language,
  onCodeChange,
}) => {
  const normalizedLanguage = (language || 'mermaid').toLowerCase();

  // Route to appropriate DSL-specific editor
  if (normalizedLanguage === 'dbml') {
    return <DBMLCanvasEditor code={code} onCodeChange={onCodeChange} />;
  }

  if (normalizedLanguage === 'graphviz' || normalizedLanguage === 'dot') {
    return <GraphvizCanvasEditor code={code} onCodeChange={onCodeChange} />;
  }

  if (normalizedLanguage === 'plantuml') {
    return (
      <div className="w-full h-full flex items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
        <div
          className="max-w-md rounded-lg p-5 text-center"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'rgba(45,212,191,0.12)' }}>
            <Wand2 size={18} style={{ color: 'var(--accent-start)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Visual editing not available for PlantUML yet
          </p>
          <p className="mt-2 text-xs leading-relaxed">
            Use the PlantUML code editor and preview. The app will keep rendering, validation, regeneration, and export in PlantUML.
          </p>
        </div>
      </div>
    );
  }

  // Default to Mermaid for 'mermaid' or any unrecognized language
  return <MermaidCanvasEditor code={code} onCodeChange={onCodeChange} />;
};
