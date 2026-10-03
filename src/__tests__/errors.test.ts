import {
  isLocalNetworkPermissionError,
  LOCAL_NETWORK_PERMISSION_DENIED,
} from '../errors'

describe('isLocalNetworkPermissionError', () => {
  it('matches the Android 17 NSD / probe errors', () => {
    expect(
      isLocalNetworkPermissionError(
        new Error(
          'munim-wifi: local network permission denied: browsing for _http._tcp needs android.permission.ACCESS_LOCAL_NETWORK on Android 17+.'
        )
      )
    ).toBe(true)
  })

  it('matches iOS Bonjour onError messages passed as strings', () => {
    expect(
      isLocalNetworkPermissionError(
        'munim-wifi: service discovery for _http._tcp failed: local network permission denied (Settings > Privacy & Security > Local Network)'
      )
    ).toBe(true)
  })

  it('matches plain error-like objects and is case-insensitive', () => {
    expect(
      isLocalNetworkPermissionError({ message: 'Local Network Permission Denied' })
    ).toBe(true)
    expect(LOCAL_NETWORK_PERMISSION_DENIED).toBe('local network permission denied')
  })

  it('ignores unrelated errors and non-errors', () => {
    expect(isLocalNetworkPermissionError(new Error('munim-wifi: Wi-Fi is disabled'))).toBe(false)
    expect(isLocalNetworkPermissionError(undefined)).toBe(false)
    expect(isLocalNetworkPermissionError(42)).toBe(false)
  })
})
