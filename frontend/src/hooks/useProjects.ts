import { useState, useCallback, useEffect } from 'react';
import { ProjectData, DiagramType } from '../types/project';
import { ProjectManager } from '../utils/projectManager';

/**
 * Custom hook for project management
 */
export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [favorites, setFavorites] = useState<ProjectData[]>([]);
  const [recent, setRecent] = useState<ProjectData[]>([]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = useCallback(() => {
    const allProjects = ProjectManager.getAllProjects();
    const favs = ProjectManager.getFavorites();
    const rec = ProjectManager.getRecent();
    const currentId = ProjectManager.getCurrentProjectId();
    const current = currentId ? ProjectManager.getProject(currentId) : null;

    setProjects(allProjects);
    setFavorites(favs);
    setRecent(rec);
    setCurrentProject(current);
  }, []);

  const createProject = useCallback(
    (name: string, diagramType: DiagramType, code: string = '', prompt: string = '') => {
      const project = ProjectManager.createProject(name, diagramType, code, prompt);
      ProjectManager.saveProject(project);
      ProjectManager.setCurrentProject(project.id);
      loadProjects();
      return project;
    },
    [loadProjects]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<ProjectData>) => {
      const project = ProjectManager.getProject(id);
      if (project) {
        ProjectManager.saveProject({ ...project, ...updates });
        loadProjects();
      }
    },
    [loadProjects]
  );

  const deleteProject = useCallback(
    (id: string) => {
      ProjectManager.deleteProject(id);
      loadProjects();
    },
    [loadProjects]
  );

  const openProject = useCallback(
    (id: string) => {
      ProjectManager.setCurrentProject(id);
      loadProjects();
    },
    [loadProjects]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      ProjectManager.toggleFavorite(id);
      loadProjects();
    },
    [loadProjects]
  );

  const duplicateProject = useCallback(
    (id: string) => {
      const copy = ProjectManager.duplicateProject(id);
      if (copy) {
        loadProjects();
        return copy;
      }
    },
    [loadProjects]
  );

  return {
    projects,
    currentProject,
    favorites,
    recent,
    createProject,
    updateProject,
    deleteProject,
    openProject,
    toggleFavorite,
    duplicateProject,
    loadProjects,
  };
};