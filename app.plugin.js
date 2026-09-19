const {
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
} = require('@expo/config-plugins')

const DEFAULT_LOCATION_MESSAGE =
  'Allow this app to access Wi-Fi network information and scan nearby networks.'

const TOOLS_NAMESPACE = 'http://schemas.android.com/tools'

/**
 * Adds (or updates) a <uses-permission> element on the app manifest.
 * `attributes` are merged onto the element's `$` map.
 */
function upsertPermission(manifest, name, attributes = {}) {
  const permissions = (manifest.manifest['uses-permission'] =
    manifest.manifest['uses-permission'] || [])
  let entry = permissions.find((item) => item.$ && item.$['android:name'] === name)
  if (!entry) {
    entry = { $: { 'android:name': name } }
    permissions.push(entry)
  }
  Object.assign(entry.$, attributes)
  return entry
}

function withMunimWifi(config, props = {}) {
  const locationMessage = props.locationPermission || DEFAULT_LOCATION_MESSAGE
  const android = props.android || {}
  // Location on Android 13+ is only needed to read the connected network's
  // SSID/BSSID (getCurrentNetwork) or to derive location from scans. Kept on by
  // default so existing apps keep that behaviour; set false to cap location at
  // API 32 (scans then only need NEARBY_WIFI_DEVICES).
  const locationOnAndroid13Plus = android.locationOnAndroid13Plus !== false
  // Set false only if the app derives physical location from Wi-Fi scans.
  const neverForLocation = android.neverForLocation !== false

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
    manifest.manifest.$ = manifest.manifest.$ || {}
    manifest.manifest.$['xmlns:tools'] = TOOLS_NAMESPACE

    for (const name of [
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_STATE',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.CHANGE_NETWORK_STATE',
    ]) {
      upsertPermission(manifest, name)
    }

    for (const name of [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ]) {
      const entry = upsertPermission(manifest, name)
      if (locationOnAndroid13Plus) {
        // The library caps location at API 32; lift the cap for this app.
        delete entry.$['android:maxSdkVersion']
        entry.$['tools:remove'] = 'android:maxSdkVersion'
      } else {
        entry.$['android:maxSdkVersion'] = '32'
        delete entry.$['tools:remove']
      }
    }

    const nearby = upsertPermission(manifest, 'android.permission.NEARBY_WIFI_DEVICES')
    if (neverForLocation) {
      nearby.$['android:usesPermissionFlags'] = 'neverForLocation'
      delete nearby.$['tools:remove']
    } else {
      delete nearby.$['android:usesPermissionFlags']
      nearby.$['tools:remove'] = 'android:usesPermissionFlags'
    }
    nearby.$['tools:targetApi'] = 's'

    return current
  })
}

module.exports = withMunimWifi
module.exports.default = withMunimWifi
