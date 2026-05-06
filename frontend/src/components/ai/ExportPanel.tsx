import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, Image, FileCode, FileText, Copy, Download, CheckCircle2,
} from 'lucide-react';
import { theme } from '../theme';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useUIStore } from '../../store/uiStore';
import type { ExportOptions, ExportQuality } from '../../utils/exporters';

interface ExportPanelProps {
  onExportPNG: (options?: ExportOptions) => Promise<void>;
  onExportSVG: (options?: ExportOptions) => Promise<void>;
  onExportPDF: (options?: ExportOptions) => Promise<void>;
  onCopyCode: () => void;
  hasContent: boolean;
}

const FORMAT_OPTIONS = [
  {
    id: 'png',
    label: 'PNG Image',
    description: 'High-quality raster image',
    icon: Image,
    gradient: 'linear-gradient(135deg, #6a5cff, #00d4ff)',
  },
  {
    id: 'svg',
    label: 'SVG Vector',
    description: 'Scalable, editable vector',
    icon: FileCode,
    gradient: 'linear-gradient(135deg, #00d4ff, #6a5cff)',
  },
  {
    id: 'pdf',
    label: 'PDF Document',
    description: 'Print-ready document',
    icon: FileText,
    gradient: 'linear-gradient(135deg, #ff7ad9, #6a5cff)',
  },
  {
    id: 'code',
    label: 'Copy Code',
    description: 'Source markup to clipboard',
    icon: Copy,
    gradient: 'linear-gradient(135deg, #6a5cff, #ff7ad9)',
  },
] as const;

const STYLE_OPTIONS = [
  {
    id: 'studio-dark',
    label: 'Studio Dark',
    description: 'Deep navy background',
    background: '#0b0f1a',
    padding: 28,
    borderRadius: 16,
    shadow: '0 24px 60px rgba(0,0,0,0.45)',
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Clean white export',
    background: '#ffffff',
    padding: 32,
    borderRadius: 12,
    shadow: '0 14px 40px rgba(0,0,0,0.15)',
  },
  {
    id: 'transparent',
    label: 'Transparent',
    description: 'No background fill',
    background: 'transparent',
    padding: 0,
    borderRadius: 0,
    shadow: 'none',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Cool slate tone',
    background: '#0f172a',
    padding: 26,
    borderRadius: 14,
    shadow: '0 20px 50px rgba(0,0,0,0.4)',
  },
] as const;

const QUALITY_OPTIONS: Array<{ id: ExportQuality; label: string; hint: string }> = [
  { id: 'low', label: 'Low', hint: 'Fast' },
  { id: 'medium', label: 'Medium', hint: 'Balanced' },
  { id: 'high', label: 'High', hint: 'Crisp' },
];

type ExportId = typeof FORMAT_OPTIONS[number]['id'];
type ExportStyleId = typeof STYLE_OPTIONS[number]['id'];

/**
 * ExportPanel — Radix Dialog overlay with 2×2 grid of export options.
 */
