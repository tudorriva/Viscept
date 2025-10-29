import React, { useState } from 'react';
import { ProjectData, DiagramType } from '../types/project';
import { theme } from '../theme';

interface ProjectSidebarProps {
  projects: ProjectData[];
  favorites: ProjectData[];
  recent: ProjectData[];
  currentProject: ProjectData | null;
  onSelectProject: (project: ProjectData) => void;
  onCreateProject: (name: string, diagramType: DiagramType) => void;
  onDeleteProject: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
}

type SidebarTab = 'recent' | 'all' | 'favorites';

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  favorites,
  recent,
  currentProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onToggleFavorite,
  onDuplicate,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('recent');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedDiagramType, setSelectedDiagramType] = useState<DiagramType>('mermaid');
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName, selectedDiagramType);
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  const getDisplayProjects = () => {
    let items = activeTab === 'recent' ? recent : activeTab === 'favorites' ? favorites : projects;
    if (searchQuery.trim()) {
      items = items.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 3600000) return 'Today';
    if (diff < 86400000) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayProjects = getDisplayProjects();

  return (
    <div
      className="flex flex-col h-full w-80 border-r"
      style={{
        backgroundColor: theme.colors.bg.primary,
        borderColor: theme.colors.border.medium,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: theme.colors.border.medium }}>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full py-2.5 rounded-lg font-medium transition-all text-sm"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
            color: '#fff',
            boxShadow: `0 4px 15px rgba(59, 130, 246, 0.3)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 6px 25px rgba(59, 130, 246, 0.5)`;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 4px 15px rgba(59, 130, 246, 0.3)`;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ✨ New Project
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: theme.colors.border.medium }}>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm transition-all"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border.light}`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.accent.primary;
            e.currentTarget.style.boxShadow = `0 0 0 3px rgba(59, 130, 246, 0.1)`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border.light;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b px-2 pt-2" style={{ borderColor: theme.colors.border.medium }}>
        {(['recent', 'all', 'favorites'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium transition-all border-b-2 capitalize"
            style={{
              color: activeTab === tab ? theme.colors.accent.primary : theme.colors.text.tertiary,
              borderColor: activeTab === tab ? theme.colors.accent.primary : 'transparent',
            }}
          >
            {tab === 'recent' ? '⏱️ Recent' : tab === 'all' ? '📁 All' : '⭐ Favorites'}
          </button>
        ))}
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {displayProjects.length === 0 ? (
          <div className="p-8 text-center">
            <p
              className="text-sm"
              style={{ color: theme.colors.text.tertiary }}
            >
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: theme.colors.border.light }}>
            {displayProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, projectId: project.id });
                }}
                className="p-3 cursor-pointer transition-all hover:border-l-2"
                style={{
                  backgroundColor:
                    currentProject?.id === project.id
                      ? theme.colors.bg.tertiary
                      : 'transparent',
                  borderLeftColor: currentProject?.id === project.id ? theme.colors.accent.primary : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (currentProject?.id !== project.id) {
                    e.currentTarget.style.backgroundColor = theme.colors.bg.quaternary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentProject?.id !== project.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: theme.colors.text.primary }}
                    >
                      {project.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${theme.colors.accent.primary}20`,
                          color: theme.colors.accent.primary,
                        }}
                      >
                        {project.diagramType}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: theme.colors.text.tertiary }}
                      >
                        {formatDate(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(project.id);
                    }}
                    className="text-lg transition-all"
                  >
                    {project.isFavorite ? '⭐' : '☆'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setIsCreating(false)}
        >
          <div
            className="rounded-lg p-6 w-96 shadow-2xl"
            style={{ backgroundColor: theme.colors.bg.secondary }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: theme.colors.text.primary }}
            >
              Create New Project
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My diagram..."
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Diagram Type
                </label>
                <select
                  value={selectedDiagramType}
                  onChange={(e) => setSelectedDiagramType(e.target.value as DiagramType)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  <option value="mermaid">📊 Mermaid</option>
                  <option value="dbml">🗄️ DBML</option>
                  <option value="graphviz">🔗 Graphviz</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 py-2 rounded-lg font-medium text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                    color: '#fff',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 rounded-lg font-medium text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed rounded-lg shadow-lg py-1 z-50 text-sm"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            backgroundColor: theme.colors.bg.secondary,
            border: `1px solid ${theme.colors.border.medium}`,
          }}
          onClick={() => setContextMenu(null)}
        >
          {[
            { label: 'Duplicate', icon: '📋', action: () => onDuplicate(contextMenu.projectId) },
            { label: 'Delete', icon: '🗑️', action: () => onDeleteProject(contextMenu.projectId), danger: true },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              className="w-full text-left px-4 py-2 hover:opacity-80 transition-all flex items-center gap-2"
              style={{ color: item.danger ? theme.colors.status.error : theme.colors.text.primary }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};