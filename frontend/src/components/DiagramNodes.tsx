/**
 * Custom React Flow node types for the interactive diagram editor.
 *
 * Shape components (driven by VCM `NodeShape`):
 *   - EditableNode      — default rounded rect, also used for rect/subroutine
 *   - DiamondNode       — rotated-square decision node
 *   - CylinderNode      — database / store (SVG cylinder)
 *   - CircleNode        — start state / simple circle
 *   - DoubleCircleNode  — final state ◎
 *   - LifelineNode      — sequence diagram participant + dashed vertical line
 *   - StadiumNode       — pill / stadium shape
 *   - HexagonNode       — preparation step (SVG hexagon)
 *   - ParallelogramNode — input / output (skewed rect)
 *   - TableNode         — entity / class / DBML table with columnar fields
 *
 * All node types persist label changes via `data.onLabelChange(id, newLabel)`.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { theme } from '../theme';
import type { NodeShape } from '../types/vcm';

// ── Shared handle styles ───────────────────────────────────────────────────────

const targetHandleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  border: `2px solid ${theme.colors.bg.primary}`,
  background: theme.colors.accent.primary,
};

const sourceHandleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  border: `2px solid ${theme.colors.bg.primary}`,
  background: theme.colors.accent.secondary,
};

// ── Shared inline-edit hook ────────────────────────────────────────────────────

function useInlineEdit(
  id: string,
  label: string,
  onLabelChange?: (id: string, label: string) => void,
) {
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') {
        setIsEditing(false);
        setEditLabel(label);
      }
    },
    [handleSave, label],
  );

  return {
    isEditing,
    editLabel,
    setEditLabel,
    inputRef,
    handleDoubleClick,
    handleSave,
    handleKeyDown,
  };
}

/** Render inline-edit input or label text. */
function InlineLabel({
  isEditing,
  editLabel,
  setEditLabel,
  inputRef,
  handleSave,
  handleKeyDown,
  label,
  className = 'text-sm font-medium text-center',
  style,
}: ReturnType<typeof useInlineEdit> & {
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={editLabel}
        onChange={(e) => setEditLabel(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-full bg-transparent outline-none ${className}`}
        style={{ color: theme.colors.text.primary, minWidth: 40, textAlign: 'center', ...style }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <div className={className} style={{ color: theme.colors.text.primary, ...style }}>
      {label}
    </div>
  );
}

// ── Shared border helper ───────────────────────────────────────────────────────

function borderColor(selected: boolean | undefined): string {
  return selected ? theme.colors.accent.primary : theme.colors.border.medium;
}

function selectedGlow(selected: boolean | undefined): string {
  return selected ? `0 0 12px ${theme.colors.accent.primary}40` : 'none';
}

// ── Standard 4-handle set ──────────────────────────────────────────────────────

function FourHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="top" style={targetHandleStyle} />
      <Handle type="target" position={Position.Left} id="left" style={targetHandleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={sourceHandleStyle} />
      <Handle type="source" position={Position.Right} id="right" style={sourceHandleStyle} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TableNode — entity / class / DBML table with columnar fields
// ══════════════════════════════════════════════════════════════════════════════

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
  const edit = useInlineEdit(id, String(label), onLabelChange);

  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden"
      style={{
        minWidth: 180,
        backgroundColor: theme.colors.bg.secondary,
        border: `2px solid ${borderColor(selected)}`,
        transition: 'border-color 0.15s ease',
        boxShadow: selectedGlow(selected),
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
        onDoubleClick={edit.handleDoubleClick}
      >
        <InlineLabel {...edit} label={String(label)} className="text-xs font-bold text-center" />
      </div>

      {/* Fields */}
      {(fields as string[]).length > 0 && (
        <div
          className="px-3 py-1.5"
          style={{
            borderBottom:
              (methods as string[]).length > 0
                ? `1px solid ${theme.colors.border.medium}`
                : 'none',
          }}
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
          <div
            className="text-xs italic text-center"
            style={{ color: theme.colors.text.tertiary }}
          >
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

// ══════════════════════════════════════════════════════════════════════════════
// EditableNode — default rounded rectangle (also handles rect, subroutine)
// ══════════════════════════════════════════════════════════════════════════════

export const EditableNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const vcmShape = (data?.vcmShape as NodeShape) || 'roundedRect';
  const edit = useInlineEdit(id, label, onLabelChange);

  // Subroutine → double border
  const isSubroutine = vcmShape === 'subroutine';
  const borderRadius = vcmShape === 'rect' || isSubroutine ? 4 : 8;

  return (
    <div
      className="px-4 py-2.5 shadow-md"
      style={{
        minWidth: 120,
        borderRadius,
        backgroundColor: theme.colors.bg.tertiary,
        border: `2px solid ${borderColor(selected)}`,
        outline: isSubroutine ? `2px solid ${borderColor(selected)}` : 'none',
        outlineOffset: isSubroutine ? 3 : 0,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        boxShadow: selectedGlow(selected),
      }}
      onDoubleClick={edit.handleDoubleClick}
    >
      <FourHandles />
      <InlineLabel {...edit} label={label} />
    </div>
  );
});
EditableNode.displayName = 'EditableNode';

// ══════════════════════════════════════════════════════════════════════════════
// DiamondNode — decision / condition (rotated square)
// ══════════════════════════════════════════════════════════════════════════════

export const DiamondNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  const size = Math.max(90, label.length * 8 + 30);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onDoubleClick={edit.handleDoubleClick}
    >
      {/* Rotated background square */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.colors.bg.tertiary,
          border: `2px solid ${borderColor(selected)}`,
          borderRadius: 4,
          transform: 'rotate(45deg)',
          boxShadow: selectedGlow(selected),
          transition: 'border-color 0.15s ease',
        }}
      />
      {/* Label — un-rotated */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 8px', maxWidth: size * 0.7, textAlign: 'center' }}>
        <InlineLabel {...edit} label={label} className="text-xs font-medium text-center" />
      </div>

      {/* Handles at diamond tips */}
      <Handle type="target" position={Position.Top} id="top"
        style={{ ...targetHandleStyle, top: -4 }} />
      <Handle type="target" position={Position.Left} id="left"
        style={{ ...targetHandleStyle, left: -4 }} />
      <Handle type="source" position={Position.Bottom} id="bottom"
        style={{ ...sourceHandleStyle, bottom: -4 }} />
      <Handle type="source" position={Position.Right} id="right"
        style={{ ...sourceHandleStyle, right: -4 }} />
    </div>
  );
});
DiamondNode.displayName = 'DiamondNode';

// ══════════════════════════════════════════════════════════════════════════════
// CylinderNode — database / store
// ══════════════════════════════════════════════════════════════════════════════

export const CylinderNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  const w = Math.max(120, label.length * 8 + 40);
  const h = 70;
  const ry = 12; // ellipse radius for top/bottom caps

  const strokeC = borderColor(selected);
  const fill = theme.colors.bg.tertiary;

  return (
    <div
      style={{ width: w, height: h + ry, position: 'relative' }}
      onDoubleClick={edit.handleDoubleClick}
    >
      <svg
        width={w}
        height={h + ry}
        viewBox={`0 0 ${w} ${h + ry}`}
        style={{ position: 'absolute', inset: 0, filter: selected ? `drop-shadow(0 0 6px ${theme.colors.accent.primary}40)` : 'none' }}
      >
        {/* Body */}
        <rect x={1} y={ry} width={w - 2} height={h - ry} fill={fill} stroke={strokeC} strokeWidth={2} />
        {/* Bottom ellipse */}
        <ellipse cx={w / 2} cy={h} rx={w / 2 - 1} ry={ry} fill={fill} stroke={strokeC} strokeWidth={2} />
        {/* Top ellipse (on top of body) */}
        <ellipse cx={w / 2} cy={ry} rx={w / 2 - 1} ry={ry} fill={fill} stroke={strokeC} strokeWidth={2} />
      </svg>
      {/* Label centred */}
      <div
        style={{
          position: 'absolute',
          top: ry + 4,
          left: 0,
          right: 0,
          bottom: ry,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
        }}
      >
        <InlineLabel {...edit} label={label} className="text-xs font-medium text-center" />
      </div>
      <FourHandles />
    </div>
  );
});
CylinderNode.displayName = 'CylinderNode';

// ══════════════════════════════════════════════════════════════════════════════
// CircleNode — start state, simple circle
// ══════════════════════════════════════════════════════════════════════════════

export const CircleNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  const r = Math.max(28, label.length * 4 + 16);
  const d = r * 2;

  return (
    <div
      style={{
        width: d,
        height: d,
        borderRadius: '50%',
        backgroundColor: theme.colors.bg.tertiary,
        border: `2px solid ${borderColor(selected)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selectedGlow(selected),
        transition: 'border-color 0.15s ease',
      }}
      onDoubleClick={edit.handleDoubleClick}
    >
      <FourHandles />
      <InlineLabel {...edit} label={label} className="text-xs font-bold text-center" />
    </div>
  );
});
CircleNode.displayName = 'CircleNode';

