import { useSyncExternalStore } from 'react'

// Demo state shared by every screen. It survives a page reload (local storage),
// and "Reset demo" puts it back to the start of the demo.
export type DemoState = {
  towerRegistered: boolean
}

const STORAGE_KEY = 'znirmaan.demo.v1'
const INITIAL: DemoState = { towerRegistered: false }

function load(): DemoState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    return raw ? { ...INITIAL, ...(JSON.parse(raw) as Partial<DemoState>) } : INITIAL
  } catch {
    return INITIAL
  }
}

let state: DemoState = load()
const listeners = new Set<() => void>()

function set(next: DemoState) {
  state = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage blocked: the demo still works for this visit.
  }
  listeners.forEach((l) => l())
}

export const getDemoState = () => state

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const setTowerRegistered = (towerRegistered: boolean) => set({ ...state, towerRegistered })

export const resetDemo = () => set(INITIAL)

export const useDemoState = () => useSyncExternalStore(subscribe, getDemoState)
