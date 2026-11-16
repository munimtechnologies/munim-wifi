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
  /** IPv4 address of the Wi-Fi interface. */
  ipAddress?: string
  /** IPv6 addresses of the Wi-Fi interface (global first, link-local last). */
  ipv6Addresses?: string[]
  subnetMask?: string
  /** IPv4 prefix length of the Wi-Fi interface (24 for 255.255.255.0). */
  subnetPrefixLength?: number
  gateway?: string
  dnsServers?: string[]
  /**
   * Signal strength of the connection in dBm. Android only; iOS exposes no
   * signal strength for the joined network to ordinary apps.
   */
  rssi?: number
  /** Android: current link speed in Mbps (WifiInfo.getLinkSpeed). */
  linkSpeedMbps?: number
  /** Android 10+: transmit link speed in Mbps. */
  txLinkSpeedMbps?: number
  /** Android 10+: receive link speed in Mbps. */
  rxLinkSpeedMbps?: number
  /** Android 11+: highest transmit link speed the connection supports, in Mbps. */
  maxTxLinkSpeedMbps?: number
  /** Android 11+: highest receive link speed the connection supports, in Mbps. */
  maxRxLinkSpeedMbps?: number
  /** Android: primary channel frequency in MHz. */
  frequency?: number
  /** Android: primary channel number. */
  channel?: number
  /** Android: band of the primary channel in GHz (2.4, 5, 6 or 60). */
  bandGhz?: number
  /** Android 11+: Wi-Fi generation of the connection. */
  wifiStandard?: WifiStandard
  /** Android: whether the network hides its SSID. */
  hiddenSsid?: boolean
  /**
   * Android 13+, Wi-Fi 7 multi-link operation: MAC address of the access
   * point's multi-link device (MLD). Absent for single-link connections.
   */
  apMldMacAddress?: string
  /** Android 13+, Wi-Fi 7: links of this multi-link association. */
  mloLinks?: MloLink[]
}

/**
 * Wi-Fi generation. legacy = 802.11a/b/g, wifi4 = 802.11n, wifi5 = 802.11ac,
 * wifi6 = 802.11ax (including 6 GHz Wi-Fi 6E), wifi7 = 802.11be,
 * wigig = 802.11ad (60 GHz).
 */
export type WifiStandard =
  | 'legacy'
  | 'wifi4'
  | 'wifi5'
  | 'wifi6'
  | 'wifi7'
  | 'wigig'
  | 'unknown'

/** State of one Wi-Fi 7 link (Android MloLink.MLO_LINK_STATE_*). */
export type MloLinkState = 'invalid' | 'unassociated' | 'idle' | 'active'

/** One link of a Wi-Fi 7 (802.11be) multi-link access point or association. */
export interface MloLink {
  linkId: number
  /** Band in GHz (2.4, 5, 6 or 60); absent when the platform reports none. */
  bandGhz?: number
  channel?: number
  /** BSSID of the access point on this link. */
  apMacAddress?: string
  /** Associated links only (CurrentNetworkInfo.mloLinks). */
  state?: MloLinkState
  rssi?: number
  txLinkSpeedMbps?: number
  rxLinkSpeedMbps?: number
}

