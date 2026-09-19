import {
  utf8ByteLength,
  validateBSSID,
  validateNativeConnectionOptions,
  validateSecurity,
  validateSSID,
  validateSuggestionOptions,
  validateResolveTimeout,
  validateServiceType,
  validateTimeout,
} from '../validation'

describe('utf8ByteLength', () => {
  it('counts ASCII characters as one byte', () => {
    expect(utf8ByteLength('network')).toBe(7)
  })

  it('counts two-byte characters', () => {
    expect(utf8ByteLength('café')).toBe(5)
  })

  it('counts three-byte characters', () => {
    expect(utf8ByteLength('ワイファイ')).toBe(15)
  })

  it('counts astral-plane characters as four bytes', () => {
    expect(utf8ByteLength('📶')).toBe(4)
  })
})

describe('validateSSID', () => {
  it('accepts a typical SSID', () => {
    expect(() => validateSSID('Home Network 5G')).not.toThrow()
  })

  it('accepts an SSID at exactly 32 UTF-8 bytes', () => {
    expect(() => validateSSID('a'.repeat(32))).not.toThrow()
  })

  it('rejects non-string values', () => {
    expect(() => validateSSID(42 as unknown as string)).toThrow(TypeError)
  })

  it('rejects empty and whitespace-only SSIDs', () => {
    expect(() => validateSSID('')).toThrow(TypeError)
    expect(() => validateSSID('   ')).toThrow(TypeError)
  })

  it('rejects SSIDs containing null characters', () => {
    expect(() => validateSSID('bad\0ssid')).toThrow(TypeError)
  })

  it('rejects SSIDs above 32 UTF-8 bytes', () => {
    expect(() => validateSSID('a'.repeat(33))).toThrow(RangeError)
  })

  it('measures multi-byte SSIDs in bytes, not characters', () => {
    // 11 three-byte characters = 33 bytes, though only 11 characters long.
    expect(() => validateSSID('ネ'.repeat(11))).toThrow(RangeError)
    expect(() => validateSSID('ネ'.repeat(10))).not.toThrow()
  })
})

describe('validateBSSID', () => {
  it('allows undefined', () => {
    expect(() => validateBSSID(undefined)).not.toThrow()
  })

  it('accepts canonical MAC notation in either case', () => {
    expect(() => validateBSSID('aa:bb:cc:dd:ee:ff')).not.toThrow()
    expect(() => validateBSSID('AA:BB:CC:DD:EE:0F')).not.toThrow()
  })

  it('rejects non-canonical notations', () => {
    expect(() => validateBSSID('aabb.ccdd.eeff')).toThrow(TypeError)
    expect(() => validateBSSID('aa-bb-cc-dd-ee-ff')).toThrow(TypeError)
    expect(() => validateBSSID('aa:bb:cc:dd:ee')).toThrow(TypeError)
    expect(() => validateBSSID('aa:bb:cc:dd:ee:ff:00')).toThrow(TypeError)
    expect(() => validateBSSID('gg:bb:cc:dd:ee:ff')).toThrow(TypeError)
  })

  it('rejects the all-zero address', () => {
    expect(() => validateBSSID('00:00:00:00:00:00')).toThrow(TypeError)
  })
})

