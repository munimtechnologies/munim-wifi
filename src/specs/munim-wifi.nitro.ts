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
  securityType: WifiSecurityType
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
  securityType: WifiSecurityType
  timestamp?: number
}

export type WifiSecurityType =
  | 'open'
  | 'owe'
  | 'wep'
  | 'wpa2'
  | 'wpa3'
  | 'enterprise'
  | 'passpoint'
  | 'unknown'

// Connection options
export interface ConnectionOptions {
  /** Network name. SSIDs are limited to 32 UTF-8 bytes. */
  ssid: string
  /** Optional passphrase, limited to 64 UTF-8 bytes. */
  password?: string
  /** Set for legacy WEP networks. */
  isWEP?: boolean
  /**
   * Optional security type of the target network.
   *
   * When omitted, security is inferred from `password` and `isWEP`
   * (open without a password, WPA2 with one).
   */
  security?: WifiSecurityType
  /** Optional BSSID in canonical MAC-address form. */
  bssid?: string
  /**
   * Keep the connection temporary. Defaults to true.
   *
   * Set explicitly to false to retain a saved configuration where the platform
   * supports persistence.
   */
  joinOnce?: boolean
  /** Connection timeout in milliseconds, from 5000 through 120000. */
  timeout?: number
}

export type ConnectionMode =
  | 'localNetwork'
  | 'managedConfiguration'
  | 'userSavedNetwork'

export type ConnectionStatus =
  | 'connected'
  | 'configured'
  | 'presented'
  | 'released'
  | 'unsupported'
  | 'cancelled'
  | 'failed'

export interface NativeConnectionOptions {
  ssid: string
  securityType: WifiSecurityType
  passphrase?: string
  bssid?: string
  timeout?: number
  bindProcess?: boolean
}

export interface ConnectionOutcome {
  status: ConnectionStatus
  mode: ConnectionMode
  ssid?: string
  leaseId?: string
  configurationId?: string
  boundProcess: boolean
  message?: string
}

export type SuggestionStatus =
  | 'added'
  | 'alreadyExists'
  | 'removed'
  | 'notFound'
  | 'active'
  | 'inactive'
  | 'unknown'
  | 'unsupported'
  | 'failed'

export interface NativeNetworkSuggestionOptions {
  ssid: string
  securityType: WifiSecurityType
  passphrase?: string
  bssid?: string
  hidden?: boolean
  appInteractionRequired?: boolean
}

export interface SuggestionOutcome {
  status: SuggestionStatus
  suggestionId?: string
  message?: string
}

export type HotspotStatus =
  | 'started'
  | 'stopped'
  | 'unsupported'
  | 'failed'

export interface HotspotOutcome {
  status: HotspotStatus
  reservationId?: string
  ssid?: string
  passphrase?: string
  securityType: WifiSecurityType
  message?: string
}

export type CapabilityAvailability =
  | 'supported'
  | 'unsupported'
  | 'restricted'
  | 'unknown'

export type PermissionState =
  | 'granted'
  | 'denied'
  | 'notDetermined'
  | 'restricted'
  | 'unavailable'

export type WifiPlatform = 'ios' | 'android'

export interface WifiCapabilityStatus {
  // Typed as string in the native struct: a union here generates a C++ enum
  // whose ANDROID member collides with the NDK's built-in `ANDROID` macro.
  platform: string
  scan: CapabilityAvailability
  localNetworkRequest: CapabilityAvailability
  managedConfiguration: CapabilityAvailability
  networkSuggestions: CapabilityAvailability
  userSavedNetworkIntent: CapabilityAvailability
  localOnlyHotspot: CapabilityAvailability
  wifiDirect: CapabilityAvailability
  wifiAware: CapabilityAvailability
  wifiRtt: CapabilityAvailability
  locationPermission: PermissionState
  nearbyWifiPermission: PermissionState
  wifiInformationPermission: PermissionState
}

export interface NetworkLinkProperties {
  interfaceName?: string
  addresses: string[]
  dnsServers: string[]
  routes: string[]
  mtu?: number
}

export type NetworkState = 'available' | 'lost' | 'unavailable'

export interface NetworkDiagnostics {
  timestamp: number
  state: NetworkState
  validated?: boolean
  captivePortal?: boolean
  metered?: boolean
  constrained?: boolean
  currentNetwork?: CurrentNetworkInfo
  linkProperties?: NetworkLinkProperties
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
  interval?: number
}

export type WifiScanCallback = (networks: WifiNetwork[]) => void
export type WifiScanErrorCallback = (message: string) => void
export type NetworkObserverCallback = (diagnostics: NetworkDiagnostics) => void

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
  startScan(
    options: ScanOptions | undefined,
    onNetworks: WifiScanCallback,
    onError?: WifiScanErrorCallback
  ): void

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
   * Connections are temporary by default. Set `joinOnce` explicitly to false
   * to opt in to a saved configuration.
   *
   * @param options - Connection options including SSID and password.
   * @returns Promise resolving after connection succeeds, or rejecting on failure or timeout.
   */
  connectToNetwork(options: ConnectionOptions): Promise<void>

  requestLocalNetwork(
    options: NativeConnectionOptions
  ): Promise<ConnectionOutcome>

  configureNetwork(
    options: NativeConnectionOptions
  ): Promise<ConnectionOutcome>

  requestUserSavedNetwork(
    options?: NativeConnectionOptions
  ): Promise<ConnectionOutcome>

  releaseConnection(leaseOrConfigurationId: string): Promise<ConnectionOutcome>

  addNetworkSuggestion(
    options: NativeNetworkSuggestionOptions
  ): Promise<SuggestionOutcome>

  removeNetworkSuggestion(
    options: NativeNetworkSuggestionOptions
  ): Promise<SuggestionOutcome>

  getNetworkSuggestionStatus(
    options: NativeNetworkSuggestionOptions
  ): Promise<SuggestionOutcome>

  startLocalOnlyHotspot(): Promise<HotspotOutcome>

  stopLocalOnlyHotspot(reservationId: string): Promise<HotspotOutcome>

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

  getWifiCapabilityStatus(): Promise<WifiCapabilityStatus>

  getNetworkDiagnostics(): Promise<NetworkDiagnostics>

  startNetworkObserver(onUpdate: NetworkObserverCallback): void

  stopNetworkObserver(): void

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
