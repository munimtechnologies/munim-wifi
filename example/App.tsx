import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
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
  getCurrentNetwork,
  isWifiEnabled,
  requestWifiPermission,
  scanNetworks,
  type CurrentNetworkInfo,
  type WifiNetwork,
} from 'munim-wifi'

export default function App() {
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [current, setCurrent] = useState<CurrentNetworkInfo | null>(null)
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [message, setMessage] = useState('Request permission, then scan nearby networks.')

  useEffect(() => {
    void isWifiEnabled().then(setEnabled).catch(() => setEnabled(false))
  }, [])

  const runScan = async () => {
    setBusy(true)
    setMessage('Checking Wi-Fi permissions…')
    try {
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
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

        <Text style={styles.message}>{message}</Text>

        {current && (
          <View style={styles.currentCard}>
            <Text style={styles.cardLabel}>CURRENT NETWORK</Text>
            <Text style={styles.networkName}>{current.ssid}</Text>
            <Text style={styles.meta}>{current.ipAddress ?? 'IP address unavailable'}</Text>
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
              {network.isSecure == null ? '' : network.isSecure ? ' · Secured' : ' · Open'}
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
  message: { color: '#bfd0da', fontSize: 13, lineHeight: 20, marginVertical: 18 },
  currentCard: { backgroundColor: '#0e2635', borderColor: '#2d7b9a', borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 },
  networkCard: { backgroundColor: '#0b1d29', borderColor: '#19394a', borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 15 },
  cardLabel: { color: '#66d9ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8 },
  networkHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  networkName: { color: '#f4fbff', flexShrink: 1, fontSize: 17, fontWeight: '700' },
  signal: { color: '#79edb1', fontFamily: 'Courier', fontSize: 12, marginLeft: 12 },
  meta: { color: '#8098a6', fontFamily: 'Courier', fontSize: 11, marginTop: 5 },
})
