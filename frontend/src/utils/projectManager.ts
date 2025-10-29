import { ProjectData, ProjectMetadata, DiagramType } from '../types/project';

const STORAGE_KEY = 'viscept_projects';
const CURRENT_PROJECT_KEY = 'viscept_current_project';

/**
 * Project management utilities using localStorage
 */

export class ProjectManager {
  /**
   * Generate unique ID
   */
  static generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create new project
   */
  static createProject(
    name: string,
    diagramType: DiagramType,
    code: string = '',
    prompt: string = ''
  ): ProjectData {
    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      name,
      diagramType,
      code,
      prompt,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    };
  }

  /**
   * Get all projects
   */
  static getAllProjects(): ProjectData[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }

  /**
   * Get project by ID
   */
  static getProject(id: string): ProjectData | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === id) || null;
  }

  /**
   * Save project
   */
  static saveProject(project: ProjectData): void {
    const projects = this.getAllProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);

    if (existingIndex >= 0) {
      projects[existingIndex] = {
        ...project,
        updatedAt: new Date().toISOString(),
      };
    } else {
      projects.push(project);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  /**
   * Delete project
   */
  static deleteProject(id: string): void {
    const projects = this.getAllProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Rename project
   */
  static renameProject(id: string, newName: string): void {
    const project = this.getProject(id);
    if (project) {
      project.name = newName;
      this.saveProject(project);
    }
  }

  /**
   * Toggle favorite
   */
  static toggleFavorite(id: string): void {
    const project = this.getProject(id);
    if (project) {
      project.isFavorite = !project.isFavorite;
      this.saveProject(project);
    }
  }

  /**
   * Get favorites
   */
  static getFavorites(): ProjectData[] {
    return this.getAllProjects().filter(p => p.isFavorite);
  }

  /**
   * Get recent projects (last 10)
   */
  static getRecent(): ProjectData[] {
    return this.getAllProjects()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }

  /**
   * Set current project
   */
  static setCurrentProject(id: string): void {
    localStorage.setItem(CURRENT_PROJECT_KEY, id);
  }

  /**
   * Get current project ID
   */
  static getCurrentProjectId(): string | null {
    return localStorage.getItem(CURRENT_PROJECT_KEY);
  }

  /**
   * Duplicate project
   */
  static duplicateProject(id: string): ProjectData | null {
    const original = this.getProject(id);
    if (!original) return null;

    const copy = this.createProject(
      `${original.name} (Copy)`,
      original.diagramType,
      original.code,
      original.prompt
    );

    this.saveProject(copy);
    return copy;
  }

  /**
   * Export project as JSON
   */
  static exportProject(id: string): string {
    const project = this.getProject(id);
    if (!project) throw new Error('Project not found');
    return JSON.stringify(project, null, 2);
  }

  /**
   * Import project from JSON
   */
  static importProject(json: string): ProjectData {
    const project = JSON.parse(json) as ProjectData;
    project.id = this.generateId(); // Generate new ID
    this.saveProject(project);
    return project;
  }

  /**
   * Get metadata for all projects
   */
  static getAllMetadata(): ProjectMetadata[] {
    return this.getAllProjects().map(p => ({
      id: p.id,
      name: p.name,
      diagramType: p.diagramType,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isFavorite: p.isFavorite || false,
      lineCount: p.code.split('\n').length,
      charCount: p.code.length,
    }));
  }

  /**
   * Search projects by name
   */
  static search(query: string): ProjectData[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllProjects().filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.prompt.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Clear all projects (be careful!)
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}