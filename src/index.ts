import { PermissionsAndroid, Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import type {
  ChannelInfo,
  ConnectionOptions,
  CurrentNetworkInfo,
  Location,
  MunimWifi as MunimWifiSpec,
  ScanOptions,
  WifiFingerprint,
  WifiNetwork,
} from './specs/munim-wifi.nitro'

export const MunimWifi =
  NitroModules.createHybridObject<MunimWifiSpec>('MunimWifi')

type NetworkListener = (network: WifiNetwork) => void
type NetworksListener = (networks: WifiNetwork[]) => void
type ErrorListener = (message: string) => void

const networkListeners = new Set<NetworkListener>()
const networksListeners = new Set<NetworksListener>()
const errorListeners = new Set<ErrorListener>()

export function isWifiEnabled(): Promise<boolean> {
  return MunimWifi.isWifiEnabled()
}

export async function requestWifiPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return MunimWifi.requestWifiPermission()
  }

  const permissions: Array<(typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]> = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]

  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES)
  }

  const results = await PermissionsAndroid.requestMultiple(permissions)
  return permissions.every(
    (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
  )
}

export function scanNetworks(options?: ScanOptions): Promise<WifiNetwork[]> {
  return MunimWifi.scanNetworks(options)
}

export function startScan(options?: ScanOptions): void {
  MunimWifi.startScan(
    options,
    (networks) => {
      networksListeners.forEach((listener) => listener(networks))
      networks.forEach((network) => {
        networkListeners.forEach((listener) => listener(network))
      })
    },
    (message) => errorListeners.forEach((listener) => listener(message))
  )
}

export function stopScan(): void {
  MunimWifi.stopScan()
}

export function getSSIDs(): Promise<string[]> {
  return MunimWifi.getSSIDs()
}

export function getWifiFingerprint(): Promise<WifiFingerprint> {
  return MunimWifi.getWifiFingerprint()
}

export function getRSSI(ssid: string): Promise<number | null> {
  return MunimWifi.getRSSI(ssid)
}

export function getBSSID(ssid: string): Promise<string | null> {
  return MunimWifi.getBSSID(ssid)
}

export function getChannelInfo(ssid: string): Promise<ChannelInfo | null> {
  return MunimWifi.getChannelInfo(ssid)
}

export function getNetworkInfo(ssid: string): Promise<WifiNetwork | null> {
  return MunimWifi.getNetworkInfo(ssid)
}

export function getCurrentNetwork(): Promise<CurrentNetworkInfo | null> {
  return MunimWifi.getCurrentNetwork()
}

export function connectToNetwork(options: ConnectionOptions): Promise<void> {
  return MunimWifi.connectToNetwork(options)
}

export function disconnect(): Promise<void> {
  return MunimWifi.disconnect()
}

export function getIPAddress(): Promise<string | null> {
  return MunimWifi.getIPAddress()
}

export function addNetworkFoundListener(callback: NetworkListener): () => void {
  networkListeners.add(callback)
  return () => networkListeners.delete(callback)
}

export function addNetworksFoundListener(callback: NetworksListener): () => void {
  networksListeners.add(callback)
  return () => networksListeners.delete(callback)
}

export function addScanErrorListener(callback: ErrorListener): () => void {
  errorListeners.add(callback)
  return () => errorListeners.delete(callback)
}

export function addEventListener(
  eventName: 'networkFound' | 'networksFound' | 'scanError',
  callback: NetworkListener | NetworksListener | ErrorListener
): () => void {
  if (eventName === 'networkFound') {
    return addNetworkFoundListener(callback as NetworkListener)
  }
  if (eventName === 'networksFound') {
    return addNetworksFoundListener(callback as NetworksListener)
  }
  return addScanErrorListener(callback as ErrorListener)
}

/** @deprecated Subscribe with addNetworkFoundListener instead. */
export function addListener(eventName: string): void {
  MunimWifi.addListener(eventName)
}

/** @deprecated Remove the function returned by addNetworkFoundListener instead. */
export function removeListeners(count: number): void {
  MunimWifi.removeListeners(count)
}

export type {
  ChannelInfo,
  ConnectionOptions,
  CurrentNetworkInfo,
  Location,
  MunimWifiSpec,
  ScanOptions,
  WifiFingerprint,
  WifiNetwork,
}

export default {
  isWifiEnabled,
  requestWifiPermission,
  scanNetworks,
  startScan,
  stopScan,
  getSSIDs,
  getWifiFingerprint,
  getRSSI,
  getBSSID,
  getChannelInfo,
  getNetworkInfo,
  getCurrentNetwork,
  connectToNetwork,
  disconnect,
  getIPAddress,
  addNetworkFoundListener,
  addNetworksFoundListener,
  addScanErrorListener,
  addEventListener,
  addListener,
  removeListeners,
}
