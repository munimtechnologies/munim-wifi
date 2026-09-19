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
  /// Decides whether the joined network is the requested one; nil skips the
  /// check (Passpoint selects networks by provider, not by SSID).
  private let matchesNetwork: ((String) -> Bool)?
  private let removeConfiguration: () -> Void
  private let queue = DispatchQueue(label: "com.munimwifi.connection-attempt")
  private var existedBeforeAttempt: Bool?
  private var settled = false
  private var timeoutWorkItem: DispatchWorkItem?

  init(
    ssid: String,
    configuration: NEHotspotConfiguration,
    isTemporary: Bool,
    matchesNetwork: ((String) -> Bool)? = nil,
    removeConfiguration: (() -> Void)? = nil,
    onSuccess: @escaping () -> Void,
    onFailure: @escaping (Error) -> Void
  ) {
    self.ssid = ssid
    self.configuration = configuration
    self.isTemporary = isTemporary
    self.matchesNetwork = matchesNetwork ?? { $0 == ssid }
    self.removeConfiguration = removeConfiguration ?? {
      NEHotspotConfigurationManager.shared.removeConfiguration(forSSID: ssid)
    }
    self.onSuccess = onSuccess
    self.onFailure = onFailure
  }

  /// For configurations that must not be SSID-verified (Passpoint).
  static func unverified(
    identifier: String,
    configuration: NEHotspotConfiguration,
    isTemporary: Bool,
    removeConfiguration: @escaping () -> Void,
    onSuccess: @escaping () -> Void,
    onFailure: @escaping (Error) -> Void
  ) -> WifiConnectionAttempt {
    let attempt = WifiConnectionAttempt(
      ssid: identifier,
      configuration: configuration,
      isTemporary: isTemporary,
      matchesNetwork: { _ in true },
      removeConfiguration: removeConfiguration,
      onSuccess: onSuccess,
      onFailure: onFailure
    )
    attempt.skipVerification = true
    return attempt
  }

  private var skipVerification = false

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

        if self.skipVerification {
          self.settle { self.onSuccess() }
        } else {
          self.verifyConnectedSSID(remainingChecks: 10)
        }
      }
    }
  }

  private func verifyConnectedSSID(remainingChecks: Int) {
    NEHotspotNetwork.fetchCurrent { [self] network in
      queue.async {
        guard !self.settled else { return }
        if let network, self.matchesNetwork?(network.ssid) ?? true {
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
    removeConfiguration()
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
  private let stateLock = NSLock()
  /// SSID this app last joined, used by disconnect() when fetchCurrent is unavailable.
  private var _lastJoinedSSID: String?

  private var lastJoinedSSID: String? {
    get { stateLock.lock(); defer { stateLock.unlock() }; return _lastJoinedSSID }
    set { stateLock.lock(); _lastJoinedSSID = newValue; stateLock.unlock() }
  }

  /// iOS has no public API for the Wi-Fi radio state. The most truthful signal
  /// is whether a Wi-Fi interface currently offers a usable path, which does
  /// not depend on location authorization the way NEHotspotNetwork does.
  func isWifiEnabled() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    Self.snapshotPath(requiredInterfaceType: .wifi) { path in
      promise.resolve(withResult: path?.status == .satisfied)
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
    onNetworks: @escaping (_ networks: [WifiNetwork], _ info: ScanResultInfo) -> Void,
    onError: ((_ message: String) -> Void)?
  ) throws {
    try validate(options: options)
    fetchCurrentNetwork { network in
      let networks = network.map { [self.toWifiNetwork($0)] } ?? []
      self.scanResults = networks
      // iOS has no scan API: this is a live read of the current network only.
      onNetworks(networks, ScanResultInfo(fresh: true, throttled: false, message: nil))
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
      onSuccess: { [weak self] in
        self?.lastJoinedSSID = options.ssid
        promise.resolve()
      },
      onFailure: { error in promise.reject(withError: error) }
    ).start(timeout: try normalizedConnectionTimeout(options.timeout))
    return promise
  }

  func disconnect() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    let manager = NEHotspotConfigurationManager.shared
    manager.getConfiguredSSIDs { [weak self] configuredSSIDs in
      guard let self else {
        promise.resolve(withResult: false)
        return
      }
      self.fetchCurrentNetwork { network in
        let lastJoined = self.lastJoinedSSID
        // Without location/entitlement access fetchCurrent returns nil; fall
        // back to the network this app itself joined.
        let candidate = network?.ssid ?? lastJoined
        guard
          let ssid = candidate,
          configuredSSIDs.contains(ssid) || ssid == lastJoined
        else {
          // The current network was configured by the user or another app;
          // iOS gives apps no way to leave it.
          promise.resolve(withResult: false)
          return
        }
        manager.removeConfiguration(forSSID: ssid)
        if ssid == lastJoined { self.lastJoinedSSID = nil }
        promise.resolve(withResult: true)
      }
    }
    return promise
  }

  func getIPAddress() throws -> Promise<Variant_NullType_String> {
    if let address = getIPAddressSync() {
      return Promise.resolved(withResult: .second(address))
    }
    return Promise.resolved(withResult: .first(NullType.null))
  }

  func getIPAddresses() throws -> Promise<Variant_NullType_IPAddressInfo> {
    let info = wifiInterfaceAddresses()
    if info.ipv4.isEmpty && info.ipv6.isEmpty {
      return Promise.resolved(withResult: .first(NullType.null))
    }
    return Promise.resolved(withResult: .second(info))
  }

  func requestLocalNetwork(options: NativeConnectionOptions) throws -> Promise<ConnectionOutcome> {
    try validateIdentifier(options)
    let promise = Promise<ConnectionOutcome>()
    let configuration: NEHotspotConfiguration
    do {
      guard let made = try makeHotspotConfiguration(options) else {
        promise.resolve(withResult: outcome(
          .unsupported,
          .localnetwork,
          options: options,
          message: "munim-wifi: \(options.securityType.stringValue) networks cannot be joined through NEHotspotConfiguration"
        ))
        return promise
      }
      configuration = made
    } catch {
      promise.resolve(withResult: outcome(.failed, .localnetwork, options: options, message: error.localizedDescription))
      return promise
    }
    configuration.joinOnce = true
    let identifier = configurationIdentifier(options)
    makeAttempt(
      options: options,
      configuration: configuration,
      isTemporary: true,
      onSuccess: { [weak self] in
        if options.securityType != .passpoint { self?.lastJoinedSSID = options.ssid }
        promise.resolve(withResult: ConnectionOutcome(
          status: .connected,
          mode: .localnetwork,
          ssid: options.ssid,
          leaseId: identifier,
          configurationId: nil,
          boundProcess: false,
          message: nil
        ))
      },
      onFailure: { error in
        promise.resolve(withResult: self.outcome(
          .failed,
          .localnetwork,
          options: options,
          message: error.localizedDescription
        ))
      }
    ).start(timeout: try normalizedConnectionTimeout(options.timeout))
    return promise
  }

  func configureNetwork(options: NativeConnectionOptions) throws -> Promise<ConnectionOutcome> {
    try validateIdentifier(options)
    let promise = Promise<ConnectionOutcome>()
    let configuration: NEHotspotConfiguration
    do {
      guard let made = try makeHotspotConfiguration(options) else {
        promise.resolve(withResult: outcome(
          .unsupported,
          .managedconfiguration,
          options: options,
          message: "munim-wifi: \(options.securityType.stringValue) networks cannot be configured through NEHotspotConfiguration"
        ))
        return promise
      }
      configuration = made
    } catch {
      promise.resolve(withResult: outcome(.failed, .managedconfiguration, options: options, message: error.localizedDescription))
      return promise
    }
    configuration.joinOnce = false
    let identifier = configurationIdentifier(options)
    NEHotspotConfigurationManager.shared.apply(configuration) { [weak self] error in
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
      if options.securityType != .passpoint { self?.lastJoinedSSID = options.ssid }
      promise.resolve(withResult: ConnectionOutcome(
        status: .configured,
        mode: .managedconfiguration,
        ssid: options.ssid,
        leaseId: nil,
        configurationId: identifier,
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
    // The identifier is an SSID, or a Passpoint domain name for HS20 configurations.
    NEHotspotConfigurationManager.shared.removeConfiguration(forSSID: leaseOrConfigurationId)
    NEHotspotConfigurationManager.shared.removeConfiguration(forHS20DomainName: leaseOrConfigurationId)
    if lastJoinedSSID == leaseOrConfigurationId { lastJoinedSSID = nil }
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
    Self.snapshotPath { [weak self] path in
      guard let self else {
        promise.reject(withError: MunimWifiError.released)
        return
      }
      self.fetchCurrentNetwork { network in
        if let path {
          promise.resolve(withResult: self.buildDiagnostics(path: path, network: network))
        } else {
          promise.resolve(withResult: NetworkDiagnostics(
            timestamp: Date().timeIntervalSince1970 * 1_000,
            state: .unavailable,
            validated: nil,
            captivePortal: nil,
            metered: nil,
            constrained: nil,
            currentNetwork: network.map(self.toCurrentNetworkInfo),
            linkProperties: nil
          ))
        }
      }
    }
    return promise
  }

  /// Delivers the first path an NWPathMonitor reports (or nil after `timeout`)
  /// exactly once, then tears the monitor down. The handler captures the
  /// monitor weakly, and the claim flag is lock-protected, so neither the
  /// monitor nor the completion can leak or fire twice.
  static func snapshotPath(
    requiredInterfaceType: NWInterface.InterfaceType? = nil,
    timeout: TimeInterval = 3,
    completion: @escaping (Network.NWPath?) -> Void
  ) {
    let monitor = requiredInterfaceType.map { NWPathMonitor(requiredInterfaceType: $0) } ?? NWPathMonitor()
    let queue = DispatchQueue(label: "com.munimwifi.path-snapshot")
    let once = OnceFlag()
    monitor.pathUpdateHandler = { [weak monitor] path in
      guard once.claim() else { return }
      monitor?.pathUpdateHandler = nil
      monitor?.cancel()
      completion(path)
    }
    monitor.start(queue: queue)
    // Holds the monitor strongly only until the deadline.
    queue.asyncAfter(deadline: .now() + timeout) {
      guard once.claim() else { return }
      monitor.pathUpdateHandler = nil
      monitor.cancel()
      completion(nil)
    }
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

  private func makeHotspotConfiguration(_ options: NativeConnectionOptions) throws -> NEHotspotConfiguration? {
    let ssid = options.ssid
    let passphrase = options.passphrase
    switch options.securityType {
    case .open, .owe:
      return NEHotspotConfiguration(ssid: ssid)
    case .wep:
      guard let passphrase, !passphrase.isEmpty else { return nil }
      return NEHotspotConfiguration(ssid: ssid, passphrase: passphrase, isWEP: true)
    case .wpa2, .wpa3:
      // iOS applies WPA2 and WPA3 Personal through the same passphrase API.
      guard let passphrase, !passphrase.isEmpty else { return nil }
      return NEHotspotConfiguration(ssid: ssid, passphrase: passphrase, isWEP: false)
    case .enterprise:
      guard let enterprise = options.enterprise else { return nil }
      return NEHotspotConfiguration(
        ssid: ssid,
        eapSettings: try EnterpriseCredentialStore.makeEAPSettings(enterprise)
      )
    case .passpoint:
      guard let enterprise = options.enterprise, let passpoint = options.passpoint else { return nil }
      return NEHotspotConfiguration(
        hs20Settings: EnterpriseCredentialStore.makeHS20Settings(passpoint),
        eapSettings: try EnterpriseCredentialStore.makeEAPSettings(enterprise)
      )
    case .unknown:
      return nil
    }
  }

  /// SSID for ordinary networks, provider domain for Passpoint.
  private func configurationIdentifier(_ options: NativeConnectionOptions) -> String {
    if options.securityType == .passpoint, let domain = options.passpoint?.domainName {
      return domain
    }
    return options.ssid
  }

  private func makeAttempt(
    options: NativeConnectionOptions,
    configuration: NEHotspotConfiguration,
    isTemporary: Bool,
    onSuccess: @escaping () -> Void,
    onFailure: @escaping (Error) -> Void
  ) -> WifiConnectionAttempt {
    if options.securityType == .passpoint, let domain = options.passpoint?.domainName {
      return WifiConnectionAttempt.unverified(
        identifier: domain,
        configuration: configuration,
        isTemporary: isTemporary,
        removeConfiguration: {
          NEHotspotConfigurationManager.shared.removeConfiguration(forHS20DomainName: domain)
        },
        onSuccess: onSuccess,
        onFailure: onFailure
      )
    }
    return WifiConnectionAttempt(
      ssid: options.ssid,
      configuration: configuration,
      isTemporary: isTemporary,
      onSuccess: onSuccess,
      onFailure: onFailure
    )
  }

  private func outcome(
    _ status: ConnectionStatus,
    _ mode: ConnectionMode,
    options: NativeConnectionOptions,
    message: String?
  ) -> ConnectionOutcome {
    ConnectionOutcome(
      status: status,
      mode: mode,
      ssid: options.ssid,
      leaseId: nil,
      configurationId: nil,
      boundProcess: false,
      message: message
    )
  }

  /// Passpoint identifiers are free-form; everything else must be a valid SSID.
  private func validateIdentifier(_ options: NativeConnectionOptions) throws {
    if options.securityType == .passpoint {
      guard
        !options.ssid.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
        !options.ssid.contains("\0")
      else {
        throw MunimWifiError.invalidSSID
      }
      return
    }
    try validateSSID(options.ssid)
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
      ipv6Addresses: wifiInterfaceAddresses().ipv6,
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
    wifiInterfaceAddresses().ipv4.first
  }

  /// Wi-Fi is en0 on iPhone and iPad (en1 on some Mac Catalyst hosts). Only
  /// interfaces that are up and running are considered.
  private func wifiInterfaceAddresses() -> IPAddressInfo {
    var ipv4: [String] = []
    var ipv6: [(address: String, rank: Int)] = []
    var interfaceName: String?

    var interfaceAddresses: UnsafeMutablePointer<ifaddrs>?
    guard getifaddrs(&interfaceAddresses) == 0, let first = interfaceAddresses else {
      return IPAddressInfo(interfaceName: nil, ipv4: [], ipv6: [])
    }
    defer { freeifaddrs(interfaceAddresses) }

    var pointer: UnsafeMutablePointer<ifaddrs>? = first
    while let current = pointer {
      defer { pointer = current.pointee.ifa_next }
      guard let socketAddress = current.pointee.ifa_addr else { continue }
      let family = socketAddress.pointee.sa_family
      guard family == UInt8(AF_INET) || family == UInt8(AF_INET6) else { continue }
      let flags = Int32(current.pointee.ifa_flags)
      guard flags & IFF_UP != 0, flags & IFF_RUNNING != 0 else { continue }
      let name = String(cString: current.pointee.ifa_name)
      guard name == "en0" || name == "en1" else { continue }
      // Stick to the first Wi-Fi interface that has addresses.
      if let interfaceName, interfaceName != name { continue }

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
      guard result == 0 else { continue }
      let address = String(cString: hostname)
      interfaceName = name
      if family == UInt8(AF_INET) {
        ipv4.append(address)
      } else {
        ipv6.append((address, Self.ipv6Rank(address)))
      }
    }

    return IPAddressInfo(
      interfaceName: interfaceName,
      ipv4: ipv4,
      ipv6: ipv6.enumerated()
        .sorted { ($0.element.rank, $0.offset) < ($1.element.rank, $1.offset) }
        .map { $0.element.address }
    )
  }

  /// 0 = global, 1 = unique local (fc00::/7), 2 = link-local (fe80::/10).
  private static func ipv6Rank(_ address: String) -> Int {
    let lower = address.lowercased()
    if lower.hasPrefix("fe8") || lower.hasPrefix("fe9") || lower.hasPrefix("fea") || lower.hasPrefix("feb") {
      return 2
    }
    if lower.hasPrefix("fc") || lower.hasPrefix("fd") { return 1 }
    return 0
  }
}

final class OnceFlag {
  private let lock = NSLock()
  private var claimed = false

  /// Returns true for the first caller only.
  func claim() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    if claimed { return false }
    claimed = true
    return true
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
  case released

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
    case .released:
      return "munim-wifi: the module was released before the operation finished"
    }
  }
}
