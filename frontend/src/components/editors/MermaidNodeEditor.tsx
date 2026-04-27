/**
 * MermaidNodeEditor — Panel for editing Mermaid node properties.
 *
 * Shows when a node is selected in the Mermaid canvas editor.
 * Allows:
 * - Edit node label
 * - Change node shape
 */

import React, { useState } from 'react';
import { theme } from '../../theme';
import type { NodeShape } from '../../types/vcm';

interface MermaidNodeEditorProps {
  nodeId: string;
  label: string;
  shape: NodeShape;
  onLabelChange: (newLabel: string) => void;
  onShapeChange: (newShape: NodeShape) => void;
}

const MERMAID_SHAPES: { value: NodeShape; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'roundedRect', label: 'Rounded' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'circle', label: 'Circle' },
  { value: 'stadium', label: 'Stadium' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'parallelogram', label: 'Parallelogram' },
];

export const MermaidNodeEditor: React.FC<MermaidNodeEditorProps> = ({
  nodeId,
  label,
  shape,
  onLabelChange,
  onShapeChange,
}) => {
  const [editLabel, setEditLabel] = useState(label);

  const handleSaveLabel = () => {
    if (editLabel.trim() && editLabel !== label) {
      onLabelChange(editLabel);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 rounded-lg border"
      style={{
        backgroundColor: theme.colors.bg.tertiary,
        borderColor: theme.colors.border.medium,
      }}
    >
      {/* Node Info */}
      <div>
        <div className="text-xs font-semibold mb-2" style={{ color: theme.colors.text.secondary }}>
          Node ID
        </div>
        <div
          className="text-xs font-mono px-2 py-1 rounded"
          style={{ backgroundColor: theme.colors.bg.secondary, color: theme.colors.text.tertiary }}
        >
          {nodeId}
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
          placeholder="Node label..."
        />
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: theme.colors.border.medium, opacity: 0.3 }} />

      {/* Shape Selector */}
      <div>
        <label className="text-xs font-semibold block mb-2" style={{ color: theme.colors.text.secondary }}>
          Shape
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MERMAID_SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => onShapeChange(s.value)}
              className="px-2 py-2 rounded text-xs border transition hover:opacity-80"
              style={{
                backgroundColor: shape === s.value ? theme.colors.accent.primary : theme.colors.bg.secondary,
                borderColor: shape === s.value ? theme.colors.accent.primary : theme.colors.border.medium,
                color: shape === s.value ? 'white' : theme.colors.text.primary,
                fontWeight: shape === s.value ? 'bold' : 'normal',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