// ══════════════════════════════════════════════════════════════════════════════
// DoubleCircleNode — final state ◎
// ══════════════════════════════════════════════════════════════════════════════

export const DoubleCircleNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  const r = Math.max(28, label.length * 4 + 16);
  const d = r * 2;

  return (
    <div
      style={{
        width: d,
        height: d,
        borderRadius: '50%',
        backgroundColor: theme.colors.bg.tertiary,
        border: `2px solid ${borderColor(selected)}`,
        outline: `2px solid ${borderColor(selected)}`,
        outlineOffset: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selectedGlow(selected),
        transition: 'border-color 0.15s ease',
      }}
      onDoubleClick={edit.handleDoubleClick}
    >
      <FourHandles />
      <InlineLabel {...edit} label={label} className="text-xs font-bold text-center" />
    </div>
  );
});
DoubleCircleNode.displayName = 'DoubleCircleNode';

// ══════════════════════════════════════════════════════════════════════════════
// LifelineNode — sequence diagram participant + dashed vertical line
// ══════════════════════════════════════════════════════════════════════════════

export const LifelineNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  const w = Math.max(100, label.length * 8 + 30);
  const headerH = 36;
  const lineH = 160;

  return (
    <div
      style={{ width: w, height: headerH + lineH, position: 'relative' }}
      onDoubleClick={edit.handleDoubleClick}
    >
      {/* Participant box */}
      <div
        style={{
          width: w,
          height: headerH,
          borderRadius: 6,
          backgroundColor: theme.colors.bg.tertiary,
          border: `2px solid ${borderColor(selected)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: selectedGlow(selected),
          transition: 'border-color 0.15s ease',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <InlineLabel {...edit} label={label} className="text-xs font-semibold text-center" />
      </div>

      {/* Dashed vertical lifeline */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: headerH,
          width: 0,
          height: lineH,
          borderLeft: `2px dashed ${theme.colors.border.strong}`,
          transform: 'translateX(-1px)',
        }}
      />

      {/* Handles on header */}
      <Handle type="target" position={Position.Top} id="top" style={targetHandleStyle} />
      <Handle type="target" position={Position.Left} id="left"
        style={{ ...targetHandleStyle, top: headerH / 2 }} />
      <Handle type="source" position={Position.Right} id="right"
        style={{ ...sourceHandleStyle, top: headerH / 2 }} />
      {/* Bottom handle at end of lifeline */}
      <Handle type="source" position={Position.Bottom} id="bottom"
        style={{ ...sourceHandleStyle }} />
    </div>
  );
});
LifelineNode.displayName = 'LifelineNode';

// ══════════════════════════════════════════════════════════════════════════════
// StadiumNode — pill / stadium shape
// ══════════════════════════════════════════════════════════════════════════════

export const StadiumNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  return (
    <div
      className="px-5 py-2 shadow-md"
      style={{
        minWidth: 120,
        borderRadius: 999,
        backgroundColor: theme.colors.bg.tertiary,
        border: `2px solid ${borderColor(selected)}`,
        boxShadow: selectedGlow(selected),
        transition: 'border-color 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onDoubleClick={edit.handleDoubleClick}
    >
      <FourHandles />
      <InlineLabel {...edit} label={label} />
    </div>
  );
});
StadiumNode.displayName = 'StadiumNode';

// ══════════════════════════════════════════════════════════════════════════════
// HexagonNode — preparation step
// ══════════════════════════════════════════════════════════════════════════════

export const HexagonNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  const w = Math.max(130, label.length * 8 + 50);
  const h = 50;
  const inset = 16; // horizontal inset for the hexagon points

  const strokeC = borderColor(selected);
  const fill = theme.colors.bg.tertiary;

  const points = `${inset},0 ${w - inset},0 ${w},${h / 2} ${w - inset},${h} ${inset},${h} 0,${h / 2}`;

  return (
    <div
      style={{ width: w, height: h, position: 'relative' }}
      onDoubleClick={edit.handleDoubleClick}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{
          position: 'absolute',
          inset: 0,
          filter: selected ? `drop-shadow(0 0 6px ${theme.colors.accent.primary}40)` : 'none',
        }}
      >
        <polygon points={points} fill={fill} stroke={strokeC} strokeWidth={2} />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
        }}
      >
        <InlineLabel {...edit} label={label} className="text-xs font-medium text-center" />
      </div>
      <FourHandles />
    </div>
  );
});
HexagonNode.displayName = 'HexagonNode';

// ══════════════════════════════════════════════════════════════════════════════
// ParallelogramNode — input / output (skewed)
// ══════════════════════════════════════════════════════════════════════════════

export const ParallelogramNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const vcmShape = (data?.vcmShape as NodeShape) || 'parallelogram';
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  // Trapezoid skews the opposite direction
  const skewDeg = vcmShape === 'trapezoid' ? 10 : -10;

  return (
    <div
      style={{
        minWidth: 120,
        position: 'relative',
      }}
      onDoubleClick={edit.handleDoubleClick}
    >
      {/* Skewed background */}
      <div
        className="px-5 py-2.5"
        style={{
          backgroundColor: theme.colors.bg.tertiary,
          border: `2px solid ${borderColor(selected)}`,
          borderRadius: 4,
          transform: `skewX(${skewDeg}deg)`,
          boxShadow: selectedGlow(selected),
          transition: 'border-color 0.15s ease',
        }}
      >
        {/* Un-skew the label */}
        <div style={{ transform: `skewX(${-skewDeg}deg)` }}>
          <InlineLabel {...edit} label={label} />
        </div>
      </div>
      <FourHandles />
    </div>
  );
});
ParallelogramNode.displayName = 'ParallelogramNode';

// ══════════════════════════════════════════════════════════════════════════════
// EllipseNode — generic ellipse (DOT)
// ══════════════════════════════════════════════════════════════════════════════

export const EllipseNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const onLabelChange = data?.onLabelChange as
    | ((id: string, label: string) => void)
    | undefined;
  const edit = useInlineEdit(id, label, onLabelChange);

  return (
    <div
      className="px-5 py-2.5 shadow-md"
      style={{
        minWidth: 100,
        borderRadius: '50%',
        backgroundColor: theme.colors.bg.tertiary,
        border: `2px solid ${borderColor(selected)}`,
        boxShadow: selectedGlow(selected),
        transition: 'border-color 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1.6 / 1',
      }}
      onDoubleClick={edit.handleDoubleClick}
    >
      <FourHandles />
      <InlineLabel {...edit} label={label} className="text-xs font-medium text-center" />
    </div>
  );
});
EllipseNode.displayName = 'EllipseNode';

// ══════════════════════════════════════════════════════════════════════════════
// GroupNode — cluster / subgraph container (rendered behind children)
// ══════════════════════════════════════════════════════════════════════════════

export const GroupNode = memo(({ id, data, selected }: NodeProps) => {
  const label = String(data?.label || '');
  const collapsed = !!data?.collapsed;

  return (
    <div
      style={{
        minWidth: 200,
        minHeight: 100,
        padding: '28px 8px 8px',
        borderRadius: 8,
        backgroundColor: `${theme.colors.accent.primary}08`,
        border: `2px dashed ${selected ? theme.colors.accent.primary : theme.colors.border.strong}`,
        boxShadow: selectedGlow(selected),
        transition: 'border-color 0.15s ease',
        position: 'relative',
      }}
    >
      {/* Group label */}
      <div
        className="text-xs font-semibold uppercase tracking-wide"
        style={{
          position: 'absolute',
          top: 6,
          left: 10,
          color: theme.colors.text.tertiary,
        }}
      >
        {label}
        {collapsed && (
          <span className="ml-1.5 text-[10px] opacity-60">(collapsed)</span>
        )}
      </div>
    </div>
  );
});
GroupNode.displayName = 'GroupNode';

// ══════════════════════════════════════════════════════════════════════════════
// Node Type Registry — maps React Flow `node.type` → component
// ══════════════════════════════════════════════════════════════════════════════

export const customNodeTypes: Record<string, React.ComponentType<NodeProps>> = {
  editableNode: EditableNode,
  tableNode: TableNode,
  diamondNode: DiamondNode,
  cylinderNode: CylinderNode,
  circleNode: CircleNode,
  doubleCircleNode: DoubleCircleNode,
  lifelineNode: LifelineNode,
  stadiumNode: StadiumNode,
  hexagonNode: HexagonNode,
  parallelogramNode: ParallelogramNode,
  ellipseNode: EllipseNode,
  groupNode: GroupNode,
  default: EditableNode,
};
