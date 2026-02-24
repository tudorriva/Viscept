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
import { ValidationPanel } from './components/ValidationPanel';
import { useProjects } from './hooks/useProjects';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateDiagram, correctDiagram, formatCode as formatCodeAPI, fetchDemo, validateDiagram, ValidationResult } from './utils/api';
import { DIAGRAM_EXAMPLES, DiagramExample } from './utils/examples';
import { theme } from './theme';
import mermaid from 'mermaid';
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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [autoValidation] = useLocalStorage('viscept_auto_validation', false);

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

  /**
   * Try to pre-render Mermaid code to detect syntax errors.
   * Returns null if rendering succeeds, or the error message on failure.
   */
  const preRenderCheck = useCallback(async (diagramCode: string, lang: string): Promise<string | null> => {
    if (lang !== 'mermaid') return null; // Only Mermaid has client-side pre-render

    try {
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      // Use a unique ID to avoid collisions
      const id = `pre-render-check-${Date.now()}`;
      await mermaid.render(id, diagramCode);
      // Clean up the rendered element
      const el = document.getElementById(id);
      if (el) el.remove();
      // Also remove the hidden container mermaid creates
      const dEl = document.querySelector(`[id="d${id}"]`);
      if (dEl) dEl.remove();
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[PreRender] Syntax error detected:', msg);
      return msg;
    }
  }, []);

  const MAX_RENDER_RETRIES = 3;

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      let response = await generateDiagram({
        prompt,
        diagramType,
        enableValidation: autoValidation,
        maxRetries: 2,
      });

      let currentCode = response.code;
      let attempts = 1;

      // Self-correction loop: pre-render → detect error → send to AI → repeat
      for (let i = 0; i < MAX_RENDER_RETRIES; i++) {
        const renderErr = await preRenderCheck(currentCode, diagramType);
        if (!renderErr) break; // Renders fine, we're done

        console.log(`[AutoCorrect] Attempt ${i + 1}/${MAX_RENDER_RETRIES}: fixing render error`);
        setError(`Auto-correcting render error (attempt ${i + 1}/${MAX_RENDER_RETRIES})...`);

        const corrected = await correctDiagram({
          code: currentCode,
          diagramType,
          renderError: renderErr,
          originalPrompt: prompt,
        });

        currentCode = corrected.code;
        attempts++;
      }

      setError(null); // Clear any "auto-correcting" message
      setCode(currentCode);
      setGenerationAttempts(attempts);

      // Store validation results if the pipeline returned them
      if (response.validation) {
        setValidationResult(response.validation);
      }

      if (currentProject) {
        updateProject(currentProject.id, {
          code: currentCode,
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
  }, [prompt, diagramType, currentProject, updateProject, autoValidation, preRenderCheck]);

  /**
   * Manually validate the current diagram using the Visual Judge.
   */
  const handleValidate = useCallback(async () => {
    if (!code.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateDiagram({
        code,
        diagramType,
        originalPrompt: prompt || 'User diagram',
      });

      setValidationResult(result);
    } catch (err) {
      setError('Visual validation failed');
    } finally {
      setIsValidating(false);
    }
  }, [code, diagramType, prompt]);

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

  /**
   * Handle code changes from the visual editor (bidirectional sync).
   */
  const handleVisualEditorCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      if (currentProject) {
        updateProject(currentProject.id, { code: newCode });
      }
    },
    [currentProject, updateProject]
  );

  return (
    <div
      className="flex flex-col h-screen w-screen"
      style={{ backgroundColor: theme.colors.bg.primary }}
    >
      {/* Top Navigation */}
      <TopNavBar
        isOllamaOnline={isOllamaOnline}
        currentModel="Qwen2.5-Coder 7B"
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
          className="w-full min-w-96 border-l flex flex-col"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <div ref={previewRef} className="flex-1 overflow-hidden">
            <DiagramPreview code={code} language={diagramType} onCodeChange={handleVisualEditorCodeChange} isGenerating={isLoading} />
          </div>

          {/* Visual Validation Panel */}
          <ValidationPanel
            validation={validationResult}
            attempts={generationAttempts}
            isValidating={isValidating}
            onValidate={handleValidate}
            hasCode={!!code.trim()}
          />
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