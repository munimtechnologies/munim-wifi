import { NitroModules } from 'react-native-nitro-modules'
import { NativeEventEmitter, NativeModules } from 'react-native'
import type {
  MunimWifi as MunimWifiSpec,
  WifiNetwork,
  WifiFingerprint,
  ScanOptions,
  ChannelInfo,
  Location,
} from './specs/munim-wifi.nitro'

const MunimWifi =
  NitroModules.createHybridObject<MunimWifiSpec>('MunimWifi')

// Event Emitter for Wi-Fi events
const { MunimWifiEventEmitter } = NativeModules

let eventEmitter: NativeEventEmitter | null = null

if (MunimWifiEventEmitter) {
  try {
    eventEmitter = new NativeEventEmitter(MunimWifiEventEmitter)
  } catch (error) {
    console.error(
      '[munim-wifi] Failed to initialize event emitter:',
      error
    )
  }
}

// ========== Wi-Fi Functions ==========

/**
 * Check if Wi-Fi is enabled on the device.
 *
 * @returns Promise resolving to true if Wi-Fi is enabled, false otherwise.
 */
export function isWifiEnabled(): Promise<boolean> {
  return MunimWifi.isWifiEnabled()
}

/**
 * Request Wi-Fi permissions (Android) or check authorization status (iOS).
 * On Android, this requests location permission which is required for Wi-Fi scanning.
 * On iOS, this checks location authorization status.
 *
 * @returns Promise resolving to true if permissions are granted, false otherwise.
 */
export function requestWifiPermission(): Promise<boolean> {
  return MunimWifi.requestWifiPermission()
}

/**
 * Scan for nearby Wi-Fi networks.
 *
 * @param options - Optional scan configuration including max results and timeout.
 * @returns Promise resolving to array of discovered Wi-Fi networks.
 */
export function scanNetworks(options?: ScanOptions): Promise<WifiNetwork[]> {
  return MunimWifi.scanNetworks(options)
}

/**
 * Start continuous Wi-Fi scanning. Results will be emitted via events.
 *
 * @param options - Optional scan configuration.
 */
export function startScan(options?: ScanOptions): void {
  return MunimWifi.startScan(options)
}

/**
 * Stop continuous Wi-Fi scanning.
 */
export function stopScan(): void {
  return MunimWifi.stopScan()
}

/**
 * Get list of SSIDs (network names) from the last scan.
 *
 * @returns Promise resolving to array of SSID strings.
 */
export function getSSIDs(): Promise<string[]> {
  return MunimWifi.getSSIDs()
}

/**
 * Get Wi-Fi fingerprint containing all network information.
 * This includes SSIDs, BSSIDs, RSSI, channels, and frequencies.
 *
 * @returns Promise resolving to Wi-Fi fingerprint data.
 */
export function getWifiFingerprint(): Promise<WifiFingerprint> {
  return MunimWifi.getWifiFingerprint()
}

/**
 * Get RSSI (signal strength) for a specific network by SSID.
 *
 * @param ssid - The SSID of the network.
 * @returns Promise resolving to RSSI value in dBm, or null if network not found.
 */
export function getRSSI(ssid: string): Promise<number | null> {
  return MunimWifi.getRSSI(ssid)
}

/**
 * Get BSSID (MAC address) for a specific network by SSID.
 *
 * @param ssid - The SSID of the network.
 * @returns Promise resolving to BSSID string, or null if network not found.
 */
export function getBSSID(ssid: string): Promise<string | null> {
  return MunimWifi.getBSSID(ssid)
}

/**
 * Get channel and frequency information for a specific network by SSID.
 *
 * @param ssid - The SSID of the network.
 * @returns Promise resolving to object with channel and frequency, or null if network not found.
 */
export function getChannelInfo(ssid: string): Promise<ChannelInfo | null> {
  return MunimWifi.getChannelInfo(ssid)
}

/**
 * Get all available information for a specific network by SSID.
 *
 * @param ssid - The SSID of the network.
 * @returns Promise resolving to WifiNetwork object, or null if network not found.
 */
export function getNetworkInfo(ssid: string): Promise<WifiNetwork | null> {
  return MunimWifi.getNetworkInfo(ssid)
}

// ========== Event Management ==========

/**
 * Add a network found event listener (for continuous scanning).
 *
 * @param callback - Function to call when a network is found
 * @returns A function to remove the listener
 */
export function addNetworkFoundListener(
  callback: (network: WifiNetwork) => void
): () => void {
  if (!eventEmitter) {
    console.warn(
      '[munim-wifi] Cannot add listener - event emitter not available'
    )
    return () => {}
  }

  const subscription = eventEmitter.addListener('networkFound', callback)
  return () => subscription.remove()
}

/**
 * Add an event listener.
 *
 * @param eventName - The name of the event to listen for.
 * @param callback - The callback to invoke when the event occurs.
 * @returns A function to remove the listener
 */
export function addEventListener(
  eventName: string,
  callback: (data: any) => void
): () => void {
  if (!eventEmitter) {
    console.warn(
      '[munim-wifi] Cannot add listener - event emitter not available'
    )
    return () => {}
  }

  const subscription = eventEmitter.addListener(eventName, callback)
  return () => subscription.remove()
}

/**
 * Add an event listener (legacy method).
 *
 * @param eventName - The name of the event to listen for.
 */
export function addListener(eventName: string): void {
  return MunimWifi.addListener(eventName)
}

/**
 * Remove event listeners.
 *
 * @param count - Number of listeners to remove.
 */
export function removeListeners(count: number): void {
  return MunimWifi.removeListeners(count)
}

// ========== Type Exports ==========

export type { WifiNetwork, WifiFingerprint, ScanOptions, ChannelInfo, Location }

// Default export for convenience
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
  addNetworkFoundListener,
  addEventListener,
  addListener,
  removeListeners,
}