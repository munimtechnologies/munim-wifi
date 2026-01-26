package com.munimwifi

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import com.margelo.nitro.NitroModules
import com.margelo.nitro.munimwifi.HybridMunimWifiSpec
import java.util.concurrent.ConcurrentHashMap

class HybridMunimWifi : HybridMunimWifiSpec() {
    private val TAG = "HybridMunimWifi"
    private var wifiManager: WifiManager? = null
    private val scanResults = ConcurrentHashMap<String, ScanResult>()
    private var isScanning = false

    private fun getWifiManager(): WifiManager? {
        if (wifiManager == null) {
            val context = NitroModules.applicationContext ?: return null
            wifiManager = context.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        }
        return wifiManager
    }

    private fun hasPermission(permission: String): Boolean {
        val context = NitroModules.applicationContext ?: return false
        return ActivityCompat.checkSelfPermission(
            context,
            permission
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun checkLocationPermission(): Boolean {
        return hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) ||
            hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
    }

    private fun getFrequencyChannel(frequency: Int): Int {
        return when {
            frequency in 2412..2484 -> ((frequency - 2412) / 5) + 1 // 2.4 GHz channels 1-14
            frequency in 5170..5825 -> ((frequency - 5170) / 5) + 36 // 5 GHz channels
            else -> 0
        }
    }

    private fun convertScanResult(scanResult: ScanResult): com.margelo.nitro.munimwifi.WifiNetwork {
        val channel = getFrequencyChannel(scanResult.frequency)
        val isSecure = scanResult.capabilities.contains("WPA") ||
            scanResult.capabilities.contains("WEP") ||
            scanResult.capabilities.contains("EAP")

        return com.margelo.nitro.munimwifi.WifiNetwork(
            ssid = scanResult.SSID ?: "",
            bssid = scanResult.BSSID ?: "",
            rssi = scanResult.level,
            frequency = scanResult.frequency,
            channel = channel,
            capabilities = scanResult.capabilities,
            isSecure = isSecure,
            timestamp = System.currentTimeMillis()
        )
    }

    override fun isWifiEnabled(): Boolean {
        return getWifiManager()?.isWifiEnabled ?: false
    }

    override fun requestWifiPermission(): Boolean {
        return checkLocationPermission()
    }

    override fun scanNetworks(
        maxResults: Double?,
        timeout: Double?
    ): List<com.margelo.nitro.munimwifi.WifiNetwork> {
        val manager = getWifiManager() ?: return emptyList()

        if (!checkLocationPermission()) {
            Log.w("MunimWifi", "Location permission not granted")
            return emptyList()
        }

        if (!manager.isWifiEnabled) {
            Log.w("MunimWifi", "Wi-Fi is not enabled")
            return emptyList()
        }

        try {
            val success = manager.startScan()
            if (!success) {
                Log.w("MunimWifi", "Failed to start Wi-Fi scan")
                return emptyList()
            }

            // Wait for scan to complete (max 10 seconds)
            val maxWaitTime = (timeout?.toLong() ?: 10000L).coerceAtMost(10000L)
            val startTime = System.currentTimeMillis()
            while (System.currentTimeMillis() - startTime < maxWaitTime) {
                val results = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                        manager.scanResults
                    } else {
                        emptyList()
                    }
                } else {
                    manager.scanResults
                }

                if (results.isNotEmpty()) {
                    scanResults.clear()
                    results.forEach { result ->
                        val ssid = result.SSID ?: ""
                        if (ssid.isNotEmpty()) {
                            scanResults[ssid] = result
                        }
                    }

                    val networks = scanResults.values.map { convertScanResult(it) }
                    val max = maxResults?.toInt() ?: networks.size
                    return networks.take(max)
                }

                Thread.sleep(100)
            }

            Log.w("MunimWifi", "Scan timeout")
            return emptyList()
        } catch (e: SecurityException) {
            Log.e("MunimWifi", "Security exception during scan", e)
            return emptyList()
        } catch (e: Exception) {
            Log.e("MunimWifi", "Error scanning networks", e)
            return emptyList()
        }
    }

    override fun startScan(maxResults: Double?, timeout: Double?) {
        isScanning = true
        val manager = getWifiManager() ?: return

        if (!checkLocationPermission()) {
            Log.w("MunimWifi", "Location permission not granted")
            isScanning = false
            return
        }

        if (!manager.isWifiEnabled) {
            Log.w("MunimWifi", "Wi-Fi is not enabled")
            isScanning = false
            return
        }

        try {
            manager.startScan()
        } catch (e: Exception) {
            Log.e("MunimWifi", "Error starting scan", e)
            isScanning = false
        }
    }

    override fun stopScan() {
        isScanning = false
    }

    override fun getSSIDs(): List<String> {
        val manager = getWifiManager() ?: return emptyList()
        val results = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                manager.scanResults
            } else {
                emptyList()
            }
        } else {
            manager.scanResults
        }

        return results.mapNotNull { it.SSID }.distinct()
    }

    override fun getWifiFingerprint(): com.margelo.nitro.munimwifi.WifiFingerprint {
        val manager = getWifiManager() ?: return com.margelo.nitro.munimwifi.WifiFingerprint(
            networks = emptyList(),
            timestamp = System.currentTimeMillis()
        )
        val results = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                manager.scanResults
            } else {
                emptyList()
            }
        } else {
            manager.scanResults
        }

        val networks = results.map { convertScanResult(it) }

        return com.margelo.nitro.munimwifi.WifiFingerprint(
            networks = networks,
            timestamp = System.currentTimeMillis()
        )
    }

    override fun getRSSI(ssid: String): Double? {
        val manager = getWifiManager() ?: return null
        val results = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                manager.scanResults
            } else {
                emptyList()
            }
        } else {
            manager.scanResults
        }

        val network = results.find { it.SSID == ssid }
        return network?.level?.toDouble()
    }

    override fun getBSSID(ssid: String): String? {
        val manager = getWifiManager() ?: return null
        val results = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                manager.scanResults
            } else {
                emptyList()
            }
        } else {
            manager.scanResults
        }

        val network = results.find { it.SSID == ssid }
        return network?.BSSID
    }

    override fun getChannelInfo(ssid: String): com.margelo.nitro.munimwifi.ChannelInfo? {
        val manager = getWifiManager() ?: return null
        val results = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                manager.scanResults
            } else {
                emptyList()
            }
        } else {
            manager.scanResults
        }

        val network = results.find { it.SSID == ssid } ?: return null
        val channel = getFrequencyChannel(network.frequency)

        return com.margelo.nitro.munimwifi.ChannelInfo(
            channel = channel,
            frequency = network.frequency
        )
    }

    override fun getNetworkInfo(ssid: String): com.margelo.nitro.munimwifi.WifiNetwork? {
        val manager = getWifiManager() ?: return null
        val results = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
                manager.scanResults
            } else {
                emptyList()
            }
        } else {
            manager.scanResults
        }

        val network = results.find { it.SSID == ssid } ?: return null
        return convertScanResult(network)
    }

    override fun addListener(eventName: String) {
        Log.d(TAG, "Adding listener for event: $eventName")
    }

    override fun removeListeners(count: Double) {
        Log.d(TAG, "Removing $count listeners")
    }
}
