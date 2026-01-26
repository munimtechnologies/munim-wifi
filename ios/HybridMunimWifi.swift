//
//  HybridMunimWifi.swift
//  Pods
//
//  Created by sheehanmunim on 1/26/2026.
//

import Foundation
import CoreWLAN
import CoreLocation
import NetworkExtension

class HybridMunimWifi: HybridMunimWifiSpec {
    private let wifiClient = CWWiFiClient.shared()
    private var locationManager: CLLocationManager?
    private var scanResults: [CWNetwork] = []
    private var isScanning = false
    
    private func getFrequencyChannel(frequency: Int) -> Int {
        // Convert frequency (MHz) to channel number
        if frequency >= 2412 && frequency <= 2484 {
            // 2.4 GHz band
            return ((frequency - 2412) / 5) + 1
        } else if frequency >= 5170 && frequency <= 5825 {
            // 5 GHz band
            return ((frequency - 5170) / 5) + 36
        }
        return 0
    }
    
    private func convertNetwork(_ network: CWNetwork) -> WifiNetwork {
        guard let channel = network.wlanChannel else {
            return WifiNetwork(
                ssid: network.ssid ?? "",
                bssid: network.bssid ?? "",
                rssi: Int(network.rssiValue),
                frequency: 0,
                channel: 0,
                capabilities: network.ies?.description ?? "",
                isSecure: false,
                timestamp: Int64(Date().timeIntervalSince1970 * 1000)
            )
        }
        
        let channelNumber = Int(channel.channelNumber)
        let frequency: Int
        if channel.channelBand == .band2GHz {
            frequency = 2412 + (channelNumber - 1) * 5
        } else {
            frequency = 5170 + (channelNumber - 36) * 5
        }
        
        let isSecure = network.supportsSecurity(.WPA2Personal) || 
                      network.supportsSecurity(.WPA3Personal) ||
                      network.supportsSecurity(.WPAEnterprise) ||
                      network.supportsSecurity(.WPA3Enterprise)
        
        return WifiNetwork(
            ssid: network.ssid ?? "",
            bssid: network.bssid ?? "",
            rssi: Int(network.rssiValue),
            frequency: frequency,
            channel: channelNumber,
            capabilities: network.ies?.description ?? "",
            isSecure: isSecure,
            timestamp: Int64(Date().timeIntervalSince1970 * 1000)
        )
    }
    
    func isWifiEnabled() throws -> Bool {
        return wifiClient.interface()?.powerOn() ?? false
    }
    
    func requestWifiPermission() throws -> Bool {
        // On iOS, Wi-Fi scanning requires location permission
        let locationManager = CLLocationManager()
        self.locationManager = locationManager
        
        let status = locationManager.authorizationStatus
        return status == .authorizedWhenInUse || status == .authorizedAlways
    }
    
    func scanNetworks(maxResults: Double?, timeout: Double?) throws -> [WifiNetwork] {
        guard let interface = wifiClient.interface() else {
            throw NSError(domain: "MunimWifi", code: 1, userInfo: [NSLocalizedDescriptionKey: "Wi-Fi interface not available"])
        }
        
        guard interface.powerOn() else {
            throw NSError(domain: "MunimWifi", code: 2, userInfo: [NSLocalizedDescriptionKey: "Wi-Fi is not enabled"])
        }
        
        // Check location permission
        let locationManager = CLLocationManager()
        let status = locationManager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            throw NSError(domain: "MunimWifi", code: 3, userInfo: [NSLocalizedDescriptionKey: "Location permission not granted"])
        }
        
        do {
            let networks = try interface.scanForNetworks(withName: nil)
            scanResults = networks
            
            let wifiNetworks = networks.map { convertNetwork($0) }
            let max = maxResults.map { Int($0) } ?? wifiNetworks.count
            return Array(wifiNetworks.prefix(max))
        } catch {
            throw error
        }
    }
    
    func startScan(maxResults: Double?, timeout: Double?) throws {
        isScanning = true
        
        guard let interface = wifiClient.interface() else {
            isScanning = false
            return
        }
        
        guard interface.powerOn() else {
            isScanning = false
            return
        }
        
        // Check location permission
        let locationManager = CLLocationManager()
        let status = locationManager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            isScanning = false
            return
        }
        
        // Start scanning in background
        DispatchQueue.global(qos: .background).async { [weak self] in
            guard let self = self else { return }
            
            do {
                let networks = try interface.scanForNetworks(withName: nil)
                self.scanResults = networks
                self.isScanning = false
            } catch {
                self.isScanning = false
            }
        }
    }
    
    func stopScan() throws {
        isScanning = false
    }
    
    func getSSIDs() throws -> [String] {
        let networks = scanResults.isEmpty ? (try? wifiClient.interface()?.scanForNetworks(withName: nil)) ?? [] : scanResults
        return networks.compactMap { $0.ssid }.unique()
    }
    
    func getWifiFingerprint() throws -> WifiFingerprint {
        let networks = scanResults.isEmpty ? (try? wifiClient.interface()?.scanForNetworks(withName: nil)) ?? [] : scanResults
        let wifiNetworks = networks.map { convertNetwork($0) }
        
        return WifiFingerprint(
            networks: wifiNetworks,
            timestamp: Int64(Date().timeIntervalSince1970 * 1000)
        )
    }
    
    func getRSSI(ssid: String) throws -> Double? {
        let networks = scanResults.isEmpty ? (try? wifiClient.interface()?.scanForNetworks(withName: nil)) ?? [] : scanResults
        let network = networks.first { $0.ssid == ssid }
        return network.map { Double($0.rssiValue) }
    }
    
    func getBSSID(ssid: String) throws -> String? {
        let networks = scanResults.isEmpty ? (try? wifiClient.interface()?.scanForNetworks(withName: nil)) ?? [] : scanResults
        let network = networks.first { $0.ssid == ssid }
        return network?.bssid
    }
    
    func getChannelInfo(ssid: String) throws -> ChannelInfo? {
        let networks = scanResults.isEmpty ? (try? wifiClient.interface()?.scanForNetworks(withName: nil)) ?? [] : scanResults
        guard let network = networks.first(where: { $0.ssid == ssid }),
              let channel = network.wlanChannel else {
            return nil
        }
        
        let channelNumber = Int(channel.channelNumber)
        let frequency: Int
        if channel.channelBand == .band2GHz {
            frequency = 2412 + (channelNumber - 1) * 5
        } else {
            frequency = 5170 + (channelNumber - 36) * 5
        }
        
        return ChannelInfo(
            channel: channelNumber,
            frequency: frequency
        )
    }
    
    func getNetworkInfo(ssid: String) throws -> WifiNetwork? {
        let networks = scanResults.isEmpty ? (try? wifiClient.interface()?.scanForNetworks(withName: nil)) ?? [] : scanResults
        guard let network = networks.first(where: { $0.ssid == ssid }) else {
            return nil
        }
        return convertNetwork(network)
    }
    
    func addListener(eventName: String) throws {
        // Event listener implementation can be added here if needed
        print("[MunimWifi] Adding listener for event: \(eventName)")
    }
    
    func removeListeners(count: Double) throws {
        // Event listener removal implementation can be added here if needed
        print("[MunimWifi] Removing \(count) listeners")
    }
}

extension Array where Element: Hashable {
    func unique() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}
