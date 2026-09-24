import type { Bilingual, LegalClass, QualityLevel, RightType, Severity, SpatialUnit, Status, Tier, UnitType } from './types'
import { SITE } from './geo'

export const CLASS_OF_TYPE: Record<UnitType, LegalClass> = {
  S: 'surface',
  B: 'building',
  U: 'exclusive',
  L: 'limited',
  C: 'common',
  P: 'parking',
  G: 'underground',
  A: 'elevated',
}

export const classOf = (u: Pick<SpatialUnit, 'type'>) => CLASS_OF_TYPE[u.type]

export const CLASS_COLOR: Record<LegalClass, string> = {
  surface: '#B8C1CF',
  building: '#8A94A6',
  exclusive: '#0072B2',
  limited: '#E69F00',
  common: '#009E73',
  parking: '#CC79A7',
  underground: '#D55E00',
  elevated: '#56B4E9',
}

export const CLASS_LABEL: Record<LegalClass, Bilingual> = {
  surface: { en: 'Surface parcel', hi: 'सतही पार्सल' },
  building: { en: 'Building envelope', hi: 'भवन आवरण' },
  exclusive: { en: 'Exclusive unit', hi: 'अनन्य इकाई' },
  limited: { en: 'Limited common (allotted)', hi: 'सीमित साझा (आवंटित)' },
  common: { en: 'Common area', hi: 'साझा क्षेत्र' },
  parking: { en: 'Parking (unallotted)', hi: 'पार्किंग (अनावंटित)' },
  underground: { en: 'Underground infra', hi: 'भूमिगत अवसंरचना' },
  elevated: { en: 'Elevated infra', hi: 'उन्नत अवसंरचना' },
}

export const STATUS_COLOR: Record<Status, string> = {
  provisional: '#98A2B3',
  verified: '#2E90FA',
  approved: '#0E9384',
  registered: '#12B76A',
}

export const STATUS_LABEL: Record<Status, Bilingual> = {
  provisional: { en: 'Provisional', hi: 'अनंतिम' },
  verified: { en: 'Verified', hi: 'सत्यापित' },
  approved: { en: 'Approved', hi: 'अनुमोदित' },
  registered: { en: 'Registered', hi: 'पंजीकृत' },
}

export const STATUS_ORDER: Status[] = ['provisional', 'verified', 'approved', 'registered']

export const TIER_COLOR: Record<Tier, string> = { A: '#12B76A', B: '#2E90FA', C: '#F79009', D: '#98A2B3' }

export const TIER_LABEL: Record<Tier, Bilingual> = {
  A: { en: 'Tier A · Survey-verified', hi: 'टियर A · सर्वेक्षण-सत्यापित' },
  B: { en: 'Tier B · Plan-derived', hi: 'टियर B · नक्शा-आधारित' },
  C: { en: 'Tier C · Imagery-derived', hi: 'टियर C · छवि-आधारित' },
  D: { en: 'Tier D · Screening only', hi: 'टियर D · केवल स्क्रीनिंग' },
}

export const SEVERITY_COLOR: Record<Severity, string> = { blocking: '#F04438', warning: '#F79009', info: '#2E90FA' }

export const SEVERITY_LABEL: Record<Severity, Bilingual> = {
  blocking: { en: 'Blocking', hi: 'अवरोधक' },
  warning: { en: 'Warning', hi: 'चेतावनी' },
  info: { en: 'Info', hi: 'सूचना' },
}

export const RIGHT_LABEL: Record<RightType, Bilingual> = {
  ownership: { en: 'Ownership', hi: 'स्वामित्व' },
  'undivided-share': { en: 'Undivided share in common areas', hi: 'साझा क्षेत्रों में अविभाजित हिस्सा' },
  'parking-allotment': { en: 'Parking allotment', hi: 'पार्किंग आवंटन' },
  'right-of-user': { en: 'Right of user / restriction', hi: 'उपयोग अधिकार / प्रतिबंध' },
  easement: { en: 'Easement', hi: 'सुखाधिकार' },
  mortgage: { en: 'Mortgage', hi: 'बंधक' },
  lease: { en: 'Lease (air space)', hi: 'पट्टा (वायु क्षेत्र)' },
}

export const QL_LABEL: Record<QualityLevel, string> = {
  'QL-A': 'QL-A · exposed & measured',
  'QL-B': 'QL-B · surface-geophysics located',
  'QL-C': 'QL-C · surveyed surface features',
  'QL-D': 'QL-D · records only',
}

export const fmtM = (z: number) => `${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(2)} m`
export const fmtMsl = (z: number) => `${(SITE.groundMsl + z).toFixed(2)} m MSL`
export const fmtArea = (a?: number) => (a === undefined ? '—' : `${a.toFixed(2)} m²`)