export const ExportPanel: React.FC<ExportPanelProps> = ({
  onExportPNG, onExportSVG, onExportPDF, onCopyCode, hasContent,
}) => {
  const open = useUIStore((s) => s.exportPanelOpen);
  const setExportPanelOpen = useUIStore((s) => s.setExportPanelOpen);
  const [selectedFormats, setSelectedFormats] = useState<ExportId[]>(['png']);
  const [selectedStyle, setSelectedStyle] = useState<ExportStyleId>('studio-dark');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggleFormat = (id: ExportId) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const buildOptions = (): ExportOptions => {
    const style = STYLE_OPTIONS.find((opt) => opt.id === selectedStyle) || STYLE_OPTIONS[0];
    return {
      background: style.background,
      padding: style.padding,
      borderRadius: style.borderRadius,
      shadow: style.shadow,
      quality,
    };
  };

  const handleExportSelected = async () => {
    if (!hasContent || loading || selectedFormats.length === 0) return;
    setLoading(true);
    setDone(false);
    const options = buildOptions();
    try {
      for (const id of selectedFormats) {
        if (id === 'png') await onExportPNG(options);
        if (id === 'svg') await onExportSVG(options);
        if (id === 'pdf') await onExportPDF(options);
        if (id === 'code') onCopyCode();
      }
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setExportPanelOpen}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => setExportPanelOpen(false)}
          />
        </Dialog.Overlay>

        {/* Content */}
        <Dialog.Content asChild>
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-2xl outline-none"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              border: `1px solid ${theme.colors.border.medium}`,
              boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-8 py-6 border-b"
              style={{ borderColor: theme.colors.border.medium }}
            >
              <div>
                <Dialog.Title
                  className="text-2xl font-bold"
                  style={{ color: theme.colors.text.primary }}
                >
                  Export Diagram
                </Dialog.Title>
                <Dialog.Description
                  className="text-sm mt-1"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Choose formats, styles, and quality for your export.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  onClick={() => setExportPanelOpen(false)}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.secondary,
                  }}
                  title="Close export"
                >
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Formats */}
              <div>
                <label
                  className="text-sm font-semibold uppercase tracking-widest block mb-3"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {FORMAT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedFormats.includes(opt.id);
                    return (
                      <motion.button
                        key={opt.id}
                        whileHover={{ scale: hasContent ? 1.02 : 1 }}
                        whileTap={{ scale: hasContent ? 0.98 : 1 }}
                        onClick={() => toggleFormat(opt.id)}
                        disabled={!hasContent || loading}
                        className="text-left p-4 rounded-xl flex items-start gap-3 transition-all border"
                        style={{
                          backgroundColor: isSelected ? theme.colors.bg.tertiary : theme.colors.bg.secondary,
                          borderColor: isSelected ? theme.colors.accent.primary : theme.colors.border.medium,
                          cursor: hasContent ? 'pointer' : 'not-allowed',
                          opacity: !hasContent ? 0.5 : 1,
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ background: opt.gradient }}>
                          {isSelected ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                            {opt.label}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: theme.colors.text.secondary }}>
                            {opt.description}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Styles */}
              <div>
                <label
                  className="text-sm font-semibold uppercase tracking-widest block mb-3"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Export Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedStyle(opt.id)}
                      disabled={!hasContent || loading}
                      className="text-left p-4 rounded-xl transition-all border"
                      style={{
                        backgroundColor: opt.id === selectedStyle ? theme.colors.bg.tertiary : theme.colors.bg.secondary,
                        borderColor: opt.id === selectedStyle ? theme.colors.accent.primary : theme.colors.border.medium,
                        cursor: hasContent ? 'pointer' : 'not-allowed',
                        opacity: !hasContent ? 0.5 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-4 h-4 rounded border"
                          style={{
                            backgroundColor: opt.background,
                            borderColor: theme.colors.border.medium,
                          }}
                        />
                        <span className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                          {opt.label}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <label
                  className="text-sm font-semibold uppercase tracking-widest block mb-3"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Quality
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setQuality(opt.id)}
                      disabled={!hasContent || loading}
                      className="text-center p-3 rounded-lg transition-all border"
                      style={{
                        backgroundColor: opt.id === quality ? theme.colors.bg.tertiary : theme.colors.bg.secondary,
                        borderColor: opt.id === quality ? theme.colors.accent.primary : theme.colors.border.medium,
                        cursor: hasContent ? 'pointer' : 'not-allowed',
                        opacity: !hasContent ? 0.5 : 1,
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: theme.colors.text.secondary }}>
                        {opt.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer / Actions */}
            <div
              className="flex items-center gap-3 px-8 py-6 border-t"
              style={{ borderColor: theme.colors.border.medium }}
            >
              <button
                onClick={handleExportSelected}
                disabled={!hasContent || loading || selectedFormats.length === 0}
                className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: theme.colors.accent.primary,
                  color: 'white',
                  opacity: !hasContent || selectedFormats.length === 0 ? 0.6 : 1,
                  cursor: !hasContent || selectedFormats.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Exporting...' : done ? '✓ Exported' : `Export (${selectedFormats.length})`}
              </button>
              <button
                onClick={() => setSelectedFormats(FORMAT_OPTIONS.map((opt) => opt.id))}
                disabled={!hasContent || loading}
                className="px-4 py-3 rounded-lg text-sm font-medium transition-all border"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  borderColor: theme.colors.border.medium,
                  color: theme.colors.text.secondary,
                  opacity: !hasContent ? 0.5 : 1,
                  cursor: !hasContent ? 'not-allowed' : 'pointer',
                }}
              >
                Select All
              </button>
            </div>

            {!hasContent && (
              <div className="px-8 py-4 text-center text-xs" style={{ color: theme.colors.text.secondary }}>
                Generate a diagram first to enable exports.
              </div>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
