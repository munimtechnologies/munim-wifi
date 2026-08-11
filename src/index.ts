import { PermissionsAndroid, Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import type {
  CapabilityAvailability,
  ChannelInfo,
  ConnectionMode,
  ConnectionOutcome,
  ConnectionOptions,
  ConnectionStatus,
  CurrentNetworkInfo,
  HotspotOutcome,
  HotspotStatus,
  Location,
  MunimWifi as MunimWifiSpec,
  NativeConnectionOptions,
  NativeNetworkSuggestionOptions,
  NetworkDiagnostics,
  NetworkLinkProperties,
  NetworkState,
  PermissionState,
  ScanOptions,
  SuggestionOutcome,
  SuggestionStatus,
  WifiCapabilityStatus,
  WifiFingerprint,
  WifiNetwork,
  WifiPlatform,
  WifiSecurityType,
} from './specs/munim-wifi.nitro'
import {
  validateBSSID,
  validateNativeConnectionOptions,
  validateSecurity,
  validateSSID,
  validateSuggestionOptions,
  validateTimeout,
} from './validation'

export const MunimWifi =
  NitroModules.createHybridObject<MunimWifiSpec>('MunimWifi')

type NetworkListener = (network: WifiNetwork) => void
type NetworksListener = (networks: WifiNetwork[]) => void
type ErrorListener = (message: string) => void

function validateConnectionOptions(options: ConnectionOptions): void {
  if (!options || typeof options !== 'object') {
    throw new TypeError('Connection options must be an object')
  }
  validateSSID(options.ssid)
  validateBSSID(options.bssid)
  validateSecurity(
    options.security ??
      (options.isWEP
        ? 'wep'
        : options.password === undefined
          ? 'open'
          : 'wpa2'),
    options.password
  )
  if (options.joinOnce !== undefined && typeof options.joinOnce !== 'boolean') {
    throw new TypeError('joinOnce must be a boolean when provided')
  }
  validateTimeout(options.timeout)
}

interface BaseNetworkOptions {
  ssid: string
  bssid?: string
}

export type WifiSecurityOptions =
  | { type: 'open' }
  | { type: 'owe' }
  | { type: 'wep'; passphrase: string }
  | { type: 'wpa2'; passphrase: string }
  | { type: 'wpa3'; passphrase: string }

export interface LocalNetworkRequestOptions extends BaseNetworkOptions {
  security: WifiSecurityOptions
  timeout?: number
  /**
   * Route all process traffic through the requested Android network.
   * Defaults to false and has no effect on iOS.
   */
  bindProcess?: boolean
}

export interface NetworkConfigurationOptions extends BaseNetworkOptions {
  security: WifiSecurityOptions
  timeout?: number
}

export interface NetworkSuggestionOptions extends BaseNetworkOptions {
  security: WifiSecurityOptions
  hidden?: boolean
  appInteractionRequired?: boolean
}

function toNativeConnectionOptions(
  options: LocalNetworkRequestOptions | NetworkConfigurationOptions
): NativeConnectionOptions {
  const nativeOptions: NativeConnectionOptions = {
    ssid: options.ssid,
    bssid: options.bssid,
    securityType: options.security.type,
    passphrase:
      'passphrase' in options.security
        ? options.security.passphrase
        : undefined,
    timeout: options.timeout,
    bindProcess:
      'bindProcess' in options ? options.bindProcess ?? false : false,
  }
  validateNativeConnectionOptions(nativeOptions)
  return nativeOptions
}

function toNativeSuggestionOptions(
  options: NetworkSuggestionOptions
): NativeNetworkSuggestionOptions {
  const nativeOptions: NativeNetworkSuggestionOptions = {
    ssid: options.ssid,
    bssid: options.bssid,
    securityType: options.security.type,
    passphrase:
      'passphrase' in options.security
        ? options.security.passphrase
        : undefined,
    hidden: options.hidden,
    appInteractionRequired: options.appInteractionRequired,
  }
  validateSuggestionOptions(nativeOptions)
  return nativeOptions
}

function validateLookupSSID<T>(ssid: string, operation: () => Promise<T>): Promise<T> {
  try {
    validateSSID(ssid)
    return operation()
  } catch (error) {
    return Promise.reject(error)
  }
}

const networkListeners = new Set<NetworkListener>()
const networksListeners = new Set<NetworksListener>()
const errorListeners = new Set<ErrorListener>()
const diagnosticsListeners = new Set<(diagnostics: NetworkDiagnostics) => void>()

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
  return validateLookupSSID(ssid, () => MunimWifi.getRSSI(ssid))
}

export function getBSSID(ssid: string): Promise<string | null> {
  return validateLookupSSID(ssid, () => MunimWifi.getBSSID(ssid))
}

export function getChannelInfo(ssid: string): Promise<ChannelInfo | null> {
  return validateLookupSSID(ssid, () => MunimWifi.getChannelInfo(ssid))
}

export function getNetworkInfo(ssid: string): Promise<WifiNetwork | null> {
  return validateLookupSSID(ssid, () => MunimWifi.getNetworkInfo(ssid))
}

export function getCurrentNetwork(): Promise<CurrentNetworkInfo | null> {
  return MunimWifi.getCurrentNetwork()
}

