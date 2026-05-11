/**
 * storage.ts — Stub for legacy component imports.
 * These components (ControlPanel, HistoryPanel) are no longer used in the
 * new App shell but remain in the codebase. This stub prevents build errors.
 */
export interface ProjectData {
  id?: string;
  name?: string;
  code: string;
  language?: string;
  diagramType: 'mermaid' | 'dbml' | 'graphviz' | 'plantuml';
  prompt: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoryItem {
  id: string;
  code: string;
  timestamp: string;
  diagramType: string;
}

export function saveProject(_project: ProjectData): void {
  // no-op stub
}

export function getHistory(_diagramType?: string): HistoryItem[] {
  return [];
}
