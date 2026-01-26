import { type HybridObject } from 'react-native-nitro-modules'

// Location information
export interface Location {
  latitude?: number
  longitude?: number
}

// Channel information
export interface ChannelInfo {
  channel: number
  frequency: number
}

// Wi-Fi Network information
export interface WifiNetwork {
  ssid: string
  bssid: string
  rssi: number
  frequency: number
  channel?: number
  capabilities?: string
  isSecure?: boolean
  timestamp?: number
}

// Wi-Fi Fingerprint data
export interface WifiFingerprint {
  networks: WifiNetwork[]
  timestamp: number
  location?: Location
}

// Scan options
export interface ScanOptions {
  maxResults?: number
  timeout?: number
}

export interface MunimWifi
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Check if Wi-Fi is enabled on the device.
   *
   * @returns Promise resolving to true if Wi-Fi is enabled, false otherwise.
   */
  isWifiEnabled(): Promise<boolean>

  /**
   * Request Wi-Fi permissions (Android) or check authorization status (iOS).
   * On Android, this requests location permission which is required for Wi-Fi scanning.
   * On iOS, this checks location authorization status.
   *
   * @returns Promise resolving to true if permissions are granted, false otherwise.
   */
  requestWifiPermission(): Promise<boolean>

  /**
   * Scan for nearby Wi-Fi networks.
   *
   * @param options - Optional scan configuration including max results and timeout.
   * @returns Promise resolving to array of discovered Wi-Fi networks.
   */
  scanNetworks(options?: ScanOptions): Promise<WifiNetwork[]>

  /**
   * Start continuous Wi-Fi scanning. Results will be emitted via events.
   *
   * @param options - Optional scan configuration.
   */
  startScan(options?: ScanOptions): void

  /**
   * Stop continuous Wi-Fi scanning.
   */
  stopScan(): void

  /**
   * Get list of SSIDs (network names) from the last scan.
   *
   * @returns Promise resolving to array of SSID strings.
   */
  getSSIDs(): Promise<string[]>

  /**
   * Get Wi-Fi fingerprint containing all network information.
   * This includes SSIDs, BSSIDs, RSSI, channels, and frequencies.
   *
   * @returns Promise resolving to Wi-Fi fingerprint data.
   */
  getWifiFingerprint(): Promise<WifiFingerprint>

  /**
   * Get RSSI (signal strength) for a specific network by SSID.
   *
   * @param ssid - The SSID of the network.
   * @returns Promise resolving to RSSI value in dBm, or null if network not found.
   */
  getRSSI(ssid: string): Promise<number | null>

  /**
   * Get BSSID (MAC address) for a specific network by SSID.
   *
   * @param ssid - The SSID of the network.
   * @returns Promise resolving to BSSID string, or null if network not found.
   */
  getBSSID(ssid: string): Promise<string | null>

  /**
   * Get channel and frequency information for a specific network by SSID.
   *
   * @param ssid - The SSID of the network.
   * @returns Promise resolving to object with channel and frequency, or null if network not found.
   */
  getChannelInfo(ssid: string): Promise<ChannelInfo | null>

  /**
   * Get all available information for a specific network by SSID.
   *
   * @param ssid - The SSID of the network.
   * @returns Promise resolving to WifiNetwork object, or null if network not found.
   */
  getNetworkInfo(ssid: string): Promise<WifiNetwork | null>

  // ========== Event Management ==========

  /**
   * Add an event listener for network found events (when using startScan).
   *
   * @param eventName - The name of the event to listen for.
   */
  addListener(eventName: string): void

  /**
   * Remove event listeners.
   *
   * @param count - Number of listeners to remove.
   */
  removeListeners(count: number): void
}