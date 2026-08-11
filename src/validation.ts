import type {
  NativeConnectionOptions,
  NativeNetworkSuggestionOptions,
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

export function validateSecurity(
  securityType: WifiSecurityType,
  passphrase: string | undefined
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
    case 'unknown':
      throw new TypeError(
        `${securityType} credentials are not modeled by this connection API`
      )
  }
}

export function validateNativeConnectionOptions(
  options: NativeConnectionOptions
): void {
  if (!options || typeof options !== 'object') {
    throw new TypeError('Connection options must be an object')
  }
  validateSSID(options.ssid)
  validateBSSID(options.bssid)
  validateTimeout(options.timeout)
  validateSecurity(options.securityType, options.passphrase)
  if (
    options.bindProcess !== undefined &&
    typeof options.bindProcess !== 'boolean'
  ) {
    throw new TypeError('bindProcess must be a boolean when provided')
  }
}

export function validateSuggestionOptions(
  options: NativeNetworkSuggestionOptions
): void {
  validateSSID(options.ssid)
  validateBSSID(options.bssid)
  validateSecurity(options.securityType, options.passphrase)
}
