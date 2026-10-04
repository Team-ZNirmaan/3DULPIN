import type { LucideIcon } from 'lucide-react'
import { Cuboid, Database, IdCard, ScanSearch, ShieldCheck } from 'lucide-react'

export type ScreenId = 'survey' | 'explorer' | 'validation' | 'registry' | 'card'

export interface ScreenDef {
  id: ScreenId
  path: string
  icon: LucideIcon
}

/** The five demo steps, in story order. */
export const SCREENS: ScreenDef[] = [
  { id: 'survey', path: '/app/survey', icon: ScanSearch },
  { id: 'explorer', path: '/app/explorer', icon: Cuboid },
  { id: 'validation', path: '/app/validation', icon: ShieldCheck },
  { id: 'registry', path: '/app/registry', icon: Database },
  { id: 'card', path: '/app/card', icon: IdCard },
]

export const FIRST_SCREEN = SCREENS[0].path
