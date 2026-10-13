import generated from './site.generated.json'

// Everything about the place itself. Plot geometry and the metro alignment come from OpenStreetMap
// (see scripts/build-site-data.mjs). Names, numbers and owners are fictional demo data.

export const SITE = {
  origin: generated.origin as { lon: number; lat: number },
  /** The tower frame's x axis, in degrees counter-clockwise from east. */
  frameAngleDeg: generated.towerFrameAngleDeg,
  /**
   * Ground floor level of the tower, metres above mean sea level.
   * SRTM 30 m gives 558 m. Checked in chunk 2: Cesium World Terrain puts the plot at 485.64 m above the
   * WGS84 ellipsoid, and the EGM2008 geoid there is -71.90 m, so 485.64 + 71.90 = 557.5 m. They agree.
   */
  groundLevelMsl: 558,
  state: 'Maharashtra',
  district: 'Pune',
  /** From property listings for Shivajinagar (Bhamburda). To be confirmed on Mahabhumi. */
  taluka: 'Haveli',
  village: 'Bhamburda (Shivajinagar)',
  localBody: 'Pune Municipal Corporation',
  pincode: '411005',
  attribution: generated.attribution,
} as const

export const NETWORK_ROOTS = generated.networkRoots as { metro: string; water: string }

export const TOWER = {
  index: '1',
  name: 'Nirmaan Residency, Tower 1',
  society: 'Nirmaan Residency Co-operative Housing Society',
  road: 'Ganeshkhind Road',
} as const

/** Fictional legal documents that the rights refer to. */
export const DOCS = {
  deedOfDeclaration: { kind: 'deed-of-declaration', ref: 'Sub-Registrar Haveli 4, Doc. 11872/2026', date: '2026-03-12' },
  occupancyCertificate: { kind: 'occupancy-certificate', ref: 'BP/OC/2026/0412', date: '2026-02-20' },
  metroNotification: { kind: 'acquisition-notification', ref: 'Right of user notification MRL/PUN/2019/37', date: '2019-11-05' },
  waterEasement: { kind: 'easement-deed', ref: 'Sub-Registrar Haveli 4, Doc. 4410/1998', date: '1998-06-18' },
} as const

export const HOLDERS = {
  metro: 'Metro rail authority, Pune',
  water: 'Municipal water supply department',
  society: TOWER.society,
  allOwners: 'All apartment owners, in undivided shares',
} as const
