import React from 'react';
import { AnimatedBackground } from './AnimatedBackground';
import { TopBar } from './TopBar';
import { LeftSidebar } from '../panels/LeftSidebar';
import { CenterWorkspace } from '../canvas/CenterWorkspace';
import { AIPanel } from '../ai/AIPanel';
import { ExportPanel } from '../ai/ExportPanel';
import { SettingsDialog } from '../ui/SettingsDialog';
import { CommandPalette } from '../ui/CommandPalette';
import type { ChatMessage, ChatSessionMeta, DiagramType } from '../../types/chat';
import type { ValidationResult } from '../../types/vcm';

interface AppShellProps {
  /* Identity */
  isOllamaOnline: boolean;
  currentModel: string;

  /* Session/sidebar */
  chatList: ChatSessionMeta[];
  activeChatId: string | null;
  onCreateChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onShowExamples: () => void;

  /* Chat & AI */
  messages: ChatMessage[];
  diagramType: DiagramType | null;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onRegenerate: () => void;
  onLoadDemo: () => void;
  onModelChange: (model: string) => void;

  /* Workspace (code/preview) */
  code: string;
  language: string;
  isGenerating: boolean;
  prompt: string;
  previewRef: React.RefObject<HTMLDivElement>;
  onCodeChange: (code: string) => void;
  onFormatCode: () => void;

  /* Validation */
  validation: ValidationResult | null;
  isValidating: boolean;
  onValidate: () => void;
  onFix?: () => void;

  /* Export helpers (used by ExportPanel) */
  onExportPNG: () => Promise<void>;
  onExportSVG: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  onCopyCode: () => void;

  /* Settings */
  settings: Record<string, unknown>;
  onSettingsChange: (key: string, value: unknown) => void;
}

/**
 * AppShell — top-level layout:
 *
 *   ┌──────────────────────────────────────── TopBar (48px) ────────────────────────────────┐
 *   │                                                                                        │
 *   │  LeftSidebar (240 / 48px) │  CenterWorkspace (flex-1)  │  AIPanel (320 / 0px)         │
 *   └────────────────────────────────────────────────────────────────────────────────────────┘
 *
 *   + AnimatedBackground (fixed, z-0)
 *   + CommandPalette portal
 *   + SettingsDialog portal
 *   + ExportPanel portal
 */
export const AppShell: React.FC<AppShellProps> = (props) => {
  const {
    isOllamaOnline, currentModel,
    chatList, activeChatId,
    onCreateChat, onOpenChat, onDeleteChat, onRenameChat, onShowExamples,
    messages, diagramType, isLoading, onSendMessage, onRegenerate, onLoadDemo, onModelChange,
    code, language, isGenerating, prompt, previewRef, onCodeChange, onFormatCode,
    validation, isValidating, onValidate, onFix,
    onExportPNG, onExportSVG, onExportPDF, onCopyCode,
    settings, onSettingsChange,
  } = props;

  const aiStatus = isLoading || isGenerating ? 'generating' : isOllamaOnline ? 'idle' : 'error';

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient background */}
      <AnimatedBackground />

      {/* Top bar */}
      <TopBar
        isOllamaOnline={isOllamaOnline}
        currentModel={currentModel}
        aiStatus={aiStatus as 'idle' | 'thinking' | 'generating' | 'error' | 'success'}
        onShowExamples={onShowExamples}
      />

      {/* Body: sidebar + workspace + AI panel */}
      <div className="flex flex-1 min-h-0 relative z-10">
        <LeftSidebar
          chatList={chatList}
          activeChatId={activeChatId}
          onCreateChat={onCreateChat}
          onOpenChat={onOpenChat}
          onDeleteChat={onDeleteChat}
          onRenameChat={onRenameChat}
          onShowExamples={onShowExamples}
        />

        <CenterWorkspace
          code={code}
          language={language}
          isGenerating={isGenerating}
          prompt={prompt}
          previewRef={previewRef}
          onCodeChange={onCodeChange}
          onFormat={onFormatCode}
        />

        <AIPanel
          messages={messages}
          diagramType={diagramType}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          onRegenerate={onRegenerate}
          onLoadDemo={onLoadDemo}
          onShowExamples={onShowExamples}
          currentModel={currentModel}
          onModelChange={onModelChange}
          validation={validation}
          isValidating={isValidating}
          hasCode={!!code.trim()}
          onValidate={onValidate}
          onFix={onFix}
        />
      </div>

      {/* Portals */}
      <ExportPanel
        onExportPNG={onExportPNG}
        onExportSVG={onExportSVG}
        onExportPDF={onExportPDF}
        onCopyCode={onCopyCode}
        hasContent={!!code.trim()}
      />

      <SettingsDialog
        settings={settings}
        onSettingsChange={onSettingsChange}
      />

      <CommandPalette
        chatList={chatList}
        onNewDiagram={onCreateChat}
        onLoadSession={onOpenChat}
        onGenerateDemo={onLoadDemo}
        onValidate={onValidate}
        onFormatCode={onFormatCode}
        onShowExamples={onShowExamples}
      />
    </div>
  );
};
