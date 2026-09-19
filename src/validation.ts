import type {
  ReachabilityOptions,
  EnterpriseCredentials,
  NativeConnectionOptions,
  NativeNetworkSuggestionOptions,
  PasspointConfig,
  WifiSecurityType,
} from './specs/munim-wifi.nitro'

const MAX_SSID_BYTES = 32
const BSSID_PATTERN = /^(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/
const HEX_PATTERN = /^[0-9a-fA-F]+$/

export function utf8ByteLength(value: string): number {
  let length = 0
  for (const character of value) {
    const codePoint = character.codePointAt(0)!
    length +=
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4
  }
  return length
}

export function validateSSID(ssid: string): void {
  if (typeof ssid !== 'string' || ssid.trim().length === 0) {
    throw new TypeError('SSID must be a non-empty string')
  }
  if (ssid.includes('\0')) {
    throw new TypeError('SSID must not contain null characters')
  }
  if (utf8ByteLength(ssid) > MAX_SSID_BYTES) {
    throw new RangeError(`SSID must not exceed ${MAX_SSID_BYTES} UTF-8 bytes`)
  }
}

export function validateBSSID(bssid: string | undefined): void {
  if (bssid === undefined) return
  if (!BSSID_PATTERN.test(bssid)) {
    throw new TypeError('BSSID must use canonical XX:XX:XX:XX:XX:XX notation')
  }
  if (bssid.toLowerCase() === '00:00:00:00:00:00') {
    throw new TypeError('BSSID must not be the all-zero address')
  }
}

export function validateTimeout(timeout: number | undefined): void {
  if (
    timeout !== undefined &&
    (!Number.isFinite(timeout) ||
      !Number.isInteger(timeout) ||
      timeout < 5000 ||
      timeout > 120000)
  ) {
    throw new RangeError('Connection timeout must be 5000-120000 milliseconds')
  }
}

const EAP_METHODS = new Set([
  'peap',
  'ttls',
  'tls',
  'fast',
  'pwd',
  'sim',
  'aka',
  'akaPrime',
])
const PHASE2_METHODS = new Set([
  'none',
  'pap',
  'chap',
  'mschap',
  'mschapv2',
  'gtc',
  'eap',
])
const BASE64_PATTERN = /^[A-Za-z0-9+/\s]+={0,2}\s*$/

function validateOptionalString(value: unknown, name: string): void {
  if (value !== undefined && (typeof value !== 'string' || value.includes('\0'))) {
    throw new TypeError(`${name} must be a string without null characters`)
  }
}

function validateCertificate(value: unknown, name: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty base64 or PEM string`)
  }
  const body = value.includes('-----BEGIN')
    ? value.replace(/-----(BEGIN|END)[^-]+-----/g, '')
    : value
  if (!BASE64_PATTERN.test(body.trim())) {
    throw new TypeError(`${name} must be base64 (DER/PKCS#12) or PEM`)
  }
}

export function validateEnterpriseCredentials(
  eap: EnterpriseCredentials | undefined
): void {
  if (!eap || typeof eap !== 'object') {
    throw new TypeError('Enterprise networks require EAP credentials (eap)')
  }
  if (!EAP_METHODS.has(eap.method)) {
    throw new TypeError(`Unknown EAP method "${String(eap.method)}"`)
  }
  if (eap.phase2 !== undefined && !PHASE2_METHODS.has(eap.phase2)) {
    throw new TypeError(`Unknown EAP phase 2 method "${String(eap.phase2)}"`)
  }
  validateOptionalString(eap.identity, 'eap.identity')
  validateOptionalString(eap.anonymousIdentity, 'eap.anonymousIdentity')
  validateOptionalString(eap.password, 'eap.password')
  validateOptionalString(eap.serverDomain, 'eap.serverDomain')
  validateOptionalString(
    eap.clientCertificatePassword,
    'eap.clientCertificatePassword'
  )
  if (
    (eap.method === 'peap' || eap.method === 'ttls' || eap.method === 'pwd') &&
    (!eap.identity || !eap.password)
  ) {
    throw new TypeError(`EAP-${eap.method.toUpperCase()} requires identity and password`)
  }
  if (eap.method === 'tls') {
    validateCertificate(eap.clientCertificate, 'eap.clientCertificate')
  } else if (eap.clientCertificate !== undefined) {
    validateCertificate(eap.clientCertificate, 'eap.clientCertificate')
  }
  if (eap.trustedServerNames !== undefined) {
    if (!Array.isArray(eap.trustedServerNames)) {
      throw new TypeError('eap.trustedServerNames must be an array of strings')
    }
    eap.trustedServerNames.forEach((name, index) =>
      validateOptionalString(name, `eap.trustedServerNames[${index}]`)
    )
  }
  if (eap.caCertificates !== undefined) {
    if (!Array.isArray(eap.caCertificates)) {
      throw new TypeError('eap.caCertificates must be an array of strings')
    }
    eap.caCertificates.forEach((certificate, index) =>
      validateCertificate(certificate, `eap.caCertificates[${index}]`)
    )
  }
}

export function validatePasspointConfig(
  passpoint: PasspointConfig | undefined
): void {
  if (!passpoint || typeof passpoint !== 'object') {
    throw new TypeError('Passpoint networks require a passpoint configuration')
  }
  if (
    typeof passpoint.domainName !== 'string' ||
    passpoint.domainName.trim().length === 0 ||
    passpoint.domainName.includes('\0')
  ) {
    throw new TypeError('passpoint.domainName must be a non-empty string')
  }
  validateOptionalString(passpoint.friendlyName, 'passpoint.friendlyName')
  validateOptionalString(passpoint.realm, 'passpoint.realm')
  for (const oi of passpoint.roamingConsortiumOIs ?? []) {
    if (typeof oi !== 'string' || !HEX_PATTERN.test(oi) || oi.length % 2 !== 0 || oi.length > 16) {
      throw new TypeError(
        'passpoint.roamingConsortiumOIs must be even-length hex strings of at most 16 digits'
      )
    }
  }
  for (const code of passpoint.mccAndMncs ?? []) {
    if (typeof code !== 'string' || !/^\d{5,6}$/.test(code)) {
      throw new TypeError('passpoint.mccAndMncs entries must be 5-6 digit MCC+MNC strings')
    }
  }
}

export function validateSecurity(
  securityType: WifiSecurityType,
  passphrase: string | undefined,
  enterprise?: EnterpriseCredentials,
  passpoint?: PasspointConfig
): void {
  if (passphrase?.includes('\0')) {
    throw new TypeError('Passphrase must not contain null characters')
  }

  const byteLength = passphrase === undefined ? 0 : utf8ByteLength(passphrase)
  switch (securityType) {
    case 'open':
    case 'owe':
      if (passphrase !== undefined) {
        throw new TypeError(`${securityType} security must not include a passphrase`)
      }
      return
    case 'wep': {
      if (passphrase === undefined) {
        throw new TypeError('WEP security requires a key')
      }
      const isAscii = byteLength === 5 || byteLength === 13 || byteLength === 29
      const isHex =
        (passphrase.length === 10 ||
          passphrase.length === 26 ||
          passphrase.length === 58) &&
        HEX_PATTERN.test(passphrase)
      if (!isAscii && !isHex) {
        throw new RangeError(
          'WEP key must be 5, 13, or 29 UTF-8 bytes, or 10, 26, or 58 hex characters'
        )
      }
      return
    }
    case 'wpa2':
      if (
        passphrase === undefined ||
        byteLength < 8 ||
        byteLength > 63
      ) {
        throw new RangeError('WPA2 passphrase must be 8-63 UTF-8 bytes')
      }
      return
    case 'wpa3':
      if (
        passphrase === undefined ||
        byteLength < 1 ||
        byteLength > 63
      ) {
        throw new RangeError('WPA3 passphrase must be 1-63 UTF-8 bytes')
      }
      return
    case 'enterprise':
    case 'passpoint':
      if (passphrase !== undefined) {
        throw new TypeError(
          `${securityType} security takes EAP credentials, not a passphrase`
        )
      }
      validateEnterpriseCredentials(enterprise)
      if (securityType === 'passpoint') validatePasspointConfig(passpoint)
      return
    case 'unknown':
      throw new TypeError(
        'unknown credentials are not modeled by this connection API'
      )
  }
}

/** Passpoint selects networks by provider domain, so the SSID is only an identifier. */
function validateNetworkIdentifier(ssid: string, securityType: WifiSecurityType): void {
  if (securityType === 'passpoint') {
    if (typeof ssid !== 'string' || ssid.trim().length === 0 || ssid.includes('\0')) {
      throw new TypeError('A non-empty identifier is required')
    }
    return
  }
  validateSSID(ssid)
}

export function validateNativeConnectionOptions(
  options: NativeConnectionOptions
): void {
  if (!options || typeof options !== 'object') {
    throw new TypeError('Connection options must be an object')
  }
  validateNetworkIdentifier(options.ssid, options.securityType)
  validateBSSID(options.bssid)
  validateTimeout(options.timeout)
  validateSecurity(
    options.securityType,
    options.passphrase,
    options.enterprise,
    options.passpoint
  )
  if (
    options.bindProcess !== undefined &&
    typeof options.bindProcess !== 'boolean'
  ) {
    throw new TypeError('bindProcess must be a boolean when provided')
  }
  if (
    options.ssidPrefix !== undefined &&
    typeof options.ssidPrefix !== 'boolean'
  ) {
    throw new TypeError('ssidPrefix must be a boolean when provided')
  }
  if (options.ssidPrefix && options.securityType === 'passpoint') {
    throw new TypeError('ssidPrefix does not apply to Passpoint networks')
  }
}

export function validateSuggestionOptions(
  options: NativeNetworkSuggestionOptions
): void {
  validateNetworkIdentifier(options.ssid, options.securityType)
  validateBSSID(options.bssid)
  validateSecurity(
    options.securityType,
    options.passphrase,
    options.enterprise,
    options.passpoint
  )
}

const SERVICE_TYPE_PATTERN = /^_[A-Za-z0-9](?:[A-Za-z0-9-]{0,13}[A-Za-z0-9])?\._(?:tcp|udp)\.?$/

/** DNS-SD service types look like "_http._tcp" (service names are 1-15 characters). */
export function validateServiceType(type: string): void {
  if (typeof type !== 'string' || !SERVICE_TYPE_PATTERN.test(type)) {
    throw new TypeError(
      'Service type must look like "_name._tcp" or "_name._udp" (name: 1-15 letters, digits or hyphens)'
    )
  }
}

export function validateResolveTimeout(timeout: number | undefined): void {
  if (
    timeout !== undefined &&
    (!Number.isInteger(timeout) || timeout < 1000 || timeout > 30000)
  ) {
    throw new RangeError('resolveTimeout must be an integer from 1000 through 30000 ms')
  }
}

export function validateReachabilityOptions(
  options: ReachabilityOptions | undefined
): void {
  if (options === undefined) return
  if (options === null || typeof options !== 'object') {
    throw new TypeError('Reachability options must be an object')
  }
  if (
    options.probeUrl !== undefined &&
    (typeof options.probeUrl !== 'string' ||
      !/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(options.probeUrl))
  ) {
    throw new TypeError('probeUrl must be an absolute http(s) URL')
  }
  if (
    options.timeout !== undefined &&
    (!Number.isInteger(options.timeout) ||
      options.timeout < 1000 ||
      options.timeout > 30000)
  ) {
    throw new RangeError('Reachability timeout must be 1000-30000 milliseconds')
  }
}
