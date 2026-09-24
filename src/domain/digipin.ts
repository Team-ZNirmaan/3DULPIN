const GRID = [
  ['F', 'C', '9', '8'],
  ['J', '3', '2', '7'],
  ['K', '4', '5', '6'],
  ['L', 'M', 'P', 'T'],
]

/** DIGIPIN (India Post open algorithm): 10 symbols, ~4 m grid cell. Shown as an address attribute only. */
export function digipin(lat: number, lon: number): string {
  let minLat = 2.5
  let maxLat = 38.5
  let minLon = 63.5
  let maxLon = 99.5
  let out = ''
  for (let level = 1; level <= 10; level++) {
    const latDiv = (maxLat - minLat) / 4
    const lonDiv = (maxLon - minLon) / 4
    const row = Math.max(0, Math.min(3, 3 - Math.floor((lat - minLat) / latDiv)))
    const col = Math.max(0, Math.min(3, Math.floor((lon - minLon) / lonDiv)))
    out += GRID[row][col]
    if (level === 3 || level === 6) out += '-'
    maxLat = minLat + latDiv * (4 - row)
    minLat = minLat + latDiv * (3 - row)
    minLon = minLon + lonDiv * col
    maxLon = minLon + lonDiv
  }
  return out
}
