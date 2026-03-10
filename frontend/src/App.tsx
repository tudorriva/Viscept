import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TopNavBar } from './components/TopNavBar';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatPanel } from './components/ChatPanel';
import { CodeEditor } from './components/CodeEditor';
import { DiagramPreview } from './components/DiagramPreview';
import { ControlPanel } from './components/ControlPanel';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ExamplesGallery } from './components/ExamplesGallery';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ValidationPanel } from './components/ValidationPanel';
import { useChat } from './hooks/useChat';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatCode as formatCodeAPI, fetchDemo, validateDiagram, ValidationResult } from './utils/api';
import { DiagramExample } from './utils/examples';
import { theme } from './theme';
import './index.css';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Chat hook (replaces useProjects + manual prompt/code state) ─────────
  const chat = useChat();

  // Derived state from chat
  const code = chat.diagramCode;
  const diagramType = chat.diagramType ?? 'mermaid';
  const messages = chat.activeChat?.messages ?? [];

  // ── Local UI state ──────────────────────────────────────────────────────
  const [isOllamaOnline, setIsOllamaOnline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showOnboarding, setShowOnboarding] = useLocalStorage(
    'viscept_show_onboarding',
    chat.chatList.length === 0,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Merge errors: chat-level + local
  const error = chat.error || localError;

  // Clear local error after 6 seconds
  useEffect(() => {
    if (!localError) return undefined;
    const t = setTimeout(() => setLocalError(null), 6000);
    return () => clearTimeout(t);
  }, [localError]);

  // ── Ollama health-check ─────────────────────────────────────────────────
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

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  /** Code changed in either the text editor or the visual editor. */
  const handleCodeChange = useCallback(
    (newCode: string) => {
      chat.updateDiagramCode(newCode);
    },
    [chat],
  );

  /** Format the current diagram code via the backend formatter. */
  const handleFormatCode = useCallback(async () => {
    if (!code.trim()) return;
    try {
      const response = await formatCodeAPI({ code, language: diagramType });
      chat.updateDiagramCode(response.formatted);
    } catch {
      setLocalError('Failed to format code');
    }
  }, [code, diagramType, chat]);

  /** Load a built-in demo snippet for the active diagram type. */
  const handleLoadDemo = useCallback(async () => {
    try {
      const demo = await fetchDemo();
      chat.updateDiagramCode(demo[diagramType]);
    } catch {
      setLocalError('Failed to load demo');
    }
  }, [diagramType, chat]);

  /** Run the Visual Judge on the current diagram. */
  const handleValidate = useCallback(async () => {
    if (!code.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const firstUserMessage = messages.find((m) => m.role === 'user');
      const result = await validateDiagram({
        code,
        diagramType,
        originalPrompt: firstUserMessage?.content ?? 'User diagram',
      });
      setValidationResult(result);
    } catch {
      setLocalError('Visual validation failed');
    } finally {
      setIsValidating(false);
    }
  }, [code, diagramType, messages]);

  /** User picked an example from the gallery. */
  const handleSelectExample = useCallback(
    (example: DiagramExample) => {
      // Set the code from the example directly
      chat.updateDiagramCode(example.code);
    },
    [chat],
  );

  /** Onboarding "create" callback — just opens a new chat. */
  const handleOnboardingCreate = useCallback(() => {
    chat.createChat();
  }, [chat]);

  // ── Render ──────────────────────────────────────────────────────────────

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
        {/* Chat Sidebar (replaces ProjectSidebar) */}
        <ChatSidebar
          chatList={chat.chatList}
          activeChatId={chat.activeChat?.id ?? null}
          onCreateChat={() => chat.createChat()}
          onOpenChat={chat.openChat}
          onDeleteChat={chat.deleteChat}
          onRenameChat={chat.renameChat}
        />

        {/* Left Panel: Chat + Controls */}
        <div
          className="w-96 flex flex-col border-r"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <ChatPanel
            messages={messages}
            diagramType={chat.diagramType}
            isLoading={chat.isLoading}
            onSendMessage={chat.sendMessage}
            onRegenerate={chat.regenerateLastResponse}
            onLoadDemo={handleLoadDemo}
            onShowExamples={() => setShowExamples(true)}
          />

          {/* Control Panel (export, import, etc.) */}
          <ControlPanel
            code={code}
            diagramType={diagramType}
            prompt={messages[0]?.content ?? ''}
            previewRef={previewRef}
            onLoadProject={(p) => {
              // Import a project file → just set the code in the active chat
              chat.updateDiagramCode(p.code);
            }}
          />
        </div>

        {/* Middle Panel: Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditor
            code={code}
            language={diagramType}
            onChange={handleCodeChange}
            onFormat={handleFormatCode}
          />
        </div>

        {/* Right Panel: Preview + Validation */}
        <div
          className="w-full min-w-96 border-l flex flex-col"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <div ref={previewRef} className="flex-1 overflow-hidden">
            <DiagramPreview
              code={code}
              language={diagramType}
              onCodeChange={handleCodeChange}
              isGenerating={chat.isLoading}
              prompt={messages[0]?.content ?? ''}
            />
          </div>

          {/* Visual Validation Panel */}
          <ValidationPanel
            validation={validationResult}
            attempts={0}
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
        onCreateProject={handleOnboardingCreate}
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