/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from './en'
import hi from './hi'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.test.ts') ? [p] : []
  })
}

const has = (dict: unknown, key: string) =>
  key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict) !== undefined

describe('i18n', () => {
  const keys = new Set<string>()
  for (const f of files('src')) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) keys.add(m[1])
  }
  it('every static key used in code exists in English and Hindi', () => {
    const missing = [...keys].filter((k) => !has(en, k) || !has(hi, k))
    expect(missing).toEqual([])
    expect(keys.size).toBeGreaterThan(100)
  })
})