/** Addresses assigned to the Wi-Fi interface. */
export interface IPAddressInfo {
  interfaceName?: string
  ipv4: string[]
  /**
   * Global and unique-local addresses first; link-local (fe80::/10) last,
   * with their `%interface` scope suffix.
   */
  ipv6: string[]
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
  /**
   * Wall-clock time (ms since epoch) at which the radio last observed this
   * network. On Android this comes from ScanResult.timestamp, so cached results
   * carry their real age; on iOS it is the time of the current-network read.
   */
  timestamp?: number
  /** Android: band in GHz (2.4, 5, 6 or 60). */
  bandGhz?: number
  /** Android: channel bandwidth in MHz (20, 40, 80, 160 or 320; 80+80 reports 160). */
  channelWidthMhz?: number
  /** Android: center frequency of the whole channel in MHz (40 MHz and wider). */
  centerFrequency0?: number
  /** Android: center frequency of the second segment of an 80+80 MHz channel. */
  centerFrequency1?: number
  /** Android 11+: newest Wi-Fi generation the access point advertises. */
  wifiStandard?: WifiStandard
  /**
   * Android: the access point answers IEEE 802.11mc fine timing measurements,
   * so rangeToAccessPoints() can measure its distance with two-sided RTT.
   */
  rttResponder?: boolean
  /** Android 15+: the access point supports IEEE 802.11az non-trigger-based ranging. */
  rttNtbResponder?: boolean
  /** Android 13+, Wi-Fi 7: MAC address of the access point's multi-link device. */
  apMldMacAddress?: string
  /** Android 13+, Wi-Fi 7: the links the access point's MLD offers. */
  mloLinks?: MloLink[]
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

/** EAP method for WPA2/WPA3-Enterprise and Passpoint networks. */
export type EapMethod =
  | 'peap'
  | 'ttls'
  | 'tls'
  | 'fast'
  | 'pwd'
  | 'sim'
  | 'aka'
  | 'akaPrime'

/** Inner (phase 2) authentication for PEAP/TTLS. */
export type EapPhase2Method =
  | 'none'
  | 'pap'
  | 'chap'
  | 'mschap'
  | 'mschapv2'
  | 'gtc'
  | 'eap'

/**
 * WPA2/WPA3-Enterprise (802.1X) credentials.
 *
 * iOS (NEHotspotEAPSettings) supports peap, ttls, tls and fast. Android
 * (WifiEnterpriseConfig) supports peap, ttls, tls, pwd, sim, aka and akaPrime.
 */
export interface EnterpriseCredentials {
  method: EapMethod
  /** Inner authentication. iOS: TTLS only (pap/chap/mschap/mschapv2/eap). */
  phase2?: EapPhase2Method
  identity?: string
  /** Outer identity sent in the clear (for example "anonymous@example.com"). */
  anonymousIdentity?: string
  password?: string
  /**
   * Domain the authentication server's certificate must match. Android:
   * domainSuffixMatch; iOS: added to trustedServerNames.
   */
  serverDomain?: string
  /** iOS: additional trusted server certificate common names. */
  trustedServerNames?: string[]
  /** CA certificates (base64 DER, or PEM) used to validate the server. */
  caCertificates?: string[]
  /** Base64 PKCS#12 client identity, required for EAP-TLS. */
  clientCertificate?: string
  clientCertificatePassword?: string
  /** Android: configure WPA3-Enterprise instead of WPA2-Enterprise. */
  wpa3?: boolean
}

/** Hotspot 2.0 (Passpoint) provider settings. */
export interface PasspointConfig {
  /** Home service provider FQDN (for example "example.com"). */
  domainName: string
  /** Android: provider name shown to the user. Defaults to domainName. */
  friendlyName?: string
  /** NAI realm used for the credential. Defaults to domainName. */
  realm?: string
  /** iOS: extra NAI realm names. */
  naiRealmNames?: string[]
  /** Roaming consortium OIs as hex strings (for example "5A03BA0000"). */
  roamingConsortiumOIs?: string[]
  /** MCC/MNC pairs such as "310026" for SIM-based providers. */
  mccAndMncs?: string[]
  /** iOS: allow connecting to roaming partner networks. Defaults to false. */
  roamingEnabled?: boolean
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
  /** For Passpoint this is only an identifier; the domain name selects networks. */
  ssid: string
  securityType: WifiSecurityType
  passphrase?: string
  bssid?: string
  timeout?: number
  bindProcess?: boolean
  /**
   * Treat `ssid` as a prefix and join the first matching network. iOS 13+
   * (open/WEP/WPA personal); Android 10+ for requestLocalNetwork only.
   */
  ssidPrefix?: boolean
  /** Required when securityType is 'enterprise' or 'passpoint'. */
  enterprise?: EnterpriseCredentials
  /** Required when securityType is 'passpoint'. */
  passpoint?: PasspointConfig
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
  enterprise?: EnterpriseCredentials
  passpoint?: PasspointConfig
}

export interface SuggestionOutcome {
  status: SuggestionStatus
  suggestionId?: string
  message?: string
}

export type SuggestionConnectionEventType =
  | 'postConnection'
  | 'connectionFailure'
  | 'error'

export type SuggestionFailureReason =
  | 'unknown'
  | 'association'
  | 'authentication'
  | 'ipProvisioning'

/** Android network-suggestion connection events. */
export interface SuggestionConnectionEvent {
  /**
   * postConnection: the device connected to one of this app's suggestions
   * (delivered only for suggestions with appInteractionRequired and when the
   * app holds precise location). connectionFailure: Android 11+ reports that
   * connecting to a suggestion failed. error: the listener could not be
   * installed (for example missing location permission).
   */
  type: SuggestionConnectionEventType
  ssid?: string
  failureReason?: SuggestionFailureReason
  message?: string
}

export type SuggestionConnectionCallback = (
  event: SuggestionConnectionEvent
) => void

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
  /**
   * Local network access (mDNS/DNS-SD, LAN TCP/UDP).
   *
   * Android: `android.permission.ACCESS_LOCAL_NETWORK`, enforced on Android 17
   * (API 37) for apps targeting API 37+. 'unavailable' when the OS does not
   * gate local network access for this app (older Android, or a lower
   * targetSdk), so nothing needs to be requested.
   * iOS: the Local Network privacy permission. iOS has no query API, so this is
   * the last outcome observed in this launch (requestLocalNetworkPermission(),
   * a Bonjour browse or a LAN probe), or 'notDetermined' before any.
   */
  localNetworkPermission: PermissionState
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

export interface ReachabilityOptions {
  /**
   * Optional URL to fetch (GET, redirects not followed) for an end-to-end
   * check. Only a 2xx response counts as reachable, so captive-portal
   * redirects fail. Use an https endpoint that returns 204, such as
   * https://www.google.com/generate_204 or your own health check.
   */
  probeUrl?: string
  /** Probe timeout in ms (1000-30000, default 5000). */
  timeout?: number
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
  /**
   * scanNetworks() only. When Android refuses to start a fresh scan (foreground
   * apps are throttled to 4 scans every 2 minutes) or the scan fails, resolve
   * with the cached results (true, the default) or reject (false).
   */
  allowCached?: boolean
  /**
   * scanNetworks() only, Android. Resolve with the cached results, without
   * starting a scan, when the newest cached result is at most this many
   * milliseconds old. Saves one of the 4 scans Android allows every 2 minutes.
   * Ignored on iOS.
   */
  maxAge?: number
}

/** Android's Wi-Fi scan throttle as seen by this app. */
export interface ScanThrottleStatus {
  /**
   * Android 11+: whether the system throttles scans (the developer option
   * "Wi-Fi scan throttling"). Absent where the OS does not report it.
   */
  throttleEnabled?: boolean
  /** Scans a foreground app may start per window (4 on Android 9+, 0 on iOS). */
  maxScans: number
  /** Length of the throttle window in milliseconds (120000 on Android 9+). */
  windowMs: number
  /** Scans this app started through munim-wifi inside the current window. */
  scansInWindow: number
  /**
   * Wall-clock ms at which the next scan request should be accepted; now (or
   * earlier) when one would be accepted right away.
   */
  nextScanAllowedAt: number
  /** Age in milliseconds of the newest cached scan result, when there is one. */
  cachedResultsAgeMs?: number
}

export type RttRangingStatus =
  | 'completed'
  | 'unsupported'
  | 'unavailable'
  | 'permissionDenied'
  | 'noTargets'
  | 'failed'

export type RttResultStatus = 'success' | 'failed' | 'responderUnsupported'

export interface RttRangingOptions {
  /**
   * BSSIDs to range to. They must be in the latest scan results. Defaults to
   * every 802.11mc responder in the latest scan, strongest first.
   */
  bssids?: string[]
  /**
   * Android 12+: also range to access points that are not 802.11mc
   * responders, using one-sided RTT (less accurate). Defaults to false.
   */
  includeOneSided?: boolean
  /** Ranging timeout in ms (1000-30000, default 10000). */
  timeout?: number
}

export interface RttRangingResult {
  bssid: string
  status: RttResultStatus
  /** Estimated distance in meters (success only). */
  distanceMeters?: number
  /** Standard deviation of the distance estimate in meters (success only). */
  distanceStdDevMeters?: number
  /** RSSI of the ranging frames in dBm (success only). */
  rssi?: number
  attemptedMeasurements?: number
  successfulMeasurements?: number
  /** True when this was measured with one-sided RTT. */
  oneSided: boolean
  /** Wall-clock time of the measurement (ms since epoch). */
  timestamp: number
}

export interface RttRangingOutcome {
  status: RttRangingStatus
  results: RttRangingResult[]
  message?: string
}

/** Describes one batch of scan results delivered by startScan(). */
export interface ScanResultInfo {
  /** True when these results come from a scan that completed successfully. */
  fresh: boolean
  /**
   * True when Android declined to start a scan (throttling or a busy radio);
   * the batch then holds cached results whose `timestamp`s show their age.
   */
  throttled: boolean
  message?: string
}

/** One TXT record entry; `value` is absent for boolean (key-only) entries. */
export interface ServiceTxtEntry {
  key: string
  value?: string
}

/** A DNS-SD (Bonjour/mDNS) service instance. */
export interface DiscoveredService {
  /** `name.type.domain`; identical for the found and lost events of one instance. */
  id: string
  name: string
  /** Service type without the trailing dot, for example "_http._tcp". */
  type: string
  domain: string
  /** Resolved address (Android: host address; iOS: address the resolver reached). */
  host?: string
  port?: number
  addresses: string[]
  txt: ServiceTxtEntry[]
  interfaceName?: string
  /** False when resolution was disabled, failed or timed out. */
  resolved: boolean
}

export interface ServiceDiscoveryOptions {
  /** Browse domain. Defaults to "local.". */
  domain?: string
  /** Resolve host/port/addresses before reporting a service. Defaults to true. */
  resolve?: boolean
  /** Per-service resolution timeout in ms (1000-30000, default 5000). */
  resolveTimeout?: number
  /**
   * Android 17 (API 37)+: let the user pick the services to share through the
   * system picker (DiscoveryRequest.FLAG_SHOW_PICKER). Picker discovery needs
   * no local network permission; only the services the user selects are
   * reported. Ignored on iOS and older Android versions, which browse as usual.
   */
  showPicker?: boolean
}

/** Wi-Fi radio state (Android WifiManager.WIFI_STATE_*). */
export type WifiRadioState =
  | 'disabled'
  | 'disabling'
  | 'enabled'
  | 'enabling'
  | 'unknown'

export interface WifiStateEvent {
  /** True when the radio is on (Android) or a Wi-Fi path is usable (iOS). */
  enabled: boolean
  state: WifiRadioState
  timestamp: number
}

export type WifiStateCallback = (event: WifiStateEvent) => void

export type ServiceFoundCallback = (service: DiscoveredService) => void
export type ServiceLostCallback = (service: DiscoveredService) => void

export type WifiScanCallback = (
  networks: WifiNetwork[],
  info: ScanResultInfo
) => void
export type WifiScanErrorCallback = (message: string) => void
export type NetworkObserverCallback = (diagnostics: NetworkDiagnostics) => void

export interface MunimWifi
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Android: whether the Wi-Fi radio is enabled (WifiManager.isWifiEnabled).
   * iOS: whether the device currently has a usable Wi-Fi path (joined to a
   * Wi-Fi network). iOS offers no public API for the radio's on/off state, so a
   * device with Wi-Fi on but not joined to any network reports false.
   */
  isWifiEnabled(): Promise<boolean>

