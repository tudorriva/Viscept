import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TopNavBar } from './components/TopNavBar';
import { ProjectSidebar } from './components/ProjectSidebar';
import { ChatPanel } from './components/ChatPanel';
import { CodeEditor } from './components/CodeEditor';
import { DiagramPreview } from './components/DiagramPreview';
import { ControlPanel } from './components/ControlPanel';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ExamplesGallery } from './components/ExamplesGallery';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useProjects } from './hooks/useProjects';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateDiagram, formatCode as formatCodeAPI, fetchDemo } from './utils/api';
import { DIAGRAM_EXAMPLES, DiagramExample } from './utils/examples';
import { theme } from './theme';
import './index.css';
import { AlertCircle } from 'lucide-react';

type DiagramType = 'mermaid' | 'dbml' | 'graphviz';

export const App: React.FC = () => {
  const previewRef = useRef<HTMLDivElement>(null);
  const {
    projects,
    currentProject,
    favorites,
    recent,
    createProject,
    updateProject,
    deleteProject,
    openProject,
    toggleFavorite,
    duplicateProject,
  } = useProjects();

  // State
  const [prompt, setPrompt] = useState(currentProject?.prompt || '');
  const [code, setCode] = useState(currentProject?.code || '');
  const [diagramType, setDiagramType] = useState<DiagramType>(currentProject?.diagramType || 'mermaid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOllamaOnline, setIsOllamaOnline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useLocalStorage('viscept_show_onboarding', projects.length === 0);
  const [showExamples, setShowExamples] = useState(false);

  // Sync current project
  useEffect(() => {
    if (currentProject) {
      setPrompt(currentProject.prompt);
      setCode(currentProject.code);
      setDiagramType(currentProject.diagramType);
    }
  }, [currentProject]);

  // Check Ollama status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        setIsOllamaOnline(response.ok);
      } catch {
        setIsOllamaOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && prompt.trim()) {
        handleGenerate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowExamples(true);
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

      if (currentProject) {
        updateProject(currentProject.id, {
          code: response.code,
          prompt,
          diagramType,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate diagram';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, diagramType, currentProject, updateProject]);

  const handleFormatCode = useCallback(async () => {
    if (!code.trim()) return;

    try {
      const response = await formatCodeAPI({
        code,
        language: diagramType,
      });

      setCode(response.formatted);
      if (currentProject) {
        updateProject(currentProject.id, { code: response.formatted });
      }
    } catch (err) {
      console.error('Format error:', err);
      setError('Failed to format code');
    }
  }, [code, diagramType, currentProject, updateProject]);

  const handleLoadDemo = useCallback(async () => {
    try {
      const demo = await fetchDemo();
      setCode(demo[diagramType]);
      setPrompt(`Demo: ${diagramType.toUpperCase()}`);
    } catch (err) {
      setError('Failed to load demo');
    }
  }, [diagramType]);

  const handleCreateProject = useCallback(
    (name: string, type: DiagramType) => {
      const project = createProject(name, type, '', '');
      openProject(project.id);
    },
    [createProject, openProject]
  );

  const handleSelectExample = useCallback(
    (example: DiagramExample) => {
      if (!currentProject) {
        const project = createProject(example.title, example.type, example.code, example.prompt);
        openProject(project.id);
      } else {
        updateProject(currentProject.id, {
          code: example.code,
          prompt: example.prompt,
          diagramType: example.type,
        });
      }
    },
    [currentProject, createProject, updateProject, openProject]
  );

  return (
    <div
      className="flex flex-col h-screen w-screen"
      style={{ backgroundColor: theme.colors.bg.primary }}
    >
      {/* Top Navigation */}
      <TopNavBar
        isOllamaOnline={isOllamaOnline}
        currentModel="Mistral 7B"
        onSettingsClick={() => setShowSettings(true)}
        onHelpClick={() => setShowExamples(true)}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Project Sidebar */}
        <ProjectSidebar
          projects={projects}
          favorites={favorites}
          recent={recent}
          currentProject={currentProject || null}
          onSelectProject={(p) => openProject(p.id)}
          onCreateProject={handleCreateProject}
          onDeleteProject={deleteProject}
          onToggleFavorite={toggleFavorite}
          onDuplicate={(id) => {
            const copy = duplicateProject(id);
            if (copy) openProject(copy.id);
          }}
        />

        {/* Left Panel: Chat */}
        <div
          className="w-96 flex flex-col border-r"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <ChatPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            diagramType={diagramType}
            onDiagramTypeChange={setDiagramType}
            isLoading={isLoading}
            onGenerate={handleGenerate}
            onLoadDemo={handleLoadDemo}
            onShowExamples={() => setShowExamples(true)}
          />

          {/* Control Panel */}
          <ControlPanel
            code={code}
            diagramType={diagramType}
            prompt={prompt}
            previewRef={previewRef}
            onLoadProject={(p) => {
              const newProject = createProject(p.name || 'Imported', p.diagramType, p.code, p.prompt);
              openProject(newProject.id);
            }}
          />
        </div>

        {/* Middle Panel: Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditor
            code={code}
            language={diagramType} // ← Make sure this is passed correctly
            onChange={setCode}
            onFormat={handleFormatCode}
          />
        </div>

        {/* Right Panel: Preview */}
        <div
          className="w-full min-w-96 border-l"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <div ref={previewRef} className="h-full overflow-hidden">
            <DiagramPreview code={code} language={diagramType} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onCreateProject={handleCreateProject}
      />
      <ExamplesGallery
        isOpen={showExamples}
        onClose={() => setShowExamples(false)}
        onSelectExample={handleSelectExample}
      />

      {/* Indicators */}
      <OfflineIndicator />

      {/* Error Toast */}
      {error && (
        <div
          className="fixed bottom-6 right-6 max-w-sm p-4 rounded-lg animate-slide-in-up border-l-4 flex gap-3"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            borderColor: theme.colors.status.error,
            borderLeftWidth: '4px',
          }}
        >
          <AlertCircle size={18} style={{ color: theme.colors.status.error, flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.colors.status.error }}>
              Error
            </p>
            <p className="text-xs mt-1" style={{ color: theme.colors.text.secondary }}>
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;