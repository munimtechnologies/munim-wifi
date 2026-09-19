import CryptoKit
import Foundation
import NetworkExtension
import Security

enum EnterpriseConfigurationError: LocalizedError {
  case unsupportedMethod(String)
  case invalidCertificate
  case invalidPKCS12(OSStatus)
  case keychain(OSStatus, String)
  case rejected(String)

  var errorDescription: String? {
    switch self {
    case .unsupportedMethod(let method):
      return "munim-wifi: EAP method \(method) is not supported by NEHotspotEAPSettings (use peap, ttls, tls or fast)"
    case .invalidCertificate:
      return "munim-wifi: a CA certificate is not valid base64 DER or PEM"
    case .invalidPKCS12(let status):
      return "munim-wifi: the client certificate could not be imported as PKCS#12 (OSStatus \(status)); check the password"
    case .keychain(let status, let action):
      return "munim-wifi: keychain error \(status) while \(action)"
    case .rejected(let what):
      return "munim-wifi: iOS rejected the \(what)"
    }
  }
}

/// Builds NEHotspotEAPSettings / NEHotspotHS20Settings. Certificates and
/// identities handed to NEHotspotEAPSettings must be references to items in the
/// app's keychain, so they are imported there first (idempotently).
enum EnterpriseCredentialStore {
  static func makeEAPSettings(_ credentials: EnterpriseCredentials) throws -> NEHotspotEAPSettings {
    let settings = NEHotspotEAPSettings()
    let type: NEHotspotEAPSettings.EAPType
    switch credentials.method {
    case .peap:
      type = .EAPPEAP
    case .ttls:
      type = .EAPTTLS
    case .tls:
      type = .EAPTLS
    case .fast:
      type = .EAPFAST
    case .pwd, .sim, .aka, .akaprime:
      throw EnterpriseConfigurationError.unsupportedMethod(credentials.method.stringValue)
    }
    settings.supportedEAPTypes = [NSNumber(value: type.rawValue)]

    if let identity = credentials.identity, !identity.isEmpty {
      settings.username = identity
    }
    if let outerIdentity = credentials.anonymousIdentity, !outerIdentity.isEmpty {
      settings.outerIdentity = outerIdentity
    }
    if let password = credentials.password, !password.isEmpty {
      settings.password = password
    }
    if let phase2 = credentials.phase2 {
      switch phase2 {
      case .pap:
        settings.ttlsInnerAuthenticationType = .eapttlsInnerAuthenticationPAP
      case .chap:
        settings.ttlsInnerAuthenticationType = .eapttlsInnerAuthenticationCHAP
      case .mschap:
        settings.ttlsInnerAuthenticationType = .eapttlsInnerAuthenticationMSCHAP
      case .mschapv2:
        settings.ttlsInnerAuthenticationType = .eapttlsInnerAuthenticationMSCHAPv2
      case .eap:
        settings.ttlsInnerAuthenticationType = .eapttlsInnerAuthenticationEAP
      case .none, .gtc:
        break
      }
    }

    var trustedNames = credentials.trustedServerNames ?? []
    if let domain = credentials.serverDomain, !domain.isEmpty, !trustedNames.contains(domain) {
      trustedNames.insert(domain, at: 0)
    }
    if !trustedNames.isEmpty {
      settings.trustedServerNames = trustedNames
    }

    if let encoded = credentials.caCertificates, !encoded.isEmpty {
      let certificates = try encoded.map(importCertificate)
      guard settings.setTrustedServerCertificates(certificates) else {
        throw EnterpriseConfigurationError.rejected("trusted server certificates")
      }
    }

    if credentials.method == .tls {
      settings.isTLSClientCertificateRequired = true
    }
    if let pkcs12 = credentials.clientCertificate, !pkcs12.isEmpty {
      let identity = try importIdentity(pkcs12, password: credentials.clientCertificatePassword ?? "")
      guard settings.setIdentity(identity) else {
        throw EnterpriseConfigurationError.rejected("client identity")
      }
    }
    return settings
  }

  static func makeHS20Settings(_ passpoint: PasspointConfig) -> NEHotspotHS20Settings {
    let settings = NEHotspotHS20Settings(
      domainName: passpoint.domainName,
      roamingEnabled: passpoint.roamingEnabled ?? false
    )
    if let ois = passpoint.roamingConsortiumOIs, !ois.isEmpty {
      settings.roamingConsortiumOIs = ois
    }
    var realms = passpoint.naiRealmNames ?? []
    if let realm = passpoint.realm, !realm.isEmpty, !realms.contains(realm) {
      realms.insert(realm, at: 0)
    }
    if !realms.isEmpty {
      settings.naiRealmNames = realms
    }
    if let codes = passpoint.mccAndMncs, !codes.isEmpty {
      settings.mccAndMNCs = codes
    }
    return settings
  }

