import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  addNetworkObserverListener,
  addNetworkSuggestion,
  addNetworksFoundListener,
  addScanErrorListener,
  addScanThrottledListener,
  addSuggestionConnectionListener,
  disconnect,
  getConfiguredSSIDs,
  getCurrentNetwork,
  getIPAddresses,
  isInternetReachable,
  requestLocalNetworkPermission,
  startScan,
  startServiceDiscovery,
  stopScan,
  txtRecordToObject,
  getNetworkDiagnostics,
  getNetworkSuggestionStatus,
  getWifiCapabilityStatus,
  isWifiEnabled,
  releaseConnection,
  removeNetworkSuggestion,
  requestLocalNetwork,
  requestWifiPermission,
  scanNetworks,
  startLocalOnlyHotspot,
  stopLocalOnlyHotspot,
  type ConnectionOutcome,
  type CurrentNetworkInfo,
  type DiscoveredService,
  type NetworkDiagnostics,
  type WifiCapabilityStatus,
  type WifiNetwork,
} from 'munim-wifi'

const DEMO_SSID = 'munim-demo'
const DEMO_PASSPHRASE = 'demo-passphrase'

export default function App() {
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [current, setCurrent] = useState<CurrentNetworkInfo | null>(null)
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [capabilities, setCapabilities] = useState<WifiCapabilityStatus | null>(null)
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null)
  const [observing, setObserving] = useState(false)
  const [connection, setConnection] = useState<ConnectionOutcome | null>(null)
  const [message, setMessage] = useState('Request permission, then scan nearby networks.')
  const stopObserving = useRef<(() => void) | null>(null)
  const [services, setServices] = useState<Record<string, DiscoveredService>>({})
  const stopBrowsing = useRef<(() => void) | null>(null)
  const stopContinuous = useRef<(() => void) | null>(null)
  const stopSuggestionEvents = useRef<(() => void) | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [suggestionEvents, setSuggestionEvents] = useState(false)

  useEffect(() => {
    void isWifiEnabled().then(setEnabled).catch(() => setEnabled(false))
    return () => {
      stopObserving.current?.()
      stopBrowsing.current?.()
      stopContinuous.current?.()
      stopSuggestionEvents.current?.()
    }
  }, [])

  const guard = async (work: () => Promise<void>) => {
    setBusy(true)
    try {
      await work()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const runScan = () =>
    guard(async () => {
      setMessage('Checking Wi-Fi permissions…')
      if (!(await requestWifiPermission())) {
        setMessage('Wi-Fi permission was not granted.')
        return
      }
      const [nextCurrent, nextNetworks] = await Promise.all([
        getCurrentNetwork(),
        scanNetworks({ maxResults: 30, timeout: 10_000 }),
      ])
      setCurrent(nextCurrent)
      setNetworks(nextNetworks)
      setMessage(`Found ${nextNetworks.length} network${nextNetworks.length === 1 ? '' : 's'}.`)
    })

  const runCapabilities = () =>
    guard(async () => {
      const status = await getWifiCapabilityStatus()
      setCapabilities(status)
      setMessage(`Capability report ready for ${status.platform}.`)
    })

  const runDiagnostics = () =>
    guard(async () => {
      const snapshot = await getNetworkDiagnostics()
      setDiagnostics(snapshot)
      setMessage(`Diagnostics captured at ${new Date(snapshot.timestamp).toLocaleTimeString()}.`)
    })

  const runStructuredConnect = () =>
    guard(async () => {
      setMessage(`Requesting local network "${DEMO_SSID}"…`)
      const outcome = await requestLocalNetwork({
        ssid: DEMO_SSID,
        security: { type: 'wpa2', passphrase: DEMO_PASSPHRASE },
        timeout: 15_000,
        bindProcess: false,
      })
      setConnection(outcome)
      setMessage(`Connection outcome: ${outcome.status}${outcome.message ? ` (${outcome.message})` : ''}`)
    })

  const releaseLease = () =>
    guard(async () => {
      const id = connection?.leaseId ?? connection?.configurationId
      if (!id) {
        setMessage('Nothing to release yet.')
        return
      }
      const outcome = await releaseConnection(id)
      setConnection(null)
      setMessage(`Release outcome: ${outcome.status}`)
    })

  const runHotspot = () =>
    guard(async () => {
      setMessage('Starting local-only hotspot…')
      const outcome = await startLocalOnlyHotspot()
      setMessage(
        `Hotspot: ${outcome.status}` +
          (outcome.ssid ? ` ssid=${outcome.ssid}` : '') +
          (outcome.reservationId ? ` (stopping in 6s)` : ''),
      )
      if (outcome.reservationId) {
        const id = outcome.reservationId
        setTimeout(async () => {
          const stopped = await stopLocalOnlyHotspot(id)
          setMessage(`Hotspot stopped: ${stopped.status}`)
        }, 6000)
      }
    })

  const runSuggestions = () =>
    guard(async () => {
      setMessage('Adding network suggestion…')
      const suggestion = {
        ssid: DEMO_SSID,
        security: { type: 'wpa2' as const, passphrase: DEMO_PASSPHRASE },
      }
      const added = await addNetworkSuggestion(suggestion)
      const status = await getNetworkSuggestionStatus(suggestion)
      const removed = await removeNetworkSuggestion(suggestion)
      setMessage(
        `Suggestion add=${added.status} status=${status.status} remove=${removed.status}`,
      )
    })

  const runReachability = () =>
    guard(async () => {
      const os = await isInternetReachable()
      const probed = await isInternetReachable({
        probeUrl: 'https://www.google.com/generate_204',
        timeout: 5000,
      })
      setMessage(`Internet reachable: OS says ${os}, HTTP probe says ${probed}.`)
    })

  const runAddresses = () =>
    guard(async () => {
      const info = await getIPAddresses()
      setMessage(
        info
          ? `${info.interfaceName ?? 'wifi'} IPv4 [${info.ipv4.join(', ')}] IPv6 [${info.ipv6.join(', ')}]`
          : 'No Wi-Fi addresses.'
      )
    })

  const runLocalNetworkPermission = () =>
    guard(async () => {
      setMessage('Requesting local network access…')
      setMessage(`Local network permission: ${await requestLocalNetworkPermission()}`)
    })

  const runConfigured = () =>
    guard(async () => {
      const ssids = await getConfiguredSSIDs()
      setMessage(`Configured by this app: ${ssids.join(', ') || 'none'}`)
    })

  const runDisconnect = () =>
    guard(async () => {
      setMessage(`disconnect() released something: ${await disconnect()}`)
    })

  const toggleBrowse = () => {
    if (stopBrowsing.current) {
      stopBrowsing.current()
      stopBrowsing.current = null
      setBrowsing(false)
      setMessage('Service discovery stopped.')
      return
    }
    setServices({})
    try {
      const handle = startServiceDiscovery('_http._tcp', {
        onFound: (service) => setServices((all) => ({ ...all, [service.id]: service })),
        onLost: (service) =>
          setServices((all) => {
            const next = { ...all }
            delete next[service.id]
            return next
          }),
        onError: (error) => setMessage(error),
      })
      stopBrowsing.current = handle.stop
      setBrowsing(true)
      setMessage('Browsing for _http._tcp services…')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const toggleContinuousScan = () => {
    if (stopContinuous.current) {
      stopContinuous.current()
      stopContinuous.current = null
      setScanning(false)
      setMessage('Continuous scan stopped.')
      return
    }
    const unsubscribers = [
      addNetworksFoundListener((found, info) => {
        setNetworks(found)
        setMessage(
          `Batch of ${found.length}: fresh=${info.fresh} throttled=${info.throttled}` +
            (info.message ? ` (${info.message})` : '')
        )
      }),
      addScanThrottledListener((info) => setMessage(`Throttled: ${info.message ?? ''}`)),
      addScanErrorListener((error) => setMessage(`Scan error: ${error}`)),
    ]
    startScan({ interval: 10_000 })
    stopContinuous.current = () => {
      stopScan()
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
    setScanning(true)
    setMessage('Continuous scan every 10 s (Android throttles after 4 per 2 min).')
  }

  const toggleSuggestionEvents = () => {
    if (stopSuggestionEvents.current) {
      stopSuggestionEvents.current()
      stopSuggestionEvents.current = null
      setSuggestionEvents(false)
      setMessage('Suggestion events stopped.')
      return
    }
    const unsubscribe = addSuggestionConnectionListener((event) =>
      setMessage(
        `Suggestion event: ${event.type} ${event.ssid ?? ''} ${event.failureReason ?? ''} ${event.message ?? ''}`
      )
    )
    if (!unsubscribe) {
      setMessage('Suggestion connection events are unsupported here.')
      return
    }
    stopSuggestionEvents.current = unsubscribe
    setSuggestionEvents(true)
    setMessage('Listening for suggestion connection events.')
  }

  const toggleObserver = () => {
    if (stopObserving.current) {
      stopObserving.current()
      stopObserving.current = null
      setObserving(false)
      setMessage('Network observer stopped.')
      return
    }
    stopObserving.current = addNetworkObserverListener((update) => {
      setDiagnostics(update)
    })
    setObserving(true)
    setMessage('Network observer running — diagnostics update live.')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>NITRO MODULE</Text>
        <Text style={styles.title}>Munim Wi-Fi</Text>
        <Text style={styles.subtitle}>
          Native Wi-Fi discovery and connection tools for Expo and React Native.
        </Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Wi-Fi</Text>
          <Text style={[styles.statusValue, enabled === false && styles.statusOff]}>
            {enabled == null ? 'Checking…' : enabled ? 'Enabled' : 'Unavailable'}
          </Text>
        </View>

        <Pressable
          disabled={busy}
          onPress={runScan}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            busy && styles.buttonDisabled,
          ]}
        >
          {busy ? <ActivityIndicator color="#07131d" /> : <Text style={styles.buttonText}>Scan networks</Text>}
        </Pressable>

        <View style={styles.buttonGrid}>
          <Pressable disabled={busy} onPress={runCapabilities} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Capabilities</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runDiagnostics} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Diagnostics</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runStructuredConnect} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Connect</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={releaseLease} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Release</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runHotspot} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Hotspot</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runSuggestions} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Suggest</Text>
          </Pressable>
          <Pressable onPress={toggleObserver} style={({ pressed }) => [styles.smallButton, observing && styles.smallButtonActive, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>{observing ? 'Stop observer' : 'Observe'}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runReachability} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Internet?</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runAddresses} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>IP addresses</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runLocalNetworkPermission} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Local network</Text>
          </Pressable>
          <Pressable onPress={toggleBrowse} style={({ pressed }) => [styles.smallButton, browsing && styles.smallButtonActive, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>{browsing ? 'Stop Bonjour' : 'Bonjour _http'}</Text>
          </Pressable>
          <Pressable onPress={toggleContinuousScan} style={({ pressed }) => [styles.smallButton, scanning && styles.smallButtonActive, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>{scanning ? 'Stop scan loop' : 'Scan loop'}</Text>
          </Pressable>
          <Pressable onPress={toggleSuggestionEvents} style={({ pressed }) => [styles.smallButton, suggestionEvents && styles.smallButtonActive, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>{suggestionEvents ? 'Stop events' : 'Suggest events'}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runConfigured} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Configured</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={runDisconnect} style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
            <Text style={styles.smallButtonText}>Disconnect</Text>
          </Pressable>
        </View>

        <Text style={styles.message}>{message}</Text>

        {connection && (
          <View style={styles.currentCard}>
            <Text style={styles.cardLabel}>CONNECTION OUTCOME</Text>
            <Text style={styles.networkName}>{connection.ssid ?? '—'}</Text>
            <Text style={styles.meta}>
              {connection.status} · {connection.mode}
              {connection.boundProcess ? ' · process bound' : ''}
            </Text>
            {(connection.leaseId ?? connection.configurationId) && (
              <Text style={styles.meta}>id: {connection.leaseId ?? connection.configurationId}</Text>
            )}
          </View>
        )}

        {capabilities && (
          <View style={styles.currentCard}>
            <Text style={styles.cardLabel}>CAPABILITIES · {capabilities.platform.toUpperCase()}</Text>
            <Text style={styles.meta}>scan: {capabilities.scan} · local request: {capabilities.localNetworkRequest}</Text>
            <Text style={styles.meta}>configuration: {capabilities.managedConfiguration} · suggestions: {capabilities.networkSuggestions}</Text>
            <Text style={styles.meta}>hotspot: {capabilities.localOnlyHotspot} · settings intent: {capabilities.userSavedNetworkIntent}</Text>
            <Text style={styles.meta}>location: {capabilities.locationPermission} · nearby devices: {capabilities.nearbyWifiPermission}</Text>
          </View>
        )}

        {diagnostics && (
          <View style={styles.currentCard}>
            <Text style={styles.cardLabel}>DIAGNOSTICS{observing ? ' · LIVE' : ''}</Text>
            <Text style={styles.networkName}>{diagnostics.currentNetwork?.ssid ?? diagnostics.state}</Text>
            <Text style={styles.meta}>
              state: {diagnostics.state}
              {diagnostics.validated == null ? '' : ` · validated: ${diagnostics.validated}`}
              {diagnostics.captivePortal == null ? '' : ` · captive portal: ${diagnostics.captivePortal}`}
            </Text>
            <Text style={styles.meta}>
              {diagnostics.metered == null ? '' : `metered: ${diagnostics.metered}`}
              {diagnostics.constrained == null ? '' : ` · constrained: ${diagnostics.constrained}`}
            </Text>
            {diagnostics.linkProperties && (
              <Text style={styles.meta}>
                {diagnostics.linkProperties.interfaceName ?? 'if?'} · {diagnostics.linkProperties.addresses.join(', ') || 'no addresses'}
              </Text>
            )}
          </View>
        )}

        {Object.values(services).map((service) => (
          <View key={service.id} style={styles.networkCard}>
            <Text numberOfLines={1} style={styles.networkName}>{service.name}</Text>
            <Text style={styles.meta}>
              {service.type} · {service.resolved ? `${service.host}:${service.port}` : 'unresolved'}
            </Text>
            {service.txt.length > 0 && (
              <Text numberOfLines={2} style={styles.meta}>{JSON.stringify(txtRecordToObject(service.txt))}</Text>
            )}
          </View>
        ))}

        {current && (
          <View style={styles.currentCard}>
            <Text style={styles.cardLabel}>CURRENT NETWORK</Text>
            <Text style={styles.networkName}>{current.ssid}</Text>
            <Text style={styles.meta}>{current.ipAddress ?? 'IP address unavailable'}</Text>
            {current.ipv6Addresses && current.ipv6Addresses.length > 0 && (
              <Text style={styles.meta}>{current.ipv6Addresses.join(', ')}</Text>
            )}
            <Text style={styles.meta}>security: {current.securityType}</Text>
          </View>
        )}

        {networks.map((network) => (
          <View key={network.bssid || network.ssid} style={styles.networkCard}>
            <View style={styles.networkHeader}>
              <Text numberOfLines={1} style={styles.networkName}>{network.ssid}</Text>
              <Text style={styles.signal}>{network.rssi == null ? '—' : `${network.rssi} dBm`}</Text>
            </View>
            <Text style={styles.meta}>{network.bssid || 'BSSID unavailable'}</Text>
            <Text style={styles.meta}>
              {network.channel == null ? 'Channel unavailable' : `Channel ${network.channel}`}
              {` · ${network.securityType}`}
              {network.timestamp == null ? '' : ` · seen ${Math.round((Date.now() - network.timestamp) / 1000)}s ago`}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07131d' },
  container: { flexGrow: 1, padding: 24, paddingTop: 72, paddingBottom: 48 },
  eyebrow: { color: '#66d9ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#f4fbff', fontSize: 44, fontWeight: '800', letterSpacing: -1.4, marginTop: 12 },
  subtitle: { color: '#9db4c2', fontSize: 17, lineHeight: 25, marginTop: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  statusLabel: { color: '#9db4c2', fontSize: 14 },
  statusValue: { color: '#79edb1', fontSize: 14, fontWeight: '700' },
  statusOff: { color: '#ff9a9a' },
  button: { alignItems: 'center', backgroundColor: '#66d9ff', borderRadius: 14, justifyContent: 'center', marginTop: 18, minHeight: 54 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#07131d', fontSize: 16, fontWeight: '800' },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: '#0e2635', borderColor: '#2d7b9a', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  smallButtonActive: { backgroundColor: '#2d7b9a' },
  smallButtonText: { color: '#bfe8f8', fontSize: 13, fontWeight: '700' },
  message: { color: '#bfd0da', fontSize: 13, lineHeight: 20, marginVertical: 18 },
  currentCard: { backgroundColor: '#0e2635', borderColor: '#2d7b9a', borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 },
  networkCard: { backgroundColor: '#0b1d29', borderColor: '#19394a', borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 15 },
  cardLabel: { color: '#66d9ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  networkHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  networkName: { color: '#f4fbff', flexShrink: 1, fontSize: 17, fontWeight: '700' },
  signal: { color: '#79edb1', fontFamily: 'Courier', fontSize: 12, marginLeft: 12 },
  meta: { color: '#8098a6', fontFamily: 'Courier', fontSize: 11, marginTop: 5 },
})
