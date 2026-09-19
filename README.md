<!-- Banner Image -->

<p align="center">
  <a href="https://github.com/munimtechnologies/munim-wifi">
    <img alt="Munim Technologies Wi-Fi" height="128" src="./.github/resources/banner.png?v=3">
    <h1 align="center">munim-wifi</h1>
  </a>
</p>

<p align="center">
  <a aria-label="Package version" href="https://www.npmjs.com/package/munim-wifi" target="_blank">
    <img alt="Package version" src="https://img.shields.io/npm/v/munim-wifi.svg?style=flat-square&label=Version&labelColor=000000&color=0066CC" />
  </a>
  <a aria-label="Package is free to use" href="https://github.com/munimtechnologies/munim-wifi/blob/master/LICENSE" target="_blank">
    <img alt="License: Apache-2.0" src="https://img.shields.io/badge/License-Apache%202.0-success.svg?style=flat-square&color=33CC12" />
  </a>
  <a aria-label="Monthly downloads" href="https://www.npmtrends.com/munim-wifi" target="_blank">
    <img alt="Monthly downloads" src="https://img.shields.io/npm/dm/munim-wifi.svg?style=flat-square&labelColor=gray&color=33CC12&label=Downloads" />
  </a>
  <a aria-label="Total downloads" href="https://www.npmjs.com/package/munim-wifi" target="_blank">
    <img alt="Total downloads" src="https://img.shields.io/npm/dt/munim-wifi.svg?style=flat-square&labelColor=gray&color=0066CC&label=Total%20Downloads" />
  </a>
</p>

<p align="center">
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.76%2B-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img alt="Expo" src="https://img.shields.io/badge/Expo-development%20build-000020?style=flat-square&logo=expo&logoColor=white" />
  <img alt="iOS" src="https://img.shields.io/badge/iOS-13%2B-000000?style=flat-square&logo=apple&logoColor=white" />
  <img alt="Android" src="https://img.shields.io/badge/Android-API%2023%2B-3DDC84?style=flat-square&logo=android&logoColor=white" />
  <img alt="Nitro Modules" src="https://img.shields.io/badge/Nitro%20Modules-0.36%2B-7C3AED?style=flat-square" />
</p>

<p align="center">
  <a aria-label="Works with Expo" href="https://docs.expo.dev/"><b>Works with Expo</b></a>
  &ensp;•&ensp;
  <a aria-label="Documentation" href="https://github.com/munimtechnologies/munim-wifi#readme">Read the Documentation</a>
  &ensp;•&ensp;
  <a aria-label="Report issues" href="https://github.com/munimtechnologies/munim-wifi/issues">Report Issues</a>
</p>

<h6 align="center">Follow Munim Technologies</h6>
<p align="center">
  <a aria-label="Munim Technologies on GitHub" href="https://github.com/munimtechnologies" target="_blank">
    <img alt="Munim Technologies on GitHub" src="https://img.shields.io/badge/GitHub-222222?style=for-the-badge&logo=github&logoColor=white" />
  </a>&nbsp;
  <a aria-label="Munim Technologies on LinkedIn" href="https://linkedin.com/in/sheehanmunim" target="_blank">
    <img alt="Munim Technologies on LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" />
  </a>&nbsp;
  <a aria-label="Munim Technologies website" href="https://munimtech.com" target="_blank">
    <img alt="Munim Technologies website" src="https://img.shields.io/badge/Website-0066CC?style=for-the-badge&logo=globe&logoColor=white" />
  </a>
</p>

## Introduction

**munim-wifi** is a comprehensive React Native Wi-Fi library for nearby-network discovery, current-network information, connection flows, and Wi-Fi fingerprinting. It exposes SSIDs, BSSIDs, signal strength, frequencies, channels, security information, local IP data, and platform-native connect/disconnect behavior where the operating system permits it.

**Fully compatible with Expo!** It includes an Expo config plugin and a managed Expo example app. Because the package contains native code, Expo projects must use a development build rather than Expo Go.

**Built with React Native's Nitro Modules architecture** using Swift on iOS, Kotlin on Android, generated native bindings, and callback-based continuous results without a legacy React Native event bridge.

**Note:** Wi-Fi is heavily platform-gated. Android exposes nearby scans but throttles their frequency. Ordinary iOS apps cannot perform general Wi-Fi scans, so iOS returns the current network when Apple allows access. Unsupported data is returned as `null` instead of being fabricated.

## Table of contents

