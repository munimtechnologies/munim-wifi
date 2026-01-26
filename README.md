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
  <a aria-label="Package is free to use" href="https://github.com/munimtechnologies/munim-wifi/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-success.svg?style=flat-square&color=33CC12" target="_blank" />
  </a>
  <a aria-label="package downloads" href="https://www.npmtrends.com/munim-wifi" target="_blank">
    <img alt="Downloads" src="https://img.shields.io/npm/dm/munim-wifi.svg?style=flat-square&labelColor=gray&color=33CC12&label=Downloads" />
  </a>
  <a aria-label="total package downloads" href="https://www.npmjs.com/package/munim-wifi" target="_blank">
    <img alt="Total Downloads" src="https://img.shields.io/npm/dt/munim-wifi.svg?style=flat-square&labelColor=gray&color=0066CC&label=Total%20Downloads" />
  </a>
</p>

<p align="center">
  <a aria-label="try with expo" href="https://docs.expo.dev/"><b>Works with Expo</b></a>
&ensp;•&ensp;
  <a aria-label="documentation" href="https://github.com/munimtechnologies/munim-wifi#readme">Read the Documentation</a>
&ensp;•&ensp;
  <a aria-label="report issues" href="https://github.com/munimtechnologies/munim-wifi/issues">Report Issues</a>
</p>

<h6 align="center">Follow Munim Technologies</h6>
<p align="center">
  <a aria-label="Follow Munim Technologies on GitHub" href="https://github.com/munimtechnologies" target="_blank">
    <img alt="Munim Technologies on GitHub" src="https://img.shields.io/badge/GitHub-222222?style=for-the-badge&logo=github&logoColor=white" target="_blank" />
  </a>&nbsp;
  <a aria-label="Follow Munim Technologies on LinkedIn" href="https://linkedin.com/in/sheehanmunim" target="_blank">
    <img alt="Munim Technologies on LinkedIn" src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" target="_blank" />
  </a>&nbsp;
  <a aria-label="Visit Munim Technologies Website" href="https://munimtech.com" target="_blank">
    <img alt="Munim Technologies Website" src="https://img.shields.io/badge/Website-0066CC?style=for-the-badge&logo=globe&logoColor=white" target="_blank" />
  </a>
</p>

## Introduction

**munim-wifi** is a comprehensive React Native library for Wi-Fi network scanning and analysis. This library allows your React Native app to scan for nearby Wi-Fi networks, retrieve detailed network information including SSIDs, BSSIDs (MAC addresses), RSSI (signal strength), channels, frequencies, and perform Wi-Fi fingerprinting for location-based services.

**Fully compatible with Expo!** Works seamlessly with both Expo managed and bare workflows.

**Built with React Native's Nitro modules architecture** for high performance and reliability.

**Note**: This library focuses on reliability and platform compatibility. It supports core Wi-Fi scanning features that work consistently across both Android and iOS platforms.

## Table of contents

