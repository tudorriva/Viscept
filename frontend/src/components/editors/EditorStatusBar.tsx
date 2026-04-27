/**
 * EditorStatusBar — Bottom status bar showing diagram statistics and state.
 *
 * Displays:
 * - Node count
 * - Edge count
 * - Selected node/edge count
 * - Undo/redo state
 */

import React from 'react';
import { theme } from '../../theme';

interface EditorStatusBarProps {
  nodeCount: number;
  edgeCount: number;
  selectedNodeCount: number;
  selectedEdgeCount: number;
  canUndo: boolean;
  canRedo: boolean;
  isDirty?: boolean;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  nodeCount,
  edgeCount,
  selectedNodeCount,
  selectedEdgeCount,
  canUndo,
  canRedo,
  isDirty,
}) => {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 text-xs border-t"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderColor: theme.colors.border.medium,
        color: theme.colors.text.tertiary,
      }}
    >
      <div className="flex items-center gap-4">
        {/* Diagram stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <span>📦</span>
            <span>
              {nodeCount} node{nodeCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔗</span>
            <span>
              {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '16px',
            backgroundColor: theme.colors.border.medium,
            opacity: 0.3,
          }}
        />

        {/* Selection info */}
        {(selectedNodeCount > 0 || selectedEdgeCount > 0) && (
          <div className="flex gap-4">
            {selectedNodeCount > 0 && (
              <span style={{ color: theme.colors.accent.primary }}>
                {selectedNodeCount} selected node{selectedNodeCount !== 1 ? 's' : ''}
              </span>
            )}
            {selectedEdgeCount > 0 && (
              <span style={{ color: theme.colors.accent.primary }}>
                {selectedEdgeCount} selected edge{selectedEdgeCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Undo/redo/dirty state */}
      <div className="flex items-center gap-2">
        {isDirty && (
          <span style={{ color: theme.colors.accent.secondary }}>
            ● Unsaved
          </span>
        )}
        <div className="flex gap-2">
          {canUndo && <span style={{ opacity: 0.6 }}>↶</span>}
          {canRedo && <span style={{ opacity: 0.6 }}>↷</span>}
        </div>
      </div>
    </div>
  );
};