  // MARK: - Keychain

  /// Accepts base64 DER/PKCS#12 or a PEM block.
  static func decode(_ encoded: String) -> Data? {
    var body = encoded
    if body.contains("-----BEGIN") {
      body = body
        .components(separatedBy: .newlines)
        .filter { !$0.hasPrefix("-----") }
        .joined()
    }
    return Data(base64Encoded: body, options: .ignoreUnknownCharacters)
  }

  private static func fingerprint(_ data: Data) -> String {
    SHA256.hash(data: data).prefix(16).map { String(format: "%02x", $0) }.joined()
  }

  static func importCertificate(_ encoded: String) throws -> SecCertificate {
    guard
      let data = decode(encoded),
      let certificate = SecCertificateCreateWithData(nil, data as CFData)
    else {
      throw EnterpriseConfigurationError.invalidCertificate
    }

    let add: [CFString: Any] = [
      kSecClass: kSecClassCertificate,
      kSecValueRef: certificate,
      kSecAttrLabel: "munim-wifi.ca.\(fingerprint(data))",
    ]
    let status = SecItemAdd(add as CFDictionary, nil)
    guard status == errSecSuccess || status == errSecDuplicateItem else {
      throw EnterpriseConfigurationError.keychain(status, "storing a CA certificate")
    }

    // Return the keychain-backed reference (issuer + serial uniquely identify a certificate).
    var query: [CFString: Any] = [
      kSecClass: kSecClassCertificate,
      kSecReturnRef: true,
      kSecMatchLimit: kSecMatchLimitOne,
    ]
    if let serial = SecCertificateCopySerialNumberData(certificate, nil) {
      query[kSecAttrSerialNumber] = serial
    }
    if let issuer = SecCertificateCopyNormalizedIssuerSequence(certificate) {
      query[kSecAttrIssuer] = issuer
    }
    var result: CFTypeRef?
    let lookup = SecItemCopyMatching(query as CFDictionary, &result)
    guard lookup == errSecSuccess, let result, CFGetTypeID(result) == SecCertificateGetTypeID() else {
      throw EnterpriseConfigurationError.keychain(lookup, "reading back a CA certificate")
    }
    return result as! SecCertificate
  }

  static func importIdentity(_ encoded: String, password: String) throws -> SecIdentity {
    guard let data = decode(encoded) else {
      throw EnterpriseConfigurationError.invalidPKCS12(errSecDecode)
    }
    var items: CFArray?
    let status = SecPKCS12Import(
      data as CFData,
      [kSecImportExportPassphrase: password] as CFDictionary,
      &items
    )
    guard
      status == errSecSuccess,
      let entries = items as? [[String: Any]],
      let imported = entries.first?[kSecImportItemIdentity as String]
    else {
      throw EnterpriseConfigurationError.invalidPKCS12(status)
    }
    let identity = imported as! SecIdentity

    let add: [CFString: Any] = [
      kSecValueRef: identity,
      kSecAttrLabel: "munim-wifi.identity.\(fingerprint(data))",
    ]
    let addStatus = SecItemAdd(add as CFDictionary, nil)
    guard addStatus == errSecSuccess || addStatus == errSecDuplicateItem else {
      throw EnterpriseConfigurationError.keychain(addStatus, "storing the client identity")
    }

    // Find the keychain-backed identity whose certificate matches the import.
    var importedCertificate: SecCertificate?
    SecIdentityCopyCertificate(identity, &importedCertificate)
    let importedCertificateData = importedCertificate.map { SecCertificateCopyData($0) as Data }

    let query: [CFString: Any] = [
      kSecClass: kSecClassIdentity,
      kSecReturnRef: true,
      kSecMatchLimit: kSecMatchLimitAll,
    ]
    var result: CFTypeRef?
    let lookup = SecItemCopyMatching(query as CFDictionary, &result)
    guard lookup == errSecSuccess, let candidates = result as? [Any] else {
      throw EnterpriseConfigurationError.keychain(lookup, "reading back the client identity")
    }
    for candidate in candidates {
      let stored = candidate as! SecIdentity
      var certificate: SecCertificate?
      SecIdentityCopyCertificate(stored, &certificate)
      if let certificate, SecCertificateCopyData(certificate) as Data == importedCertificateData {
        return stored
      }
    }
    throw EnterpriseConfigurationError.keychain(errSecItemNotFound, "reading back the client identity")
  }
}
