/**
 * T12 -- a table declared tenant-owned that carries no `tenant_id`.
 *
 * Law 11 read in the direction that actually bites. Everything else asks "does
 * every table WITH tenant_id have RLS?" -- discovered from the catalogue, so a
 * table without the column is simply never discovered and never checked. It
 * looks isolated because nothing looked at it.
 */
import {
  checkDeclaredTablesCarryTenantId,
  checkRlsCoverage,
  discoverTenantTables,
} from '@xforge/fixtures/rls-checks'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeAll, owner, reachable, seed } from './harness'

beforeAll(async () => {
  if (reachable) await seed()
})
afterAll(closeAll)

describe.skipIf(!reachable)('T12 -- an unisolatable table is detected', () => {
  it('every declared tenant-owned table really carries tenant_id', async () => {
    const { TENANT_OWNED_TABLES } = await import('@xforge/db')
    expect(await checkDeclaredTablesCarryTenantId(owner, TENANT_OWNED_TABLES)).toEqual([])
  })

  it('a declared table WITHOUT the column is reported, not silently skipped', async () => {
    try {
      await owner`create table if not exists t12_probe (id uuid primary key)`
      const findings = await checkDeclaredTablesCarryTenantId(owner, ['t12_probe'])
      expect(findings).toHaveLength(1)
      expect(findings[0]?.detail).toMatch(/no tenant_id/)

      // And the point: catalogue discovery never sees it, so RLS coverage
      // reports clean while an unisolatable table sits in the schema.
      expect(await discoverTenantTables(owner)).not.toContain('t12_probe')
      expect(await checkRlsCoverage(owner)).toEqual([])
    } finally {
      await owner`drop table if exists t12_probe`
    }
  })

  it('and a table WITH tenant_id but no RLS is caught by coverage', async () => {
    try {
      await owner`create table if not exists t12_open (id uuid primary key, tenant_id uuid not null)`
      const findings = await checkRlsCoverage(owner)
      expect(findings.map((f) => f.subject)).toContain('t12_open')
    } finally {
      await owner`drop table if exists t12_open`
    }
    expect(await checkRlsCoverage(owner)).toEqual([])
  })
})
