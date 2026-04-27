/**
 * MermaidEdgeEditor — Panel for editing Mermaid edge (connection) properties.
 *
 * Shows when an edge is selected in the Mermaid canvas editor.
 * Allows:
 * - Edit edge label
 * - View source and target nodes
 */

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { theme } from '../../theme';

interface MermaidEdgeEditorProps {
  edgeId: string;
  source: string;
  target: string;
  label: string;
  onLabelChange: (newLabel: string) => void;
  onDelete: () => void;
}

export const MermaidEdgeEditor: React.FC<MermaidEdgeEditorProps> = ({
  edgeId,
  source,
  target,
  label,
  onLabelChange,
  onDelete,
}) => {
  const [editLabel, setEditLabel] = useState(label || '');

  const handleSaveLabel = () => {
    onLabelChange(editLabel);
  };

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
