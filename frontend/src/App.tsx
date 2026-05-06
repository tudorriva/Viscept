/**
 * App.tsx — slim orchestration layer for Viscept AI Diagram Studio.
 *
 * Responsibilities:
 *  • Wire domain hooks (useChat, useSettings, useLocalStorage)
 *  • Derive/manage a small amount of local UI state (errors, validation, ollama health)
 *  • Handle keyboard shortcuts that aren't owned by CommandPalette
 *  • Pass everything down to AppShell
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { OnboardingTour } from './components/OnboardingTour';
import { ExamplesGallery } from './components/ExamplesGallery';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useChat } from './hooks/useChat';
import { useSettings } from './hooks/useSettings';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useUIStore } from './store/uiStore';
import { formatCode as formatCodeAPI, fetchDemo, fetchHealth, validateDiagram, correctDiagram, ValidationResult, type CorrectRequest, type GenerateResponse } from './utils/api';
import { exportAsPNG, exportAsSVG, exportAsPDF, type ExportOptions } from './utils/exporters';
import type { DiagramExample } from './utils/examples';
import './index.css';

export const App: React.FC = () => {
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Domain hooks ──────────────────────────────────────────────────────────
  const chat = useChat();
  const { settings, updateSetting } = useSettings();
  const { examplesOpen, setExamplesOpen } = useUIStore();

  // Derived state
  const code = chat.diagramCode;
  const diagramType = chat.diagramType ?? 'mermaid';
  const messages = chat.activeChat?.messages ?? [];

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isOllamaOnline, setIsOllamaOnline] = useState(true);
  const [showOnboarding, setShowOnboarding] = useLocalStorage(
    'viscept_show_onboarding',
    chat.chatList.length === 0,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAutoCorrecting, setIsAutoCorrecting] = useState(false);

  const error = chat.error || localError;

  // Clear local error after 6 s
  useEffect(() => {
    const t = localError ? setTimeout(() => setLocalError(null), 6000) : undefined;
    return () => clearTimeout(t);
  }, [localError]);

  // ── Ollama health check ───────────────────────────────────────────────────
  // Ask the *backend* — not Ollama directly — so this works from any device
  // on the network (the browser's localhost ≠ the server's localhost).
  useEffect(() => {
    const check = async () => {
      try {
        const data = await fetchHealth();
        setIsOllamaOnline(data?.ollama?.online ?? false);
      } catch {
        setIsOllamaOnline(false);
      }
    };
    check();
    const iv = setInterval(check, 30_000); // 30 s — no need to hammer the backend
    return () => clearInterval(iv);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCodeChange = useCallback(
    (newCode: string) => { chat.updateDiagramCode(newCode); },
    [chat],
  );

  const handleFormatCode = useCallback(async () => {
    if (!code.trim()) return;
    try {
      const res = await formatCodeAPI({ code, language: diagramType });
      chat.updateDiagramCode(res.formatted);
    } catch {
      setLocalError('Failed to format code');
    }
  }, [code, diagramType, chat]);

  const handleLoadDemo = useCallback(async () => {
    try {
      const demo = await fetchDemo();
      chat.updateDiagramCode(demo[diagramType]);
    } catch {
      setLocalError('Failed to load demo');
    }
  }, [diagramType, chat]);

  const handleValidate = useCallback(async () => {
    if (!code.trim()) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const firstUser = messages.find((m) => m.role === 'user');
      const result = await validateDiagram({
        code,
        diagramType,
        originalPrompt: firstUser?.content ?? 'User diagram',
      });
      setValidationResult(result);
    } catch {
      setLocalError('Visual validation failed');
    } finally {
      setIsValidating(false);
    }
  }, [code, diagramType, messages]);

  const handleSelectExample = useCallback(
    (example: DiagramExample) => { chat.updateDiagramCode(example.code); },
    [chat],
  );

  // ── Export helpers ────────────────────────────────────────────────────────
  const handleExportPNG = useCallback(async (options?: ExportOptions) => {
    if (previewRef.current) await exportAsPNG(previewRef.current, 'diagram', options);
  }, []);

  const handleExportSVG = useCallback(async (options?: ExportOptions) => {
    if (previewRef.current) await exportAsSVG(previewRef.current, 'diagram', options);
  }, []);

  const handleExportPDF = useCallback(async (options?: ExportOptions) => {
    if (previewRef.current) await exportAsPDF(previewRef.current, 'diagram', options);
  }, []);

  const handleCopyCode = useCallback(() => {
    if (code) navigator.clipboard.writeText(code).catch(() => setLocalError('Copy failed'));
  }, [code]);

  const handleRenderError = useCallback(
    async (errorMsg: string) => {
      // Only auto-correct if user hasn't manually disabled it and AI isn't already working
      if (!code.trim() || chat.isLoading || isAutoCorrecting) return;

      setIsAutoCorrecting(true);
      try {
        const firstUser = messages.find((m) => m.role === 'user');
        const corrected = await correctDiagram({
          code,
          diagramType,
          renderError: errorMsg,
          originalPrompt: firstUser?.content ?? 'User diagram',
        });

        if (corrected.code) {
          chat.updateDiagramCode(corrected.code);
        }
      } catch (err) {
        // Silently fail auto-correction; user sees the error already
        console.error('[Auto-correct] Failed:', err);
      } finally {
        setIsAutoCorrecting(false);
      }
    },
    [code, diagramType, chat, messages, isAutoCorrecting],
  );

  // ── Settings adapter (typed → generic for SettingsDialog) ────────────────
  const handleSettingsChange = useCallback(
    (key: string, value: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateSetting(key as any, value as any);
    },
    [updateSetting],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <AppShell
        /* identity */
        isOllamaOnline={isOllamaOnline}
        currentModel={settings.model}
        /* sidebar */
        chatList={chat.chatList}
        activeChatId={chat.activeChat?.id ?? null}
        onCreateChat={() => chat.createChat()}
        onOpenChat={chat.openChat}
        onDeleteChat={chat.deleteChat}
        onRenameChat={chat.renameChat}
        onShowExamples={() => setExamplesOpen(true)}
        /* chat / AI */
        messages={messages}
        diagramType={chat.diagramType}
        isLoading={chat.isLoading}
        onSendMessage={chat.sendMessage}
        onRegenerate={chat.regenerateLastResponse}
        onLoadDemo={handleLoadDemo}
        onModelChange={(m) => updateSetting('model', m)}
        /* workspace */
        code={code}
        language={diagramType}
        isGenerating={chat.isLoading || isAutoCorrecting}
        prompt={messages[0]?.content ?? ''}
        previewRef={previewRef}
        onCodeChange={handleCodeChange}
        onFormatCode={handleFormatCode}
        onRenderError={handleRenderError}
        /* validation */
        validation={validationResult}
        isValidating={isValidating}
        onValidate={handleValidate}
        /* export */
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportPDF={handleExportPDF}
        onCopyCode={handleCopyCode}
        /* settings */
        settings={settings as unknown as Record<string, unknown>}
        onSettingsChange={handleSettingsChange}
      />

      {/* Modals that live outside AppShell */}
      <OnboardingTour
        isOpen={!!showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onCreateProject={() => chat.createChat()}
      />
      <ExamplesGallery
        isOpen={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onSelectExample={handleSelectExample}
      />

      {/* Offline indicator (bottom-left corner) */}
      <OfflineIndicator />

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-toast"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[300] max-w-sm px-4 py-3 rounded-xl flex items-start gap-3"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--color-error)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-error)' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-error)' }}>Error</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default App;

