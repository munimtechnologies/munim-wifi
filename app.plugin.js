const {
  AndroidConfig,
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
} = require('@expo/config-plugins')

const DEFAULT_LOCATION_MESSAGE =
  'Allow this app to access Wi-Fi network information and scan nearby networks.'

function withMunimWifi(config, props = {}) {
  const locationMessage = props.locationPermission || DEFAULT_LOCATION_MESSAGE

  config = withInfoPlist(config, (current) => {
    current.modResults.NSLocationWhenInUseUsageDescription = locationMessage
    return current
  })

  config = withEntitlementsPlist(config, (current) => {
    current.modResults['com.apple.developer.networking.wifi-info'] = true
    current.modResults['com.apple.developer.networking.HotspotConfiguration'] = true
    return current
  })

  return withAndroidManifest(config, (current) => {
    const manifest = current.modResults
    const permissions = [
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_STATE',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CHANGE_NETWORK_STATE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.NEARBY_WIFI_DEVICES',
    ]

    AndroidConfig.Permissions.ensurePermissions(manifest, permissions)
    return current
  })
}

module.exports = withMunimWifi
module.exports.default = withMunimWifi
