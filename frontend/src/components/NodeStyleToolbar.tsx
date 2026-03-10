/**
 * NodeStyleToolbar — contextual floating bar for customizing the selected
 * node's visual style (fill, stroke, font size, shape).
 *
 * Rendered inside a React Flow `<Panel>` so it floats above the canvas.
 * Only visible when exactly one node is selected.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { Palette, Type, Square, Circle, Diamond, Database, type LucideIcon } from 'lucide-react';
import { theme } from '../theme';
import type { NodeShape, VisualStyle } from '../types/vcm';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StyleChange {
  nodeId: string;
  style?: Partial<VisualStyle>;
  shape?: NodeShape;
}

interface NodeStyleToolbarProps {
  /** ID of the selected node (null ⇒ toolbar hidden). */
  selectedNodeId: string | null;

  /** Current shape of the selected node. */
  currentShape?: NodeShape;

  /** Current style overrides on the selected node. */
  currentStyle?: VisualStyle;

  /** Callback when user changes style / shape. */
  onChange: (change: StyleChange) => void;
}

// ── Preset colours ─────────────────────────────────────────────────────────────

const FILL_PRESETS = [
  { label: 'Default', value: undefined },
  { label: 'Blue', value: '#1e3a5f' },
  { label: 'Green', value: '#1a3a2a' },
  { label: 'Purple', value: '#2d1f5e' },
  { label: 'Red', value: '#4a1c1c' },
  { label: 'Amber', value: '#3d2e0a' },
  { label: 'Cyan', value: '#0a3d3d' },
] as const;

const STROKE_PRESETS = [
  { label: 'Default', value: undefined },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#10b981' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Cyan', value: '#06b6d4' },
] as const;

const FONT_SIZES = [11, 12, 13, 14, 16, 18] as const;

// Quick shape switcher — most popular shapes
const SHAPE_OPTIONS: Array<{ shape: NodeShape; label: string; Icon: LucideIcon }> = [
  { shape: 'roundedRect', label: 'Rounded Rect', Icon: Square },
  { shape: 'rect', label: 'Rectangle', Icon: Square },
  { shape: 'diamond', label: 'Diamond', Icon: Diamond },
  { shape: 'circle', label: 'Circle', Icon: Circle },
  { shape: 'cylinder', label: 'Cylinder', Icon: Database },
  { shape: 'stadium', label: 'Stadium', Icon: Square },
];

// ── Component ──────────────────────────────────────────────────────────────────

export const NodeStyleToolbar: React.FC<NodeStyleToolbarProps> = memo(
  ({ selectedNodeId, currentShape, currentStyle, onChange }) => {
    if (!selectedNodeId) return null;

    const activeFill = currentStyle?.fill;
    const activeStroke = currentStyle?.stroke;
    const activeFontSize = currentStyle?.fontSize ?? 13;

    const handleFillChange = useCallback(
      (fill: string | undefined) => {
        onChange({ nodeId: selectedNodeId, style: { fill } });
      },
      [selectedNodeId, onChange],
    );

    const handleStrokeChange = useCallback(
      (stroke: string | undefined) => {
        onChange({ nodeId: selectedNodeId, style: { stroke } });
      },
      [selectedNodeId, onChange],
    );

    const handleFontSizeChange = useCallback(
      (fontSize: number) => {
        onChange({ nodeId: selectedNodeId, style: { fontSize } });
      },
      [selectedNodeId, onChange],
    );

    const handleShapeChange = useCallback(
      (shape: NodeShape) => {
        onChange({ nodeId: selectedNodeId, shape });
      },
      [selectedNodeId, onChange],
    );

    const containerStyle: React.CSSProperties = useMemo(
      () => ({
        backgroundColor: theme.colors.bg.secondary,
        border: `1px solid ${theme.colors.border.medium}`,
        borderRadius: 10,
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: theme.shadows.lg,
        fontSize: 11,
        color: theme.colors.text.secondary,
        flexWrap: 'wrap' as const,
        maxWidth: 480,
      }),
      [],
    );

    const sectionStyle: React.CSSProperties = useMemo(
      () => ({
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }),
      [],
    );

    const dividerStyle: React.CSSProperties = useMemo(
      () => ({
        width: 1,
        height: 20,
        backgroundColor: theme.colors.border.medium,
        flexShrink: 0,
      }),
      [],
    );

    return (
      <div style={containerStyle}>
        {/* Fill colours */}
        <div style={sectionStyle}>
          <Palette size={12} style={{ color: theme.colors.text.muted, flexShrink: 0 }} />
          {FILL_PRESETS.map((p) => (
            <button
              key={p.label}
              title={`Fill: ${p.label}`}
              onClick={() => handleFillChange(p.value)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                backgroundColor: p.value ?? theme.colors.bg.tertiary,
                border:
                  activeFill === p.value || (!activeFill && !p.value)
                    ? `2px solid ${theme.colors.accent.primary}`
                    : `1px solid ${theme.colors.border.medium}`,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        <div style={dividerStyle} />

        {/* Stroke colours */}
        <div style={sectionStyle}>
          <span style={{ color: theme.colors.text.muted, fontSize: 10, flexShrink: 0 }}>⊡</span>
          {STROKE_PRESETS.map((p) => (
            <button
              key={p.label}
              title={`Stroke: ${p.label}`}
              onClick={() => handleStrokeChange(p.value)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                backgroundColor: 'transparent',
                border: `2px solid ${p.value ?? theme.colors.border.medium}`,
                outline:
                  activeStroke === p.value || (!activeStroke && !p.value)
                    ? `1px solid ${theme.colors.accent.primary}`
                    : 'none',
                outlineOffset: 1,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        <div style={dividerStyle} />

        {/* Font size */}
        <div style={sectionStyle}>
          <Type size={12} style={{ color: theme.colors.text.muted, flexShrink: 0 }} />
          <select
            value={activeFontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
              borderRadius: 4,
              padding: '1px 4px',
              fontSize: 11,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
        </div>

        <div style={dividerStyle} />

        {/* Quick shape switcher */}
        <div style={sectionStyle}>
          {SHAPE_OPTIONS.map(({ shape, label, Icon }) => (
            <button
              key={shape}
              title={label}
              onClick={() => handleShapeChange(shape)}
              style={{
                padding: '2px 4px',
                borderRadius: 4,
                backgroundColor:
                  currentShape === shape
                    ? `${theme.colors.accent.primary}30`
                    : 'transparent',
                border:
                  currentShape === shape
                    ? `1px solid ${theme.colors.accent.primary}`
                    : `1px solid transparent`,
                color:
                  currentShape === shape
                    ? theme.colors.accent.primary
                    : theme.colors.text.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={12} />
            </button>
          ))}
        </div>
      </div>
    );
  },
);
(NodeStyleToolbar as any).displayName = 'NodeStyleToolbar';
