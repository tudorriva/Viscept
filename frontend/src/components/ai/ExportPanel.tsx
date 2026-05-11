import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X, Image, FileCode, FileText, Copy, Download, CheckCircle2, Loader,
} from 'lucide-react';
import { theme } from '../../theme';
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
 * ExportPanel — Radix Dialog overlay with styling matched to SettingsPanel.
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
      setTimeout(() => {
        setDone(false);
        setExportPanelOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setExportPanelOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
              />
            </Dialog.Overlay>

            {/* Content Container (Centering wrapper) */}
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden outline-none shadow-2xl pointer-events-auto"
                  style={{
                    backgroundColor: theme.colors.bg.secondary,
                    border: `1px solid ${theme.colors.border.medium}`,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-8 py-6 border-b shrink-0"
                    style={{ borderColor: theme.colors.border.medium, backgroundColor: theme.colors.bg.secondary }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.tertiary})` }}
                      >
                        <Download size={24} />
                      </div>
                      <div>
                        <Dialog.Title
                          className="text-2xl font-bold tracking-tight"
                          style={{ color: theme.colors.text.primary }}
                        >
                          Export Diagram
                        </Dialog.Title>
                        <Dialog.Description
                          className="text-sm font-medium opacity-70"
                          style={{ color: theme.colors.text.secondary }}
                        >
                          Professional formats & visual styles
                        </Dialog.Description>
                      </div>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        className="p-2.5 rounded-xl transition-all hover:bg-white/5 active:scale-95"
                        style={{
                          backgroundColor: 'transparent',
                          color: theme.colors.text.secondary,
                        }}
                        title="Close"
                      >
                        <X size={20} />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar" style={{ backgroundColor: theme.colors.bg.secondary }}>
                    {/* Formats Section */}
                    <section>
                      <div className="flex items-center gap-2 mb-5">
                        <FileCode size={16} style={{ color: theme.colors.accent.primary }} />
                        <label
                          className="text-[11px] font-bold uppercase tracking-[0.15em]"
                          style={{ color: theme.colors.text.muted }}
                        >
                          Export Formats
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {FORMAT_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = selectedFormats.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => toggleFormat(opt.id)}
                              disabled={!hasContent || loading}
                              className="text-left p-5 rounded-2xl flex items-start gap-4 transition-all border group relative overflow-hidden"
                              style={{
                                backgroundColor: isSelected ? 'rgba(106,92,255,0.05)' : 'transparent',
                                borderColor: isSelected ? theme.colors.accent.primary : theme.colors.border.light,
                                opacity: !hasContent ? 0.5 : 1,
                              }}
                            >
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md z-10"
                                style={{ background: opt.gradient }}
                              >
                                {isSelected ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                              </div>
                              <div className="z-10">
                                <p className="text-sm font-bold group-hover:text-white transition-colors" style={{ color: theme.colors.text.primary }}>
                                  {opt.label}
                                </p>
                                <p className="text-xs mt-1 leading-snug opacity-60" style={{ color: theme.colors.text.secondary }}>
                                  {opt.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Style Section */}
                    <section>
                      <div className="flex items-center gap-2 mb-5">
                        <Image size={16} style={{ color: theme.colors.accent.primary }} />
                        <label
                          className="text-[11px] font-bold uppercase tracking-[0.15em]"
                          style={{ color: theme.colors.text.muted }}
                        >
                          Visual Presets
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedStyle(opt.id)}
                            disabled={!hasContent || loading}
                            className="text-left p-5 rounded-2xl transition-all border group"
                            style={{
                              backgroundColor: opt.id === selectedStyle ? 'rgba(106,92,255,0.05)' : 'transparent',
                              borderColor: opt.id === selectedStyle ? theme.colors.accent.primary : theme.colors.border.light,
                              opacity: !hasContent ? 0.5 : 1,
                            }}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className="w-5 h-5 rounded-full border-2 border-white/10 shadow-inner"
                                style={{ backgroundColor: opt.background }}
                              />
                              <span className="text-sm font-bold" style={{ color: theme.colors.text.primary }}>
                                {opt.label}
                              </span>
                            </div>
                            <p className="text-xs opacity-60" style={{ color: theme.colors.text.secondary }}>
                              {opt.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Quality Selection */}
                    <section>
                      <div className="flex items-center gap-2 mb-5">
                        <FileText size={16} style={{ color: theme.colors.accent.primary }} />
                        <label
                          className="text-[11px] font-bold uppercase tracking-[0.15em]"
                          style={{ color: theme.colors.text.muted }}
                        >
                          Resolution Quality
                        </label>
                      </div>
                      <div className="flex p-1.5 rounded-2xl" style={{ backgroundColor: theme.colors.bg.primary, border: `1px solid ${theme.colors.border.light}` }}>
                        {QUALITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setQuality(opt.id)}
                            disabled={!hasContent || loading}
                            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all relative"
                            style={{
                              backgroundColor: opt.id === quality ? theme.colors.bg.secondary : 'transparent',
                              color: opt.id === quality ? theme.colors.accent.primary : theme.colors.text.muted,
                              boxShadow: opt.id === quality ? theme.shadows.sm : 'none',
                              border: opt.id === quality ? `1px solid ${theme.colors.border.light}` : '1px solid transparent',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Footer */}
                  <div
                    className="px-8 py-8 border-t flex items-center gap-4 shrink-0"
                    style={{ borderColor: theme.colors.border.medium, backgroundColor: theme.colors.bg.primary }}
                  >
                    <button
                      onClick={() => setExportPanelOpen(false)}
                      className="px-8 py-4 rounded-2xl text-sm font-bold transition-all border hover:bg-white/5 active:scale-95"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: theme.colors.border.light,
                        color: theme.colors.text.primary,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExportSelected}
                      disabled={!hasContent || loading || selectedFormats.length === 0}
                      className="flex-1 py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 shadow-xl hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                      style={{
                        background: loading
                          ? theme.colors.bg.tertiary
                          : `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.tertiary})`,
                        color: '#fff',
                        boxShadow: loading ? 'none' : `0 8px 24px -6px ${theme.colors.accent.primary}66`,
                      }}
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          >
                            <Loader size={18} />
                          </motion.div>
                          Processing Export...
                        </>
                      ) : done ? (
                        <>
                          <CheckCircle2 size={18} />
                          Files Ready!
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          Download {selectedFormats.length} {selectedFormats.length === 1 ? 'Format' : 'Formats'}
                        </>
                      )}
                    </button>
                  </div>

                  {!hasContent && (
                    <div
                      className="px-8 py-3 text-center text-[10px] font-bold uppercase tracking-widest"
                      style={{ backgroundColor: `${theme.colors.status.warning}10`, color: theme.colors.status.warning, borderTop: `1px solid ${theme.colors.status.warning}20` }}
                    >
                      Canvas is empty. Generate a diagram to enable export.
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