- [📚 Documentation](#-documentation)
- [🚀 Features](#-features)
- [Platform Support Matrix](#platform-support-matrix)
- [📦 Installation](#-installation)
- [Permissions and OS Behavior](#permissions-and-os-behavior)
- [⚡ Quick Start](#-quick-start)
- [🔧 API Reference](#-api-reference)
- [📖 Usage Examples](#-usage-examples)
- [🔍 Troubleshooting](#-troubleshooting)
- [👏 Contributing](#-contributing)
- [📄 License](#-license)

## 📚 Documentation

<p>Learn about building Wi-Fi-aware apps <a aria-label="Documentation" href="https://github.com/munimtechnologies/munim-wifi#readme">in our documentation!</a></p>

- [Getting Started](#-installation)
- [Platform Support](#platform-support-matrix)
- [API Reference](#-api-reference)
- [Usage Examples](#-usage-examples)
- [Troubleshooting](#-troubleshooting)

## 🚀 Features

### Wi-Fi Discovery

- 📡 **Nearby Network Scanning:** Retrieve Android scan results without blocking a native thread.
- 📶 **Signal Information:** Read RSSI, frequency, and calculated 2.4/5/6/60 GHz channel information on Android.
- 🔐 **Security Details:** Read capabilities and an easy-to-use secure/open flag.
- 🔄 **Continuous Results:** Subscribe to result batches or individual networks through Nitro callbacks.
- 🧭 **Wi-Fi Fingerprinting:** Capture visible networks with a millisecond timestamp.

### Network Management

- 🔌 **Native Connection Flows:** Android `WifiNetworkSpecifier` and iOS `NEHotspotConfiguration`.
- 📱 **Current Network Information:** Read SSID, BSSID, IP address, gateway, DNS, and subnet data where available.
- 🌐 **Local Routing:** Android 10+ binds the app process to the approved requested network until `disconnect()`, then restores the previous binding.
- 🏢 **Enterprise and Passpoint:** WPA2/WPA3-Enterprise (PEAP, TTLS, TLS, …) and Hotspot 2.0 on both platforms.
- 🔎 **SSID-prefix joins:** Join the first network whose SSID starts with a prefix (iOS 13+, Android 10+).
- 🛰️ **Service Discovery:** Browse Bonjour/mDNS services (`NsdManager` / `NWBrowser`) with resolved host, port and TXT records.
- 🌍 **Internet Reachability:** OS-validated reachability plus an optional HTTP probe.
- ✅ **Explicit Failures:** Invalid options, missing permissions, disabled Wi-Fi, timeouts, and unsupported WEP flows reject clearly.

### Additional Features

- 📱 **Cross-platform:** One TypeScript API with honest platform-specific results.
- 🎯 **TypeScript Support:** Full result, option, callback, and HybridObject types.
- ⚡ **High Performance:** Nitro Modules with generated Swift/Kotlin/C++ bindings.
- 🚀 **Expo Compatible:** Managed config plugin and Expo 57 example project.
- 🔐 **Permission Handling:** Android runtime permission requests and real iOS location authorization.
- 🧪 **Release Verification:** Package, example, iOS, and Android release-candidate checks.

## Platform Support Matrix

| Capability | iOS | Android | Notes |
| --- | --- | --- | --- |
| Nearby-network scan | ⚠️ Current network only | ✅ Full | Ordinary iOS apps cannot enumerate nearby Wi-Fi networks. |
| SSID and BSSID | ✅ | ✅ | iOS requires the Wi-Fi Information entitlement plus an Apple access criterion. |
| RSSI | ❌ | ✅ | Android returns dBm. |
| Frequency and channel | ❌ | ✅ | Android covers 2.4, 5, 6, and 60 GHz channel calculations. |
| Capabilities/security | ⚠️ Security state only | ✅ | iOS does not expose Android-style capability strings. |
| Current network | ✅ | ✅ | Values can be hidden by permissions or OS privacy behavior. |
| Local IPv4/IPv6 addresses | ✅ | ✅ | `getIPAddress()` (IPv4) and `getIPAddresses()` (IPv4 + IPv6). |
| Connect | ✅ | ✅ | Both platforms use system-controlled user-consent flows. |
| Disconnect | ⚠️ Removes app configuration | ✅ | Resolves `false` when there was nothing this app could release. |
| Continuous scan | ⚠️ One current-network result | ✅ | Throttled batches are flagged (`info.throttled`), never passed off as fresh. |
| Wi-Fi fingerprint | ⚠️ Current network only | ✅ | No location is inferred by the library. |
| Security type | ⚠️ Coarse (open/WEP/personal/enterprise) | ✅ Full | Android classifies WPA2/WPA3/OWE/EAP/Passpoint from scan capabilities. |
| Local network request | ✅ `joinOnce` configuration | ✅ Android 10+ specifier | Structured `ConnectionOutcome` on both platforms. |
| Persistent configuration | ✅ `NEHotspotConfiguration` | ⚠️ Via network suggestion | `configureNetwork()`. |
| Network suggestions | ❌ `unsupported` outcome | ✅ Android 10+ | `NEHotspotConfiguration` is the iOS analog. |
| Suggestion connection events | ❌ | ✅ Android 10+ | Post-connection broadcast; failures on Android 11+. |
| WPA2/WPA3-Enterprise | ✅ PEAP/TTLS/TLS/FAST | ✅ PEAP/TTLS/TLS/PWD/SIM/AKA/AKA' | `security: { type: 'enterprise', eap }`. |
| Passpoint (Hotspot 2.0) | ✅ | ✅ Android 11+ (suggestions) | `security: { type: 'passpoint', passpoint, eap }`. |
| SSID-prefix join | ✅ iOS 13+ | ⚠️ `requestLocalNetwork` only | `ssidPrefix: true`. |
| Configured SSIDs | ✅ | ✅ (app suggestions) | `getConfiguredSSIDs()`. |
| Service discovery (DNS-SD) | ✅ `NWBrowser` | ✅ `NsdManager` | iOS needs `NSBonjourServices`. |
| Local network permission | ✅ Prompt + result | ✅ Always granted | `requestLocalNetworkPermission()`. |
| Internet reachability | ✅ `NWPath` | ✅ `NET_CAPABILITY_VALIDATED` | Optional HTTP probe on both. |
| Wi-Fi settings intent | ❌ | ✅ Android 10+ | `requestUserSavedNetwork()` opens the system panel. |
| Local-only hotspot | ❌ | ✅ Android 8+ | Returns generated SSID/passphrase/security. |
| Network diagnostics | ⚠️ Path-level | ✅ Capability + link level | `validated`/`captivePortal` are Android-only. |
| Network observer | ✅ `NWPathMonitor` | ✅ Default network callback | Continuous `NetworkDiagnostics` updates. |
| Capability report | ✅ | ✅ | `getWifiCapabilityStatus()` includes permission states. |

Platform support can vary by OS version, hardware, permission state, foreground/background state, and device-management policy.

## 📦 Installation

### React Native CLI

```bash
npm install munim-wifi react-native-nitro-modules
# or
yarn add munim-wifi react-native-nitro-modules
```

### Expo

```bash
npx expo install munim-wifi react-native-nitro-modules
```

> **Important:** This package requires a native Expo development build and does not work in Expo Go. After installing, run `npx expo run:ios`, `npx expo run:android`, or create a development build with EAS.

Add the included config plugin to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "munim-wifi",
        {
          "locationPermission": "Allow this app to find nearby Wi-Fi networks."
        }
      ]
    ]
  }
}
```

The plugin adds the Android Wi-Fi, location, and Nearby Wi-Fi Devices permissions; the iOS location and local-network descriptions and `NSBonjourServices`; and the iOS Access Wi-Fi Information and Hotspot Configuration entitlements.

All plugin options:

```json
[
  "munim-wifi",
  {
    "locationPermission": "Allow this app to find nearby Wi-Fi networks.",
    "localNetworkPermission": "Allow this app to find devices on your local network.",
    "bonjourServices": ["_http._tcp", "_ipp._tcp"],
    "android": {
      "locationOnAndroid13Plus": true,
      "neverForLocation": true
    }
  }
]
```

- `locationPermission`: iOS `NSLocationWhenInUseUsageDescription`.
- `localNetworkPermission`: iOS `NSLocalNetworkUsageDescription`.
- `bonjourServices`: service types for `startServiceDiscovery()`, added to `NSBonjourServices` next to `_munimwifi._tcp` (used by `requestLocalNetworkPermission()`).
- `android.locationOnAndroid13Plus` (default `true`): keep `ACCESS_FINE_LOCATION` on Android 13+ so `getCurrentNetwork()` can read the connected SSID/BSSID. Set `false` to cap location at API 32; scanning then needs only Nearby Wi-Fi Devices.
- `android.neverForLocation` (default `true`): declare `NEARBY_WIFI_DEVICES` with `usesPermissionFlags="neverForLocation"`. Set `false` only if your app derives physical location from Wi-Fi scans (scans then also need location on Android 13+).

> **Xcode 27 / iOS 27:** apps built with Xcode 27 crash at launch on iOS 27 unless they adopt the UIScene lifecycle ([expo/expo#46664](https://github.com/expo/expo/issues/46664)). This is an app setting, not a munim-wifi change: on Expo 57 use `expo` 57.0.23 or newer, run `npx expo install expo-build-properties`, and add `["expo-build-properties", { "ios": { "enableSceneSupport": true } }]` to your plugins (the example app does this).

Generate or rebuild native projects after changing the plugin configuration:

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

### iOS Setup

Bare React Native apps must enable these capabilities in Xcode:

- Access Wi-Fi Information
- Hotspot Configuration

Add a location usage message to `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses location permission to access Wi-Fi information.</string>
```

### Android Setup

The library manifest already declares what it needs and is merged into your app:

```xml
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES"
    android:usesPermissionFlags="neverForLocation" />
```

Location is capped at API 32 because Android 13+ gates scans with `NEARBY_WIFI_DEVICES` instead. If your app reads the connected network's SSID/BSSID (`getCurrentNetwork()`, `getNetworkSuggestionStatus()`'s `active` state) or uses suggestion connection events on Android 13+, lift the cap in your app manifest (add `xmlns:tools="http://schemas.android.com/tools"` to `<manifest>`):

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    tools:remove="android:maxSdkVersion" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"
    tools:remove="android:maxSdkVersion" />
```

If your app derives physical location from Wi-Fi scans, also drop the `neverForLocation` assertion (scans then need location as well as Nearby Wi-Fi Devices on 13+):

```xml
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES"
    tools:remove="android:usesPermissionFlags" />
```

The Expo config plugin does this for you (see its `android` options above).

## Permissions and OS Behavior

### iOS current-network access

Apple's `NEHotspotNetwork.fetchCurrent()` returns a network only when the app has the Access Wi-Fi Information entitlement and meets at least one qualifying condition, such as precise-location authorization, a network configured by the app, an active VPN configuration, or an active DNS settings configuration. See [Apple's `fetchCurrent` documentation](https://developer.apple.com/documentation/networkextension/nehotspotnetwork/fetchcurrent(completionhandler:)).

`disconnect()` can remove only a Wi-Fi configuration created by the app. It cannot remove or force-disconnect a network configured by the user or another app.

### Which permission each API needs

`requestWifiPermission()` asks for what scanning needs on the running OS (Nearby Wi-Fi Devices on Android 13+, precise location below; plus location on 13+ when your manifest declares it). Everything else is checked at call time.

| API | Android 13+ (API 33+) | Android 10–12L (API 29–32) | Android 9 and below | iOS |
| --- | --- | --- | --- | --- |
| `scanNetworks`, `startScan`, `getSSIDs`, `getWifiFingerprint`, `getRSSI`, `getBSSID`, `getChannelInfo`, `getNetworkInfo` | `NEARBY_WIFI_DEVICES` (plus `ACCESS_FINE_LOCATION` if the app did not declare `neverForLocation`) | `ACCESS_FINE_LOCATION` | `ACCESS_FINE_LOCATION` or `ACCESS_COARSE_LOCATION` | Access Wi-Fi Information entitlement + location (current network only) |
| `getCurrentNetwork`, `CurrentNetworkInfo` in diagnostics | `ACCESS_FINE_LOCATION` (the SSID/BSSID is redacted without it) | `ACCESS_FINE_LOCATION` | location | entitlement + location, or a network this app configured |
| `getIPAddress`, `getIPAddresses`, `getNetworkDiagnostics`, observer, `isInternetReachable` | none | none | none | none |
| `connectToNetwork`, `requestLocalNetwork` | `NEARBY_WIFI_DEVICES` | none | none (legacy `WifiManager`) | Hotspot Configuration entitlement |
| `configureNetwork`, suggestions | none (`CHANGE_WIFI_STATE`) | none | unsupported | Hotspot Configuration entitlement |
| Suggestion connection events | `ACCESS_FINE_LOCATION` | `ACCESS_FINE_LOCATION` | unsupported | unsupported |
| `startLocalOnlyHotspot` | `NEARBY_WIFI_DEVICES` (plus location without `neverForLocation`) | `ACCESS_FINE_LOCATION` | `ACCESS_FINE_LOCATION` | unsupported |
| `startServiceDiscovery` | none | none | none | Local Network permission + `NSBonjourServices` entry |

See [Android Wi-Fi permissions](https://developer.android.com/develop/connectivity/wifi/wifi-permissions).

### Android scan throttling

Android throttles `WifiManager.startScan()` (foreground apps: 4 scans every 2 minutes). When a continuous-scan request is refused, the cached batch is still delivered but flagged: `addNetworksFoundListener((networks, info) => …)` receives `info.throttled === true` and `info.fresh === false`, and `addScanThrottledListener` fires. `scanNetworks({ allowCached: false })` rejects instead of resolving with cached results. Each `WifiNetwork.timestamp` is when the radio last saw that network, so stale entries show their age.

### Android process binding

Android 10+ connections use `WifiNetworkSpecifier`. The OS presents a system approval flow and may create a local-only connection. `connectToNetwork()` binds the app process to the approved network; when that network is lost or `disconnect()` is called, the binding the app had before is restored.



## ⚡ Quick Start

### Basic Usage - Scan Networks

```typescript
import {
  getCurrentNetwork,
  isWifiEnabled,
  requestWifiPermission,
  scanNetworks,
} from 'munim-wifi'

const enabled = await isWifiEnabled()
if (!enabled) throw new Error('Wi-Fi is unavailable')

const hasPermission = await requestWifiPermission()
if (!hasPermission) throw new Error('Wi-Fi permission was not granted')

const [current, networks] = await Promise.all([
  getCurrentNetwork(),
  scanNetworks({ maxResults: 30, timeout: 10_000 }),
])

console.log('Current network:', current)
networks.forEach((network) => {
  console.log(network.ssid, network.bssid, network.rssi, network.channel)
})
```

### Continuous Scanning

```typescript
import {
  addNetworksFoundListener,
  addScanErrorListener,
  startScan,
  stopScan,
} from 'munim-wifi'

const removeResults = addNetworksFoundListener((networks, info) => {
  // info.throttled: Android refused a new scan; these are cached results.
  console.log(info.fresh ? 'Fresh scan' : 'Cached results', networks)
})
const removeError = addScanErrorListener(console.warn)

startScan({ interval: 30_000, maxResults: 30 })

// Later:
stopScan()
removeResults()
removeError()
```

### Connect to a Network

```typescript
import { connectToNetwork, disconnect } from 'munim-wifi'

await connectToNetwork({
  ssid: 'Workshop Wi-Fi',
  password: 'correct-horse-battery-staple',
  timeout: 30_000,
})

// Release/remove the app-managed connection later.
const released = await disconnect() // false when nothing app-owned was removed
```

Android 10+ and iOS both show system-controlled approval UI. WEP is unsupported on Android 10+.

## 🔧 API Reference

### Discovery Functions

#### `isWifiEnabled()`

- Android: whether the Wi-Fi radio is on (`WifiManager.isWifiEnabled`).
- iOS: whether a Wi-Fi interface currently offers a usable path (`NWPathMonitor(requiredInterfaceType: .wifi)`). Apple has no public radio-state API, so Wi-Fi switched on but not joined to any network reports `false`. This does not need location permission.

**Returns:** `Promise<boolean>`

#### `requestWifiPermission()`

Prompts natively (no `PermissionsAndroid` needed):

- Android 13+: `NEARBY_WIFI_DEVICES`, plus location when the app manifest declares it for this API level.
- Android 12L and below: `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`.
- iOS: When-In-Use location when it has not been determined.

**Returns:** `Promise<boolean>` — `true` when Wi-Fi scanning (Android) or current-network access (iOS) is permitted afterwards. Check `getWifiCapabilityStatus().locationPermission` for the location grant on Android 13+.

#### `scanNetworks(options?)`

Runs one Android scan or one iOS current-network lookup.

**Parameters:**

- `maxResults?` (`number`): Positive integer result limit.
- `timeout?` (`number`): Android timeout from 250 to 30,000 milliseconds.
- `allowCached?` (`boolean`): Android. When the OS refuses or fails a fresh scan, resolve with cached results (`true`, default) or reject (`false`).

**Returns:** `Promise<WifiNetwork[]>`

#### `startScan(options?)`

Starts repeated Android scans. On iOS, emits one current-network result because general scanning is unavailable.

**Parameters:**

- `maxResults?` (`number`): Positive integer result limit.
- `interval?` (`number`): 10,000 to 600,000 milliseconds. Defaults to 30,000.
- `timeout?` (`number`): Validation-compatible one-shot timeout value.

Use `addNetworksFoundListener()`, `addNetworkFoundListener()`, `addScanThrottledListener()`, or `addScanErrorListener()` before starting. Batch listeners receive `(networks, info: ScanResultInfo)` where `info` is `{ fresh, throttled, message? }`.

#### `stopScan()`

Stops continuous Android scanning and releases its broadcast receiver.

#### `getSSIDs()`

Returns visible SSIDs from the current scan information.

**Returns:** `Promise<string[]>`

#### `getWifiFingerprint()`

Returns visible/current networks and a millisecond timestamp.

**Returns:** `Promise<WifiFingerprint>`

### Network Information Functions

#### `getRSSI(ssid)`

Returns Android signal strength in dBm or `null`. iOS returns `null`.

#### `getBSSID(ssid)`

Returns the BSSID matching an SSID or `null`.

#### `getChannelInfo(ssid)`

Returns Android `{ channel, frequency }` data or `null`. iOS returns `null`.

#### `getNetworkInfo(ssid)`

Returns complete information for the first matching SSID or `null`.

#### `getCurrentNetwork()`

Returns `CurrentNetworkInfo` or `null`. Depending on the platform, it can contain SSID, BSSID, IP address, subnet mask, gateway, and DNS servers.

#### `getIPAddress()`

Returns the Wi-Fi interface's IPv4 address or `null`. Android reads it from the Wi-Fi network's `LinkProperties`, so no location permission is needed.

#### `getIPAddresses()`

Returns `{ interfaceName?, ipv4: string[], ipv6: string[] }` for the Wi-Fi interface, or `null`. IPv6 lists global and unique-local addresses first and link-local (`fe80::…%en0`) last, so IPv6-only networks are covered. `CurrentNetworkInfo.ipv6Addresses` carries the same IPv6 list.

### Connection Functions

#### `connectToNetwork(options)`

Starts the native connection flow.

**Parameters:**

- `ssid` (`string`): Required network name, limited to 32 UTF-8 bytes.
- `password?` (`string`): WPA/WPA2 or WEP password, limited to 64 UTF-8 bytes.
- `isWEP?` (`boolean`): Legacy WEP mode; unsupported on Android 10+.
- `security?` (`WifiSecurityType`): Optional explicit security type. When omitted, security is inferred from `password`/`isWEP` (open without a password, WPA2 with one). Pass `'wpa3'` to allow short SAE passphrases and use `setWpa3Passphrase` on Android.
- `bssid?` (`string`): Optional Android 10+ BSSID constraint.
- `joinOnce?` (`boolean`): Temporary connection behavior. Defaults to `true`; set explicitly to `false` to retain a saved configuration where supported.
- `timeout?` (`number`): Connection timeout from 5,000 to 120,000 milliseconds on iOS and Android.

**Returns:** `Promise<void>`

iOS settles each attempt once, verifies the resulting SSID when public APIs
expose it, and removes only a newly created persistent configuration after a
failed or timed-out attempt. Existing saved configurations are preserved.

#### `disconnect()`

Android releases the requested network and restores the previous process binding. iOS removes the app-created configuration for the current SSID (or the SSID this app last joined when the current network cannot be read).

**Returns:** `Promise<boolean>` — `true` when something owned by this app was released; `false` when there was nothing to remove (for example on iOS when the current network was configured by the user).

### Structured Connection Functions

These functions never reject on ordinary platform limitations — they resolve
with a structured outcome whose `status` explains what happened
(`'connected' | 'configured' | 'presented' | 'released' | 'unsupported' | 'cancelled' | 'failed'`).

#### `requestLocalNetwork(options)`

Requests a temporary, app-scoped connection to a nearby network.

- Android 10+: `WifiNetworkSpecifier` + `ConnectivityManager.requestNetwork`. Set `bindProcess: true` to route this process's traffic through the network. The returned `leaseId` releases the request later.
- iOS: `NEHotspotConfiguration` with `joinOnce: true`. The returned `leaseId` is the SSID.

**Parameters:** `{ ssid, security, bssid?, timeout?, bindProcess?, ssidPrefix? }` where `security` is one of
`{ type: 'open' } | { type: 'owe' } | { type: 'wep', passphrase } | { type: 'wpa2', passphrase } | { type: 'wpa3', passphrase } | { type: 'enterprise', eap } | { type: 'passpoint', passpoint, eap }`.

- `ssidPrefix: true` joins the first network whose SSID starts with `ssid` (iOS 13+ `NEHotspotConfiguration(ssidPrefix:)` for open/WEP/WPA personal; Android `setSsidPattern` with `PATTERN_PREFIX`).
- Enterprise works on both platforms (Android through `setWpa2EnterpriseConfig`/`setWpa3Enterprise…`); Passpoint is `unsupported` for Android local requests (use suggestions).

```typescript
await requestLocalNetwork({
  ssid: 'Corp',
  security: {
    type: 'enterprise',
    eap: {
      method: 'peap',
      phase2: 'mschapv2',
      identity: 'alice@example.com',
      password: 'secret',
      serverDomain: 'radius.example.com',
      caCertificates: [caPemOrBase64Der],
    },
  },
})
```

`EnterpriseCredentials`: `method` (`'peap' | 'ttls' | 'tls' | 'fast' | 'pwd' | 'sim' | 'aka' | 'akaPrime'`), `phase2?` (`'none' | 'pap' | 'chap' | 'mschap' | 'mschapv2' | 'gtc' | 'eap'`), `identity?`, `anonymousIdentity?`, `password?`, `serverDomain?` (Android `domainSuffixMatch`, iOS trusted server name), `trustedServerNames?` (iOS), `caCertificates?` (base64 DER or PEM), `clientCertificate?` (base64 PKCS#12, required for TLS) + `clientCertificatePassword?`, `wpa3?` (Android). iOS supports peap/ttls/tls/fast and imports certificates/identities into the app keychain (as `NEHotspotEAPSettings` requires). Android supports peap/ttls/tls/pwd/sim/aka/akaPrime; Android 11+ rejects enterprise suggestions without server validation (`caCertificates` + `serverDomain`).

`PasspointConfig`: `domainName`, `friendlyName?`, `realm?`, `naiRealmNames?`, `roamingConsortiumOIs?` (hex), `mccAndMncs?`, `roamingEnabled?` (iOS). For Passpoint the `ssid` is only an identifier; the configuration ID is the domain name. Android Passpoint credentials: TTLS (username/password), TLS (PKCS#12) or SIM/AKA (`mccAndMncs` required).

**Returns:** `Promise<ConnectionOutcome>` — `status: 'connected'` on success with `mode: 'localNetwork'`.

#### `configureNetwork(options)`

Persists a network configuration.

- iOS: persistent `NEHotspotConfiguration` (`configurationId` is the SSID, or the domain for Passpoint). Supports `ssidPrefix`, enterprise and Passpoint.
- Android 10+: routed through a network suggestion, since Android has no direct managed-configuration equivalent. `ssidPrefix` resolves `unsupported`.

**Returns:** `Promise<ConnectionOutcome>` — `status: 'configured'` with `mode: 'managedConfiguration'`.

#### `requestUserSavedNetwork(options?)`

- Android 10+: opens the system Wi-Fi panel (or the Android 11+ "add networks" flow when options are given) and resolves `status: 'presented'`.
- iOS: resolves `status: 'unsupported'`.

#### `releaseConnection(leaseOrConfigurationId)`

Releases a `requestLocalNetwork` lease (Android unregisters the callback and restores the previous process binding) or removes a configuration (iOS `removeConfiguration(forSSID:)` and, for Passpoint, `removeConfiguration(forHS20DomainName:)`). Resolves `status: 'released'`.

#### `getConfiguredSSIDs()`

iOS: `NEHotspotConfigurationManager.getConfiguredSSIDs()` (configurations this app created). Android: SSIDs (or Passpoint domains) of this app's network suggestions.

**Returns:** `Promise<string[]>`

#### `addNetworkSuggestion(options)` / `removeNetworkSuggestion(options)` / `getNetworkSuggestionStatus(options)`

Android 10+ `WifiManager` network suggestions with `open`, `owe`, `wpa2`, `wpa3`, `enterprise` and (Android 11+) `passpoint` support plus `hidden` and `appInteractionRequired` flags. Status values include `'added' | 'alreadyExists' | 'removed' | 'notFound' | 'active' | 'inactive'`. On iOS these resolve `status: 'unsupported'` — `NEHotspotConfiguration` (`configureNetwork`) is the closest analog.

**Returns:** `Promise<SuggestionOutcome>`

#### `addSuggestionConnectionListener(callback)`

Android 10+: `callback({ type, ssid?, failureReason?, message? })` for
`'postConnection'` (`ACTION_WIFI_NETWORK_SUGGESTION_POST_CONNECTION`; only for suggestions added with `appInteractionRequired: true`) and, on Android 11+, `'connectionFailure'` with `failureReason` `'association' | 'authentication' | 'ipProvisioning' | 'unknown'` (`addSuggestionConnectionStatusListener`). Both need `ACCESS_FINE_LOCATION`; an `'error'` event says so when it is missing.

**Returns:** an unsubscribe function, or `null` on iOS and Android 9 and below.

#### `startLocalOnlyHotspot()` / `stopLocalOnlyHotspot(reservationId)`

Android 8+ local-only hotspot (requires Nearby Wi-Fi Devices on Android 13+, location below). The outcome carries the generated `ssid`, `passphrase`, and `securityType`. iOS resolves `status: 'unsupported'`.

**Returns:** `Promise<HotspotOutcome>`

### Capability and Diagnostics Functions

#### `getWifiCapabilityStatus()`

Reports per-capability availability (`scan`, `localNetworkRequest`, `managedConfiguration`, `networkSuggestions`, `userSavedNetworkIntent`, `localOnlyHotspot`, `wifiDirect`, `wifiAware`, `wifiRtt`) and permission states (`locationPermission`, `nearbyWifiPermission`, `wifiInformationPermission`) for the current OS version.

**Returns:** `Promise<WifiCapabilityStatus>`

#### `getNetworkDiagnostics()`

One-shot snapshot of the default network.

- Android: `NetworkCapabilities` (`validated`, `captivePortal`, `metered`, `constrained`) plus `LinkProperties` (interface, addresses, DNS servers, routes, MTU).
- iOS: `NWPathMonitor` (`metered` from `isExpensive`, `constrained` from `isConstrained`); `validated`/`captivePortal` are not detectable and stay unset.

**Returns:** `Promise<NetworkDiagnostics>`

#### `isInternetReachable(options?)`

- Android: the default network has `NET_CAPABILITY_INTERNET` and `NET_CAPABILITY_VALIDATED` and is not a captive portal.
- iOS: the default `NWPath` is satisfied.
- With `{ probeUrl, timeout? }` the answer is an HTTP GET over that network instead (redirects are not followed, only 2xx counts, so captive portals report `false`). Use an https endpoint that returns 204, such as `https://www.google.com/generate_204`; Android blocks cleartext `http` unless your network security config allows it.

**Returns:** `Promise<boolean>`

#### `startNetworkObserver(callback)` / `stopNetworkObserver()` / `addNetworkObserverListener(callback)`

Continuous `NetworkDiagnostics` updates as the default network appears, changes capabilities, or is lost (`state: 'available' | 'lost' | 'unavailable'`). `addNetworkObserverListener` multiplexes many JS listeners over one native observer and returns a cleanup function.

### Local Network Functions

#### `startServiceDiscovery(type, handlers, options?)`

Browses for DNS-SD (Bonjour/mDNS) services such as `'_http._tcp'`.

```typescript
const discovery = startServiceDiscovery('_http._tcp', {
  onFound: (service) => console.log(service.name, service.host, service.port, txtRecordToObject(service.txt)),
  onLost: (service) => console.log('gone', service.id),
  onError: console.warn,
})
// Later:
discovery.stop() // or stopServiceDiscovery(discovery.id)
```

- `options`: `domain?` (default `'local.'`), `resolve?` (default `true`), `resolveTimeout?` (1,000–30,000 ms, default 5,000).
- `DiscoveredService`: `id` (`name.type.domain`, the same for found/lost), `name`, `type`, `domain`, `host?`, `port?`, `addresses`, `txt` (`{ key, value? }[]`), `interfaceName?`, `resolved`. A service is re-reported through `onFound` when its TXT record changes.
- Android: `NsdManager`; services are resolved one at a time with a timeout.
- iOS: `NWBrowser`; TXT comes from the browse result, host/port from a short-lived `NWConnection` to the service (opened and cancelled immediately). The type must be listed in `NSBonjourServices` and `NSLocalNetworkUsageDescription` must be set (config plugin: `bonjourServices`, `localNetworkPermission`), otherwise `onError` reports a policy denial.

#### `requestLocalNetworkPermission(timeoutMs?)`

iOS has no API to read the Local Network permission. This publishes and browses a private `_munimwifi._tcp` service (declared by the config plugin; bare apps add it to `NSBonjourServices`), which shows the prompt the first time. Resolves `'granted'` when the browse sees the service, `'denied'` when access is refused (judged after the alert is dismissed), or `'notDetermined'` if nothing is decided within `timeoutMs` (default 30,000). Android needs no runtime permission for mDNS and resolves `'granted'`.

**Returns:** `Promise<PermissionState>`

### Events

| API/event | Payload | Notes |
| --- | --- | --- |
| `addNetworkFoundListener(callback)` | `WifiNetwork` | Called once for every network in a result batch. |
| `addNetworksFoundListener(callback)` | `WifiNetwork[]`, `ScanResultInfo` | Called once per continuous result batch; `info.fresh`/`info.throttled` say whether the batch is new. |
| `addScanThrottledListener(callback)` | `ScanResultInfo` | Android refused a scan request; the cached batch follows. |
| `addScanErrorListener(callback)` | `string` | Continuous-scan error message. |
| `addEventListener('networkFound', callback)` | `WifiNetwork` | Generic listener alias. |
| `addEventListener('networksFound', callback)` | `WifiNetwork[]` | Generic listener alias. |
| `addEventListener('scanError', callback)` | `string` | Generic listener alias. |
| `addEventListener('scanThrottled', callback)` | `ScanResultInfo` | Generic listener alias. |

Each listener function returns a cleanup function. `addListener()` and `removeListeners()` remain deprecated compatibility shims.

### Types

```typescript
type WifiSecurityType =
  | 'open'
  | 'owe'
  | 'wep'
  | 'wpa2'
  | 'wpa3'
  | 'enterprise'
  | 'passpoint'
  | 'unknown'

interface WifiNetwork {
  ssid: string
  bssid: string
  rssi?: number
  frequency?: number
  channel?: number
  capabilities?: string
  isSecure?: boolean
  securityType: WifiSecurityType
  timestamp?: number // when the radio last saw it (Android ScanResult.timestamp)
}

interface ScanResultInfo {
  fresh: boolean
  throttled: boolean
  message?: string
}

interface IPAddressInfo {
  interfaceName?: string
  ipv4: string[]
  ipv6: string[]
}

interface CurrentNetworkInfo {
  ssid: string
  bssid: string
  securityType: WifiSecurityType
  ipAddress?: string
  ipv6Addresses?: string[]
  subnetMask?: string
  gateway?: string
  dnsServers?: string[]
}

interface WifiFingerprint {
  networks: WifiNetwork[]
  timestamp: number
  location?: { latitude?: number; longitude?: number }
}

interface ConnectionOutcome {
  status: ConnectionStatus // 'connected' | 'configured' | 'presented' | 'released' | 'unsupported' | 'cancelled' | 'failed'
  mode: ConnectionMode // 'localNetwork' | 'managedConfiguration' | 'userSavedNetwork'
  ssid?: string
  leaseId?: string
  configurationId?: string
  boundProcess: boolean
  message?: string
}

interface SuggestionOutcome {
  status: SuggestionStatus
  suggestionId?: string
  message?: string
}

interface HotspotOutcome {
  status: HotspotStatus // 'started' | 'stopped' | 'unsupported' | 'failed'
  reservationId?: string
  ssid?: string
  passphrase?: string
  securityType: WifiSecurityType
  message?: string
}

interface NetworkDiagnostics {
  timestamp: number
  state: NetworkState // 'available' | 'lost' | 'unavailable'
  validated?: boolean
  captivePortal?: boolean
  metered?: boolean
  constrained?: boolean
  currentNetwork?: CurrentNetworkInfo
  linkProperties?: NetworkLinkProperties
}
```

All public result, option, callback, and HybridObject types are exported from the package.

## 📖 Usage Examples

### Wi-Fi Fingerprint

```typescript
import { getWifiFingerprint, requestWifiPermission } from 'munim-wifi'

if (await requestWifiPermission()) {
  const fingerprint = await getWifiFingerprint()
  console.log('Captured at', new Date(fingerprint.timestamp))
  fingerprint.networks.forEach(({ ssid, bssid, rssi }) => {
    console.log(ssid, bssid, rssi)
  })
}
```

### React Network Scanner

```tsx
import { useEffect, useState } from 'react'
import { Button, FlatList, Text, View } from 'react-native'
import {
  requestWifiPermission,
  scanNetworks,
  type WifiNetwork,
} from 'munim-wifi'

export function NetworkScanner() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [message, setMessage] = useState('Ready')

  const scan = async () => {
    try {
      if (!(await requestWifiPermission())) {
        setMessage('Permission denied')
        return
      }
      setNetworks(await scanNetworks({ maxResults: 50, timeout: 10_000 }))
      setMessage('Scan complete')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  useEffect(() => () => setNetworks([]), [])

  return (
    <View>
      <Button title="Scan Wi-Fi" onPress={scan} />
      <Text>{message}</Text>
      <FlatList
        data={networks}
        keyExtractor={(network) => network.bssid || network.ssid}
        renderItem={({ item }) => (
          <Text>{item.ssid}: {item.rssi ?? '—'} dBm</Text>
        )}
      />
    </View>
  )
}
```

## 🔍 Troubleshooting

### Common Issues

- **The scan returns no Android networks:** Confirm Wi-Fi is enabled and `requestWifiPermission()` resolved `true` (Nearby Wi-Fi Devices on 13+, precise location and device Location Services below). Android also throttles repeated scans — check `info.throttled`.
- **Android 13+ connection throws a permission error:** Request Nearby Wi-Fi Devices permission with `requestWifiPermission()` before connecting.
- **`getCurrentNetwork()` is `null` on Android 13+:** reading the connected SSID still needs `ACCESS_FINE_LOCATION`; keep it declared without the API-32 cap (see Android Setup).
- **iOS service discovery reports a policy denial:** add the type to `NSBonjourServices`, set `NSLocalNetworkUsageDescription`, and allow Local Network access (Settings › Privacy & Security › Local Network).
- **iOS returns `null` for the current network:** Verify the Access Wi-Fi Information entitlement, precise-location authorization, and Apple's `fetchCurrent()` eligibility conditions.
- **iOS returns no RSSI/channel/frequency:** Those values are not exposed to ordinary iOS apps. This is expected.
- **The Android connection cannot reach a local device:** Keep the connection active and do not call `disconnect()` until local traffic is finished; the package binds the app process to the approved network.
- **WEP fails on modern Android:** `WifiNetworkSpecifier` does not support WEP. Use WPA2/WPA3 or an open network.

### Expo-Specific Issues

- This package does not work in Expo Go; create a development build.
- Run `npx expo prebuild --clean` after changing plugin options or upgrading the package.
- If iOS capabilities are missing, inspect the generated `.entitlements` file after prebuild.
- If Android permissions are missing, inspect the merged application manifest rather than only the library manifest.

### Debug Mode

The example app in [`example/`](./example) requests permission, displays current-network information, scans, and renders native result fields. Run it with:

```bash
npm install
npm --workspace munim-wifi-example run prebuild
npm --workspace munim-wifi-example run ios
# or
npm --workspace munim-wifi-example run android
```

## 👏 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines. Before opening a pull request, run:

```bash
npm install
npm run codegen
npm run build
npm run typecheck:example
npm pack --dry-run
```

Do not edit files in `nitrogen/generated` directly. Change `src/specs/munim-wifi.nitro.ts` and rerun `npm run codegen`.

### Local release (maintainers)

Releases run locally and do not require GitHub Actions. On the configured maintainer Mac, `npm run release:local` reads the npm publishing token from macOS Keychain and the GitHub token from the authenticated GitHub CLI session, then runs semantic-release. The credentials are never stored in this repository.

Use `npm run release:local -- --dry-run` to verify the next release without publishing it.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
