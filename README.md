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
- 🌐 **Local Routing:** Android 10+ binds the app process to the approved requested network until `disconnect()`.
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
| Local IPv4 address | ✅ | ✅ | Returns `null` when no Wi-Fi interface is available. |
| Connect | ✅ | ✅ | Both platforms use system-controlled user-consent flows. |
| Disconnect | ⚠️ Removes app configuration | ✅ | iOS cannot force-disconnect arbitrary saved networks. |
| Continuous scan | ⚠️ One current-network result | ✅ | Android scan throttling still applies. |
| Wi-Fi fingerprint | ⚠️ Current network only | ✅ | No location is inferred by the library. |

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

The plugin adds the Android Wi-Fi, location, and Nearby Wi-Fi Devices permissions; the iOS location description; and the iOS Access Wi-Fi Information and Hotspot Configuration entitlements.

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

Bare React Native apps should merge these permissions into the application manifest:

```xml
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" />
```

The Expo config plugin adds them automatically.

## Permissions and OS Behavior

### iOS current-network access

Apple's `NEHotspotNetwork.fetchCurrent()` returns a network only when the app has the Access Wi-Fi Information entitlement and meets at least one qualifying condition, such as precise-location authorization, a network configured by the app, an active VPN configuration, or an active DNS settings configuration. See [Apple's `fetchCurrent` documentation](https://developer.apple.com/documentation/networkextension/nehotspotnetwork/fetchcurrent(completionhandler:)).

`disconnect()` can remove only a Wi-Fi configuration created by the app. It cannot remove or force-disconnect a network configured by the user or another app.

### Android scan and connection access

Wi-Fi scans and scan results require precise-location permission. Android 13+ connection management also uses the Nearby Wi-Fi Devices runtime permission. See [Android Wi-Fi permissions](https://developer.android.com/develop/connectivity/wifi/wifi-permissions).

Android throttles `WifiManager.startScan()`. Foreground apps can still receive cached results when the OS declines a fresh scan, so the `timestamp` field records when this package converted the result, not when the radio last observed it.

Android 10+ connections use `WifiNetworkSpecifier`. The OS presents a system approval flow and may create a local-only connection. The library binds the app process to the approved network until `disconnect()` so app traffic can reach that network.

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

const removeResults = addNetworksFoundListener((networks) => {
  console.log('Updated networks:', networks)
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
await disconnect()
```

Android 10+ and iOS both show system-controlled approval UI. WEP is unsupported on Android 10+.

## 🔧 API Reference

### Discovery Functions

#### `isWifiEnabled()`

Checks whether Wi-Fi appears available to the app.

**Returns:** `Promise<boolean>`

On iOS this is inferred from current-network access because Apple does not expose a public Wi-Fi enabled-state API.

#### `requestWifiPermission()`

Requests precise-location and Nearby Wi-Fi Devices permissions on supported Android versions. On iOS, requests When In Use location authorization when it has not been determined.

**Returns:** `Promise<boolean>`

#### `scanNetworks(options?)`

Runs one Android scan or one iOS current-network lookup.

**Parameters:**

- `maxResults?` (`number`): Positive integer result limit.
- `timeout?` (`number`): Android timeout from 250 to 30,000 milliseconds.

**Returns:** `Promise<WifiNetwork[]>`

#### `startScan(options?)`

Starts repeated Android scans. On iOS, emits one current-network result because general scanning is unavailable.

**Parameters:**

- `maxResults?` (`number`): Positive integer result limit.
- `interval?` (`number`): 10,000 to 600,000 milliseconds. Defaults to 30,000.
- `timeout?` (`number`): Validation-compatible one-shot timeout value.

Use `addNetworksFoundListener()`, `addNetworkFoundListener()`, or `addScanErrorListener()` before starting.

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

Returns the current Wi-Fi interface's local IPv4 address or `null`.

### Connection Functions

#### `connectToNetwork(options)`

Starts the native connection flow.

**Parameters:**

- `ssid` (`string`): Required network name.
- `password?` (`string`): WPA/WPA2 or WEP password.
- `isWEP?` (`boolean`): Legacy WEP mode; unsupported on Android 10+.
- `bssid?` (`string`): Optional Android 10+ BSSID constraint.
- `joinOnce?` (`boolean`): iOS `NEHotspotConfiguration.joinOnce` value.
- `timeout?` (`number`): Android timeout from 5,000 to 120,000 milliseconds.

**Returns:** `Promise<void>`

#### `disconnect()`

Android releases the requested network and clears process binding. iOS removes the app-created configuration for the current SSID.

**Returns:** `Promise<void>`

### Events

| API/event | Payload | Notes |
| --- | --- | --- |
| `addNetworkFoundListener(callback)` | `WifiNetwork` | Called once for every network in a result batch. |
| `addNetworksFoundListener(callback)` | `WifiNetwork[]` | Called once per continuous result batch. |
| `addScanErrorListener(callback)` | `string` | Continuous-scan error message. |
| `addEventListener('networkFound', callback)` | `WifiNetwork` | Generic listener alias. |
| `addEventListener('networksFound', callback)` | `WifiNetwork[]` | Generic listener alias. |
| `addEventListener('scanError', callback)` | `string` | Generic listener alias. |

Each listener function returns a cleanup function. `addListener()` and `removeListeners()` remain deprecated compatibility shims.

### Types

```typescript
interface WifiNetwork {
  ssid: string
  bssid: string
  rssi?: number
  frequency?: number
  channel?: number
  capabilities?: string
  isSecure?: boolean
  timestamp?: number
}

interface CurrentNetworkInfo {
  ssid: string
  bssid: string
  ipAddress?: string
  subnetMask?: string
  gateway?: string
  dnsServers?: string[]
}

interface WifiFingerprint {
  networks: WifiNetwork[]
  timestamp: number
  location?: { latitude?: number; longitude?: number }
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

- **The scan returns no Android networks:** Confirm Wi-Fi is enabled, precise-location permission is granted, and device Location Services are enabled. Android can also throttle repeated scans.
- **Android 13+ connection throws a permission error:** Request Nearby Wi-Fi Devices permission with `requestWifiPermission()` before connecting.
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
