import CoreLocation
import Foundation
import Network
import NetworkExtension
import NitroModules

private final class WifiConnectionAttempt {
  private let manager = NEHotspotConfigurationManager.shared
  private let onSuccess: () -> Void
  private let onFailure: (Error) -> Void
  private let ssid: String
  private let configuration: NEHotspotConfiguration
  private let isTemporary: Bool
  private let queue = DispatchQueue(label: "com.munimwifi.connection-attempt")
  private var existedBeforeAttempt: Bool?
  private var settled = false
  private var timeoutWorkItem: DispatchWorkItem?

  init(
    ssid: String,
    configuration: NEHotspotConfiguration,
    isTemporary: Bool,
    onSuccess: @escaping () -> Void,
    onFailure: @escaping (Error) -> Void
  ) {
    self.ssid = ssid
    self.configuration = configuration
    self.isTemporary = isTemporary
    self.onSuccess = onSuccess
    self.onFailure = onFailure
  }

  func start(timeout: TimeInterval) {
    let timeoutWorkItem = DispatchWorkItem { [self] in
      guard !settled else { return }
      cleanupNewPersistentConfiguration()
      settle {
        onFailure(MunimWifiError.connectionTimeout(ssid))
      }
    }
    self.timeoutWorkItem = timeoutWorkItem
    queue.asyncAfter(deadline: .now() + timeout, execute: timeoutWorkItem)

    if isTemporary {
      apply()
      return
    }

    manager.getConfiguredSSIDs { [self] configuredSSIDs in
      queue.async {
        guard !self.settled else { return }
        self.existedBeforeAttempt = configuredSSIDs.contains(self.ssid)
        self.apply()
      }
    }
  }

  private func apply() {
    manager.apply(configuration) { [self] error in
      queue.async {
        guard !self.settled else {
          if error == nil {
            self.cleanupNewPersistentConfiguration()
          }
          return
        }

        if let error = error as NSError?,
           !(error.domain == NEHotspotConfigurationErrorDomain &&
             error.code == NEHotspotConfigurationError.alreadyAssociated.rawValue) {
          self.cleanupNewPersistentConfiguration()
          self.settle { self.onFailure(error) }
          return
        }

        self.verifyConnectedSSID(remainingChecks: 10)
      }
    }
  }

  private func verifyConnectedSSID(remainingChecks: Int) {
    NEHotspotNetwork.fetchCurrent { [self] network in
      queue.async {
        guard !self.settled else { return }
        if let network, network.ssid == self.ssid {
          self.settle { self.onSuccess() }
        } else if remainingChecks > 0 {
          self.queue.asyncAfter(deadline: .now() + 0.25) {
            self.verifyConnectedSSID(remainingChecks: remainingChecks - 1)
          }
        } else if let network {
          self.cleanupNewPersistentConfiguration()
          self.settle {
            self.onFailure(
              MunimWifiError.unexpectedNetwork(
                expected: self.ssid,
                actual: network.ssid
              )
            )
          }
        } else {
          // fetchCurrent can be unavailable without the relevant entitlement or
          // location authorization. The successful apply callback is then the
          // strongest result exposed by public APIs.
          self.settle { self.onSuccess() }
        }
      }
    }
  }

  private func cleanupNewPersistentConfiguration() {
    guard !isTemporary, existedBeforeAttempt == false else { return }
    manager.removeConfiguration(forSSID: ssid)
  }

  private func settle(_ action: () -> Void) {
    guard !settled else { return }
    settled = true
    timeoutWorkItem?.cancel()
    timeoutWorkItem = nil
    action()
  }
}

final class HybridMunimWifi: HybridMunimWifiSpec {
  private var scanResults: [WifiNetwork] = []
  private var locationManager: CLLocationManager?
  private var locationDelegate: LocationPermissionDelegate?
  private var pathMonitor: NWPathMonitor?
  private let observerLock = NSLock()
  private let observerQueue = DispatchQueue(label: "com.munimwifi.network-observer")

