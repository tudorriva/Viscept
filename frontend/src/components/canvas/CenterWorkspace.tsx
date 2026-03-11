import React from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { WorkspaceTabs } from './WorkspaceTabs';
import { CodePanel } from './CodePanel';
import { DiagramPreview } from '../DiagramPreview';
import { DiagramEditor } from '../DiagramEditor';
import { useUIStore } from '../../store/uiStore';

interface CenterWorkspaceProps {
  code: string;
  language: string;
  isGenerating: boolean;
  prompt: string;
  previewRef: React.RefObject<HTMLDivElement>;
  onCodeChange: (code: string) => void;
  onFormat: () => void;
}

const tabVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/**
 * CenterWorkspace — the main content area with 3 tabs:
 *  • Preview  — Mermaid live render (DiagramPreview)
 *  • Editor   — React Flow visual canvas (DiagramEditor)
 *  • Code     — Monaco DSL editor (CodePanel)
 */
export const CenterWorkspace: React.FC<CenterWorkspaceProps> = ({
  code,
  language,
  isGenerating,
  prompt,
  previewRef,
  onCodeChange,
  onFormat,
}) => {
  const { activeTab } = useUIStore();

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden relative z-10 min-w-0"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Tab bar */}
      <WorkspaceTabs />

      {/* Tab content with transitions */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'preview' && (
            <motion.div
              key="preview"
              className="absolute inset-0"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div ref={previewRef} className="w-full h-full">
                <DiagramPreview
                  code={code}
                  language={language}
                  onCodeChange={onCodeChange}
                  isGenerating={isGenerating}
                  prompt={prompt}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'editor' && (
            <motion.div
              key="editor"
              className="absolute inset-0"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <DiagramEditor
                code={code}
                language={language}
                onCodeChange={onCodeChange}
              />
            </motion.div>
          )}

          {activeTab === 'code' && (
            <motion.div
              key="code"
              className="absolute inset-0"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <CodePanel
                code={code}
                language={language}
                onChange={onCodeChange}
                onFormat={onFormat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
