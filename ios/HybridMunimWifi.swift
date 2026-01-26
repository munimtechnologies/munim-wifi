//
//  HybridMunimWifi.swift
//  Pods
//
//  Created by sheehanmunim on 1/26/2026.
//

import Foundation
import NetworkExtension
import CoreLocation
import SystemConfiguration.CaptiveNetwork
import NitroModules

class HybridMunimWifi: HybridMunimWifiSpec {
    private var locationManager: CLLocationManager?
    private var scanResults: [WifiNetwork] = []
    private var isScanning = false
    
    // Note: iOS has very limited Wi-Fi scanning capabilities
    // CoreWLAN is macOS only - not available on iOS
    // iOS can only get SSID/BSSID, not RSSI, channel, or frequency
    
    func isWifiEnabled() throws -> Promise<Bool> {
        let promise = Promise<Bool>()
        // On iOS, we can't directly check if Wi-Fi is enabled
        // We can infer it by checking if we can get current network
        if let _ = try? getCurrentNetworkSync() {
            promise.resolve(withResult: true)
        } else {
            promise.resolve(withResult: false)
        }
        return promise
    }
    
    func requestWifiPermission() throws -> Promise<Bool> {
        let promise = Promise<Bool>()
        let locationManager = CLLocationManager()
        self.locationManager = locationManager
        
        let status = locationManager.authorizationStatus
        let hasPermission = status == .authorizedWhenInUse || status == .authorizedAlways
        promise.resolve(withResult: hasPermission)
        return promise
    }
    
    // Helper to get current network synchronously
    private func getCurrentNetworkSync() -> CurrentNetworkInfo? {
        var result: CurrentNetworkInfo? = nil
        let semaphore = DispatchSemaphore(value: 0)
        
        NEHotspotNetwork.fetchCurrent { network in
            if let network = network {
                // Get IP address
                let ipAddress = self.getIPAddressSync()
                result = CurrentNetworkInfo(
                    ssid: network.ssid,
                    bssid: network.bssid ?? "",
                    ipAddress: ipAddress,
                    subnetMask: nil,
                    gateway: nil,
                    dnsServers: nil
                )
            }
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + 5)
        return result
    }
    
    // Helper to get IP address synchronously
    private func getIPAddressSync() -> String? {
        var address: String?
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        
        guard getifaddrs(&ifaddr) == 0 else { return nil }
        defer { freeifaddrs(ifaddr) }
        
        guard var ptr = ifaddr else { return nil }
        
        while ptr != nil {
            defer { ptr = ptr.pointee.ifa_next }
            
            let interface = ptr.pointee
            let addrFamily = interface.ifa_addr.pointee.sa_family
            
            if addrFamily == UInt8(AF_INET) {
                let name = String(cString: interface.ifa_name)
                if name == "en0" || name == "en1" {
                    var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                    getnameinfo(interface.ifa_addr, socklen_t(interface.ifa_addr.pointee.sa_len),
                              &hostname, socklen_t(hostname.count),
                              nil, socklen_t(0), NI_NUMERICHOST)
                    address = String(cString: hostname)
                    break
                }
            }
        }
        
        return address
    }
    
    func scanNetworks(options: ScanOptions?) throws -> Promise<[WifiNetwork]> {
        let promise = Promise<[WifiNetwork]>()
        // iOS limitation: Cannot scan for networks directly
        // Only can get current connected network
        // For scanning, we can only return the current network if connected
        // This is a major iOS limitation
        
        if let current = try? getCurrentNetworkSync() {
            let network = WifiNetwork(
                ssid: current.ssid,
                bssid: current.bssid,
                rssi: nil, // Not available on iOS
                frequency: nil, // Not available on iOS
                channel: nil, // Not available on iOS
                capabilities: nil,
                isSecure: nil,
                timestamp: Date().timeIntervalSince1970 * 1000
            )
            scanResults = [network]
            promise.resolve(withResult: [network])
        } else {
            // Return empty array if not connected
            promise.resolve(withResult: [])
        }
        return promise
    }
    
    func startScan(options: ScanOptions?) throws {
        isScanning = true
        // iOS limitation: Cannot continuously scan
        // Just get current network once
        if let current = try? getCurrentNetworkSync() {
            let network = WifiNetwork(
                ssid: current.ssid,
                bssid: current.bssid,
                rssi: nil,
                frequency: nil,
                channel: nil,
                capabilities: nil,
                isSecure: nil,
                timestamp: Date().timeIntervalSince1970 * 1000
            )
            scanResults = [network]
        }
        isScanning = false
    }
    
    func stopScan() throws {
        isScanning = false
    }
    
    func getSSIDs() throws -> Promise<[String]> {
        let promise = Promise<[String]>()
        // iOS limitation: Can only get current network SSID
        if let current = try? getCurrentNetworkSync() {
            promise.resolve(withResult: [current.ssid])
        } else {
            promise.resolve(withResult: [])
        }
        return promise
    }
    
