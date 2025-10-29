/**
 * Project and workspace type definitions
 */

export type DiagramType = 'mermaid' | 'dbml' | 'graphviz';

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  diagramType: DiagramType;
  code: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  isFavorite?: boolean;
  thumbnail?: string; // base64 encoded preview
}

export interface ProjectMetadata {
  id: string;
  name: string;
  diagramType: DiagramType;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  lineCount: number;
  charCount: number;
}

export interface Workspace {
  projects: ProjectData[];
  currentProjectId?: string;
  lastOpenedAt?: string;
}