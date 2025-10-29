import React, { useState } from 'react';
import { Plus, Clock, FolderOpen, Star, Trash2, Copy, Code } from 'lucide-react';
import { theme } from '../theme';

interface Project {
  id: string;
  name: string;
  diagramType: 'mermaid' | 'dbml' | 'graphviz';
  code: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

interface ProjectSidebarProps {
  projects: Project[];
  favorites: Project[];
  recent: Project[];
  currentProject: Project | null;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicateProject: (id: string) => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  favorites,
  recent,
  currentProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onToggleFavorite,
  onDuplicateProject,
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'all' | 'favorites'>('recent');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const displayProjects = activeTab === 'recent' ? recent : activeTab === 'favorites' ? favorites : projects;

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName);
      setNewProjectName('');
      setShowNewProjectModal(false);
    }
  };

  return (
    <div
      className="w-64 border-r flex flex-col"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderColor: theme.colors.border.medium,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: theme.colors.border.medium }}>
        <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: theme.colors.text.primary }}>
          Projects
        </h2>
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.medium,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.colors.accent.primary}20`;
            e.currentTarget.style.borderColor = theme.colors.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
            e.currentTarget.style.borderColor = theme.colors.border.medium;
          }}
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b px-2 pt-2" style={{ borderColor: theme.colors.border.medium }}>
        {(['recent', 'all', 'favorites'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium transition-all border-b-2 capitalize flex items-center gap-1"
            style={{
              color: activeTab === tab ? theme.colors.accent.primary : theme.colors.text.tertiary,
              borderColor: activeTab === tab ? theme.colors.accent.primary : 'transparent',
            }}
          >
            {tab === 'recent' && <Clock size={14} />}
            {tab === 'all' && <FolderOpen size={14} />}
            {tab === 'favorites' && <Star size={14} />}
            <span>{tab === 'recent' ? 'Recent' : tab === 'all' ? 'All' : 'Favorites'}</span>
          </button>
        ))}
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {displayProjects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
              No {activeTab} projects
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {displayProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="p-3 rounded-lg cursor-pointer transition-all group"
                style={{
                  backgroundColor: currentProject?.id === project.id ? `${theme.colors.accent.primary}20` : 'transparent',
                  borderLeft: currentProject?.id === project.id ? `3px solid ${theme.colors.accent.primary}` : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (currentProject?.id !== project.id) {
                    e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentProject?.id !== project.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium" style={{ color: theme.colors.text.primary }}>
                    {project.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(project.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star
                      size={14}
                      fill={project.isFavorite ? theme.colors.accent.primary : 'none'}
                      color={theme.colors.accent.primary}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-xs mb-2" style={{ color: theme.colors.text.tertiary }}>
                  <Code size={12} />
                  {project.diagramType.toUpperCase()}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateProject(project.id);
                    }}
                    className="flex-1 py-1 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: `${theme.colors.accent.primary}10`,
                      color: theme.colors.accent.primary,
                    }}
                  >
                    <Copy size={12} />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    className="flex-1 py-1 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: `${theme.colors.status.error}10`,
                      color: theme.colors.status.error,
                    }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setShowNewProjectModal(false)}
        >
          <div
            className="rounded-lg p-6 w-full max-w-sm shadow-2xl"
            style={{ backgroundColor: theme.colors.bg.secondary }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.colors.text.primary }}>
              Create New Project
            </h3>
            <input
              type="text"
              placeholder="Project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg mb-4 focus:outline-none"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.medium}`,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                  color: '#fff',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};