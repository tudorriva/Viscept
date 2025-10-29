import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { CodeEditor } from './components/CodeEditor';
import { DiagramPreview } from './components/DiagramPreview';
import { HistoryPanel } from './components/HistoryPanel';
import { ControlPanel } from './components/ControlPanel';
import { generateDiagram, formatCode as formatCodeAPI, fetchDemo } from './utils/api';
import { addToHistory, ProjectData } from './utils/storage';
import './index.css';

type DiagramType = 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';

export const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('mermaid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter: Generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && prompt.trim()) {
        handleGenerate();
      }
      // Ctrl+S: Save Project
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Handled in ControlPanel
      }
      // Ctrl+Shift+E: Export SVG
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        // Handled in ControlPanel
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await generateDiagram({
        prompt,
        diagramType,
      });

      setCode(response.code);
      addToHistory(response.code, diagramType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate diagram';
      setError(errorMessage);
      console.error('Generation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, diagramType]);

  const handleFormatCode = useCallback(async () => {
    if (!code.trim()) return;

    try {
      const response = await formatCodeAPI({
        code,
        language: diagramType,
      });

      setCode(response.formatted);
    } catch (err) {
      console.error('Format error:', err);
      alert('Failed to format code');
    }
  }, [code, diagramType]);

  const handleLoadDemo = useCallback(async () => {
    try {
      const demo = await fetchDemo();
      setCode(demo[diagramType]);
      setPrompt(`Demo: ${diagramType.toUpperCase()}`);
      addToHistory(demo[diagramType], diagramType);
    } catch (err) {
      console.error('Failed to load demo:', err);
      alert('Failed to load demo data');
    }
  }, [diagramType]);

  const handleSelectVersion = useCallback((selectedCode: string) => {
    setCode(selectedCode);
  }, []);

  const handleLoadProject = useCallback((project: ProjectData) => {
    setPrompt(project.prompt);
    setCode(project.code);
    setDiagramType(project.diagramType);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      {/* Left Panel: Chat */}
      <div className="w-80 flex flex-col">
        <ChatPanel
          prompt={prompt}
          onPromptChange={setPrompt}
          diagramType={diagramType}
          onDiagramTypeChange={setDiagramType}
          isLoading={isLoading}
          onGenerate={handleGenerate}
          onLoadDemo={handleLoadDemo}
        />

        {/* Error Display */}
        {error && (
          <div className="p-3 m-3 bg-red-100 border border-red-400 rounded text-red-800 text-xs">
            <p className="font-semibold">Error: {error}</p>
          </div>
        )}

        {/* Control Panel */}
        <ControlPanel
          code={code}
          diagramType={diagramType}
          prompt={prompt}
          previewRef={previewRef}
          onLoadProject={handleLoadProject}
        />
      </div>

      {/* Middle Panel: Code Editor */}
      <div className="flex-1 flex flex-col">
        <CodeEditor
          code={code}
          language={diagramType}
          onChange={setCode}
          onFormat={handleFormatCode}
        />
      </div>

      {/* Right Panel: Preview + History */}
      <div className="flex">
        {/* Preview */}
        <div className="flex-1 min-w-96">
          <div ref={previewRef} className="h-full">
            <DiagramPreview code={code} language={diagramType} />
          </div>
        </div>

        {/* History Sidebar */}
        <HistoryPanel diagramType={diagramType} onSelectVersion={handleSelectVersion} />
      </div>
    </div>
  );
};

export default App;
