import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { CodeEditor } from './components/CodeEditor';
import { DiagramPreview } from './components/DiagramPreview';
import { HistoryPanel } from './components/HistoryPanel';
import { ControlPanel } from './components/ControlPanel';
import { generateDiagram, formatCode as formatCodeAPI, fetchDemo } from './utils/api';
import { addToHistory, ProjectData } from './utils/storage';
import './index.css';

type DiagramType = 'mermaid' | 'dbml' | 'graphviz';

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && prompt.trim()) {
        handleGenerate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setCode('');

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
      setError('Failed to format code');
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
      setError('Failed to load demo data');
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
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden">
      {/* Left Panel: Chat */}
      <div className="w-96 flex flex-col border-r border-slate-700/50 animate-slide-in-left">
        <ChatPanel
          prompt={prompt}
          onPromptChange={setPrompt}
          diagramType={diagramType}
          onDiagramTypeChange={setDiagramType}
          isLoading={isLoading}
          onGenerate={handleGenerate}
          onLoadDemo={handleLoadDemo}
        />

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
      <div className="flex-1 flex flex-col animate-fade-in">
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
        <div className="flex-1 min-w-96 border-l border-slate-700/50 animate-slide-in-right">
          <div ref={previewRef} className="h-full bg-slate-800/50 overflow-hidden flex flex-col">
            <DiagramPreview code={code} language={diagramType} />
          </div>
        </div>

        {/* History Sidebar */}
        <HistoryPanel diagramType={diagramType} onSelectVersion={handleSelectVersion} />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 max-w-sm animate-slide-in-up">
          <div className="glass p-4 rounded-lg border-l-4 border-red-500">
            <p className="text-sm font-semibold text-red-400 mb-1">❌ Error</p>
            <p className="text-xs text-slate-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;