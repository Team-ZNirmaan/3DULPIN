import { create } from 'zustand'

export type ColorMode = 'class' | 'status'
export type LevelMode = 'all' | 'only'

export interface LayerState {
  parcels: boolean
  context: boolean
  underground: boolean
}

interface ExplorerState {
  colorMode: ColorMode
  levelMode: LevelMode
  level: string
  layers: LayerState
  undergroundView: boolean
  queryMode: boolean
  setColorMode: (m: ColorMode) => void
  setLevel: (mode: LevelMode, level?: string) => void
  toggleLayer: (k: keyof LayerState) => void
  setUndergroundView: (on: boolean) => void
  setQueryMode: (on: boolean) => void
  resetExplorer: () => void
}

const DEFAULTS = {
  colorMode: 'class' as ColorMode,
  levelMode: 'all' as LevelMode,
  level: '05',
  layers: { parcels: true, context: true, underground: true },
  undergroundView: false,
  queryMode: false,
}

export const useExplorer = create<ExplorerState>()((set, get) => ({
  ...DEFAULTS,
  setColorMode: (colorMode) => set({ colorMode }),
  setLevel: (levelMode, level) => set({ levelMode, level: level ?? get().level }),
  toggleLayer: (k) => set({ layers: { ...get().layers, [k]: !get().layers[k] } }),
  setUndergroundView: (undergroundView) => set({ undergroundView }),
  setQueryMode: (queryMode) => set({ queryMode }),
  resetExplorer: () => set({ ...DEFAULTS, layers: { ...DEFAULTS.layers } }),
}))