  func isWifiEnabled() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    fetchCurrentNetwork { network in
      promise.resolve(withResult: network != nil)
    }
    return promise
  }

  func requestWifiPermission() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      let manager = CLLocationManager()
      let delegate = LocationPermissionDelegate(promise: promise)
      self.locationManager = manager
      self.locationDelegate = delegate
      manager.delegate = delegate

      switch manager.authorizationStatus {
      case .authorizedAlways, .authorizedWhenInUse:
        promise.resolve(withResult: true)
        delegate.finish()
      case .denied, .restricted:
        promise.resolve(withResult: false)
        delegate.finish()
      case .notDetermined:
        manager.requestWhenInUseAuthorization()
      @unknown default:
        promise.resolve(withResult: false)
        delegate.finish()
      }
    }
    return promise
  }

  func scanNetworks(options: ScanOptions?) throws -> Promise<[WifiNetwork]> {
    try validate(options: options)
    let promise = Promise<[WifiNetwork]>()
    fetchCurrentNetwork { network in
      let networks = network.map { [self.toWifiNetwork($0)] } ?? []
      self.scanResults = networks
      promise.resolve(withResult: networks)
    }
    return promise
  }

  func startScan(
    options: ScanOptions?,
    onNetworks: @escaping (_ networks: [WifiNetwork]) -> Void,
    onError: ((_ message: String) -> Void)?
  ) throws {
    try validate(options: options)
    fetchCurrentNetwork { network in
      let networks = network.map { [self.toWifiNetwork($0)] } ?? []
      self.scanResults = networks
      onNetworks(networks)
    }
  }

  func stopScan() throws {
    // iOS does not expose general or continuous Wi-Fi scans to ordinary apps.
  }

  func getSSIDs() throws -> Promise<[String]> {
    let promise = Promise<[String]>()
    fetchCurrentNetwork { network in
      promise.resolve(withResult: network.map { [$0.ssid] } ?? [])
    }
    return promise
  }

  func getWifiFingerprint() throws -> Promise<WifiFingerprint> {
    let promise = Promise<WifiFingerprint>()
    fetchCurrentNetwork { network in
      let networks = network.map { [self.toWifiNetwork($0)] } ?? self.scanResults
      promise.resolve(withResult: WifiFingerprint(
        networks: networks,
        timestamp: Date().timeIntervalSince1970 * 1_000,
        location: nil
      ))
    }
    return promise
  }

  func getRSSI(ssid: String) throws -> Promise<Variant_NullType_Double> {
    try validateSSID(ssid)
    return Promise.resolved(withResult: .first(NullType.null))
  }

  func getBSSID(ssid: String) throws -> Promise<Variant_NullType_String> {
    try validateSSID(ssid)
    let promise = Promise<Variant_NullType_String>()
    fetchCurrentNetwork { network in
      if let network, network.ssid == ssid {
        promise.resolve(withResult: .second(network.bssid))
      } else {
        promise.resolve(withResult: .first(NullType.null))
      }
    }
    return promise
  }

  func getChannelInfo(ssid: String) throws -> Promise<Variant_NullType_ChannelInfo> {
    try validateSSID(ssid)
    return Promise.resolved(withResult: .first(NullType.null))
  }

  func getNetworkInfo(ssid: String) throws -> Promise<Variant_NullType_WifiNetwork> {
    try validateSSID(ssid)
    let promise = Promise<Variant_NullType_WifiNetwork>()
    fetchCurrentNetwork { network in
      if let network, network.ssid == ssid {
        promise.resolve(withResult: .second(self.toWifiNetwork(network)))
      } else {
        promise.resolve(withResult: .first(NullType.null))
      }
    }
    return promise
  }

  func getCurrentNetwork() throws -> Promise<Variant_NullType_CurrentNetworkInfo> {
    let promise = Promise<Variant_NullType_CurrentNetworkInfo>()
    fetchCurrentNetwork { network in
      guard let network else {
        promise.resolve(withResult: .first(NullType.null))
        return
      }
      promise.resolve(withResult: .second(self.toCurrentNetworkInfo(network)))
    }
    return promise
  }

  func connectToNetwork(options: ConnectionOptions) throws -> Promise<Void> {
    try validateSSID(options.ssid)
    try validatePassword(options.password)

    let configuration: NEHotspotConfiguration
    if let password = options.password, !password.isEmpty {
      configuration = NEHotspotConfiguration(
        ssid: options.ssid,
        passphrase: password,
        isWEP: options.isWEP ?? (options.security == .wep)
      )
    } else {
      configuration = NEHotspotConfiguration(ssid: options.ssid)
    }
    let isTemporary = options.joinOnce ?? true
    configuration.joinOnce = isTemporary

    let promise = Promise<Void>()
    WifiConnectionAttempt(
      ssid: options.ssid,
      configuration: configuration,
      isTemporary: isTemporary,
      onSuccess: { promise.resolve() },
      onFailure: { error in promise.reject(withError: error) }
    ).start(timeout: try normalizedConnectionTimeout(options.timeout))
    return promise
  }

  func disconnect() throws -> Promise<Void> {
    let promise = Promise<Void>()
    fetchCurrentNetwork { network in
      if let network {
        NEHotspotConfigurationManager.shared.removeConfiguration(forSSID: network.ssid)
      }
      promise.resolve()
    }
    return promise
  }

  func getIPAddress() throws -> Promise<Variant_NullType_String> {
    if let address = getIPAddressSync() {
      return Promise.resolved(withResult: .second(address))
    }
    return Promise.resolved(withResult: .first(NullType.null))
  }

  func requestLocalNetwork(options: NativeConnectionOptions) throws -> Promise<ConnectionOutcome> {
    try validateSSID(options.ssid)
    let promise = Promise<ConnectionOutcome>()
    guard let configuration = makeHotspotConfiguration(
      ssid: options.ssid,
      securityType: options.securityType,
      passphrase: options.passphrase
    ) else {
      promise.resolve(withResult: ConnectionOutcome(
        status: .unsupported,
        mode: .localnetwork,
        ssid: options.ssid,
        leaseId: nil,
        configurationId: nil,
        boundProcess: false,
        message: "munim-wifi: \(options.securityType.stringValue) networks cannot be joined through NEHotspotConfiguration"
      ))
      return promise
    }
    configuration.joinOnce = true
    WifiConnectionAttempt(
      ssid: options.ssid,
      configuration: configuration,
      isTemporary: true,
      onSuccess: {
        promise.resolve(withResult: ConnectionOutcome(
          status: .connected,
          mode: .localnetwork,
          ssid: options.ssid,
          leaseId: options.ssid,
          configurationId: nil,
          boundProcess: false,
          message: nil
        ))
      },
      onFailure: { error in
        promise.resolve(withResult: ConnectionOutcome(
          status: .failed,
          mode: .localnetwork,
          ssid: options.ssid,
          leaseId: nil,
          configurationId: nil,
          boundProcess: false,
          message: error.localizedDescription
        ))
      }
    ).start(timeout: try normalizedConnectionTimeout(options.timeout))
    return promise
  }

  func configureNetwork(options: NativeConnectionOptions) throws -> Promise<ConnectionOutcome> {
    try validateSSID(options.ssid)
    let promise = Promise<ConnectionOutcome>()
    guard let configuration = makeHotspotConfiguration(
      ssid: options.ssid,
      securityType: options.securityType,
      passphrase: options.passphrase
    ) else {
      promise.resolve(withResult: ConnectionOutcome(
        status: .unsupported,
        mode: .managedconfiguration,
        ssid: options.ssid,
        leaseId: nil,
        configurationId: nil,
        boundProcess: false,
        message: "munim-wifi: \(options.securityType.stringValue) networks cannot be configured through NEHotspotConfiguration"
      ))
      return promise
    }
    configuration.joinOnce = false
    NEHotspotConfigurationManager.shared.apply(configuration) { error in
      if let error = error as NSError?,
         !(error.domain == NEHotspotConfigurationErrorDomain &&
           error.code == NEHotspotConfigurationError.alreadyAssociated.rawValue) {
        promise.resolve(withResult: ConnectionOutcome(
          status: .failed,
          mode: .managedconfiguration,
          ssid: options.ssid,
          leaseId: nil,
          configurationId: nil,
          boundProcess: false,
          message: error.localizedDescription
        ))
        return
      }
      promise.resolve(withResult: ConnectionOutcome(
        status: .configured,
        mode: .managedconfiguration,
        ssid: options.ssid,
        leaseId: nil,
        configurationId: options.ssid,
        boundProcess: false,
        message: nil
      ))
    }
    return promise
  }

  func requestUserSavedNetwork(options: NativeConnectionOptions?) throws -> Promise<ConnectionOutcome> {
    Promise.resolved(withResult: ConnectionOutcome(
      status: .unsupported,
      mode: .usersavednetwork,
      ssid: options?.ssid,
      leaseId: nil,
      configurationId: nil,
      boundProcess: false,
      message: "munim-wifi: iOS does not expose a user-facing Wi-Fi picker to apps"
    ))
  }

  func releaseConnection(leaseOrConfigurationId: String) throws -> Promise<ConnectionOutcome> {
    NEHotspotConfigurationManager.shared.removeConfiguration(forSSID: leaseOrConfigurationId)
    return Promise.resolved(withResult: ConnectionOutcome(
      status: .released,
      mode: .managedconfiguration,
      ssid: leaseOrConfigurationId,
      leaseId: nil,
      configurationId: leaseOrConfigurationId,
      boundProcess: false,
      message: nil
    ))
  }

  func addNetworkSuggestion(options: NativeNetworkSuggestionOptions) throws -> Promise<SuggestionOutcome> {
    Promise.resolved(withResult: unsupportedSuggestionOutcome())
  }

  func removeNetworkSuggestion(options: NativeNetworkSuggestionOptions) throws -> Promise<SuggestionOutcome> {
    Promise.resolved(withResult: unsupportedSuggestionOutcome())
  }

  func getNetworkSuggestionStatus(options: NativeNetworkSuggestionOptions) throws -> Promise<SuggestionOutcome> {
    Promise.resolved(withResult: unsupportedSuggestionOutcome())
  }

  func startLocalOnlyHotspot() throws -> Promise<HotspotOutcome> {
    Promise.resolved(withResult: unsupportedHotspotOutcome(reservationId: nil))
  }

  func stopLocalOnlyHotspot(reservationId: String) throws -> Promise<HotspotOutcome> {
    Promise.resolved(withResult: unsupportedHotspotOutcome(reservationId: reservationId))
  }

  func getWifiCapabilityStatus() throws -> Promise<WifiCapabilityStatus> {
    let promise = Promise<WifiCapabilityStatus>()
    DispatchQueue.main.async {
      let locationPermission = self.locationPermissionState()
      promise.resolve(withResult: WifiCapabilityStatus(
        platform: "ios",
        scan: .unsupported,
        localNetworkRequest: .supported,
        managedConfiguration: .supported,
        networkSuggestions: .unsupported,
        userSavedNetworkIntent: .unsupported,
        localOnlyHotspot: .unsupported,
        wifiDirect: .unsupported,
        wifiAware: .unsupported,
        wifiRtt: .unsupported,
        locationPermission: locationPermission,
        nearbyWifiPermission: .unavailable,
        wifiInformationPermission: locationPermission
      ))
    }
    return promise
  }

  func getNetworkDiagnostics() throws -> Promise<NetworkDiagnostics> {
    let promise = Promise<NetworkDiagnostics>()
    let monitor = NWPathMonitor()
    let queue = DispatchQueue(label: "com.munimwifi.diagnostics")
    var delivered = false
    monitor.pathUpdateHandler = { path in
      guard !delivered else { return }
      delivered = true
      monitor.cancel()
      self.fetchCurrentNetwork { network in
        promise.resolve(withResult: self.buildDiagnostics(path: path, network: network))
      }
    }
    monitor.start(queue: queue)
    return promise
  }

  func startNetworkObserver(onUpdate: @escaping (_ diagnostics: NetworkDiagnostics) -> Void) throws {
    observerLock.lock()
    defer { observerLock.unlock() }
    pathMonitor?.cancel()
    let monitor = NWPathMonitor()
    monitor.pathUpdateHandler = { [weak self] path in
      guard let self else { return }
      self.fetchCurrentNetwork { network in
        onUpdate(self.buildDiagnostics(path: path, network: network))
      }
    }
    pathMonitor = monitor
    monitor.start(queue: observerQueue)
  }

  func stopNetworkObserver() throws {
    observerLock.lock()
    defer { observerLock.unlock() }
    pathMonitor?.cancel()
    pathMonitor = nil
  }

  func addListener(eventName: String) throws {}

  func removeListeners(count: Double) throws {}

  private func makeHotspotConfiguration(
    ssid: String,
    securityType: WifiSecurityType,
    passphrase: String?
  ) -> NEHotspotConfiguration? {
    switch securityType {
    case .open, .owe:
      return NEHotspotConfiguration(ssid: ssid)
    case .wep:
      guard let passphrase, !passphrase.isEmpty else { return nil }
      return NEHotspotConfiguration(ssid: ssid, passphrase: passphrase, isWEP: true)
    case .wpa2, .wpa3:
      // iOS applies WPA2 and WPA3 Personal through the same passphrase API.
      guard let passphrase, !passphrase.isEmpty else { return nil }
      return NEHotspotConfiguration(ssid: ssid, passphrase: passphrase, isWEP: false)
    case .enterprise, .passpoint, .unknown:
      return nil
    }
  }

  private func unsupportedSuggestionOutcome() -> SuggestionOutcome {
    SuggestionOutcome(
      status: .unsupported,
      suggestionId: nil,
      message: "munim-wifi: iOS has no network-suggestion API; NEHotspotConfiguration (configureNetwork) is the closest analog"
    )
  }

  private func unsupportedHotspotOutcome(reservationId: String?) -> HotspotOutcome {
    HotspotOutcome(
      status: .unsupported,
      reservationId: reservationId,
      ssid: nil,
      passphrase: nil,
      securityType: .unknown,
      message: "munim-wifi: iOS does not expose a local-only hotspot API to apps"
    )
  }

  private func locationPermissionState() -> PermissionState {
    switch CLLocationManager().authorizationStatus {
    case .authorizedAlways, .authorizedWhenInUse:
      return .granted
    case .denied:
      return .denied
    case .restricted:
      return .restricted
    case .notDetermined:
      return .notdetermined
    @unknown default:
      return .notdetermined
    }
  }

  private func buildDiagnostics(path: Network.NWPath, network: NEHotspotNetwork?) -> NetworkDiagnostics {
    let state: NetworkState = path.status == .satisfied ? .available : .unavailable
    let interfaceName = path.availableInterfaces.first { path.usesInterfaceType($0.type) }?.name
      ?? path.availableInterfaces.first?.name
    let addresses = getIPAddressSync().map { [$0] } ?? []
    let linkProperties = interfaceName == nil && addresses.isEmpty ? nil : NetworkLinkProperties(
      interfaceName: interfaceName,
      addresses: addresses,
      dnsServers: [],
      routes: [],
      mtu: nil
    )
    return NetworkDiagnostics(
      timestamp: Date().timeIntervalSince1970 * 1_000,
      state: state,
      validated: nil,
      captivePortal: nil,
      metered: path.isExpensive,
      constrained: path.isConstrained,
      currentNetwork: network.map(toCurrentNetworkInfo),
      linkProperties: linkProperties
    )
  }

  private func fetchCurrentNetwork(_ completion: @escaping (NEHotspotNetwork?) -> Void) {
    NEHotspotNetwork.fetchCurrent(completionHandler: completion)
  }

  private func toWifiNetwork(_ network: NEHotspotNetwork) -> WifiNetwork {
    WifiNetwork(
      ssid: network.ssid,
      bssid: network.bssid,
      rssi: nil,
      frequency: nil,
      channel: nil,
      capabilities: nil,
      isSecure: network.isSecure,
      securityType: securityType(of: network),
      timestamp: Date().timeIntervalSince1970 * 1_000
    )
  }

  private func toCurrentNetworkInfo(_ network: NEHotspotNetwork) -> CurrentNetworkInfo {
    CurrentNetworkInfo(
      ssid: network.ssid,
      bssid: network.bssid,
      securityType: securityType(of: network),
      ipAddress: getIPAddressSync(),
      subnetMask: nil,
      gateway: nil,
      dnsServers: nil
    )
  }

  private func securityType(of network: NEHotspotNetwork) -> WifiSecurityType {
    if #available(iOS 15.0, *) {
      switch network.securityType {
      case .open:
        return .open
      case .WEP:
        return .wep
      case .personal:
        // WPA/WPA2/WPA3 Personal are indistinguishable through this API.
        return .wpa2
      case .enterprise:
        return .enterprise
      case .unknown:
        return .unknown
      @unknown default:
        return .unknown
      }
    }
    return network.isSecure ? .unknown : .open
  }

  private func validate(options: ScanOptions?) throws {
    if let maxResults = options?.maxResults,
       (!maxResults.isFinite || maxResults <= 0 || maxResults.rounded(.towardZero) != maxResults) {
      throw MunimWifiError.invalidMaxResults
    }
    if let timeout = options?.timeout,
       (!timeout.isFinite || timeout < 250 || timeout > 30_000) {
      throw MunimWifiError.invalidTimeout
    }
    if let interval = options?.interval,
       (!interval.isFinite || interval < 10_000 || interval > 600_000) {
      throw MunimWifiError.invalidInterval
    }
  }

  private func validateSSID(_ ssid: String) throws {
    guard
      !ssid.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
      !ssid.contains("\0"),
      ssid.utf8.count <= 32
    else {
      throw MunimWifiError.invalidSSID
    }
  }

  private func validatePassword(_ password: String?) throws {
    guard let password else { return }
    guard !password.isEmpty, !password.contains("\0"), password.utf8.count <= 64 else {
      throw MunimWifiError.invalidPassword
    }
  }

  private func normalizedConnectionTimeout(_ value: Double?) throws -> TimeInterval {
    let timeout = value ?? 30_000
    guard
      timeout.isFinite,
      timeout.rounded(.towardZero) == timeout,
      timeout >= 5_000,
      timeout <= 120_000
    else {
      throw MunimWifiError.invalidConnectionTimeout
    }
    return timeout / 1_000
  }

  private func getIPAddressSync() -> String? {
    var interfaceAddresses: UnsafeMutablePointer<ifaddrs>?
    guard getifaddrs(&interfaceAddresses) == 0, let first = interfaceAddresses else {
      return nil
    }
    defer { freeifaddrs(interfaceAddresses) }

    var pointer: UnsafeMutablePointer<ifaddrs>? = first
    while let current = pointer {
      defer { pointer = current.pointee.ifa_next }
      guard let socketAddress = current.pointee.ifa_addr else { continue }
      guard socketAddress.pointee.sa_family == UInt8(AF_INET) else { continue }
      let interfaceName = String(cString: current.pointee.ifa_name)
      guard interfaceName == "en0" || interfaceName == "en1" else { continue }

      var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
      let result = getnameinfo(
        socketAddress,
        socklen_t(socketAddress.pointee.sa_len),
        &hostname,
        socklen_t(hostname.count),
        nil,
        0,
        NI_NUMERICHOST
      )
      if result == 0 { return String(cString: hostname) }
    }
    return nil
  }
}

