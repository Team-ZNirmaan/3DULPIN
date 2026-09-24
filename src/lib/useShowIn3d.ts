import { useNavigate } from 'react-router'
import { ringCentroid } from '@/domain/geo'
import { useData } from '@/store/data'
import { useExplorer } from '@/store/explorer'

export function useShowIn3d() {
  const navigate = useNavigate()
  return (code: string, focus?: { lon: number; lat: number; height: number }) => {
    const { units, select, flyTo } = useData.getState()
    const u = units.find((x) => x.code === code)
    const f = focus ?? (u ? { lon: ringCentroid(u.ring)[0], lat: ringCentroid(u.ring)[1], height: (u.zMin + u.zMax) / 2 } : undefined)
    if (!f) return
    const ex = useExplorer.getState()
    if (f.height < 0) ex.setUndergroundView(true)
    if (u?.level && u.buildingId === 'BLD-7') ex.setLevel('only', u.level)
    select(code)
    flyTo(f)
    navigate('/app/explorer')
  }
}
