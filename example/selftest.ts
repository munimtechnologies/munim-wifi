import { Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'
import {
  addWifiStateListener,
  getCurrentNetwork,
  getIPAddresses,
  getNetworkDiagnostics,
  getWifiCapabilityStatus,
  isInternetReachable,
  isLocalNetworkPermissionError,
  isWifiEnabled,
  requestLocalNetworkPermission,
  requestWifiPermission,
  scanNetworks,
  startServiceDiscovery,
  type DiscoveredService,
  type PermissionState,
  type WifiStateEvent,
} from 'munim-wifi'

export interface SelfTestCheck {
  name: string
  pass: boolean
  detail: string
}

export interface SelfTestReport {
  platform: string
  osVersion: string | number
  startedAt: string
  finishedAt: string
  passed: number
  total: number
  checks: SelfTestCheck[]
}

export const SELF_TEST_FILE = 'munim-wifi-selftest.json'

const BONJOUR_TYPES = [
  '_http._tcp',
  '_ipp._tcp',
  '_airplay._tcp',
  '_googlecast._tcp',
  '_raop._tcp',
  '_companion-link._tcp',
]

const PERMISSION_STATES: PermissionState[] = [
  'granted',
  'denied',
  'notDetermined',
  'restricted',
  'unavailable',
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Rejects after `ms` so a permission prompt nobody answers cannot stall the run. */
function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${what} not answered within ${ms / 1000} s`)), ms)
    ),
  ])
}

function writeReport(report: SelfTestReport) {
  const file = new File(Paths.document, SELF_TEST_FILE)
  if (file.exists) file.delete()
  file.create()
  file.write(JSON.stringify(report, null, 2))
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Browses every type at once for `ms` and returns what was found. */
function browse(
  types: string[],
  ms: number,
  showPicker = false
): Promise<{ services: DiscoveredService[]; errors: string[] }> {
  return new Promise((resolve) => {
    const services = new Map<string, DiscoveredService>()
    const errors: string[] = []
    const handles = types.flatMap((type) => {
      try {
        return [
          startServiceDiscovery(
            type,
            {
              onFound: (service) => {
                const previous = services.get(service.id)
                if (!previous || service.resolved) services.set(service.id, service)
              },
              onLost: () => {},
              onError: (message) => errors.push(message),
            },
            { resolveTimeout: 4000, showPicker }
          ),
        ]
      } catch (error) {
        errors.push(describe(error))
        return []
      }
    })
    setTimeout(() => {
      handles.forEach((handle) => handle.stop())
      resolve({ services: [...services.values()], errors })
    }, ms)
  })
}

export async function runSelfTest(
  onProgress?: (line: string) => void
): Promise<SelfTestReport> {
  const startedAt = new Date().toISOString()
  const checks: SelfTestCheck[] = []
  const android = Platform.OS === 'android'
  const apiLevel = android ? Number(Platform.Version) : 0

  const snapshot = (finished: boolean): SelfTestReport => ({
    platform: Platform.OS,
    osVersion: Platform.Version,
    startedAt,
    finishedAt: finished ? new Date().toISOString() : '',
    passed: checks.filter((item) => item.pass).length,
    total: checks.length,
    checks,
  })

  const check = async (name: string, run: () => Promise<[boolean, string]>) => {
    try {
      const [pass, detail] = await run()
      checks.push({ name, pass, detail })
    } catch (error) {
      checks.push({ name, pass: false, detail: `threw: ${describe(error)}` })
    }
    const last = checks[checks.length - 1]
    onProgress?.(`${last.pass ? 'PASS' : 'FAIL'} ${name}: ${last.detail}`)
    try {
      // Partial results, so a run stuck on a prompt still shows how far it got.
      writeReport(snapshot(false))
    } catch {}
  }

  await check('permission flow (requestWifiPermission)', async () => {
    const granted = await withTimeout(requestWifiPermission(), 30_000, 'Wi-Fi/location permission prompt')
    return [granted, `granted=${granted}`]
  })

  await check('capability status reports localNetworkPermission', async () => {
    const status = await getWifiCapabilityStatus()
    const state = status.localNetworkPermission
    let pass = PERMISSION_STATES.includes(state)
    let note = ''
    if (android && apiLevel < 37) {
      // Below Android 17 the permission does not exist: "not required".
      pass = pass && state === 'unavailable'
      note = ' (API < 37: not required)'
    }
    return [
      pass,
      `localNetwork=${state}${note} location=${status.locationPermission} ` +
        `nearbyWifi=${status.nearbyWifiPermission} scan=${status.scan} wifiAware=${status.wifiAware}`,
    ]
  })

  await check('requestLocalNetworkPermission', async () => {
    const state = await withTimeout(
      requestLocalNetworkPermission(15_000),
      30_000,
      'local network permission prompt'
    )
    const note = android && apiLevel < 37 ? ' (API < 37: no permission needed)' : ''
    return [state === 'granted', `state=${state}${note}`]
  })

  let wifiOn = false
  await check('isWifiEnabled', async () => {
    wifiOn = await isWifiEnabled()
    return [wifiOn, `enabled=${wifiOn}`]
  })

  await check('Wi-Fi state listener delivers current state', async () => {
    const event = await new Promise<WifiStateEvent | null>((resolve) => {
      let unsubscribe: (() => void) | null = null
      const timer = setTimeout(() => {
        unsubscribe?.()
        resolve(null)
      }, 4000)
      unsubscribe = addWifiStateListener((next) => {
        clearTimeout(timer)
        setTimeout(() => unsubscribe?.(), 0)
        resolve(next)
      })
    })
    if (!event) return [false, 'no event within 4 s']
    return [
      event.enabled === wifiOn,
      `state=${event.state} enabled=${event.enabled} (isWifiEnabled=${wifiOn})`,
    ]
  })

  let gateway: string | undefined
  await check('current network info', async () => {
    const current = await getCurrentNetwork()
    if (!current) return [false, 'null (not connected or no location permission)']
    gateway = current.gateway
    return [
      current.ssid.length > 0,
      `ssid=${current.ssid} bssid=${current.bssid} security=${current.securityType} ` +
        `ip=${current.ipAddress ?? '-'} gateway=${current.gateway ?? '-'} ` +
        `dns=${(current.dnsServers ?? []).join(',')} ipv6=${(current.ipv6Addresses ?? []).length}`,
    ]
  })

  await check('IPv4 + IPv6 addresses', async () => {
    const info = await getIPAddresses()
    if (!info) return [false, 'null']
    return [
      info.ipv4.length > 0 && info.ipv6.length > 0,
      `${info.interfaceName ?? '?'} ipv4=[${info.ipv4.join(', ')}] ipv6=[${info.ipv6.join(', ')}]`,
    ]
  })

  await check('network diagnostics', async () => {
    const diagnostics = await getNetworkDiagnostics()
    return [
      diagnostics.state === 'available',
      `state=${diagnostics.state} validated=${diagnostics.validated} metered=${diagnostics.metered} ` +
        `if=${diagnostics.linkProperties?.interfaceName ?? '-'}`,
    ]
  })

  await check('reachability (OS)', async () => {
    const reachable = await isInternetReachable()
    return [reachable, `reachable=${reachable}`]
  })

  await check('reachability (HTTPS probe)', async () => {
    const reachable = await isInternetReachable({
      probeUrl: 'https://www.google.com/generate_204',
      timeout: 8000,
    })
    return [reachable, `generate_204 reachable=${reachable}`]
  })

  if (android) {
    await check('Wi-Fi scan', async () => {
      const networks = await scanNetworks({ maxResults: 50, timeout: 15_000 })
      const strongest = [...networks].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999))[0]
      return [
        networks.length > 0,
        `${networks.length} networks; strongest ${strongest?.ssid ?? '-'} ${strongest?.rssi ?? '-'} dBm ch ${strongest?.channel ?? '-'}`,
      ]
    })
  }

  let lanTarget: string | undefined
  await check('Bonjour / NSD discovery', async () => {
    const { services, errors } = await browse(BONJOUR_TYPES, 10_000)
    const resolved = services.filter((service) => service.resolved)
    const ipv4 = (service: DiscoveredService) => !!service.host && !service.host.includes(':')
    const http = resolved.find((service) => service.type === '_http._tcp' && ipv4(service))
    const target = http ?? resolved.find((service) => ipv4(service) && service.port)
    if (target?.host && target.port) {
      const bare = target.host.split('%')[0]
      const host = bare.includes(':') ? `[${bare}]` : bare
      lanTarget = `http://${host}:${target.port}/`
    }
    // IPv4 hosts must be usable as-is (no "%en0" interface suffix).
    const scopedIpv4 = resolved.filter((service) => service.host && !service.host.includes(':') && service.host.includes('%'))
    return [
      resolved.length > 0 && scopedIpv4.length === 0,
      `${services.length} found, ${resolved.length} resolved${scopedIpv4.length ? `, ${scopedIpv4.length} scoped IPv4 hosts` : ''}: ` +
        resolved
          .slice(0, 8)
          .map((service) => `${service.name} (${service.type} ${service.host}:${service.port}, txt ${service.txt.length})`)
          .join('; ') +
        (errors.length ? ` errors: ${errors.join(' | ')}` : ''),
    ]
  })

  await check('showPicker discovery option', async () => {
    const { services, errors } = await browse(['_http._tcp'], 4000, true)
    const permissionErrors = errors.filter(isLocalNetworkPermissionError)
    // Below Android 17 (and on iOS) showPicker is ignored and discovery browses
    // as usual; on 17+ the system picker opens and needs no permission.
    return [
      permissionErrors.length === 0,
      `accepted; ${services.length} services, ${errors.length} errors` +
        (android && apiLevel < 37 ? ' (API < 37: normal browse)' : ''),
    ]
  })

  await check('LAN reachability probe', async () => {
    const target = lanTarget ?? (gateway ? `http://${gateway}/` : undefined)
    if (!target) return [false, 'no LAN target (no resolved service or gateway)']
    try {
      const reachable = await isInternetReachable({ probeUrl: target, timeout: 5000 })
      // Any non-permission outcome proves the LAN path is open; HTTP status varies by device.
      return [true, `${target} -> ${reachable ? '2xx' : 'non-2xx/failed'} (no permission block)`]
    } catch (error) {
      const blocked = isLocalNetworkPermissionError(error)
      return [false, `${target} -> ${blocked ? 'LOCAL NETWORK PERMISSION DENIED: ' : ''}${describe(error)}`]
    }
  })

  await wait(0)
  const report = snapshot(true)

  try {
    writeReport(report)
  } catch (error) {
    onProgress?.(`could not write ${SELF_TEST_FILE}: ${describe(error)}`)
  }
  // Release builds still forward console output to logcat / the device console.
  console.log(`MUNIM_WIFI_SELFTEST ${JSON.stringify(report)}`)
  return report
}
