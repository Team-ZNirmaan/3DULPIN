import { describe, expect, it } from 'vitest'
import { getDemoState, resetDemo, setTowerRegistered, subscribe } from './demo'

describe('demo state', () => {
  it('starts with the tower not registered', () => {
    resetDemo()
    expect(getDemoState().towerRegistered).toBe(false)
  })

  it('registering and resetting notify every screen', () => {
    let calls = 0
    const stop = subscribe(() => calls++)
    setTowerRegistered(true)
    expect(getDemoState().towerRegistered).toBe(true)
    resetDemo()
    expect(getDemoState().towerRegistered).toBe(false)
    expect(calls).toBe(2)
    stop()
  })
})
