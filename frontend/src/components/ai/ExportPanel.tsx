import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Separator from '@radix-ui/react-separator';
import {
  X, Image, FileCode, FilePdf, Copy, Download, CheckCircle2,
} from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useUIStore } from '../../store/uiStore';

interface ExportPanelProps {
  onExportPNG: () => Promise<void>;
  onExportSVG: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  onCopyCode: () => void;
  hasContent: boolean;
}

const OPTIONS = [
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
    icon: FilePdf,
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

type ExportId = typeof OPTIONS[number]['id'];

/**
 * ExportPanel — Radix Dialog overlay with 2×2 grid of export options.
 */
export const ExportPanel: React.FC<ExportPanelProps> = ({
  onExportPNG, onExportSVG, onExportPDF, onCopyCode, hasContent,
}) => {
  const open = useUIStore((s) => s.exportPanelOpen);
  const setExportPanelOpen = useUIStore((s) => s.setExportPanelOpen);
  const [loading, setLoading] = useState<ExportId | null>(null);
  const [done, setDone] = useState<ExportId | null>(null);

  const handleExport = async (id: ExportId) => {
    if (!hasContent || loading) return;
    setLoading(id);
    setDone(null);
    try {
      if (id === 'png')  await onExportPNG();
      if (id === 'svg')  await onExportSVG();
      if (id === 'pdf')  await onExportPDF();
      if (id === 'code') { onCopyCode(); }
      setDone(id);
      setTimeout(() => setDone(null), 2000);
    } finally {
      setLoading(null);
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
            style={{ background: 'rgba(11,15,26,0.72)', backdropFilter: 'blur(6px)' }}
          />
        </Dialog.Overlay>

        {/* Content */}
        <Dialog.Content asChild>
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[480px] rounded-2xl p-6 outline-none"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(106,92,255,0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <Dialog.Title className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Export Diagram
                </Dialog.Title>
                <Dialog.Description className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Choose a format to download or copy your diagram.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <AnimatedButton variant="ghost" size="icon-sm">
                  <X size={15} />
                </AnimatedButton>
              </Dialog.Close>
            </div>

            <Separator.Root
              className="mb-5"
              style={{ height: 1, background: 'var(--border-subtle)' }}
            />

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {OPTIONS.map((opt, i) => {
                const Icon = opt.icon;
                const isLoading = loading === opt.id;
                const isDone = done === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: hasContent ? 1.03 : 1 }}
                    whileTap={{ scale: hasContent ? 0.97 : 1 }}
                    onClick={() => handleExport(opt.id)}
                    disabled={!hasContent || !!loading}
                    className="text-left p-4 rounded-xl flex items-start gap-3 transition-colors group"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      cursor: hasContent ? 'pointer' : 'not-allowed',
                      opacity: !hasContent ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (hasContent) {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-start)';
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-active)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: opt.gradient }}
                    >
                      {isDone
                        ? <CheckCircle2 size={18} color="white" />
                        : isLoading
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <Icon size={18} color="white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                        {opt.description}
                      </p>
                    </div>
                    <Download size={13} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                  </motion.button>
                );
              })}
            </div>

            {!hasContent && (
              <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                Generate a diagram first to enable exports.
              </p>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