- [📚 Documentation](#-documentation)
- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [⚡ Quick Start](#-quick-start)
- [🔧 API Reference](#-api-reference)
- [📖 Usage Examples](#-usage-examples)
- [🔍 Troubleshooting](#-troubleshooting)
- [👏 Contributing](#-contributing)
- [📄 License](#-license)

## 📚 Documentation

<p>Learn about building Wi-Fi scanning apps <a aria-label="documentation" href="https://github.com/munimtechnologies/munim-wifi#readme">in our documentation!</a></p>

- [Getting Started](#-installation)
- [API Reference](#-api-reference)
- [Usage Examples](#-usage-examples)
- [Troubleshooting](#-troubleshooting)

## 🚀 Features

### Wi-Fi Scanning

- 📡 **Network Scanning**: Scan for nearby Wi-Fi networks with detailed information
- 📶 **Signal Strength**: Get RSSI (signal strength) values for all networks (Android only)
- 🔍 **Network Details**: Retrieve SSIDs, BSSIDs (MAC addresses), channels, and frequencies (Android only)
- 📊 **Wi-Fi Fingerprinting**: Create comprehensive Wi-Fi fingerprints for location services
- 🔄 **Continuous Scanning**: Support for continuous scanning with event-based updates (Android only)
- 📱 **Cross-platform**: Works on both iOS and Android

### Network Management

- 🔌 **Connect to Networks**: Programmatically connect to Wi-Fi networks
- 🔌 **Disconnect**: Disconnect from current Wi-Fi network
- 📱 **Current Network Info**: Get information about currently connected network
- 🌐 **IP Address**: Retrieve IP address information for current connection

### Additional Features

- 📱 **Cross-platform**: Works on both iOS and Android (with platform-specific limitations)
- 🎯 **TypeScript Support**: Full TypeScript definitions included
- ⚡ **High Performance**: Built with React Native's Nitro modules architecture
- 🚀 **Expo Compatible**: Works seamlessly with Expo managed and bare workflows
- 🔐 **Permission Handling**: Built-in permission request helpers

### ⚠️ Platform Limitations

#### iOS Limitations

**Critical: CoreWLAN is macOS Only**
CoreWLAN framework is NOT available on iOS - it only works on macOS. The iOS implementation uses `NEHotspotNetwork` and `NEHotspotConfiguration` APIs.

**iOS Wi-Fi Scanning Capabilities:**
iOS has very limited Wi-Fi scanning capabilities:

✅ **Available on iOS:**
- Get SSID (network name) - via `NEHotspotNetwork.fetchCurrent()`
- Get BSSID (MAC address) - via `NEHotspotNetwork.fetchCurrent()`
- Connect to Wi-Fi networks - via `NEHotspotConfiguration`
- Disconnect from Wi-Fi - via `NEHotspotConfiguration`
- Get current connected network info

❌ **NOT Available on iOS:**
- RSSI (signal strength) - Cannot be retrieved for scanned networks
- Channel information - Not available
- Frequency information - Not available
- General network scanning - Only works for hotspot networks via NEHotspotHelper (requires special entitlement)

**iOS Requirements:**
- Location permission (precise location) required
- "Access Wi-Fi Information" entitlement in Xcode
- "Hotspot Configuration" capability for connecting to networks
- iOS 13+ requires location permission

#### Android Limitations

**Scanning Restrictions:**
- `WifiManager.startScan()` is deprecated in Android P (API 28) but still works
- **Throttling limits:**
  - Foreground apps: 4 scans every 2 minutes
  - Background apps: More restrictive
- Requires location permission (Android 6.0+)
- Passive listening available on Android 10+ (API 29)

✅ **Available on Android:**
- Full network scanning with SSID, BSSID, RSSI, channel, frequency
- Connect/disconnect to networks
- Get current network info
- All features work, but with throttling limits

#### Feature Support Matrix

| Feature | iOS | Android | Notes |
|---------|-----|---------|-------|
| Scan networks | ⚠️ Limited | ✅ Full | iOS: SSID/BSSID only, no RSSI/channel/frequency |
| Get SSID | ✅ | ✅ | Both platforms |
| Get BSSID | ✅ | ✅ | Both platforms |
| Get RSSI | ❌ | ✅ | iOS: Not available for scanned networks |
| Get Channel | ❌ | ✅ | iOS: Not available |
| Get Frequency | ❌ | ✅ | iOS: Not available |
| Connect to network | ✅ | ✅ | Both platforms (requires entitlements/capabilities) |
| Disconnect | ✅ | ✅ | Both platforms |
| Get current network | ✅ | ✅ | Both platforms |
| Wi-Fi fingerprinting | ⚠️ Limited | ✅ Full | iOS: Limited to SSID/BSSID only |

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

> **Note**: This library requires Expo SDK 50+ and works with both managed and bare workflows. To support Nitro modules, you need React Native version v0.78.0 or higher.

### iOS Setup

For iOS, the library is automatically linked. However, you need to add the following to your `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses location services to scan for nearby Wi-Fi networks</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses location services to scan for nearby Wi-Fi networks</string>
```

**For Expo projects**, add these permissions to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app uses location services to scan for nearby Wi-Fi networks",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app uses location services to scan for nearby Wi-Fi networks"
      }
    }
  }
}
```

### Android Setup

For Android, add the following permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**For Expo projects**, add these permissions to your `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.CHANGE_WIFI_STATE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

## ⚡ Quick Start

### Basic Usage - Scan Networks

```typescript
import { scanNetworks, requestWifiPermission, isWifiEnabled } from 'munim-wifi'

// Check if Wi-Fi is enabled
const wifiEnabled = await isWifiEnabled()
if (!wifiEnabled) {
  console.log('Wi-Fi is not enabled')
  return
}

// Request permissions (required for scanning)
const hasPermission = await requestWifiPermission()
if (!hasPermission) {
  console.log('Location permission not granted')
  return
}

// Scan for networks
const networks = await scanNetworks()
console.log(`Found ${networks.length} networks`)

networks.forEach(network => {
  console.log(`SSID: ${network.ssid}`)
  console.log(`BSSID: ${network.bssid}`)
  console.log(`RSSI: ${network.rssi} dBm`)
  console.log(`Channel: ${network.channel}`)
  console.log(`Frequency: ${network.frequency} MHz`)
  console.log(`Secure: ${network.isSecure}`)
})
```

### Get Specific Network Information

```typescript
import { getSSIDs, getRSSI, getBSSID, getChannelInfo, getNetworkInfo } from 'munim-wifi'

// Get all SSIDs
const ssids = await getSSIDs()
console.log('Available networks:', ssids)

// Get RSSI for a specific network
const rssi = await getRSSI('MyNetwork')
console.log('Signal strength:', rssi, 'dBm')

// Get BSSID (MAC address) for a network
const bssid = await getBSSID('MyNetwork')
console.log('BSSID:', bssid)

// Get channel information
const channelInfo = await getChannelInfo('MyNetwork')
if (channelInfo) {
  console.log('Channel:', channelInfo.channel)
  console.log('Frequency:', channelInfo.frequency, 'MHz')
}

// Get all information for a network
const networkInfo = await getNetworkInfo('MyNetwork')
if (networkInfo) {
  console.log('Full network info:', networkInfo)
}
```

### Wi-Fi Fingerprinting

```typescript
import { getWifiFingerprint } from 'munim-wifi'

// Get Wi-Fi fingerprint (useful for location services)
const fingerprint = await getWifiFingerprint()
console.log('Fingerprint timestamp:', fingerprint.timestamp)
console.log('Networks found:', fingerprint.networks.length)

fingerprint.networks.forEach(network => {
  console.log(`${network.ssid}: ${network.rssi} dBm on channel ${network.channel}`)
})
```

### Continuous Scanning

```typescript
import { startScan, stopScan, addNetworkFoundListener } from 'munim-wifi'

// Start continuous scanning
startScan()

// Listen for discovered networks
const unsubscribe = addNetworkFoundListener((network) => {
  console.log('Network found:', network.ssid, network.rssi, 'dBm')
})

// Stop scanning when done
// stopScan()
// unsubscribe()
```

## 🔧 API Reference

### Core Functions

#### `isWifiEnabled()`

Checks if Wi-Fi is enabled on the device.

**Returns:** Promise<boolean>

#### `requestWifiPermission()`

Requests Wi-Fi permissions (Android) or checks authorization status (iOS).
On Android, this requests location permission which is required for Wi-Fi scanning.
On iOS, this checks location authorization status.

**Returns:** Promise<boolean>

#### `scanNetworks(options?)`

Scans for nearby Wi-Fi networks.

**Parameters:**

- `options?` (object):
  - `maxResults?` (number): Maximum number of results to return
  - `timeout?` (number): Timeout in milliseconds (default: 10000)

**Returns:** Promise<WifiNetwork[]>

#### `startScan(options?)`

Starts continuous Wi-Fi scanning. Results will be emitted via events.

**Parameters:**

- `options?` (object):
  - `maxResults?` (number): Maximum number of results to return
  - `timeout?` (number): Timeout in milliseconds

#### `stopScan()`

Stops continuous Wi-Fi scanning.

#### `getSSIDs()`

Gets list of SSIDs (network names) from the last scan.

**Returns:** Promise<string[]>

#### `getWifiFingerprint()`

Gets Wi-Fi fingerprint containing all network information.
This includes SSIDs, BSSIDs, RSSI, channels, and frequencies.

**Returns:** Promise<WifiFingerprint>

#### `getRSSI(ssid)`

Gets RSSI (signal strength) for a specific network by SSID.

**Parameters:**

- `ssid` (string): The SSID of the network

**Returns:** Promise<number | null>

#### `getBSSID(ssid)`

Gets BSSID (MAC address) for a specific network by SSID.

**Parameters:**

- `ssid` (string): The SSID of the network

**Returns:** Promise<string | null>

#### `getChannelInfo(ssid)`

Gets channel and frequency information for a specific network by SSID.
**Note: Not available on iOS - returns null.**

**Parameters:**

- `ssid` (string): The SSID of the network

**Returns:** Promise<ChannelInfo | null>

#### `getNetworkInfo(ssid)`

Gets all available information for a specific network by SSID.
**Note: On iOS, RSSI, channel, and frequency will be undefined.**

**Parameters:**

- `ssid` (string): The SSID of the network

**Returns:** Promise<WifiNetwork | null>

#### `getCurrentNetwork()`

Gets information about the currently connected Wi-Fi network.

**Returns:** Promise<CurrentNetworkInfo | null>

#### `connectToNetwork(options)`

Connects to a Wi-Fi network.
**Note: Requires appropriate permissions and capabilities on both platforms.**

**Parameters:**

- `options` (ConnectionOptions):
  - `ssid` (string): The SSID of the network
  - `password?` (string): Optional password for secured networks
  - `isWEP?` (boolean): Whether the network uses WEP encryption

**Returns:** Promise<void>

#### `disconnect()`

Disconnects from the current Wi-Fi network.

**Returns:** Promise<void>

#### `getIPAddress()`

Gets IP address information for the current Wi-Fi connection.

**Returns:** Promise<string | null>

### Event Management

#### `addNetworkFoundListener(callback)`

Adds a network found event listener (for continuous scanning).

**Parameters:**

- `callback` (function): Function to call when a network is found

**Returns:** Function to remove the listener

#### `addEventListener(eventName, callback)`

Adds an event listener.

**Parameters:**

- `eventName` (string): The name of the event to listen for
- `callback` (function): The callback to invoke when the event occurs

**Returns:** Function to remove the listener

### Types

#### `WifiNetwork`

```typescript
interface WifiNetwork {
  ssid: string
  bssid: string
  rssi?: number // Not available on iOS
  frequency?: number // Not available on iOS
  channel?: number // Not available on iOS
  capabilities?: string
  isSecure?: boolean
  timestamp?: number
}
```

#### `CurrentNetworkInfo`

```typescript
interface CurrentNetworkInfo {
  ssid: string
  bssid: string
  ipAddress?: string
  subnetMask?: string
  gateway?: string
  dnsServers?: string[]
}
```

#### `ConnectionOptions`

```typescript
interface ConnectionOptions {
  ssid: string
  password?: string
  isWEP?: boolean
}
```

#### `WifiFingerprint`

```typescript
interface WifiFingerprint {
  networks: WifiNetwork[]
  timestamp: number
  location?: {
    latitude?: number
    longitude?: number
  }
}
```

#### `ScanOptions`

```typescript
interface ScanOptions {
  maxResults?: number
  timeout?: number
}
```

## 📖 Usage Examples

### Network Scanner Component

```typescript
import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, Button } from 'react-native'
import {
  scanNetworks,
  requestWifiPermission,
  isWifiEnabled,
  type WifiNetwork,
} from 'munim-wifi'

const NetworkScanner = () => {
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [scanning, setScanning] = useState(false)

  const handleScan = async () => {
    setScanning(true)
    
    // Check Wi-Fi status
    const wifiEnabled = await isWifiEnabled()
    if (!wifiEnabled) {
      alert('Please enable Wi-Fi')
      setScanning(false)
      return
    }

    // Request permissions
    const hasPermission = await requestWifiPermission()
    if (!hasPermission) {
      alert('Location permission is required for Wi-Fi scanning')
      setScanning(false)
      return
    }

    // Scan networks
    const results = await scanNetworks({ maxResults: 20 })
    setNetworks(results)
    setScanning(false)
  }

  return (
    <View>
      <Button
        title={scanning ? 'Scanning...' : 'Scan Networks'}
        onPress={handleScan}
        disabled={scanning}
      />
      <FlatList
        data={networks}
        keyExtractor={(item) => item.bssid}
        renderItem={({ item }) => (
          <View>
            <Text>{item.ssid}</Text>
            <Text>Signal: {item.rssi} dBm</Text>
            <Text>Channel: {item.channel}</Text>
            <Text>BSSID: {item.bssid}</Text>
            <Text>Secure: {item.isSecure ? 'Yes' : 'No'}</Text>
          </View>
        )}
      />
    </View>
  )
}
```

### Wi-Fi Fingerprinting for Location

```typescript
import { getWifiFingerprint } from 'munim-wifi'

const collectFingerprint = async () => {
  const fingerprint = await getWifiFingerprint()
  
  // Send fingerprint to your backend for location matching
  await fetch('https://your-api.com/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fingerprint: fingerprint.networks.map(n => ({
        bssid: n.bssid,
        rssi: n.rssi,
        channel: n.channel,
      })),
      timestamp: fingerprint.timestamp,
    }),
  })
}
```

### Signal Strength Monitor

```typescript
import { startScan, addNetworkFoundListener, stopScan } from 'munim-wifi'

const monitorSignalStrength = (targetSSID: string) => {
  const rssiHistory: number[] = []
  
  const unsubscribe = addNetworkFoundListener((network) => {
    if (network.ssid === targetSSID) {
      rssiHistory.push(network.rssi)
      console.log(`Current RSSI: ${network.rssi} dBm`)
      console.log(`Average RSSI: ${rssiHistory.reduce((a, b) => a + b, 0) / rssiHistory.length} dBm`)
    }
  })
  
  startScan()
  
  // Stop after 30 seconds
  setTimeout(() => {
    stopScan()
    unsubscribe()
  }, 30000)
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you have the necessary location permissions in your app. On Android 6.0+, location permission is required for Wi-Fi scanning.

2. **No Networks Found**: 
   - Verify Wi-Fi is enabled on the device
   - Check that location permissions are granted
   - On iOS, ensure location services are enabled in Settings

3. **Scan Timeout**: Increase the timeout value in scan options or check network connectivity

4. **Empty Results**: Make sure you've called `scanNetworks()` or `startScan()` before calling `getSSIDs()` or other getter methods

### Expo-Specific Issues

1. **Development Build Required**: This library requires a development build in Expo. Use `npx expo run:ios` or `npx expo run:android`

2. **Permissions Not Working**: Make sure you've added the permissions to your `app.json` as shown in the setup section

3. **Build Errors**: Ensure you're using Expo SDK 50+ and have the latest Expo CLI

4. **Nitro Modules**: Make sure you have `react-native-nitro-modules` installed and configured

### Platform-Specific Notes

**Android:**
- Requires `ACCESS_FINE_LOCATION` or `ACCESS_COARSE_LOCATION` permission
- Wi-Fi scanning may be limited on some devices
- Background scanning has restrictions on Android 8.0+

**iOS:**
- Requires location permission for Wi-Fi scanning
- CoreWLAN framework is used for scanning
- Some network information may be limited for privacy reasons

## 👏 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<img alt="Star the Munim Technologies repo on GitHub to support the project" src="https://user-images.githubusercontent.com/9664363/185428788-d762fd5d-97b3-4f59-8db7-f72405be9677.gif" width="50%">
