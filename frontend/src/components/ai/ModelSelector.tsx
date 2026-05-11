import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModelOption {
  value: string;
  label: string;
  group: 'code' | 'vision';
  recommended?: boolean;
}

const MODEL_OPTIONS: ModelOption[] = [
  { value: 'viscept',          label: 'Viscept',             group: 'code', recommended: true },
  { value: 'qwen2.5-coder:7b',  label: 'Qwen2.5-Coder 7B',  group: 'code' },
  { value: 'qwen2.5-coder:3b',  label: 'Qwen2.5-Coder 3B',  group: 'code' },
  { value: 'mistral',           label: 'Mistral 7B',          group: 'code' },
  { value: 'llama3.1:8b',       label: 'Llama 3.1 8B',        group: 'code' },
  { value: 'codellama:7b',      label: 'CodeLlama 7B',       group: 'code' },
  { value: 'granite3.2-vision:2b', label: 'Granite3.2 Vision 2B', group: 'vision', recommended: true },
  { value: 'moondream:latest',  label: 'Moondream2 1.9B',    group: 'vision' },
];

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  className?: string;
}

/**
 * ModelSelector — Radix DropdownMenu for choosing the active LLM.
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const selected = MODEL_OPTIONS.find((m) => m.value === value);
  const codeModels   = MODEL_OPTIONS.filter((m) => m.group === 'code');
  const visionModels = MODEL_OPTIONS.filter((m) => m.group === 'vision');

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
            'transition-colors outline-none',
            className,
          )}
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-start)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
        >
          <Cpu size={12} />
          <span className="max-w-[120px] truncate">{selected?.label ?? value}</span>
          <ChevronDown size={12} className="ml-0.5 shrink-0" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[200px] rounded-xl p-1.5 shadow-panel-lg animate-fade-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-medium)',
          }}
          sideOffset={6}
          align="start"
        >
          <DropdownMenu.Label
            className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Code Generation
          </DropdownMenu.Label>
          {codeModels.map((model) => (
            <DropdownMenu.Item
              key={model.value}
              onSelect={() => onChange(model.value)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer outline-none text-xs"
              style={{
                color: 'var(--text-secondary)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-active)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <span className="flex-1">{model.label}</span>
              {model.recommended && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-active)', color: 'var(--accent-start)' }}>
                  Recommended
                </span>
              )}
              {model.value === value && <Check size={12} color="var(--accent-start)" />}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />

          <DropdownMenu.Label
            className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Vision / Validation
          </DropdownMenu.Label>
          {visionModels.map((model) => (
            <DropdownMenu.Item
              key={model.value}
              onSelect={() => onChange(model.value)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer outline-none text-xs"
              style={{
                color: 'var(--text-secondary)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-active)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <span className="flex-1">{model.label}</span>
              {model.recommended && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-active)', color: 'var(--accent-start)' }}>
                  Recommended
                </span>
              )}
              {model.value === value && <Check size={12} color="var(--accent-start)" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
