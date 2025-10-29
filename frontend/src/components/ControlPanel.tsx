import React, { useRef, useState } from 'react';
import { exportAsPNG, exportAsSVG, exportAsPDF, downloadJSON, loadJSONFile } from '../utils/exporters';
import { saveProject, ProjectData } from '../utils/storage';

interface ControlPanelProps {
  code: string;
  diagramType: 'mermaid' | 'dbml' | 'graphviz';
  prompt: string;
  previewRef: React.RefObject<HTMLDivElement>;
  onLoadProject: (project: ProjectData) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  code,
  diagramType,
  prompt,
  previewRef,
  onLoadProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPNG = async () => {
    if (!previewRef.current || !code.trim()) return;
    setIsExporting(true);
    try {
      await exportAsPNG(previewRef.current, `viscept-${Date.now()}.png`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PNG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = async () => {
    if (!previewRef.current || !code.trim()) return;
    setIsExporting(true);
    try {
      await exportAsSVG(previewRef.current, `viscept-${Date.now()}.svg`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export SVG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!previewRef.current || !code.trim()) return;
    setIsExporting(true);
    try {
      await exportAsPDF(previewRef.current, `viscept-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProject = () => {
    const project: ProjectData = {
      prompt,
      code,
      diagramType,
      timestamp: new Date().toISOString(),
    };
    downloadJSON(project, `viscept-project-${Date.now()}`);
  };

  const handleLoadProject = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await loadJSONFile(file);
      const project = data as ProjectData;
      if (project.code && project.diagramType) {
        onLoadProject(project);
      } else {
        alert('Invalid project file');
      }
    } catch (err) {
      alert('Failed to load project file');
    }
  };

  return (
    <div className="flex flex-col gap-3 p-5 bg-slate-800/50 border-t border-slate-700/50">
      {/* Export Buttons */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">💾 Export</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExportPNG}
            disabled={isExporting || !code.trim()}
            className="btn-secondary text-xs py-2"
            title="Export as PNG image"
          >
            🖼️
          </button>
          <button
            onClick={handleExportSVG}
            disabled={isExporting || !code.trim()}
            className="btn-secondary text-xs py-2"
            title="Export as SVG vector"
          >
            📄
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting || !code.trim()}
            className="btn-secondary text-xs py-2"
            title="Export as PDF document"
          >
            📕
          </button>
        </div>
      </div>

      {/* Project Buttons */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">📦 Project</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSaveProject}
            disabled={!code.trim()}
            className="btn-secondary text-xs py-2 text-center"
          >
            💾 Save
          </button>
          <button
            onClick={handleLoadProject}
            className="btn-secondary text-xs py-2 text-center"
          >
            📂 Load
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>
    </div>
  );
};