export function connectToNetwork(options: ConnectionOptions): Promise<void> {
  try {
    validateConnectionOptions(options)
    return MunimWifi.connectToNetwork({
      ...options,
      joinOnce: options.joinOnce ?? true,
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

export function requestLocalNetwork(
  options: LocalNetworkRequestOptions
): Promise<ConnectionOutcome> {
  try {
    return MunimWifi.requestLocalNetwork(toNativeConnectionOptions(options))
  } catch (error) {
    return Promise.reject(error)
  }
}

export function configureNetwork(
  options: NetworkConfigurationOptions
): Promise<ConnectionOutcome> {
  try {
    return MunimWifi.configureNetwork(toNativeConnectionOptions(options))
  } catch (error) {
    return Promise.reject(error)
  }
}

export function requestUserSavedNetwork(
  options?: NetworkConfigurationOptions
): Promise<ConnectionOutcome> {
  try {
    return MunimWifi.requestUserSavedNetwork(
      options === undefined ? undefined : toNativeConnectionOptions(options)
    )
  } catch (error) {
    return Promise.reject(error)
  }
}

export function releaseConnection(
  leaseOrConfigurationId: string
): Promise<ConnectionOutcome> {
  if (
    typeof leaseOrConfigurationId !== 'string' ||
    leaseOrConfigurationId.length === 0
  ) {
    return Promise.reject(
      new TypeError('A non-empty lease or configuration ID is required')
    )
  }
  return MunimWifi.releaseConnection(leaseOrConfigurationId)
}

export function addNetworkSuggestion(
  options: NetworkSuggestionOptions
): Promise<SuggestionOutcome> {
  try {
    return MunimWifi.addNetworkSuggestion(toNativeSuggestionOptions(options))
  } catch (error) {
    return Promise.reject(error)
  }
}

export function removeNetworkSuggestion(
  options: NetworkSuggestionOptions
): Promise<SuggestionOutcome> {
  try {
    return MunimWifi.removeNetworkSuggestion(toNativeSuggestionOptions(options))
  } catch (error) {
    return Promise.reject(error)
  }
}

export function getNetworkSuggestionStatus(
  options: NetworkSuggestionOptions
): Promise<SuggestionOutcome> {
  try {
    return MunimWifi.getNetworkSuggestionStatus(
      toNativeSuggestionOptions(options)
    )
  } catch (error) {
    return Promise.reject(error)
  }
}

export function startLocalOnlyHotspot(): Promise<HotspotOutcome> {
  return MunimWifi.startLocalOnlyHotspot()
}

export function stopLocalOnlyHotspot(
  reservationId: string
): Promise<HotspotOutcome> {
  if (typeof reservationId !== 'string' || reservationId.length === 0) {
    return Promise.reject(new TypeError('A non-empty reservation ID is required'))
  }
  return MunimWifi.stopLocalOnlyHotspot(reservationId)
}

export function disconnect(): Promise<void> {
  return MunimWifi.disconnect()
}

export function getIPAddress(): Promise<string | null> {
  return MunimWifi.getIPAddress()
}

export function getWifiCapabilityStatus(): Promise<WifiCapabilityStatus> {
  return MunimWifi.getWifiCapabilityStatus()
}

export function getNetworkDiagnostics(): Promise<NetworkDiagnostics> {
  return MunimWifi.getNetworkDiagnostics()
}

export function startNetworkObserver(
  callback: (diagnostics: NetworkDiagnostics) => void
): void {
  MunimWifi.startNetworkObserver(callback)
}

export function stopNetworkObserver(): void {
  MunimWifi.stopNetworkObserver()
}

export function addNetworkObserverListener(
  callback: (diagnostics: NetworkDiagnostics) => void
): () => void {
  diagnosticsListeners.add(callback)
  if (diagnosticsListeners.size === 1) {
    MunimWifi.startNetworkObserver((diagnostics) => {
      diagnosticsListeners.forEach((listener) => listener(diagnostics))
    })
  }
  return () => {
    diagnosticsListeners.delete(callback)
    if (diagnosticsListeners.size === 0) {
      MunimWifi.stopNetworkObserver()
    }
  }
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
  CapabilityAvailability,
  ChannelInfo,
  ConnectionMode,
  ConnectionOutcome,
  ConnectionOptions,
  ConnectionStatus,
  CurrentNetworkInfo,
  HotspotOutcome,
  HotspotStatus,
  Location,
  MunimWifiSpec,
  NativeConnectionOptions,
  NativeNetworkSuggestionOptions,
  NetworkDiagnostics,
  NetworkLinkProperties,
  NetworkState,
  PermissionState,
  ScanOptions,
  SuggestionOutcome,
  SuggestionStatus,
  WifiCapabilityStatus,
  WifiFingerprint,
  WifiNetwork,
  WifiPlatform,
  WifiSecurityType,
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
  requestLocalNetwork,
  configureNetwork,
  requestUserSavedNetwork,
  releaseConnection,
  addNetworkSuggestion,
  removeNetworkSuggestion,
  getNetworkSuggestionStatus,
  startLocalOnlyHotspot,
  stopLocalOnlyHotspot,
  disconnect,
  getIPAddress,
  getWifiCapabilityStatus,
  getNetworkDiagnostics,
  startNetworkObserver,
  stopNetworkObserver,
  addNetworkObserverListener,
  addNetworkFoundListener,
  addNetworksFoundListener,
  addScanErrorListener,
  addEventListener,
  addListener,
  removeListeners,
}
