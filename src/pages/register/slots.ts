// Step 2: the six data sources the PS names for creating 3D-ULPINs. Each slot takes a sample file;
// nothing is uploaded or processed. The parcel layer comes from the land records by itself.

export type SlotId = 'drone' | 'lidar' | 'dsm' | 'parcel' | 'plans' | 'cors'

/** Sample files for Tower 1 (fictional names and sizes). */
export const SLOTS: {
  id: SlotId
  file: string
  size: string
  auto?: boolean
}[] = [
  { id: 'drone', file: 'cts1177_drone_orthophoto.tif', size: '412 MB' },
  { id: 'lidar', file: 'cts1177_lidar_points.laz', size: '1.8 GB' },
  { id: 'dsm', file: 'cts1177_dem_dsm_10cm.tif', size: '96 MB' },
  { id: 'parcel', file: 'bhunaksha_cts1177.geojson', size: '6 KB', auto: true },
  { id: 'plans', file: 'tower1_sanctioned_plans.pdf', size: '24 MB' },
  { id: 'cors', file: 'cts1177_cors_points.csv', size: '18 KB' },
]
