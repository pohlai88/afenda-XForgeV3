#!/usr/bin/env node
/**
 * Refuse to start the E2E server on an occupied port, and say WHO has it.
 *
 * With `reuseExistingServer: false`, an occupied port is now a failure rather
 * than a silent adoption -- which is the right direction, but Playwright's own
 * message says only that the port is in use. A leftover `next start` held 3100
 * for two hours here and the E2E stage tested that stale build the whole time;
 * the diagnosis cost far more than it should have, because nothing named the
 * process or said how long it had been there.
 *
 * The start time is the useful field. "Started two hours ago" identifies a
 * forgotten process instantly, where a bare PID does not.
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
