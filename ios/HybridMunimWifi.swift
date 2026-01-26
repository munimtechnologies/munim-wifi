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

class HybridMunimWifi: HybridMunimWifiSpec {
    private var locationManager: CLLocationManager?
    private var scanResults: [WifiNetwork] = []
    private var isScanning = false
    
    // Note: iOS has very limited Wi-Fi scanning capabilities
    // CoreWLAN is macOS only - not available on iOS
    // iOS can only get SSID/BSSID, not RSSI, channel, or frequency
    
    func isWifiEnabled() throws -> Bool {
        // On iOS, we can't directly check if Wi-Fi is enabled
        // We can infer it by checking if we can get current network
        if let _ = try? getCurrentNetworkSync() {
            return true
        }
        return false
    }
    
    func requestWifiPermission() throws -> Bool {
        let locationManager = CLLocationManager()
        self.locationManager = locationManager
        
        let status = locationManager.authorizationStatus
        return status == .authorizedWhenInUse || status == .authorizedAlways
    }
    
    // Helper to get current network synchronously
    private func getCurrentNetworkSync() -> CurrentNetworkInfo? {
        var result: CurrentNetworkInfo? = nil
        let semaphore = DispatchSemaphore(value: 0)
        
        NEHotspotNetwork.fetchCurrent { network in
            if let network = network {
                result = CurrentNetworkInfo(
                    ssid: network.ssid,
                    bssid: network.bssid ?? ""
                )
            }
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + 5)
        return result
    }
    
    func scanNetworks(maxResults: Double?, timeout: Double?) throws -> [WifiNetwork] {
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
                timestamp: Int64(Date().timeIntervalSince1970 * 1000)
            )
            scanResults = [network]
            return [network]
        }
        
        // Return empty array if not connected
        return []
    }
    
    func startScan(maxResults: Double?, timeout: Double?) throws {
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
                timestamp: Int64(Date().timeIntervalSince1970 * 1000)
            )
            scanResults = [network]
        }
        isScanning = false
    }
    
    func stopScan() throws {
        isScanning = false
    }
    
    func getSSIDs() throws -> [String] {
        // iOS limitation: Can only get current network SSID
        if let current = try? getCurrentNetworkSync() {
            return [current.ssid]
        }
        return []
    }
    
    func getWifiFingerprint() throws -> WifiFingerprint {
        // iOS limitation: Can only get current network, no RSSI/channel/frequency
        let networks = scanResults.isEmpty ? (try? scanNetworks(maxResults: nil, timeout: nil)) ?? [] : scanResults
        
        return WifiFingerprint(
            networks: networks,
            timestamp: Int64(Date().timeIntervalSince1970 * 1000)
        )
    }
    
    func getRSSI(ssid: String) throws -> Double? {
        // iOS limitation: RSSI not available for scanned networks
        return nil
    }
    
    func getBSSID(ssid: String) throws -> String? {
        if let current = try? getCurrentNetworkSync(), current.ssid == ssid {
            return current.bssid
        }
        return nil
    }
    
    func getChannelInfo(ssid: String) throws -> ChannelInfo? {
        // iOS limitation: Channel and frequency not available
        return nil
    }
    
    func getNetworkInfo(ssid: String) throws -> WifiNetwork? {
        if let current = try? getCurrentNetworkSync(), current.ssid == ssid {
            return WifiNetwork(
                ssid: current.ssid,
                bssid: current.bssid,
                rssi: nil, // Not available on iOS
                frequency: nil, // Not available on iOS
                channel: nil, // Not available on iOS
                capabilities: nil,
                isSecure: nil,
                timestamp: Int64(Date().timeIntervalSince1970 * 1000)
            )
        }
        return nil
    }
    
    func getCurrentNetwork() throws -> CurrentNetworkInfo? {
        var result: CurrentNetworkInfo? = nil
        let semaphore = DispatchSemaphore(value: 0)
        
        NEHotspotNetwork.fetchCurrent { network in
            if let network = network {
                result = CurrentNetworkInfo(
                    ssid: network.ssid,
                    bssid: network.bssid ?? ""
                )
            }
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + 5)
        return result
    }
    
    func connectToNetwork(options: ConnectionOptions) throws {
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
            throw error
        }
    }
    
    func disconnect() throws {
        // On iOS, we can't directly disconnect from Wi-Fi
        // We can only remove saved configurations
        // This is an iOS limitation
        // Note: This will remove the network from saved networks, not disconnect immediately
        if let current = try? getCurrentNetworkSync() {
            NEHotspotConfigurationManager.shared.removeConfiguration(forSSID: current.ssid)
        }
    }
    
    func getIPAddress() throws -> String? {
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
    
    func addListener(eventName: String) throws {
        print("[MunimWifi] Adding listener for event: \(eventName)")
        // Note: iOS has limited event support for Wi-Fi changes
    }
    
    func removeListeners(count: Double) throws {
        print("[MunimWifi] Removing \(count) listeners")
    }
}