describe('validateTimeout', () => {
  it('allows undefined', () => {
    expect(() => validateTimeout(undefined)).not.toThrow()
  })

  it('accepts the inclusive bounds', () => {
    expect(() => validateTimeout(5000)).not.toThrow()
    expect(() => validateTimeout(120000)).not.toThrow()
  })

  it('rejects values outside 5000-120000', () => {
    expect(() => validateTimeout(4999)).toThrow(RangeError)
    expect(() => validateTimeout(120001)).toThrow(RangeError)
    expect(() => validateTimeout(0)).toThrow(RangeError)
    expect(() => validateTimeout(-5000)).toThrow(RangeError)
  })

  it('rejects non-integer and non-finite values', () => {
    expect(() => validateTimeout(5000.5)).toThrow(RangeError)
    expect(() => validateTimeout(Number.NaN)).toThrow(RangeError)
    expect(() => validateTimeout(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('validateSecurity', () => {
  it('rejects passphrases containing null characters', () => {
    expect(() => validateSecurity('wpa2', 'pass\0word')).toThrow(TypeError)
  })

  describe('open and owe', () => {
    it('accepts the absence of a passphrase', () => {
      expect(() => validateSecurity('open', undefined)).not.toThrow()
      expect(() => validateSecurity('owe', undefined)).not.toThrow()
    })

    it('rejects a passphrase', () => {
      expect(() => validateSecurity('open', 'secret')).toThrow(TypeError)
      expect(() => validateSecurity('owe', 'secret')).toThrow(TypeError)
    })
  })

  describe('wep', () => {
    it('requires a key', () => {
      expect(() => validateSecurity('wep', undefined)).toThrow(TypeError)
    })

    it('accepts ASCII keys of 5, 13, or 29 bytes', () => {
      expect(() => validateSecurity('wep', 'a'.repeat(5))).not.toThrow()
      expect(() => validateSecurity('wep', 'a'.repeat(13))).not.toThrow()
      expect(() => validateSecurity('wep', 'a'.repeat(29))).not.toThrow()
    })

    it('accepts hex keys of 10, 26, or 58 digits', () => {
      expect(() => validateSecurity('wep', '0123456789')).not.toThrow()
      expect(() => validateSecurity('wep', 'a'.repeat(26))).not.toThrow()
      expect(() => validateSecurity('wep', 'AbCdEf0123'.repeat(1))).not.toThrow()
      expect(() => validateSecurity('wep', '0f'.repeat(29))).not.toThrow()
    })

    it('rejects keys with invalid lengths', () => {
      expect(() => validateSecurity('wep', 'a'.repeat(8))).toThrow(RangeError)
      expect(() => validateSecurity('wep', 'xyzxyzxyzx')).toThrow(RangeError)
    })
  })

  describe('wpa2', () => {
    it('requires a passphrase of 8-63 bytes', () => {
      expect(() => validateSecurity('wpa2', undefined)).toThrow(RangeError)
      expect(() => validateSecurity('wpa2', 'a'.repeat(7))).toThrow(RangeError)
      expect(() => validateSecurity('wpa2', 'a'.repeat(8))).not.toThrow()
      expect(() => validateSecurity('wpa2', 'a'.repeat(63))).not.toThrow()
      expect(() => validateSecurity('wpa2', 'a'.repeat(64))).toThrow(RangeError)
    })

    it('measures the passphrase in UTF-8 bytes', () => {
      // 21 three-byte characters = 63 bytes; 22 = 66 bytes.
      expect(() => validateSecurity('wpa2', 'ネ'.repeat(21))).not.toThrow()
      expect(() => validateSecurity('wpa2', 'ネ'.repeat(22))).toThrow(RangeError)
    })
  })

  describe('wpa3', () => {
    it('accepts short SAE passphrases that WPA2 would reject', () => {
      expect(() => validateSecurity('wpa3', 'abc')).not.toThrow()
      expect(() => validateSecurity('wpa3', 'a')).not.toThrow()
    })

    it('requires a passphrase of 1-63 bytes', () => {
      expect(() => validateSecurity('wpa3', undefined)).toThrow(RangeError)
      expect(() => validateSecurity('wpa3', '')).toThrow(RangeError)
      expect(() => validateSecurity('wpa3', 'a'.repeat(63))).not.toThrow()
      expect(() => validateSecurity('wpa3', 'a'.repeat(64))).toThrow(RangeError)
    })
  })

  it('rejects passphrases for EAP types and the unknown type', () => {
    expect(() => validateSecurity('enterprise', 'secret')).toThrow(TypeError)
    expect(() => validateSecurity('passpoint', 'secret')).toThrow(TypeError)
    expect(() => validateSecurity('unknown', 'secret')).toThrow(TypeError)
  })

  describe('enterprise', () => {
    const peap = {
      method: 'peap' as const,
      phase2: 'mschapv2' as const,
      identity: 'user@example.com',
      password: 'pa55word',
      serverDomain: 'radius.example.com',
    }

    it('requires EAP credentials', () => {
      expect(() => validateSecurity('enterprise', undefined)).toThrow(TypeError)
    })

    it('accepts PEAP with identity and password', () => {
      expect(() =>
        validateSecurity('enterprise', undefined, peap)
      ).not.toThrow()
    })

    it('requires identity and password for PEAP/TTLS', () => {
      expect(() =>
        validateSecurity('enterprise', undefined, { ...peap, password: undefined })
      ).toThrow(TypeError)
    })

    it('requires a client certificate for EAP-TLS', () => {
      expect(() =>
        validateSecurity('enterprise', undefined, { method: 'tls', identity: 'device' })
      ).toThrow(TypeError)
      expect(() =>
        validateSecurity('enterprise', undefined, {
          method: 'tls',
          identity: 'device',
          clientCertificate: 'MIIKZgIBAzCCCi8=',
        })
      ).not.toThrow()
    })

    it('rejects unknown methods and malformed certificates', () => {
      expect(() =>
        validateSecurity('enterprise', undefined, {
          method: 'leap' as 'peap',
          identity: 'a',
          password: 'b',
        })
      ).toThrow(TypeError)
      expect(() =>
        validateSecurity('enterprise', undefined, {
          ...peap,
          caCertificates: ['not base64!'],
        })
      ).toThrow(TypeError)
      expect(() =>
        validateSecurity('enterprise', undefined, {
          ...peap,
          caCertificates: [
            '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIU\n-----END CERTIFICATE-----',
          ],
        })
      ).not.toThrow()
    })
  })

  describe('passpoint', () => {
    const eap = { method: 'ttls' as const, identity: 'user', password: 'secret' }

    it('requires a domain name', () => {
      expect(() => validateSecurity('passpoint', undefined, eap)).toThrow(TypeError)
      expect(() =>
        validateSecurity('passpoint', undefined, eap, { domainName: '' })
      ).toThrow(TypeError)
    })

    it('accepts a provider with roaming consortium OIs', () => {
      expect(() =>
        validateSecurity('passpoint', undefined, eap, {
          domainName: 'example.com',
          roamingConsortiumOIs: ['5A03BA0000'],
          mccAndMncs: ['310026'],
        })
      ).not.toThrow()
    })

    it('rejects malformed OIs and MCC/MNC codes', () => {
      expect(() =>
        validateSecurity('passpoint', undefined, eap, {
          domainName: 'example.com',
          roamingConsortiumOIs: ['XYZ'],
        })
      ).toThrow(TypeError)
      expect(() =>
        validateSecurity('passpoint', undefined, eap, {
          domainName: 'example.com',
          mccAndMncs: ['31'],
        })
      ).toThrow(TypeError)
    })

    it('treats the SSID as a free-form identifier', () => {
      expect(() =>
        validateNativeConnectionOptions({
          ssid: 'a Passpoint provider identifier longer than 32 bytes',
          securityType: 'passpoint',
          enterprise: eap,
          passpoint: { domainName: 'example.com' },
        })
      ).not.toThrow()
    })
  })
})

describe('validateNativeConnectionOptions', () => {
  const base = {
    ssid: 'Lab Network',
    securityType: 'wpa2' as const,
    passphrase: 'hunter22',
  }

  it('accepts a valid WPA2 request', () => {
    expect(() => validateNativeConnectionOptions({ ...base })).not.toThrow()
  })

  it('accepts a short WPA3 passphrase', () => {
    expect(() =>
      validateNativeConnectionOptions({
        ssid: 'Lab Network',
        securityType: 'wpa3',
        passphrase: 'abc',
      })
    ).not.toThrow()
  })

  it('rejects non-object options', () => {
    expect(() =>
      validateNativeConnectionOptions(
        undefined as unknown as Parameters<
          typeof validateNativeConnectionOptions
        >[0]
      )
    ).toThrow(TypeError)
  })

  it('validates nested fields', () => {
    expect(() =>
      validateNativeConnectionOptions({ ...base, ssid: '' })
    ).toThrow(TypeError)
    expect(() =>
      validateNativeConnectionOptions({ ...base, bssid: 'nope' })
    ).toThrow(TypeError)
    expect(() =>
      validateNativeConnectionOptions({ ...base, timeout: 100 })
    ).toThrow(RangeError)
    expect(() =>
      validateNativeConnectionOptions({
        ...base,
        bindProcess: 'yes' as unknown as boolean,
      })
    ).toThrow(TypeError)
  })
})

describe('validateSuggestionOptions', () => {
  it('accepts a valid suggestion', () => {
    expect(() =>
      validateSuggestionOptions({
        ssid: 'Depot',
        securityType: 'wpa3',
        passphrase: 'short',
        bssid: 'aa:bb:cc:dd:ee:ff',
      })
    ).not.toThrow()
  })

  it('rejects invalid SSIDs, BSSIDs, and credentials', () => {
    expect(() =>
      validateSuggestionOptions({ ssid: '', securityType: 'open' })
    ).toThrow(TypeError)
    expect(() =>
      validateSuggestionOptions({
        ssid: 'Depot',
        securityType: 'open',
        bssid: '123',
      })
    ).toThrow(TypeError)
    expect(() =>
      validateSuggestionOptions({
        ssid: 'Depot',
        securityType: 'wpa2',
        passphrase: 'short',
      })
    ).toThrow(RangeError)
  })
})

describe('validateServiceType', () => {
  it('accepts DNS-SD service types', () => {
    expect(() => validateServiceType('_http._tcp')).not.toThrow()
    expect(() => validateServiceType('_googlecast._tcp.')).not.toThrow()
    expect(() => validateServiceType('_munimwifi._udp')).not.toThrow()
  })

  it('rejects malformed types', () => {
    expect(() => validateServiceType('http._tcp')).toThrow(TypeError)
    expect(() => validateServiceType('_http._sctp')).toThrow(TypeError)
    expect(() => validateServiceType('_a-name-that-is-too-long._tcp')).toThrow(TypeError)
    expect(() => validateServiceType('_bad-._tcp')).toThrow(TypeError)
  })
})

describe('validateResolveTimeout', () => {
  it('accepts undefined and integers from 1000 through 30000', () => {
    expect(() => validateResolveTimeout(undefined)).not.toThrow()
    expect(() => validateResolveTimeout(1000)).not.toThrow()
    expect(() => validateResolveTimeout(30000)).not.toThrow()
  })

  it('rejects values out of range', () => {
    expect(() => validateResolveTimeout(999)).toThrow(RangeError)
    expect(() => validateResolveTimeout(1500.5)).toThrow(RangeError)
  })
})
