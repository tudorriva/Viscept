/**
 * CodeEditor — Smart wrapper that selects the right editor based on diagram language.
 * 
 * Routes to language-specific editors:
 * - Mermaid → MermaidEditor (markdown syntax)
 * - Graphviz → GraphvizEditor (DOT syntax)
 * - DBML → DBMLEditor (SQL-like syntax)
 * - PlantUML → PlantUMLEditor (PlantUML syntax)
 * 
 * Each editor provides:
 * - Proper syntax highlighting
 * - Language-specific tips and helpers
 * - Optimized autocomplete and formatting
 */
import React from 'react';
import { MermaidEditor } from './editors/MermaidEditor';
import { GraphvizEditor } from './editors/GraphvizEditor';
import { DBMLEditor } from './editors/DBMLEditor';
import { PlantUMLEditor } from './editors/PlantUMLEditor';
import { theme } from '../theme';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  onFormat: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language = 'mermaid',
  onChange,
  onFormat,
}) => {
  const normalizedLanguage = (language || 'mermaid').toLowerCase();

  // Render the appropriate language-specific editor
  if (normalizedLanguage === 'graphviz' || normalizedLanguage === 'dot') {
    return <GraphvizEditor code={code} onChange={onChange} onFormat={onFormat} />;
  }

  if (normalizedLanguage === 'dbml') {
    return <DBMLEditor code={code} onChange={onChange} onFormat={onFormat} />;
  }

  if (normalizedLanguage === 'plantuml') {
    return <PlantUMLEditor code={code} onChange={onChange} onFormat={onFormat} />;
  }

  // Default to Mermaid for 'mermaid' or any unrecognized language
  return <MermaidEditor code={code} onChange={onChange} onFormat={onFormat} />;
};