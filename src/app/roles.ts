import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Building2,
  ClipboardCheck,
  Cuboid,
  Database,
  Download,
  Gavel,
  HardHat,
  House,
  Landmark,
  LayoutDashboard,
  Presentation,
  ScanSearch,
  ScrollText,
  Shovel,
  ShieldCheck,
  Stamp,
  Users,
  Workflow,
} from 'lucide-react'

export type ScreenId =
  | 'dashboard'
  | 'explorer'
  | 'pipeline'
  | 'analysis'
  | 'validation'
  | 'verification'
  | 'registry'
  | 'deeds'
  | 'audit'
  | 'citizen'
  | 'digcheck'
  | 'collateral'
  | 'exports'

export type NavGroup = 'overview' | 'survey' | 'governance' | 'services'

export interface ScreenDef {
  id: ScreenId
  path: string
  group: NavGroup
  icon: LucideIcon
}

export const SCREENS: ScreenDef[] = [
  { id: 'dashboard', path: '/app/dashboard', group: 'overview', icon: LayoutDashboard },
  { id: 'explorer', path: '/app/explorer', group: 'overview', icon: Cuboid },
  { id: 'pipeline', path: '/app/pipeline', group: 'survey', icon: Workflow },
  { id: 'analysis', path: '/app/analysis', group: 'survey', icon: ScanSearch },
  { id: 'validation', path: '/app/validation', group: 'survey', icon: ShieldCheck },
  { id: 'verification', path: '/app/verification', group: 'governance', icon: ClipboardCheck },
  { id: 'registry', path: '/app/registry', group: 'governance', icon: Database },
  { id: 'deeds', path: '/app/deeds', group: 'governance', icon: Stamp },
  { id: 'audit', path: '/app/audit', group: 'governance', icon: ScrollText },
  { id: 'citizen', path: '/app/citizen', group: 'services', icon: House },
  { id: 'digcheck', path: '/app/dig-check', group: 'services', icon: Shovel },
  { id: 'collateral', path: '/app/collateral', group: 'services', icon: Banknote },
  { id: 'exports', path: '/app/exports', group: 'services', icon: Download },
]

export const NAV_GROUPS: NavGroup[] = ['overview', 'survey', 'governance', 'services']

export type RoleId =
  | 'presenter'
  | 'dolr'
  | 'operator'
  | 'surveyor'
  | 'authority'
  | 'registrar'
  | 'citizen'
  | 'utility'
  | 'bank'

export interface RoleDef {
  id: RoleId
  icon: LucideIcon
  screens: ScreenId[]
}

const ALL = SCREENS.map((s) => s.id)

export const ROLES: RoleDef[] = [
  { id: 'presenter', icon: Presentation, screens: ALL },
  { id: 'dolr', icon: Landmark, screens: ['dashboard', 'explorer', 'registry', 'validation', 'audit', 'exports'] },
  { id: 'operator', icon: Building2, screens: ['pipeline', 'analysis', 'validation', 'explorer'] },
  { id: 'surveyor', icon: HardHat, screens: ['verification', 'explorer'] },
  { id: 'authority', icon: Gavel, screens: ['verification', 'validation', 'registry', 'explorer'] },
  { id: 'registrar', icon: Stamp, screens: ['deeds', 'registry', 'explorer'] },
  { id: 'citizen', icon: Users, screens: ['citizen'] },
  { id: 'utility', icon: Shovel, screens: ['digcheck', 'explorer'] },
  { id: 'bank', icon: Banknote, screens: ['collateral'] },
]

export function getRole(id: RoleId): RoleDef {
  return ROLES.find((r) => r.id === id) ?? ROLES[0]
}

export function homePathFor(role: RoleId): string {
  const first = getRole(role).screens[0]
  return SCREENS.find((s) => s.id === first)!.path
}
