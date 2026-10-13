import { describe, expect, it } from 'vitest'
import { en } from './en'
import { hi } from './hi'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keys(v as object, `${prefix}${k}.`),
  )
}

function values(obj: object): string[] {
  return Object.values(obj).flatMap((v) => (typeof v === 'string' ? [v] : values(v as object)))
}

describe('translations', () => {
  it('Hindi has exactly the same keys as English', () => {
    expect(keys(hi).sort()).toEqual(keys(en).sort())
  })

  it('no label is empty', () => {
    for (const v of [...values(en), ...values(hi)]) expect(v.trim()).not.toBe('')
  })

  it('no label uses em dashes or middle-dot separators', () => {
    for (const v of [...values(en), ...values(hi)]) expect(v).not.toMatch(/[—–·]/)
  })
})