  /**
   * Prompt for the runtime permissions Wi-Fi scanning needs.
   * Android 13+: NEARBY_WIFI_DEVICES (plus location when the app declares it).
   * Android 12L and below: precise location.
   * iOS: When-In-Use location (gates the current network's SSID/BSSID).
   *
   * @returns Promise resolving to true when scanning (Android) or current-network
   * access (iOS) is permitted afterwards.
   */
  requestWifiPermission(): Promise<boolean>

  /**
   * Scan for nearby Wi-Fi networks.
   *
   * @param options - Optional scan configuration including max results and timeout.
   * @returns Promise resolving to array of discovered Wi-Fi networks.
   */
  scanNetworks(options: ScanOptions): Promise<WifiNetwork[]>

  /**
   * Start continuous Wi-Fi scanning. Results will be emitted via events.
   *
   * @param options - Optional scan configuration.
   */
  startScan(
    options: ScanOptions,
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

  /**
   * `hasOptions` false means "no network": `options` is then a placeholder
   * and native code opens the generic Wi-Fi panel.
   */
  requestUserSavedNetwork(
    options: NativeConnectionOptions,
    hasOptions: boolean
  ): Promise<ConnectionOutcome>

  releaseConnection(leaseOrConfigurationId: string): Promise<ConnectionOutcome>

  /**
   * Networks this app has configured.
   * iOS: NEHotspotConfigurationManager.getConfiguredSSIDs().
   * Android: SSIDs (or Passpoint domains) of this app's network suggestions.
   */
  getConfiguredSSIDs(): Promise<string[]>

  addNetworkSuggestion(
    options: NativeNetworkSuggestionOptions
  ): Promise<SuggestionOutcome>

  removeNetworkSuggestion(
    options: NativeNetworkSuggestionOptions
  ): Promise<SuggestionOutcome>

  getNetworkSuggestionStatus(
    options: NativeNetworkSuggestionOptions
  ): Promise<SuggestionOutcome>

  /**
   * Android 10+: listen for connections to this app's network suggestions
   * (ACTION_WIFI_NETWORK_SUGGESTION_POST_CONNECTION) and, on Android 11+,
   * connection failures (addSuggestionConnectionStatusListener). Both require
   * ACCESS_FINE_LOCATION.
   *
   * @returns false when unsupported (iOS, Android 9 and below).
   */
  startSuggestionConnectionListener(
    onEvent: SuggestionConnectionCallback
  ): boolean

  stopSuggestionConnectionListener(): void

  startLocalOnlyHotspot(): Promise<HotspotOutcome>

  stopLocalOnlyHotspot(reservationId: string): Promise<HotspotOutcome>

  /**
   * Disconnect from the Wi-Fi network this app connected to.
   *
   * @returns Promise resolving to true when a connection or configuration owned
   * by this app was actually released, false when there was nothing to remove
   * (for example on iOS when the current network was configured by the user).
   */
  disconnect(): Promise<boolean>

  /**
   * Get the IPv4 address of the current Wi-Fi connection.
   *
   * @returns Promise resolving to the IPv4 address, or null if there is none.
   * Use getIPAddresses() for IPv6 (including IPv6-only networks).
   */
  getIPAddress(): Promise<string | null>

  /**
   * Get every IPv4 and IPv6 address of the Wi-Fi interface.
   *
   * @returns Promise resolving to the addresses, or null when no Wi-Fi
   * interface has an address.
   */
  getIPAddresses(): Promise<IPAddressInfo | null>

  getWifiCapabilityStatus(): Promise<WifiCapabilityStatus>

  /**
   * Android: the scan throttle state, so apps can avoid scan requests that
   * would only return cached results. iOS has no scan API and reports
   * maxScans 0.
   */
  getScanThrottleStatus(): Promise<ScanThrottleStatus>

  /**
   * Android 9+ on devices with Wi-Fi RTT (FEATURE_WIFI_RTT): measure the
   * distance to access points with IEEE 802.11mc fine timing measurement.
   * Needs the same permissions as scanning; scan first so the access points
   * are in the scan results. iOS: resolves 'unsupported'.
   */
  rangeToAccessPoints(options: RttRangingOptions): Promise<RttRangingOutcome>

  getNetworkDiagnostics(): Promise<NetworkDiagnostics>

  /**
   * Whether the default network reaches the internet.
   * Android: NET_CAPABILITY_INTERNET + NET_CAPABILITY_VALIDATED (and no captive
   * portal). iOS: NWPath status is satisfied. With `probeUrl`, the result is
   * the outcome of an HTTP request over that network instead.
   */
  isInternetReachable(options: ReachabilityOptions): Promise<boolean>

  startNetworkObserver(onUpdate: NetworkObserverCallback): void

  stopNetworkObserver(): void

  /**
   * Observe the Wi-Fi radio being switched on or off. The current state is
   * delivered first.
   * Android 16+: WifiManager.addWifiStateChangedListener; older versions use
   * the WIFI_STATE_CHANGED_ACTION broadcast.
   * iOS: no radio-state API exists, so this follows whether a Wi-Fi path is
   * usable (NWPathMonitor), the same signal as isWifiEnabled().
   */
  startWifiStateObserver(onChange: WifiStateCallback): void

  stopWifiStateObserver(): void

  // ========== Local network ==========

  /**
   * Browse for DNS-SD services of `type` (for example "_http._tcp") on the
   * local network. Android: NsdManager. iOS: NWBrowser; the type must be
   * listed in NSBonjourServices and NSLocalNetworkUsageDescription set.
   *
   * @returns A discovery ID for stopServiceDiscovery().
   */
  startServiceDiscovery(
    type: string,
    options: ServiceDiscoveryOptions,
    onFound: ServiceFoundCallback,
    onLost: ServiceLostCallback,
    onError?: WifiScanErrorCallback
  ): string

  stopServiceDiscovery(discoveryId: string): void

  /**
   * iOS: trigger (or re-check) the Local Network privacy prompt by publishing
   * and browsing a private Bonjour service ("_munimwifi._tcp", which must be in
   * NSBonjourServices). Resolves 'granted', 'denied', or 'notDetermined' if the
   * user has not answered within `timeoutMs` (default 30000).
   * Android 17+ (apps targeting API 37+): requests the runtime
   * ACCESS_LOCAL_NETWORK permission and resolves 'granted' or 'denied'.
   * Older Android versions need no permission and resolve 'granted'.
   */
  requestLocalNetworkPermission(timeoutMs?: number): Promise<PermissionState>

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
