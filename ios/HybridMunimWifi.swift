import CoreLocation
import Foundation
import NetworkExtension
import NitroModules

final class HybridMunimWifi: HybridMunimWifiSpec {
  private var scanResults: [WifiNetwork] = []
  private var locationManager: CLLocationManager?
  private var locationDelegate: LocationPermissionDelegate?

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
    Promise.resolved(withResult: .first(NullType.null))
  }

  func getBSSID(ssid: String) throws -> Promise<Variant_NullType_String> {
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
    Promise.resolved(withResult: .first(NullType.null))
  }

  func getNetworkInfo(ssid: String) throws -> Promise<Variant_NullType_WifiNetwork> {
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
      promise.resolve(withResult: .second(CurrentNetworkInfo(
        ssid: network.ssid,
        bssid: network.bssid,
        ipAddress: self.getIPAddressSync(),
        subnetMask: nil,
        gateway: nil,
        dnsServers: nil
      )))
    }
    return promise
  }

  func connectToNetwork(options: ConnectionOptions) throws -> Promise<Void> {
    guard !options.ssid.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw MunimWifiError.invalidSSID
    }

    let configuration: NEHotspotConfiguration
    if let password = options.password, !password.isEmpty {
      configuration = NEHotspotConfiguration(
        ssid: options.ssid,
        passphrase: password,
        isWEP: options.isWEP ?? false
      )
    } else {
      configuration = NEHotspotConfiguration(ssid: options.ssid)
    }
    configuration.joinOnce = options.joinOnce ?? false

    let promise = Promise<Void>()
    NEHotspotConfigurationManager.shared.apply(configuration) { error in
      if let error = error as NSError? {
        if error.domain == NEHotspotConfigurationErrorDomain,
           error.code == NEHotspotConfigurationError.alreadyAssociated.rawValue {
          promise.resolve()
        } else {
          promise.reject(withError: error)
        }
      } else {
        promise.resolve()
      }
    }
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

  func addListener(eventName: String) throws {}

  func removeListeners(count: Double) throws {}

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
      timestamp: Date().timeIntervalSince1970 * 1_000
    )
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
  case invalidMaxResults
  case invalidTimeout
  case invalidInterval

  var errorDescription: String? {
    switch self {
    case .invalidSSID:
      return "munim-wifi: SSID must not be empty"
    case .invalidMaxResults:
      return "munim-wifi: maxResults must be a positive integer"
    case .invalidTimeout:
      return "munim-wifi: timeout must be between 250 and 30000 milliseconds"
    case .invalidInterval:
      return "munim-wifi: interval must be between 10000 and 600000 milliseconds"
    }
  }
}
