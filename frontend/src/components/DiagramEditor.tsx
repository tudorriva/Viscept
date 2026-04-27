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
import { PlantUMLCanvasEditor } from './diagramEditors/PlantUMLCanvasEditor';

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
    return <PlantUMLCanvasEditor code={code} onCodeChange={onCodeChange} />;
  }

  // Default to Mermaid for 'mermaid' or any unrecognized language
  return <MermaidCanvasEditor code={code} onCodeChange={onCodeChange} />;
};
