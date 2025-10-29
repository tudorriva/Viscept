import React, { useState } from 'react';
import { DIAGRAM_EXAMPLES, DiagramExample } from '../utils/examples';
import { theme } from '../theme';

interface ExamplesGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExample: (example: DiagramExample) => void;
}

type FilterType = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'mermaid' | 'dbml' | 'graphviz';

export const ExamplesGallery: React.FC<ExamplesGalleryProps> = ({
  isOpen,
  onClose,
  onSelectExample,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const getFilteredExamples = () => {
    let filtered = DIAGRAM_EXAMPLES;

    if (activeFilter === 'beginner' || activeFilter === 'intermediate' || activeFilter === 'advanced') {
      filtered = filtered.filter(ex => ex.difficulty === activeFilter);
    } else if (activeFilter === 'mermaid' || activeFilter === 'dbml' || activeFilter === 'graphviz') {
      filtered = filtered.filter(ex => ex.type === activeFilter);
    }

    return filtered;
  };

  if (!isOpen) return null;

  const examples = getFilteredExamples();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg w-full max-w-4xl max-h-96 overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: theme.colors.bg.secondary }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.text.primary }}
          >
            📚 Examples Gallery
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: theme.colors.text.tertiary }}
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div
          className="px-6 py-3 border-b overflow-x-auto flex gap-2"
          style={{ borderColor: theme.colors.border.medium }}
        >
          {(['all', 'beginner', 'intermediate', 'advanced', 'mermaid', 'dbml', 'graphviz'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
              style={{
                backgroundColor:
                  activeFilter === filter
                    ? theme.colors.accent.primary
                    : theme.colors.bg.tertiary,
                color:
                  activeFilter === filter
                    ? '#fff'
                    : theme.colors.text.secondary,
                border: `1px solid ${theme.colors.border.light}`,
              }}
            >
              {filter === 'all'
                ? '🌟 All'
                : filter === 'beginner'
                ? '🟢 Beginner'
                : filter === 'intermediate'
                ? '🟡 Intermediate'
                : filter === 'advanced'
                ? '🔴 Advanced'
                : filter === 'mermaid'
                ? '📈 Mermaid'
                : filter === 'dbml'
                ? '🗄️ DBML'
                : '🔗 Graphviz'}
            </button>
          ))}
        </div>

        {/* Examples Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {examples.map((example) => (
              <div
                key={example.id}
                onClick={() => {
                  onSelectExample(example);
                  onClose();
                }}
                className="p-4 rounded-lg cursor-pointer transition-all hover:shadow-lg"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  border: `1px solid ${theme.colors.border.light}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.bg.quaternary;
                  e.currentTarget.style.borderColor = theme.colors.accent.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
                  e.currentTarget.style.borderColor = theme.colors.border.light;
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className="text-sm font-semibold flex-1"
                    style={{ color: theme.colors.text.primary }}
                  >
                    {example.title}
                  </h3>
                  <span className="text-lg">{example.category === 'flowchart' ? '📊' : example.category === 'sequence' ? '📝' : example.category === 'class' ? '📦' : example.category === 'entity' ? '🗄️' : '🔗'}</span>
                </div>

                <p
                  className="text-xs mb-3 line-clamp-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  {example.description}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${theme.colors.accent.primary}20`,
                        color: theme.colors.accent.primary,
                      }}
                    >
                      {example.type}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${
                          example.difficulty === 'beginner'
                            ? theme.colors.status.success
                            : example.difficulty === 'intermediate'
                            ? theme.colors.status.warning
                            : theme.colors.status.error
                        }20`,
                        color:
                          example.difficulty === 'beginner'
                            ? theme.colors.status.success
                            : example.difficulty === 'intermediate'
                            ? theme.colors.status.warning
                            : theme.colors.status.error,
                      }}
                    >
                      {example.difficulty}
                    </span>
                  </div>
                  <span
                    className="text-lg"
                    style={{ opacity: 0.5 }}
                  >
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {examples.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p
                className="text-sm"
                style={{ color: theme.colors.text.tertiary }}
              >
                No examples found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};