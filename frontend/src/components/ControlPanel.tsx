import React, { useRef } from 'react';
import { exportAsPNG, exportAsSVG, exportAsPDF, downloadJSON, loadJSONFile } from '../utils/exporters';
import { saveProject, generateId, ProjectData } from '../utils/storage';

type DiagramType = 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';

interface ControlPanelProps {
  code: string;
  diagramType: DiagramType;
  prompt: string;
  previewRef: React.RefObject<HTMLDivElement>;
  onLoadProject: (project: ProjectData) => void;
}

/**
 * Control panel with export, save, and load buttons.
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({
  code,
  diagramType,
  prompt,
  previewRef,
  onLoadProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportPNG = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      await exportAsPNG(previewRef.current, `diagram-${Date.now()}`);
    } catch (error) {
      console.error('Export PNG failed:', error);
      alert('Failed to export PNG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      await exportAsSVG(previewRef.current, `diagram-${Date.now()}`);
    } catch (error) {
      console.error('Export SVG failed:', error);
      alert('Failed to export SVG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      await exportAsPDF(previewRef.current, `diagram-${Date.now()}`);
    } catch (error) {
      console.error('Export PDF failed:', error);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProject = () => {
    const project: ProjectData = {
      id: generateId(),
      name: `${diagramType} - ${new Date().toLocaleString()}`,
      diagramType: diagramType as DiagramType,
      code,
      prompt,
      versions: [{ code, timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(project);
    downloadJSON(project, project.name);
    alert('Project saved!');
  };

  const handleLoadProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await loadJSONFile(file);
      if (data && typeof data === 'object' && 'id' in data) {
        onLoadProject(data as ProjectData);
        alert('Project loaded!');
      } else {
        alert('Invalid project file');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project file');
    }
  };

  const exportMenuItems = [
    { label: '🖼️ PNG', onClick: handleExportPNG },
    { label: '📄 SVG', onClick: handleExportSVG },
    { label: '📕 PDF', onClick: handleExportPDF },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border-t border-gray-200">
      <div className="text-sm font-semibold text-gray-700 mb-1">💾 Actions</div>

      {/* Export Buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          {exportMenuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              disabled={isExporting || !code.trim()}
              className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-2 px-2 rounded transition"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          <button
            onClick={handleSaveProject}
            disabled={!code.trim()}
            className="flex-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-2 rounded transition"
          >
            💾 Save Project
          </button>
          <button
            onClick={handleLoadProject}
            className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-2 rounded transition"
          >
            📂 Load Project
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      <div className="text-xs text-gray-500 text-center mt-2">
        Ctrl+S to save | Ctrl+Shift+E to export SVG
      </div>
    </div>
  );
};
