/**
 * useEditorKeyboardShortcuts — Keyboard shortcut handler for visual editors.
 *
 * Provides standardized keyboard shortcuts across all DSL editors:
 * - Ctrl+Z / Cmd+Z: Undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z: Redo
 * - Delete / Backspace: Delete selected
 * - Ctrl+N / Cmd+N: Add node (editor-specific)
 */

import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteSelected?: () => void;
  onAddNode?: () => void;
}

export function useEditorKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl+Z / Cmd+Z
      if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handlers.onUndo?.();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
      if (ctrl && e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }

      // Delete selected: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputElement(e.target as HTMLElement)) {
        e.preventDefault();
        handlers.onDeleteSelected?.();
        return;
      }

      // Add node: Ctrl+N / Cmd+N
      if (ctrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handlers.onAddNode?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

/**
 * Check if the target is an input element where keyboard shortcuts should be disabled.
 */
function isInputElement(element: HTMLElement): boolean {
  if (!element) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.contentEditable === 'true'
  );
}
