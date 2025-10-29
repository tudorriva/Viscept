import React, { useRef, useState } from 'react';
import { FileImage, FileJson, Download, Save, Upload } from 'lucide-react';
import { Icon } from './Icon';
import { theme } from '../theme';
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
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 border-t" style={{ 
      backgroundColor: theme.colors.bg.secondary,
      borderColor: theme.colors.border.medium 
    }}>
      {/* Export Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Download size={14} color={theme.colors.text.secondary} />
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: theme.colors.text.secondary }}
          >
            Export Diagram
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExportPNG}
            disabled={isExporting || !code.trim()}
            className="p-2.5 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.medium,
              opacity: isExporting || !code.trim() ? 0.5 : 1,
              cursor: isExporting || !code.trim() ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isExporting && code.trim()) {
                e.currentTarget.style.backgroundColor = `${theme.colors.accent.primary}20`;
                e.currentTarget.style.borderColor = theme.colors.accent.primary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
              e.currentTarget.style.borderColor = theme.colors.border.medium;
            }}
            title="Export as PNG image"
          >
            <FileImage size={14} />
            PNG
          </button>

          <button
            onClick={handleExportSVG}
            disabled={isExporting || !code.trim()}
            className="p-2.5 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.medium,
              opacity: isExporting || !code.trim() ? 0.5 : 1,
              cursor: isExporting || !code.trim() ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isExporting && code.trim()) {
                e.currentTarget.style.backgroundColor = `${theme.colors.accent.primary}20`;
                e.currentTarget.style.borderColor = theme.colors.accent.primary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
              e.currentTarget.style.borderColor = theme.colors.border.medium;
            }}
            title="Export as SVG vector"
          >
            <FileJson size={14} />
            SVG
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || !code.trim()}
            className="p-2.5 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.medium,
              opacity: isExporting || !code.trim() ? 0.5 : 1,
              cursor: isExporting || !code.trim() ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isExporting && code.trim()) {
                e.currentTarget.style.backgroundColor = `${theme.colors.accent.primary}20`;
                e.currentTarget.style.borderColor = theme.colors.accent.primary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
              e.currentTarget.style.borderColor = theme.colors.border.medium;
            }}
            title="Export as PDF document"
          >
            <FileJson size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* Project Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Save size={14} color={theme.colors.text.secondary} />
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: theme.colors.text.secondary }}
          >
            Project Management
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSaveProject}
            disabled={!code.trim()}
            className="p-2.5 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.medium,
              opacity: !code.trim() ? 0.5 : 1,
              cursor: !code.trim() ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (code.trim()) {
                e.currentTarget.style.backgroundColor = `${theme.colors.accent.primary}20`;
                e.currentTarget.style.borderColor = theme.colors.accent.primary;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
              e.currentTarget.style.borderColor = theme.colors.border.medium;
            }}
          >
            <Save size={14} />
            Save
          </button>

          <button
            onClick={handleLoadProject}
            className="p-2.5 rounded-lg text-sm font-medium transition-all border flex items-center justify-center gap-1"
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
            <Upload size={14} />
            Load
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