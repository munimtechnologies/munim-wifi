import { Platform } from 'react-native'
import {
  addNetworkObserverListener,
  getCurrentNetwork,
  getNetworkDiagnostics,
  getScanThrottleStatus,
  scanNetworks,
} from 'munim-wifi'

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()

async function timeAverage(runs: number, work: () => Promise<unknown>): Promise<number> {
  await work() // warm-up
  const started = now()
  for (let index = 0; index < runs; index++) await work()
  return (now() - started) / runs
}

/**
 * Times the hot paths so device runs can be compared between versions.
 * Lines are also logged as MUNIM_WIFI_BENCH for logcat / the device console.
 */
export async function runBenchmark(onProgress?: (line: string) => void): Promise<string[]> {
  const lines: string[] = []
  const add = (line: string) => {
    lines.push(line)
    onProgress?.(line)
    console.log(`MUNIM_WIFI_BENCH ${line}`)
  }

  add(`platform ${Platform.OS} ${Platform.Version}`)
  add(`getCurrentNetwork avg ${(await timeAverage(20, getCurrentNetwork)).toFixed(2)} ms (20 runs)`)
  add(`getNetworkDiagnostics avg ${(await timeAverage(20, getNetworkDiagnostics)).toFixed(2)} ms (20 runs)`)

  if (Platform.OS === 'android') {
    try {
      const before = await getScanThrottleStatus()
      // Reuses results younger than 2 minutes instead of spending a scan.
      const cached = await timeAverage(5, () => scanNetworks({ maxAge: 120_000 }))
      const after = await getScanThrottleStatus()
      add(
        `scanNetworks({ maxAge: 120000 }) avg ${cached.toFixed(2)} ms; scans spent ` +
          `${after.scansInWindow - before.scansInWindow} (window ${after.scansInWindow}/${after.maxScans})`
      )
    } catch (error) {
      add(`cached scan: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const observed = await new Promise<{ events: number; firstMs: number | null }>((resolve) => {
    const started = now()
    let events = 0
    let firstMs: number | null = null
    const stop = addNetworkObserverListener(() => {
      events++
      if (firstMs === null) firstMs = now() - started
    })
    setTimeout(() => {
      stop()
      resolve({ events, firstMs })
    }, 8_000)
  })
  add(
    `network observer: ${observed.events} update(s) in 8 s, first after ` +
      `${observed.firstMs == null ? '—' : `${observed.firstMs.toFixed(1)} ms`}`
  )
  return lines
}