private final class LocationPermissionDelegate: NSObject, CLLocationManagerDelegate {
  private var promise: Promise<Bool>?

  init(promise: Promise<Bool>) {
    self.promise = promise
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    switch manager.authorizationStatus {
    case .authorizedAlways, .authorizedWhenInUse:
      promise?.resolve(withResult: true)
      finish()
    case .denied, .restricted:
      promise?.resolve(withResult: false)
      finish()
    case .notDetermined:
      break
    @unknown default:
      promise?.resolve(withResult: false)
      finish()
    }
  }

  func finish() {
    promise = nil
  }
}

private enum MunimWifiError: LocalizedError {
  case invalidSSID
  case invalidPassword
  case invalidMaxResults
  case invalidTimeout
  case invalidInterval
  case invalidConnectionTimeout
  case connectionTimeout(String)
  case unexpectedNetwork(expected: String, actual: String)

  var errorDescription: String? {
    switch self {
    case .invalidSSID:
      return "munim-wifi: SSID must be non-empty, contain no nulls, and fit within 32 UTF-8 bytes"
    case .invalidPassword:
      return "munim-wifi: password must be non-empty, contain no nulls, and fit within 64 UTF-8 bytes"
    case .invalidMaxResults:
      return "munim-wifi: maxResults must be a positive integer"
    case .invalidTimeout:
      return "munim-wifi: timeout must be between 250 and 30000 milliseconds"
    case .invalidInterval:
      return "munim-wifi: interval must be between 10000 and 600000 milliseconds"
    case .invalidConnectionTimeout:
      return "munim-wifi: connection timeout must be an integer from 5000 through 120000 milliseconds"
    case .connectionTimeout(let ssid):
      return "munim-wifi: connection to \(ssid) timed out"
    case .unexpectedNetwork(let expected, let actual):
      return "munim-wifi: connected to \(actual) instead of requested network \(expected)"
    }
  }
}
