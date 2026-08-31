#!/usr/bin/env node
/**
 * Refuse to start the E2E server on an occupied port, and say WHO has it.
 *
 * WHEN THIS ACTUALLY FIRES, corrected after observing that it did not.
 *
 * Playwright probes `webServer.url` BEFORE it runs `webServer.command`. With
 * `reuseExistingServer: false`, anything answering that URL makes Playwright
 * fail immediately with its own message, and this script never executes. So it
 * does NOT cover the case it was written for -- a stale `next start` serving
 * the health URL -- and the first version of this comment claimed otherwise.
 *
 * What it does cover is a port held by something that does not answer that URL:
 * a half-dead server, an unrelated process, a container forwarding the port. In
 * those cases Playwright's probe times out or errors without naming anything,
 * and this says who has the port and since when.
 *
 * For the case Playwright pre-empts, `pnpm e2e:port` runs this on demand -- the
 * diagnosis is then one command rather than a search. The start time is the
 * useful field: "started two hours ago" identifies a forgotten process at a
 * glance, where a bare PID does not.
 *
 * Best-effort by design: if the platform lookup fails, this still refuses to
 * start and still says the port is occupied. Losing the diagnosis is acceptable;
 * silently continuing is not.
 */
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'

const port = Number(process.argv[2])
if (!Number.isInteger(port)) {
  process.stderr.write('usage: preflight-port.mjs <port>\n')
  process.exit(2)
}

/** Whoever is listening, as best this platform will say. */
function describeHolder() {
  try {
    if (process.platform === 'win32') {
      const script =
        `Get-NetTCPConnection -LocalPort ${port} -State Listen | ForEach-Object { ` +
        '$p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; ' +
        'if ($p) { "PID $($p.Id)  $($p.ProcessName)  started $($p.StartTime)" } }'
      return execFileSync('powershell', ['-NoProfile', '-Command', script], {
        encoding: 'utf8',
        timeout: 10_000,
      }).trim()
    }
    return execFileSync('lsof', ['-i', `:${port}`, '-sTCP:LISTEN', '-P', '-n'], {
      encoding: 'utf8',
      timeout: 10_000,
    }).trim()
  } catch {
    return ''
  }
}

const probe = createServer()

probe.once('error', (err) => {
  if (err.code !== 'EADDRINUSE') {
    process.stderr.write(`preflight: could not probe port ${port}: ${err.message}\n`)
    process.exit(1)
  }
  const holder = describeHolder()
  process.stderr.write(
    `\nE2E refuses to start: port ${port} is already in use.\n\n` +
      (holder ? `${holder}\n\n` : '  (could not identify the process)\n\n') +
      '  The gate builds and then tests, so it must test what it built. Adopting\n' +
      '  an existing server would exercise whatever that process was started\n' +
      '  with -- which is how three verify runs reported passing E2E against a\n' +
      '  build from two hours earlier. Stop the process above and re-run.\n\n',
  )
  process.exit(1)
})

probe.once('listening', () => {
  probe.close(() => process.exit(0))
})

probe.listen(port, '127.0.0.1')
