/**
 * Storage utilities for project persistence.
 */

export interface ProjectData {
  id: string;
  name: string;
  diagramType: 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';
  code: string;
  prompt: string;
  versions: Array<{
    code: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'ai-diagram-builder-projects';
const HISTORY_KEY = 'ai-diagram-builder-history';
const MAX_VERSIONS = 20;

/**
 * Save or update a project.
 */
export function saveProject(project: ProjectData): void {
  const projects = getAllProjects();
  const existing = projects.findIndex((p) => p.id === project.id);

  if (existing >= 0) {
    projects[existing] = project;
  } else {
    projects.push(project);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/**
 * Get all saved projects.
 */
export function getAllProjects(): ProjectData[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Get a project by ID.
 */
export function getProject(id: string): ProjectData | undefined {
  const projects = getAllProjects();
  return projects.find((p) => p.id === id);
}

/**
 * Delete a project.
 */
export function deleteProject(id: string): void {
  const projects = getAllProjects();
  const filtered = projects.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Add version to history.
 */
export function addToHistory(code: string, diagramType: string): void {
  const key = `${HISTORY_KEY}-${diagramType}`;
  const history = getHistory(diagramType);

  history.unshift({
    code,
    timestamp: new Date().toISOString(),
  });

  if (history.length > MAX_VERSIONS) {
    history.pop();
  }

  localStorage.setItem(key, JSON.stringify(history));
}

/**
 * Get history for a diagram type.
 */
export function getHistory(diagramType: string): Array<{ code: string; timestamp: string }> {
  const key = `${HISTORY_KEY}-${diagramType}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

/**
 * Clear history for a diagram type.
 */
export function clearHistory(diagramType: string): void {
  const key = `${HISTORY_KEY}-${diagramType}`;
  localStorage.removeItem(key);
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
