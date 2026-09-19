import Foundation
import Network
import dnssd
import NitroModules
#if canImport(UIKit)
import UIKit
#endif

/// One NWBrowser browse. TXT records come from the browse metadata; host and
/// port are resolved by opening an NWConnection to the service endpoint and
/// reading the remote endpoint once it is ready (the connection is cancelled
/// straight away). All state lives on `queue`.
final class BonjourDiscoverySession {
  let id: String
  private let type: String
  private let domain: String
  private let resolve: Bool
  private let resolveTimeout: TimeInterval
  private let onFound: (DiscoveredService) -> Void
  private let onLost: (DiscoveredService) -> Void
  private let onError: ((String) -> Void)?
  private let queue = DispatchQueue(label: "com.munimwifi.bonjour")
  private let browser: NWBrowser
  private var resolvers: [String: NWConnection] = [:]
  private var stopped = false

  init(
    id: String,
    type: String,
    domain: String,
    resolve: Bool,
    resolveTimeout: TimeInterval,
    onFound: @escaping (DiscoveredService) -> Void,
    onLost: @escaping (DiscoveredService) -> Void,
    onError: ((String) -> Void)?
  ) {
    self.id = id
    self.type = type
    self.domain = domain
    self.resolve = resolve
    self.resolveTimeout = resolveTimeout
    self.onFound = onFound
    self.onLost = onLost
    self.onError = onError
    let parameters = NWParameters()
    parameters.includePeerToPeer = false
    browser = NWBrowser(
      for: .bonjourWithTXTRecord(type: type, domain: domain),
      using: parameters
    )
  }

  func start() {
    browser.stateUpdateHandler = { [weak self] state in
      guard let self, !self.stopped else { return }
      switch state {
      case .failed(let error):
        self.onError?("munim-wifi: service discovery for \(self.type) failed: \(Self.describe(error))")
      case .waiting(let error):
        self.onError?("munim-wifi: service discovery for \(self.type) is waiting: \(Self.describe(error))")
      default:
        break
      }
    }
    browser.browseResultsChangedHandler = { [weak self] _, changes in
      guard let self, !self.stopped else { return }
      for change in changes {
        switch change {
        case .added(let result):
          self.handleFound(result)
        case .changed(old: _, new: let result, flags: _):
          self.handleFound(result)
        case .removed(let result):
          self.handleLost(result)
        case .identical:
          break
        @unknown default:
          break
        }
      }
    }
    browser.start(queue: queue)
  }

  func stop() {
    queue.async {
      guard !self.stopped else { return }
      self.stopped = true
      self.browser.stateUpdateHandler = nil
      self.browser.browseResultsChangedHandler = nil
      self.browser.cancel()
      self.resolvers.values.forEach { $0.cancel() }
      self.resolvers.removeAll()
    }
  }

  private func baseService(_ result: NWBrowser.Result) -> DiscoveredService? {
    guard case let .service(name, serviceType, serviceDomain, interface) = result.endpoint else {
      return nil
    }
    var txt: [ServiceTxtEntry] = []
    if case let .bonjour(record) = result.metadata {
      txt = record.dictionary
        .sorted { $0.key < $1.key }
        .map { ServiceTxtEntry(key: $0.key, value: $0.value.isEmpty ? nil : $0.value) }
    }
    let normalizedType = serviceType.hasSuffix(".") ? String(serviceType.dropLast()) : serviceType
    let normalizedDomain = serviceDomain.isEmpty ? domain : serviceDomain
    return DiscoveredService(
      id: "\(name).\(normalizedType).\(normalizedDomain)",
      name: name,
      type: normalizedType,
      domain: normalizedDomain,
      host: nil,
      port: nil,
      addresses: [],
      txt: txt,
      interfaceName: interface?.name,
      resolved: false
    )
  }

  private func handleFound(_ result: NWBrowser.Result) {
    guard let service = baseService(result) else { return }
    guard resolve else {
      onFound(service)
      return
    }
    resolvers[service.id]?.cancel()
    let parameters: NWParameters = type.hasSuffix("._udp") ? .udp : .tcp
    parameters.includePeerToPeer = false
    let connection = NWConnection(to: result.endpoint, using: parameters)
    resolvers[service.id] = connection
    let once = OnceFlag()

    let finish: (NWEndpoint?) -> Void = { [weak self, weak connection] endpoint in
      guard let self, once.claim() else { return }
      connection?.stateUpdateHandler = nil
      connection?.cancel()
      if let connection, self.resolvers[service.id] === connection {
        self.resolvers.removeValue(forKey: service.id)
      }
      guard !self.stopped else { return }
      var resolvedService = service
      if case let .hostPort(host, port)? = endpoint {
        let address = Self.describe(host)
        resolvedService = DiscoveredService(
          id: service.id,
          name: service.name,
          type: service.type,
          domain: service.domain,
          host: address,
          port: Double(port.rawValue),
          addresses: [address],
          txt: service.txt,
          interfaceName: service.interfaceName,
          resolved: true
        )
      }
      self.onFound(resolvedService)
    }

    connection.stateUpdateHandler = { [weak connection] state in
      switch state {
      case .ready:
        finish(connection?.currentPath?.remoteEndpoint)
      case .failed, .cancelled:
        finish(nil)
      default:
        break
      }
    }
    connection.start(queue: queue)
    queue.asyncAfter(deadline: .now() + resolveTimeout) {
      finish(nil)
    }
  }