    func getWifiFingerprint() throws -> Promise<WifiFingerprint> {
        let promise = Promise<WifiFingerprint>()
        // iOS limitation: Can only get current network, no RSSI/channel/frequency
        var networks: [WifiNetwork] = scanResults
        if networks.isEmpty {
            if let current = try? getCurrentNetworkSync() {
                networks = [WifiNetwork(
                    ssid: current.ssid,
                    bssid: current.bssid,
                    rssi: nil,
                    frequency: nil,
                    channel: nil,
                    capabilities: nil,
                    isSecure: nil,
                    timestamp: Date().timeIntervalSince1970 * 1000
                )]
            }
        }
        
        let fingerprint = WifiFingerprint(
            networks: networks,
            timestamp: Date().timeIntervalSince1970 * 1000,
            location: nil
        )
        promise.resolve(withResult: fingerprint)
        return promise
    }
    
    func getRSSI(ssid: String) throws -> Promise<Variant_NullType_Double> {
        let promise = Promise<Variant_NullType_Double>()
        // iOS limitation: RSSI not available for scanned networks
        promise.resolve(withResult: .first(NullType.null))
        return promise
    }
    
    func getBSSID(ssid: String) throws -> Promise<Variant_NullType_String> {
        let promise = Promise<Variant_NullType_String>()
        if let current = try? getCurrentNetworkSync(), current.ssid == ssid {
            promise.resolve(withResult: .second(current.bssid))
        } else {
            promise.resolve(withResult: .first(NullType.null))
        }
        return promise
    }
    
    func getChannelInfo(ssid: String) throws -> Promise<Variant_NullType_ChannelInfo> {
        let promise = Promise<Variant_NullType_ChannelInfo>()
        // iOS limitation: Channel and frequency not available
        promise.resolve(withResult: .first(NullType.null))
        return promise
    }
    
    func getNetworkInfo(ssid: String) throws -> Promise<Variant_NullType_WifiNetwork> {
        let promise = Promise<Variant_NullType_WifiNetwork>()
        if let current = try? getCurrentNetworkSync(), current.ssid == ssid {
            let network = WifiNetwork(
                ssid: current.ssid,
                bssid: current.bssid,
                rssi: nil, // Not available on iOS
                frequency: nil, // Not available on iOS
                channel: nil, // Not available on iOS
                capabilities: nil,
                isSecure: nil,
                timestamp: Date().timeIntervalSince1970 * 1000
            )
            promise.resolve(withResult: .second(network))
        } else {
            promise.resolve(withResult: .first(NullType.null))
        }
        return promise
    }
    
    func getCurrentNetwork() throws -> Promise<Variant_NullType_CurrentNetworkInfo> {
        let promise = Promise<Variant_NullType_CurrentNetworkInfo>()
        let semaphore = DispatchSemaphore(value: 0)
        var result: CurrentNetworkInfo? = nil
        
        NEHotspotNetwork.fetchCurrent { network in
            if let network = network {
                // Get IP address
                let ipAddress = self.getIPAddressSync()
                result = CurrentNetworkInfo(
                    ssid: network.ssid,
                    bssid: network.bssid ?? "",
                    ipAddress: ipAddress,
                    subnetMask: nil,
                    gateway: nil,
                    dnsServers: nil
                )
            }
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + 5)
        
        if let result = result {
            promise.resolve(withResult: .second(result))
        } else {
            promise.resolve(withResult: .first(NullType.null))
        }
        return promise
    }
    
    func connectToNetwork(options: ConnectionOptions) throws -> Promise<Void> {
        let promise = Promise<Void>()
        let configuration: NEHotspotConfiguration
        
        if let password = options.password {
            if options.isWEP == true {
                configuration = NEHotspotConfiguration(ssid: options.ssid, passphrase: password, isWEP: true)
            } else {
                configuration = NEHotspotConfiguration(ssid: options.ssid, passphrase: password, isWEP: false)
            }
        } else {
            configuration = NEHotspotConfiguration(ssid: options.ssid)
        }
        
        configuration.joinOnce = false
        
        let semaphore = DispatchSemaphore(value: 0)
        var error: Error?
        
        NEHotspotConfigurationManager.shared.apply(configuration) { applyError in
            error = applyError
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + 30)
        
        if let error = error {
            promise.reject(withError: error)
        } else {
            promise.resolve()
        }
        return promise
    }
    
    func disconnect() throws -> Promise<Void> {
        let promise = Promise<Void>()
        // On iOS, we can't directly disconnect from Wi-Fi
        // We can only remove saved configurations
        // This is an iOS limitation
        // Note: This will remove the network from saved networks, not disconnect immediately
        if let current = try? getCurrentNetworkSync() {
            NEHotspotConfigurationManager.shared.removeConfiguration(forSSID: current.ssid)
        }
        promise.resolve()
        return promise
    }
    
    func getIPAddress() throws -> Promise<Variant_NullType_String> {
        let promise = Promise<Variant_NullType_String>()
        let address = getIPAddressSync()
        
        if let address = address {
            promise.resolve(withResult: .second(address))
        } else {
            promise.resolve(withResult: .first(NullType.null))
        }
        return promise
    }
    
    func addListener(eventName: String) throws {
        print("[MunimWifi] Adding listener for event: \(eventName)")
        // Note: iOS has limited event support for Wi-Fi changes
    }
    
    func removeListeners(count: Double) throws {
        print("[MunimWifi] Removing \(count) listeners")
    }
}
