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
  getCurrentNetwork,
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

  useEffect(() => {
    void isWifiEnabled().then(setEnabled).catch(() => setEnabled(false))
    return () => stopObserving.current?.()
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

        {current && (
          <View style={styles.currentCard}>
            <Text style={styles.cardLabel}>CURRENT NETWORK</Text>
            <Text style={styles.networkName}>{current.ssid}</Text>
            <Text style={styles.meta}>{current.ipAddress ?? 'IP address unavailable'}</Text>
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