  private func handleLost(_ result: NWBrowser.Result) {
    guard let service = baseService(result) else { return }
    resolvers.removeValue(forKey: service.id)?.cancel()
    onLost(service)
  }

  static func describe(_ host: NWEndpoint.Host) -> String {
    switch host {
    case .ipv4(let address):
      return "\(address)"
    case .ipv6(let address):
      return "\(address)"
    case .name(let name, _):
      return name
    @unknown default:
      return "\(host)"
    }
  }

  static func describe(_ error: NWError) -> String {
    if case let .dns(code) = error, code == DNSServiceErrorType(kDNSServiceErr_PolicyDenied) {
      return "local network access was denied (Settings > Privacy & Security > Local Network)"
    }
    return error.localizedDescription
  }
}

/// Triggers the Local Network privacy alert and reports the outcome.
///
/// iOS has no API to query this permission. The probe publishes a private
/// Bonjour service and browses for it: seeing our own service proves access
/// was granted. The browser reports kDNSServiceErr_PolicyDenied while access is
/// denied, which also happens while the first-run alert is still on screen, so
/// a denial is only final once the alert has been dismissed (the app becomes
/// active again), when this app has probed before, or at the timeout.
final class LocalNetworkPermissionProbe {
  static let serviceType = "_munimwifi._tcp"
  private static let probedKey = "munim-wifi.local-network-probed"

  private let queue = DispatchQueue(label: "com.munimwifi.local-network-probe")
  private let serviceName = "munim-wifi-\(UUID().uuidString.prefix(8))"
  private var listener: NWListener?
  private var browser: NWBrowser?
  private var deniedSeen = false
  private var finished = false
  private var activeObserver: NSObjectProtocol?
  private var completion: ((PermissionState) -> Void)?
  private var retainSelf: LocalNetworkPermissionProbe?

  func run(timeout: TimeInterval, completion: @escaping (PermissionState) -> Void) {
    self.completion = completion
    retainSelf = self
    let probedBefore = UserDefaults.standard.bool(forKey: Self.probedKey)
    UserDefaults.standard.set(true, forKey: Self.probedKey)

    queue.async {
      do {
        let listener = try NWListener(using: .tcp)
        listener.service = NWListener.Service(name: self.serviceName, type: Self.serviceType)
        listener.newConnectionHandler = { $0.cancel() }
        listener.stateUpdateHandler = { [weak self] state in
          if case .failed = state { self?.finish(.denied) }
        }
        self.listener = listener
        listener.start(queue: self.queue)
      } catch {
        self.finish(.unavailable)
        return
      }

      let parameters = NWParameters()
      parameters.includePeerToPeer = false
      let browser = NWBrowser(for: .bonjour(type: Self.serviceType, domain: nil), using: parameters)
      browser.stateUpdateHandler = { [weak self] state in
        guard let self else { return }
        switch state {
        case .waiting(let error), .failed(let error):
          if case let .dns(code) = error, code == DNSServiceErrorType(kDNSServiceErr_PolicyDenied) {
            self.deniedSeen = true
            if probedBefore { self.finish(.denied) }
          }
        default:
          break
        }
      }
      browser.browseResultsChangedHandler = { [weak self] results, _ in
        guard let self else { return }
        let seen = results.contains { result in
          if case let .service(name, _, _, _) = result.endpoint { return name == self.serviceName }
          return false
        }
        if seen { self.finish(.granted) }
      }
      self.browser = browser
      browser.start(queue: self.queue)

      self.queue.asyncAfter(deadline: .now() + timeout) {
        self.finish(self.deniedSeen ? .denied : .notdetermined)
      }
    }

    #if canImport(UIKit)
    DispatchQueue.main.async {
      self.activeObserver = NotificationCenter.default.addObserver(
        forName: UIApplication.didBecomeActiveNotification,
        object: nil,
        queue: nil
      ) { [weak self] _ in
        // The alert was dismissed. Give a granted browse a moment to report.
        self?.queue.asyncAfter(deadline: .now() + 1.5) {
          guard let self, self.deniedSeen else { return }
          self.finish(.denied)
        }
      }
    }
    #endif
  }

  private func finish(_ state: PermissionState) {
    queue.async {
      guard !self.finished else { return }
      self.finished = true
      self.browser?.cancel()
      self.listener?.cancel()
      self.browser = nil
      self.listener = nil
      let completion = self.completion
      self.completion = nil
      completion?(state)
      DispatchQueue.main.async {
        if let observer = self.activeObserver {
          NotificationCenter.default.removeObserver(observer)
        }
        self.activeObserver = nil
        self.retainSelf = nil
      }
    }
  }
}
