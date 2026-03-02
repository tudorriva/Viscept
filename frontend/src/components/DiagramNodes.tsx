/**
 * Custom React Flow node types for the interactive diagram editor.
 *
 * - TableNode: renders a table/class with fields (classDiagram, erDiagram, DBML).
 * - EditableNode: simple labelled node with double-click inline editing.
 *
 * Both node types persist label changes by calling `data.onLabelChange(id, newLabel)`.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { theme } from '../theme';

// ── Shared handle styles ───────────────────────────────────────────────────────

const targetHandleStyle = {
  width: 8,
  height: 8,
  border: `2px solid ${theme.colors.bg.primary}`,
  background: theme.colors.accent.primary,
};

const sourceHandleStyle = {
  width: 8,
  height: 8,
  border: `2px solid ${theme.colors.bg.primary}`,
  background: theme.colors.accent.secondary,
};

// ── TableNode ──────────────────────────────────────────────────────────────────

interface TableNodeData {
  label: string;
  fields?: string[];
  methods?: string[];
  onLabelChange?: (id: string, label: string) => void;
  [key: string]: unknown;
}

export const TableNode = memo(({ id, data, selected }: NodeProps) => {
  const { label, fields = [], methods = [] } = data as TableNodeData;
  const onLabelChange = (data as TableNodeData).onLabelChange;
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(String(label));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditLabel(String(label));
  }, [label, isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(String(label));
    setTimeout(() => inputRef.current?.select(), 0);
  }, [label]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== String(label) && onLabelChange) {
      onLabelChange(id, trimmed);
    }
  }, [editLabel, label, id, onLabelChange]);

  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden"
      style={{
        minWidth: 180,
        backgroundColor: theme.colors.bg.secondary,
        border: `2px solid ${selected ? theme.colors.accent.primary : theme.colors.border.medium}`,
        transition: 'border-color 0.15s ease',
        boxShadow: selected ? `0 0 12px ${theme.colors.accent.primary}40` : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} id="top" style={targetHandleStyle} />
      <Handle type="target" position={Position.Left} id="left" style={targetHandleStyle} />

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
            ref={inputRef}
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setIsEditing(false); setEditLabel(String(label)); }
            }}
            className="w-full text-center bg-transparent outline-none text-xs font-bold"
            style={{ color: theme.colors.text.primary }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          String(label)
        )}
      </div>

      {/* Fields */}
      {(fields as string[]).length > 0 && (
        <div
          className="px-3 py-1.5"
          style={{ borderBottom: (methods as string[]).length > 0 ? `1px solid ${theme.colors.border.medium}` : 'none' }}
        >
          {(fields as string[]).map((f: string, i: number) => (
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
      {(methods as string[]).length > 0 && (
        <div className="px-3 py-1.5">
          {(methods as string[]).map((m: string, i: number) => (
            <div
              key={i}
              className="text-xs py-0.5 font-mono truncate"
              style={{ color: theme.colors.text.tertiary }}
              title={m}
            >
              {m}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(fields as string[]).length === 0 && (methods as string[]).length === 0 && (
        <div className="px-3 py-2">
          <div className="text-xs italic text-center" style={{ color: theme.colors.text.tertiary }}>
            Double-click to edit
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" style={sourceHandleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={sourceHandleStyle} />
    </div>
  );
});

TableNode.displayName = 'TableNode';

// ── EditableNode ───────────────────────────────────────────────────────────────

export const EditableNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as ((id: string, label: string) => void) | undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditLabel(label);
  }, [label, isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(label);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [label]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== label && onLabelChange) {
      onLabelChange(id, trimmed);
    }
  }, [editLabel, label, id, onLabelChange]);

  return (
    <div
      className="rounded-lg px-4 py-2.5 shadow-md"
      style={{
        minWidth: 120,
        backgroundColor: theme.colors.bg.tertiary,
        border: `2px solid ${selected ? theme.colors.accent.primary : theme.colors.border.medium}`,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        boxShadow: selected ? `0 0 12px ${theme.colors.accent.primary}40` : 'none',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} id="top" style={targetHandleStyle} />
      <Handle type="target" position={Position.Left} id="left" style={targetHandleStyle} />

      {isEditing ? (
        <input
          ref={inputRef}
          autoFocus
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setIsEditing(false); setEditLabel(label); }
          }}
          className="w-full text-center bg-transparent outline-none text-sm font-medium"
          style={{ color: theme.colors.text.primary, minWidth: 60 }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-sm font-medium text-center" style={{ color: theme.colors.text.primary }}>
          {label}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" style={sourceHandleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={sourceHandleStyle} />
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
