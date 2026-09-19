## [0.4.1](https://github.com/munimtechnologies/munim-wifi/compare/v0.4.0...v0.4.1) (2026-09-19)

### 🐛 Bug Fixes

* **ios:** stop optional option objects arriving as garbage in Release builds ([5580c96](https://github.com/munimtechnologies/munim-wifi/commit/5580c966984e6107c751901f0095183a705b8b61)), closes [margelo/nitro#1319](https://github.com/margelo/nitro/issues/1319) [swiftlang/swift#84848](https://github.com/swiftlang/swift/issues/84848)

## [0.4.0](https://github.com/munimtechnologies/munim-wifi/compare/v0.3.3...v0.4.0) (2026-09-19)

### ✨ Features

* add DNS-SD service discovery and the iOS local network permission request ([a6fa4e2](https://github.com/munimtechnologies/munim-wifi/commit/a6fa4e29121c55049ba4d5f0d7ae89b5a6191e52))
* add isInternetReachable with an optional HTTP probe ([b10f1eb](https://github.com/munimtechnologies/munim-wifi/commit/b10f1ebbcb719608bbf827a3013bf45024095430))
* **android:** report network-suggestion connections and connection failures ([df03717](https://github.com/munimtechnologies/munim-wifi/commit/df037178e9a732548e08803ad351cfaa8e6f9e7b))
* join networks by SSID prefix and list configured SSIDs ([0a8c423](https://github.com/munimtechnologies/munim-wifi/commit/0a8c42302992cd014c3e6e7ba9ba6cafe782f9ba))
* return IPv6 addresses for the Wi-Fi interface ([5360042](https://github.com/munimtechnologies/munim-wifi/commit/536004270d14d97e95a478704b8992ff174fa2ad))
* support WPA2/WPA3-Enterprise and Passpoint networks ([5980fc6](https://github.com/munimtechnologies/munim-wifi/commit/5980fc6b4ca40c61eca8ec71d2bc4caeef08d4bd)), closes [PKCS#12](https://github.com/munimtechnologies/PKCS/issues/12)

### 🐛 Bug Fixes

* **android:** report scan throttling instead of passing cached results off as fresh ([e3805fc](https://github.com/munimtechnologies/munim-wifi/commit/e3805fc2e79910e07d59c126bfa1ae328957fac1))
* **android:** request Wi-Fi permissions natively and stop requiring location on 13+ ([24e208b](https://github.com/munimtechnologies/munim-wifi/commit/24e208b07a4596b26d49b72a3869f8c055552cbe))
* **android:** restore the previous process binding when a connectToNetwork network is lost ([660cf3b](https://github.com/munimtechnologies/munim-wifi/commit/660cf3b3cd6bbb1e2c4757b3c6dd6d3e0569feb3))
* **ios:** fix path-monitor leak, truthful isWifiEnabled, accurate disconnect result ([880a292](https://github.com/munimtechnologies/munim-wifi/commit/880a292b346c6eb1f7467127f9cc3170f45f2a76))

### 📚 Documentation

* document per-API permissions, throttling flags and the new Wi-Fi APIs ([0184dbf](https://github.com/munimtechnologies/munim-wifi/commit/0184dbfc6ae33bbd41d8df43e61900100115389e))

### 🛠️ Other changes

* **deps:** bump expo 57.0.24, react-native 0.86.3, jest 30, builder-bob 0.43 ([739a7d1](https://github.com/munimtechnologies/munim-wifi/commit/739a7d1005c944b606c8fecec2e9dadd586e5294))
* **example:** adopt the UIScene lifecycle for Xcode 27 / iOS 27 ([8326eb3](https://github.com/munimtechnologies/munim-wifi/commit/8326eb382030a9ee3c434b70007ffda11ddfdbd1)), closes [expo/expo#46664](https://github.com/expo/expo/issues/46664)
* **example:** sign the example with the Lackin LLC team under a unique bundle id ([2bfdc41](https://github.com/munimtechnologies/munim-wifi/commit/2bfdc4145e9dfeac0c529ab7cf96a044f5c36a68))

## [0.3.3](https://github.com/munimtechnologies/munim-wifi/compare/v0.3.2...v0.3.3) (2026-09-14)

### 🛠️ Other changes

* **deps:** override js-yaml to 3.15.2/4.3.2 for GHSA-2883-xcg3-v3hh ([11455f3](https://github.com/munimtechnologies/munim-wifi/commit/11455f31a06d32b971bce37a2afc51193ed58cdc))

## [0.3.2](https://github.com/munimtechnologies/munim-wifi/compare/v0.3.1...v0.3.2) (2026-09-05)

### 🐛 Bug Fixes

* **android:** reject WEP networks in the Android 10+ specifier path ([86235d7](https://github.com/munimtechnologies/munim-wifi/commit/86235d7f978559d090b81059049ae73fd4e0c483))
* **deps:** override transitive uuid to 11.1.1 (GHSA buffer bounds check) ([8fdbc1f](https://github.com/munimtechnologies/munim-wifi/commit/8fdbc1f32626838769066578aa241d3ef56a35d1))

### 🛠️ Other changes

* regenerate Nitro bindings and refresh dependencies ([5a47cb6](https://github.com/munimtechnologies/munim-wifi/commit/5a47cb63bee9c3e2a8d2fef83f4c7199601a7e18)), closes [margelo/nitro#1573](https://github.com/margelo/nitro/issues/1573)

## [0.3.1](https://github.com/munimtechnologies/munim-wifi/compare/v0.3.0...v0.3.1) (2026-08-12)

### 🐛 Bug Fixes

* **android:** declare CHANGE_NETWORK_STATE + ACCESS_NETWORK_STATE for requestLocalNetwork ([fd92080](https://github.com/munimtechnologies/munim-wifi/commit/fd92080f6e67b9ae2d30a35f1a89f563f6cb68f8))

### 🛠️ Other changes

* restore GitHub Actions workflows ([e8d58f6](https://github.com/munimtechnologies/munim-wifi/commit/e8d58f6a103b209c6d048c54cbb1b48e3da89806))

## [0.3.0](https://github.com/munimtechnologies/munim-wifi/compare/v0.2.1...v0.3.0) (2026-08-12)

### ✨ Features

* connection API v2 - typed security, structured outcomes, network suggestions, local-only hotspot, diagnostics, and network observer ([d7437de](https://github.com/munimtechnologies/munim-wifi/commit/d7437deed96e432a40f2a0ea77778eabd2ed9182))

### 🐛 Bug Fixes

* release from main branch ([ba032a7](https://github.com/munimtechnologies/munim-wifi/commit/ba032a726bc600fcbd45883b9eafd83676f51434))

### 🛠️ Other changes

* drop GitHub Actions; release locally via release:local ([d4ce09d](https://github.com/munimtechnologies/munim-wifi/commit/d4ce09d8020e986745c79bbfaa3dfdea75751b5d))

## [0.2.1](https://github.com/munimtechnologies/munim-wifi/compare/v0.2.0...v0.2.1) (2026-08-08)

### 🐛 Bug Fixes

* isolate local npm publishing credentials ([9f73a2f](https://github.com/munimtechnologies/munim-wifi/commit/9f73a2fd7ca54114e074f9acae1a53e1fa9e2cbc))
* use Apache-2.0 license ([50e2b76](https://github.com/munimtechnologies/munim-wifi/commit/50e2b761acb35d396f53fd89beb25117f519725c))

## [0.2.0](https://github.com/munimtechnologies/munim-wifi/compare/v0.1.11...v0.2.0) (2026-08-06)

### ✨ Features

* modernize Expo Wi-Fi Nitro module ([0a7e29e](https://github.com/munimtechnologies/munim-wifi/commit/0a7e29e5e7c71a48700dca4f17d2526627f65254))

### 🐛 Bug Fixes

* update package names to reflect correct project naming ([3d86a9a](https://github.com/munimtechnologies/munim-wifi/commit/3d86a9ae5fbde56cd00ba0e97f647d00f9543044))

### 📚 Documentation

* polish README branding and platform badges ([51eb235](https://github.com/munimtechnologies/munim-wifi/commit/51eb235f68eead3110ad0b89e0913ed2be7c9c87))

### 🛠️ Other changes

* add Keychain-backed local releases ([b25be87](https://github.com/munimtechnologies/munim-wifi/commit/b25be870cbb5e232b993926b2feefb9f9735db46))
* **release:** 0.2.0 [skip ci] ([2736938](https://github.com/munimtechnologies/munim-wifi/commit/27369382134af96ce7824db09b38f5910016133c))

# Changelog

All notable changes to this project are documented in this file. Releases are generated from Conventional Commits.

## Next

- Upgrade the Nitro toolchain to 0.36.5.
- Add a managed Expo 57 example and automatic configuration plugin.
- Implement the complete Android connection/current-network API.
- Replace blocking Android scans with broadcast-driven asynchronous scans.
- Replace the unused native event emitter with Nitro callbacks.
- Update Android 13+ Nearby Wi-Fi permission handling.
- Make iOS Wi-Fi calls asynchronous and add real location authorization requests.
- Add package, example, iOS, and Android CI coverage.
