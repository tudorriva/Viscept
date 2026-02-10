/**
 * Custom React Flow node types for the interactive diagram editor.
 *
 * - TableNode: renders a table/class with fields and methods (used for
 *   classDiagram, erDiagram, and DBML Table definitions).
 */

import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { theme } from '../theme';

// ── TableNode ──────────────────────────────────────────────────────────────────

interface TableNodeData {
  label: string;
  fields?: string[];
  methods?: string[];
  [key: string]: unknown;
}

/**
 * A table/class node with a header, fields section, and methods section.
 * Supports inline editing of the label.
 */
export const TableNode = memo(({ data, selected }: NodeProps) => {
  const { label, fields = [], methods = [] } = data as TableNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(String(label));

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(String(label));
  }, [label]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // The label update is handled through onNodeChange in the parent
  }, []);

  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden"
      style={{
        minWidth: 180,
        backgroundColor: theme.colors.bg.secondary,
        border: `2px solid ${selected ? theme.colors.accent.primary : theme.colors.border.medium}`,
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Connection handle - top */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: theme.colors.accent.primary,
          width: 10,
          height: 10,
          border: `2px solid ${theme.colors.bg.primary}`,
        }}
      />

      {/* Header */}
      <div
        className="px-3 py-2 text-center font-bold text-xs uppercase tracking-wide"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.accent.primary}30, ${theme.colors.accent.secondary}30)`,
          color: theme.colors.text.primary,
          borderBottom: `1px solid ${theme.colors.border.medium}`,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            className="w-full text-center bg-transparent outline-none text-xs font-bold"
            style={{ color: theme.colors.text.primary }}
          />
        ) : (
          String(label)
        )}
      </div>

      {/* Fields */}
      {fields.length > 0 && (
        <div
          className="px-3 py-1.5"
          style={{ borderBottom: methods.length > 0 ? `1px solid ${theme.colors.border.medium}` : 'none' }}
        >
          {fields.map((f: string, i: number) => (
            <div
              key={i}
              className="text-xs py-0.5 font-mono truncate"
              style={{ color: theme.colors.text.secondary }}
              title={f}
            >
              {f}
            </div>
          ))}
        </div>
      )}

      {/* Methods */}
      {methods.length > 0 && (
        <div className="px-3 py-1.5">
          {methods.map((m: string, i: number) => (
            <div
              key={i}
              className="text-xs py-0.5 font-mono truncate"
              style={{ color: theme.colors.accent.tertiary }}
              title={m}
            >
              {m}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {fields.length === 0 && methods.length === 0 && (
        <div className="px-3 py-2">
          <div
            className="text-xs italic text-center"
            style={{ color: theme.colors.text.muted }}
          >
            Double-click to edit
          </div>
        </div>
      )}

      {/* Connection handle - bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: theme.colors.accent.secondary,
          width: 10,
          height: 10,
          border: `2px solid ${theme.colors.bg.primary}`,
        }}
      />
    </div>
  );
});

TableNode.displayName = 'TableNode';

// ── EditableNode ───────────────────────────────────────────────────────────────

/**
 * A simple editable node with a label. Used as the default node type in the
 * visual editor. Supports double-click to edit.
 */
export const EditableNode = memo(({ data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(label);
  }, [label]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  return (
    <div
      className="rounded-lg px-4 py-2.5 shadow-md"
      style={{
        minWidth: 100,
        backgroundColor: theme.colors.bg.tertiary,
        border: `2px solid ${selected ? theme.colors.accent.primary : theme.colors.border.medium}`,
        transition: 'border-color 0.15s ease',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: theme.colors.accent.primary,
          width: 8,
          height: 8,
          border: `2px solid ${theme.colors.bg.primary}`,
        }}
      />

      {isEditing ? (
        <input
          autoFocus
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          className="w-full text-center bg-transparent outline-none text-sm font-medium"
          style={{ color: theme.colors.text.primary }}
        />
      ) : (
        <div
          className="text-sm font-medium text-center"
          style={{ color: theme.colors.text.primary }}
        >
          {label}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: theme.colors.accent.secondary,
          width: 8,
          height: 8,
          border: `2px solid ${theme.colors.bg.primary}`,
        }}
      />
    </div>
  );
});

EditableNode.displayName = 'EditableNode';

// ── Node Type Registry ─────────────────────────────────────────────────────────

export const customNodeTypes = {
  tableNode: TableNode,
  editableNode: EditableNode,
  default: EditableNode,
};
