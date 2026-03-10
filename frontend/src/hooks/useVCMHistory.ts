/**
 * useVCMHistory — undo / redo for the Visual Canonical Model.
 *
 * Maintains a bounded stack of VisualDiagram snapshots.
 * The hook exposes:
 *   • push(diagram)  — record a new snapshot (auto-deduplicates by version)
 *   • undo()         — step back; returns the previous snapshot or null
 *   • redo()         — step forward; returns the next snapshot or null
 *   • canUndo / canRedo — booleans for UI state
 *   • current        — the snapshot at the current cursor
 *   • clear()        — reset the history
 *
 * Internally the history is stored in a ref so it never causes re-renders on
 * its own.  The caller (DiagramEditor) decides when to apply the returned
 * snapshot to React Flow state.
 */

import { useCallback, useRef, useState } from 'react';
import type { VisualDiagram } from '../types/vcm';

// ── Configuration ──────────────────────────────────────────────────────────────

/** Maximum number of snapshots to keep (oldest are evicted). */
const MAX_HISTORY = 50;

/** Minimum interval (ms) between two snapshots to prevent flooding. */
const DEBOUNCE_MS = 250;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VCMHistory {
  /** Record a new diagram snapshot. Deduplicates by `version`. */
  push: (diagram: VisualDiagram) => void;

  /** Step back one snapshot. Returns the snapshot, or null if at the start. */
  undo: () => VisualDiagram | null;

  /** Step forward one snapshot. Returns the snapshot, or null if at the end. */
  redo: () => VisualDiagram | null;

  /** The snapshot at the current cursor (may be null if history is empty). */
  current: VisualDiagram | null;

  /** True when there is at least one snapshot before the cursor. */
  canUndo: boolean;

  /** True when there is at least one snapshot after the cursor. */
  canRedo: boolean;

  /** Number of snapshots in the stack. */
  length: number;

  /** Reset the entire history. */
  clear: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useVCMHistory(): VCMHistory {
  // We store the stack in a ref so mutations don't cause re-renders.
  // A small counter in state is bumped to trigger re-renders when
  // the UI-visible properties (canUndo, canRedo, length) change.
  const stackRef = useRef<VisualDiagram[]>([]);
  const cursorRef = useRef(-1); // index into stackRef
  const lastPushTimeRef = useRef(0);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  // ── push ─────────────────────────────────────────────────────────────────

  const push = useCallback(
    (diagram: VisualDiagram) => {
      const stack = stackRef.current;
      const cursor = cursorRef.current;
      const now = Date.now();

      // Debounce rapid pushes (e.g. during drag)
      if (now - lastPushTimeRef.current < DEBOUNCE_MS) {
        // Replace the current entry instead of adding a new one,
        // so the latest position is still captured.
        if (cursor >= 0 && cursor < stack.length) {
          stack[cursor] = diagram;
        }
        return;
      }

      // Deduplicate: skip if version hasn't changed
      if (cursor >= 0 && stack[cursor]?.version === diagram.version) {
        return;
      }

      // Truncate any redo entries beyond the cursor
      if (cursor < stack.length - 1) {
        stack.length = cursor + 1;
      }

      // Push the new snapshot
      stack.push(diagram);

      // Evict oldest if over the limit
      if (stack.length > MAX_HISTORY) {
        stack.shift();
      }

      cursorRef.current = stack.length - 1;
      lastPushTimeRef.current = now;
      bump();
    },
    [bump],
  );

  // ── undo ─────────────────────────────────────────────────────────────────

  const undo = useCallback((): VisualDiagram | null => {
    const stack = stackRef.current;
    if (cursorRef.current <= 0) return null;

    cursorRef.current -= 1;
    bump();
    return stack[cursorRef.current];
  }, [bump]);

  // ── redo ─────────────────────────────────────────────────────────────────

  const redo = useCallback((): VisualDiagram | null => {
    const stack = stackRef.current;
    if (cursorRef.current >= stack.length - 1) return null;

    cursorRef.current += 1;
    bump();
    return stack[cursorRef.current];
  }, [bump]);

  // ── clear ────────────────────────────────────────────────────────────────

  const clear = useCallback(() => {
    stackRef.current = [];
    cursorRef.current = -1;
    lastPushTimeRef.current = 0;
    bump();
  }, [bump]);

  // ── derived state ────────────────────────────────────────────────────────

  const stack = stackRef.current;
  const cursor = cursorRef.current;

  return {
    push,
    undo,
    redo,
    current: cursor >= 0 ? stack[cursor] : null,
    canUndo: cursor > 0,
    canRedo: cursor < stack.length - 1,
    length: stack.length,
    clear,
  };
}
