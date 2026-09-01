// biome-ignore-all lint/suspicious/noTemplateCurlyInString: the `${` sequences below sit
// inside JSON-encoded FIXTURE SOURCE -- sample repositories whose own code contains template
// literals. The rule exists to catch a `${}` in a quoted string that was meant to
// interpolate; here the hazard is structurally absent, because these strings are never
// evaluated -- `materialise()` writes them to disk verbatim. WHAT STILL CHECKS THIS FILE:
// the suppression names one rule, so every other rule applies as normal (verified by
// planting a `var` and an unused binding and watching it go red), and the fixtures are
// executed by the evals, where a genuinely broken one fails the run rather than lint.

/**
 * Eval fixtures for the `checks-that-can-fail` skill.
 *
 * STRINGS, NOT FILES ON DISK, for the reason `tooling/architecture/fixtures/`
 * already gives: fixtures held as files get picked up by the real workspace
 * scan. These are worse than the guard fixtures in that respect, because they
 * are deliberately IMPERFECT sample repositories -- Biome reports 18 errors
 * across them -- so on disk they would fail the lint stage, and `pnpm run fix`
 * would rewrite them, silently changing the inputs the eval results depend on.
 *
 * `materialise()` writes one into a scratch directory when an eval runs. The
 * repository never holds them as source.
 *
 * Contents are JSON-encoded rather than template literals on purpose: these
 * files contain backticks, `${`, and regex escapes, and an escape mangled in
 * transit is this repository's most-repeated defect.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const fixtures = {
  'ci-repo': {
    '.github/workflows/ci.yml':
      'name: ci\non: [push, pull_request]\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: pnpm install --frozen-lockfile\n      - run: pnpm verify\n',
    'package.json':
      '{\n  "name": "acme-billing",\n  "private": true,\n  "scripts": {\n    "test:unit": "vitest run --project unit",\n    "test:integration": "vitest run --project integration",\n    "verify": "node scripts/verify.mjs"\n  }\n}\n',
    'scripts/verify.mjs':
      "#!/usr/bin/env node\n/**\n * The gate CI runs. Each stage returns { status, detail }.\n * PASS is green, FAIL stops the build.\n */\nimport { spawnSync } from 'node:child_process'\n\nconst run = (cmd, args) => {\n  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' })\n  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }\n}\n\nconst stages = [\n  {\n    id: 'unit',\n    run() {\n      const r = run('pnpm', ['-s', 'test:unit'])\n      if (r.code !== 0) {\n        return { status: 'FAIL', detail: r.out }\n      }\n      const m = r.out.match(/Tests\\s+(\\d+) passed/)\n      return { status: 'PASS', detail: `${m ? m[1] : '?'} unit tests passed` }\n    },\n  },\n]\n\nlet failed = false\nfor (const s of stages) {\n  const r = s.run()\n  console.log(`  ${r.status.padEnd(6)} ${s.id.padEnd(14)} ${r.detail.split('\\n')[0]}`)\n  if (r.status === 'FAIL') {\n    failed = true\n  }\n}\nprocess.exit(failed ? 1 : 0)\n",
    'tests/integration/billing.test.js':
      "import { describe, expect, it } from 'vitest'\nimport { chargeCard } from '../../src/billing.js'\n\nconst reachable = Boolean(process.env.STRIPE_TEST_KEY)\n\ndescribe.skipIf(!reachable)('billing against the Stripe sandbox', () => {\n  it('charges a card', async () => {\n    expect((await chargeCard({ amount: 500 })).ok).toBe(true)\n  })\n\n  it('refuses a negative amount', async () => {\n    await expect(chargeCard({ amount: -1 })).rejects.toThrow()\n  })\n})\n",
  },
  'guard-repo': {
    'package.json':
      '{\n  "name": "acme",\n  "private": true,\n  "scripts": { "check:imports": "node scripts/check-imports.mjs" }\n}\n',
    'packages/api/package.json':
      '{ "name": "@acme/api", "version": "0.0.0", "main": "src/route.ts" }\n',
    'packages/api/src/route.ts':
      "import { Hono } from 'hono'\nimport { listInvoices } from '@acme/billing'\n\nexport const routes = new Hono().get('/invoices', async (c) => c.json(await listInvoices()))\n",
    'packages/internal/package.json':
      '{ "name": "@acme/internal", "version": "0.0.0", "main": "src/db.ts" }\n',
    'packages/internal/src/db.ts':
      "import postgres from 'postgres'\n\n/**\n * The raw connection pool. Nothing outside this package may import it -- every\n * caller goes through @acme/billing, which binds the tenant first.\n */\nexport const sql = postgres(process.env.DATABASE_URL ?? '')\n",
    'packages/ui/package.json':
      '{ "name": "@acme/ui", "version": "0.0.0", "main": "src/button.tsx" }\n',
    'packages/ui/src/button.tsx':
      'import { forwardRef } from \'react\'\n\nexport const Button = forwardRef<HTMLButtonElement, { label: string }>(({ label }, ref) => (\n  <button ref={ref} type="button">\n    {label}\n  </button>\n))\n',
    'scripts/check-imports.mjs':
      "#!/usr/bin/env node\n/**\n * Structural checks that run in CI. Add new rules to `rules`.\n *\n * Each rule gets (file, source) and returns findings.\n */\nimport { readdirSync, readFileSync, statSync } from 'node:fs'\nimport { join } from 'node:path'\n\nconst walk = (dir, acc = []) => {\n  for (const entry of readdirSync(dir)) {\n    if (entry === 'node_modules') {\n      continue\n    }\n    const full = join(dir, entry)\n    if (statSync(full).isDirectory()) {\n      walk(full, acc)\n    } else if (/\\.(ts|tsx)$/.test(entry)) {\n      acc.push(full)\n    }\n  }\n  return acc\n}\n\nconst rules = [\n  {\n    id: 'no-default-export-in-packages',\n    applies: (f) => f.includes('packages'),\n    check: (f, src) =>\n      /export\\s+default\\b/.test(src) ? [{ file: f, message: 'no default exports' }] : [],\n  },\n]\n\nconst files = walk('packages')\nconst findings = rules.flatMap((r) => files.filter(r.applies).flatMap((f) => r.check(f, readFileSync(f, 'utf8'))))\n\nif (findings.length > 0) {\n  for (const v of findings) {\n    console.log(`  ${v.file}  ${v.message}`)\n  }\n  process.exit(1)\n}\nconsole.log(`  PASS  ${files.length} files checked`)\n",
  },
  'rename-repo': {
    '.github/workflows/deploy.yml':
      'name: deploy\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    env:\n      BILLING_URL: https://billing.acme.internal\n      NODE_ENV: production\n    steps:\n      - uses: actions/checkout@v4\n      - run: pnpm build && pnpm deploy\n',
    'docs/runbook.md':
      '# Runbook\n\n## Environment\n\n| Variable | Purpose |\n| --- | --- |\n| `BILLING_URL` | Base URL of the billing service. |\n| `RETRY_LIMIT` | Attempts before the charge is abandoned. |\n\nIf charges start failing, check that `BILLING_URL` resolves from inside the\ncluster before looking at anything else.\n',
    'package.json': '{ "name": "acme-payments", "private": true, "type": "module" }\n',
    'src/client.ts':
      "import { BILLING_URL, RETRY_LIMIT } from './config.js'\n\n/**\n * Talks to the billing service.\n *\n * The billing endpoint is the only outbound call this package makes, so the\n * retry budget lives here rather than in a shared HTTP layer.\n */\nexport async function charge(amountMinor: number): Promise<Response> {\n  for (let attempt = 0; attempt < RETRY_LIMIT; attempt += 1) {\n    const res = await fetch(`${BILLING_URL}/v1/charges`, {\n      body: JSON.stringify({ amountMinor }),\n      method: 'POST',\n    })\n    if (res.ok) {\n      return res\n    }\n  }\n  throw new Error('billing service did not accept the charge')\n}\n",
    'src/config.ts':
      "/** Where the billing service lives. Set BILLING_URL in every environment. */\nexport const BILLING_URL = process.env.BILLING_URL ?? 'https://billing.acme.internal'\n\nexport const RETRY_LIMIT = 3\n",
    'tests/fixtures/api.ts':
      "import { http, HttpResponse } from 'msw'\n\n// Kept in step with src/config.ts by hand.\nexport const handlers = [\n  http.post('https://billing.acme.internal/v1/charges', () =>\n    HttpResponse.json({ id: 'ch_test_1', ok: true }),\n  ),\n]\n",
  },
  'scope-repo': {
    '.github/workflows/ci.yml':
      'name: ci\non: [push, pull_request]\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: pnpm install --frozen-lockfile\n      - run: pnpm typecheck\n      - run: pnpm e2e\n',
    'e2e/order.spec.ts':
      "import { expect, test } from '@playwright/test'\n\n/**\n * Coverage for the order states. Kept in step with OrderStatus by hand.\n */\nconst COVERED = ['pending', 'paid', 'shipped']\n\nfor (const status of COVERED) {\n  test(`the ${status} order renders`, async ({ page }) => {\n    await page.goto(`/orders/demo?status=${status}`)\n    await expect(page.getByTestId(status)).toBeVisible()\n  })\n}\n",
    'package.json':
      '{\n  "name": "acme-orders",\n  "private": true,\n  "scripts": {\n    "typecheck": "tsc --noEmit",\n    "e2e": "playwright test"\n  }\n}\n',
    'src/order.ts':
      "/**\n * An order's lifecycle. Every state below is reachable in production.\n */\nexport type OrderStatus = 'pending' | 'paid' | 'shipped' | 'refunded'\n\nexport interface Order {\n  id: string\n  status: OrderStatus\n  total: number\n}\n",
    'tsconfig.json':
      '{\n  "compilerOptions": {\n    "strict": true,\n    "noEmit": true,\n    "module": "Preserve",\n    "moduleResolution": "bundler"\n  },\n  "include": ["src/**/*.ts"]\n}\n',
  },
}

/**
 * Write one fixture repository into `dest`, and return the paths written.
 *
 * Returns the list rather than nothing so a caller can assert it got what it
 * expected -- a materialiser that silently wrote zero files would hand every
 * eval an empty directory, and an eval run against nothing reports whatever
 * the runner reports for a trivial task.
 */
export function materialise(name, dest) {
  const files = fixtures[name]
  if (!files) {
    throw new Error(`no fixture named '${name}'. Known: ${Object.keys(fixtures).join(', ')}`)
  }
  const written = []
  for (const [rel, source] of Object.entries(files)) {
    const target = join(dest, rel)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, source, 'utf8')
    written.push(rel)
  }
  if (written.length === 0) {
    throw new Error(`fixture '${name}' is empty`)
  }
  return written
}
