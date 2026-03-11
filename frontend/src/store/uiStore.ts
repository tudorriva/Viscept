import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceTab = 'preview' | 'editor' | 'code';

export type GenerationPhase =
  | null
  | 'classifying'
  | 'generating'
  | 'rendering'
  | 'validating'
  | 'fixing'
  | 'done'
  | 'error';

interface UIState {
  /* Layout toggles */
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;

  /* Workspace */
  activeTab: WorkspaceTab;

  /* Modals */
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  examplesOpen: boolean;
  exportPanelOpen: boolean;

  /* AI generation */
  generationPhase: GenerationPhase;
  generationMessage: string;

  /* Actions */
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;

  setActiveTab: (tab: WorkspaceTab) => void;

  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setExamplesOpen: (open: boolean) => void;
  setExportPanelOpen: (open: boolean) => void;

  setGenerationPhase: (phase: GenerationPhase, message?: string) => void;
  resetGeneration: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftSidebarOpen: true,
      rightPanelOpen: true,
      activeTab: 'preview',
      commandPaletteOpen: false,
      settingsOpen: false,
      examplesOpen: false,
      exportPanelOpen: false,
      generationPhase: null,
      generationMessage: '',

      toggleLeftSidebar: () =>
        set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),

      toggleRightPanel: () =>
        set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setExamplesOpen: (open) => set({ examplesOpen: open }),
      setExportPanelOpen: (open) => set({ exportPanelOpen: open }),

      setGenerationPhase: (phase, message = '') =>
        set({ generationPhase: phase, generationMessage: message }),

      resetGeneration: () =>
        set({ generationPhase: null, generationMessage: '' }),
    }),
    {
      name: 'viscept_ui',
      partialize: (state) => ({
        leftSidebarOpen: state.leftSidebarOpen,
        rightPanelOpen: state.rightPanelOpen,
        activeTab: state.activeTab,
      }),
    },
  ),
);
