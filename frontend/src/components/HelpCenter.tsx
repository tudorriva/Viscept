import React, { useState } from 'react';
import { theme } from '../theme';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ isOpen, onClose }) => {
  const [selectedTopic, setSelectedTopic] = useState('getting-started');

  if (!isOpen) return null;

  const helpTopics = {
    'getting-started': {
      title: 'Getting Started',
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>1️⃣</span> Create a Project
            </h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Click the "✨ New Project" button in the sidebar to create a new diagram project.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>2️⃣</span> Write Your Description
            </h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Describe your diagram in natural language. Be specific about relationships and structure.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>3️⃣</span> Generate
            </h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Click "✨ Generate Diagram" or press Ctrl+Enter. Wait for the AI to create your code.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>4️⃣</span> Edit & Export
            </h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Fine-tune the code in the editor, then export as PNG, SVG, or PDF.
            </p>
          </div>
        </div>
      ),
    },
    'keyboard-shortcuts': {
      title: 'Keyboard Shortcuts',
      icon: '⌨️',
      content: (
        <div className="space-y-3">
          {[
            { keys: 'Ctrl + Enter', action: 'Generate diagram' },
            { keys: 'Ctrl + S', action: 'Save project' },
            { keys: 'Ctrl + K', action: 'Search projects' },
            { keys: 'Escape', action: 'Close dialogs' },
            { keys: 'Ctrl + Shift + P', action: 'Open settings' },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: theme.colors.bg.tertiary }}>
              <kbd
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  backgroundColor: theme.colors.accent.primary,
                  color: '#fff',
                }}
              >
                {shortcut.keys}
              </kbd>
              <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                {shortcut.action}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    'diagram-types': {
      title: 'Diagram Types',
      icon: '📊',
      content: (
        <div className="space-y-4">
          {[
            {
              name: 'Mermaid',
              icon: '📈',
              desc: 'Flowcharts, sequence diagrams, class diagrams, state machines',
            },
            {
              name: 'DBML',
              icon: '🗄️',
              desc: 'Entity-relationship diagrams, database schemas',
            },
            {
              name: 'Graphviz',
              icon: '🔗',
              desc: 'System architecture, directed graphs, network diagrams',
            },
          ].map((type) => (
            <div key={type.name} className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.bg.tertiary }}>
              <h3 className="font-semibold flex items-center gap-2 mb-1">
                <span>{type.icon}</span>
                {type.name}
              </h3>
              <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                {type.desc}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    'tips': {
      title: 'Tips & Tricks',
      icon: '💡',
      content: (
        <div className="space-y-3">
          {[
            '✨ Use specific keywords (User, Database, Payment) for better AI understanding',
            '🔄 Generate multiple times with different prompts to explore variations',
            '📌 Favorite your best diagrams for quick access',
            '📤 Export to SVG for vector editing in other tools',
            '💾 Use templates from the examples gallery to get started quickly',
            '🎯 Include relationships in your description (e.g., "User has many Orders")',
          ].map((tip, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg flex items-start gap-3"
              style={{ backgroundColor: theme.colors.bg.tertiary }}
            >
              <span className="text-lg flex-shrink-0">{tip.charAt(0)}</span>
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                {tip.slice(2)}
              </p>
            </div>
          ))}
        </div>
      ),
    },
  };

  const current = helpTopics[selectedTopic as keyof typeof helpTopics];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: theme.colors.bg.secondary }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 py-6 border-b"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <h2 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
            ❓ Help Center
          </h2>
          <button
            onClick={onClose}
            className="text-2xl transition-all"
            style={{ color: theme.colors.text.secondary }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className="w-48 border-r overflow-y-auto py-4"
            style={{ borderColor: theme.colors.border.medium }}
          >
            {Object.entries(helpTopics).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setSelectedTopic(key)}
                className="w-full text-left px-4 py-3 transition-all"
                style={{
                  backgroundColor: selectedTopic === key ? `${theme.colors.accent.primary}20` : 'transparent',
                  color: selectedTopic === key ? theme.colors.accent.primary : theme.colors.text.secondary,
                  borderLeft: selectedTopic === key ? `3px solid ${theme.colors.accent.primary}` : 'transparent',
                }}
              >
                <span className="text-lg mr-2">{value.icon}</span>
                <span className="text-sm font-medium">{value.title}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <h3
              className="text-xl font-bold mb-4 flex items-center gap-2"
              style={{ color: theme.colors.text.primary }}
            >
              <span>{current.icon}</span>
              {current.title}
            </h3>
            {current.content}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 border-t text-center"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: '#fff',
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};