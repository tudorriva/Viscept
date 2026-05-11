/**
 * GraphvizEdgeEditor — Panel for editing Graphviz edge properties.
 *
 * Shows when an edge is selected in the Graphviz canvas editor.
 * Allows:
 * - Edit edge label
 * - View source and target nodes
 * - Change edge direction
 */

import React, { useState, useEffect } from 'react';
import { Trash2, ArrowRight, ArrowLeft, ArrowLeftRight, Minus } from 'lucide-react';
import { theme } from '../../theme';
import type { VisualEdge } from '../../types/vcm';

interface GraphvizEdgeEditorProps {
  edgeId: string;
  source: string;
  target: string;
  label: string;
  sourceArrow: string;
  targetArrow: string;
  onLabelChange: (newLabel: string) => void;
  onDirectionChange: (direction: 'forward' | 'back' | 'both' | 'none') => void;
  onDelete: () => void;
}

export const GraphvizEdgeEditor: React.FC<GraphvizEdgeEditorProps> = ({
  edgeId,
  source,
  target,
  label,
  sourceArrow,
  targetArrow,
  onLabelChange,
  onDirectionChange,
  onDelete,
}) => {
  const [editLabel, setEditLabel] = useState(label || '');

  useEffect(() => {
    setEditLabel(label || '');
  }, [label]);

  const handleSaveLabel = () => {
    onLabelChange(editLabel);
  };
  
  let currentDirection = 'forward';
  if (sourceArrow !== 'none' && targetArrow !== 'none') {
    currentDirection = 'both';
  } else if (sourceArrow !== 'none' && targetArrow === 'none') {
    currentDirection = 'back';
  } else if (sourceArrow === 'none' && targetArrow === 'none') {
    currentDirection = 'none';
  }

  return (
    <div
      className="flex flex-col gap-4 p-4 rounded-lg border"
      style={{
        backgroundColor: theme.colors.bg.tertiary,
        borderColor: theme.colors.border.medium,
      }}
    >
      {/* Edge Info */}
      <div>
        <div className="text-xs font-semibold mb-2" style={{ color: theme.colors.text.secondary }}>
          Connection
        </div>
        <div className="text-xs space-y-1">
          <div style={{ color: theme.colors.text.tertiary }}>
            From: <span style={{ color: theme.colors.accent.primary, fontWeight: 'bold' }}>{source}</span>
          </div>
          <div style={{ color: theme.colors.text.tertiary }}>
            To: <span style={{ color: theme.colors.accent.primary, fontWeight: 'bold' }}>{target}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: theme.colors.border.medium, opacity: 0.3 }} />

      {/* Direction Editing */}
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: theme.colors.text.secondary }}>
          Direction
        </label>
        <select
          value={currentDirection}
          onChange={(e) => onDirectionChange(e.target.value as any)}
          className="w-full px-2 py-2 rounded text-sm border cursor-pointer"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            borderColor: theme.colors.border.medium,
            color: theme.colors.text.primary,
          }}
        >
          <option value="forward">Source → Target (Forward)</option>
          <option value="back">Target → Source (Back)</option>
          <option value="both">Source ↔ Target (Both)</option>
          <option value="none">Source — Target (None)</option>
        </select>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: theme.colors.border.medium, opacity: 0.3 }} />

      {/* Label Editing */}
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: theme.colors.text.secondary }}>
          Label
        </label>
        <input
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleSaveLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveLabel();
          }}
          className="w-full px-2 py-2 rounded text-sm border"
          style={{
            backgroundColor: theme.colors.bg.secondary,
            borderColor: theme.colors.border.medium,
            color: theme.colors.text.primary,
          }}
          placeholder="Edge label..."
        />
        <div className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>
          Press Enter to save
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: theme.colors.border.medium, opacity: 0.3 }} />

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="w-full px-2 py-2 rounded text-sm flex items-center justify-center gap-2 font-semibold hover:opacity-80 transition"
        style={{
          backgroundColor: '#ef4444',
          color: 'white',
        }}
      >
        <Trash2 size={16} />
        Delete Connection
      </button>
    </div>
  );
};
