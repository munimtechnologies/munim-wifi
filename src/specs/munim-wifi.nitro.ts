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

// Current network information
export interface CurrentNetworkInfo {
  ssid: string
  bssid: string
  ipAddress?: string
  subnetMask?: string
  gateway?: string
  dnsServers?: string[]
}

// Wi-Fi Network information
export interface WifiNetwork {
  ssid: string
  bssid: string
  rssi?: number // Not available on iOS
  frequency?: number // Not available on iOS
  channel?: number // Not available on iOS
  capabilities?: string
  isSecure?: boolean
  timestamp?: number
}

// Connection options
export interface ConnectionOptions {
  ssid: string
  password?: string
  isWEP?: boolean
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
   * Note: On iOS, RSSI, channel, and frequency are not available.
   *
   * @returns Promise resolving to Wi-Fi fingerprint data.
   */
  getWifiFingerprint(): Promise<WifiFingerprint>

  /**
   * Get RSSI (signal strength) for a specific network by SSID.
   * Note: Not available on iOS - returns null.
   *
   * @param ssid - The SSID of the network.
   * @returns Promise resolving to RSSI value in dBm, or null if network not found or not available.
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
   * Note: Not available on iOS - returns null.
   *
   * @param ssid - The SSID of the network.
   * @returns Promise resolving to object with channel and frequency, or null if network not found or not available.
   */
  getChannelInfo(ssid: string): Promise<ChannelInfo | null>

  /**
   * Get all available information for a specific network by SSID.
   * Note: On iOS, RSSI, channel, and frequency will be undefined.
   *
   * @param ssid - The SSID of the network.
   * @returns Promise resolving to WifiNetwork object, or null if network not found.
   */
  getNetworkInfo(ssid: string): Promise<WifiNetwork | null>

  /**
   * Get information about the currently connected Wi-Fi network.
   *
   * @returns Promise resolving to current network info, or null if not connected.
   */
  getCurrentNetwork(): Promise<CurrentNetworkInfo | null>

  /**
   * Connect to a Wi-Fi network.
   * Note: Requires appropriate permissions and capabilities on both platforms.
   *
   * @param options - Connection options including SSID and password.
   * @returns Promise resolving when connection is attempted.
   */
  connectToNetwork(options: ConnectionOptions): Promise<void>

  /**
   * Disconnect from the current Wi-Fi network.
   *
   * @returns Promise resolving when disconnection is complete.
   */
  disconnect(): Promise<void>

  /**
   * Get IP address information for the current Wi-Fi connection.
   *
   * @returns Promise resolving to IP address string, or null if not connected.
   */
  getIPAddress(): Promise<string | null>

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