import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Eye, GitGraph, Code2 } from 'lucide-react';
import { type WorkspaceTab, useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

const TABS: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { id: 'preview', label: 'Preview', icon: <Eye     size={14} /> },
  { id: 'editor',  label: 'Editor',  icon: <GitGraph size={14} /> },
  { id: 'code',    label: 'Code',    icon: <Code2   size={14} /> },
];

interface WorkspaceTabsProps {
  /** Additional classname for the outer bar */
  className?: string;
}

/**
 * WorkspaceTabs — three-tab selector for the center panel.
 * Active indicator slides via Framer Motion layoutId.
 */
export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ className }) => {
  const { activeTab, setActiveTab } = useUIStore();

  return (
    <LayoutGroup>
      <div
        className={cn(
          'flex items-center gap-1 px-3 py-2 border-b shrink-0',
          className,
        )}
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'transition-colors duration-150 outline-none select-none',
                isActive
                  ? 'text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[var(--bg-hover)]',
              )}
            >
              {/* Sliding background pill */}
              {isActive && (
                <motion.span
                  layoutId="workspace-tab-bg"
                  className="absolute inset-0 rounded-lg -z-10"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                  }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                />
              )}

              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
};
