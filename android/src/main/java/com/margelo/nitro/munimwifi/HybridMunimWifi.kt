package com.margelo.nitro.munimwifi

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.MacAddress
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.ScanResult
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.annotation.Keep
import androidx.core.content.ContextCompat
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.NullType
import com.margelo.nitro.core.Promise
import com.margelo.nitro.munimwifi.ChannelInfo
import com.margelo.nitro.munimwifi.ConnectionOptions
import com.margelo.nitro.munimwifi.CurrentNetworkInfo
import com.margelo.nitro.munimwifi.HybridMunimWifiSpec
import com.margelo.nitro.munimwifi.ScanOptions
import com.margelo.nitro.munimwifi.Variant_NullType_ChannelInfo
import com.margelo.nitro.munimwifi.Variant_NullType_CurrentNetworkInfo
import com.margelo.nitro.munimwifi.Variant_NullType_Double
import com.margelo.nitro.munimwifi.Variant_NullType_String
import com.margelo.nitro.munimwifi.Variant_NullType_WifiNetwork
import com.margelo.nitro.munimwifi.WifiFingerprint
import com.margelo.nitro.munimwifi.WifiNetwork
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicBoolean

@Keep
@DoNotStrip
class HybridMunimWifi : HybridMunimWifiSpec() {
  private val context: Context
    get() = NitroModules.applicationContext
      ?: throw IllegalStateException("munim-wifi: React Native application context is unavailable")

  private val wifiManager: WifiManager
    get() = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

  private val connectivityManager: ConnectivityManager
    get() = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

  private val mainHandler = Handler(Looper.getMainLooper())
  private var continuousReceiver: BroadcastReceiver? = null
  private var continuousRunnable: Runnable? = null
  private var requestedNetworkCallback: ConnectivityManager.NetworkCallback? = null

  override fun isWifiEnabled(): Promise<Boolean> = Promise.resolved(wifiManager.isWifiEnabled)

  override fun requestWifiPermission(): Promise<Boolean> = Promise.resolved(hasRequiredPermissions())

  override fun scanNetworks(options: ScanOptions?): Promise<Array<WifiNetwork>> {
    val promise = Promise<Array<WifiNetwork>>()
    val settled = AtomicBoolean(false)

    try {
      ensureCanScan()
      val timeoutMs = normalizedTimeout(options?.timeout)
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(receiverContext: Context, intent: Intent) {
          if (intent.action != WifiManager.SCAN_RESULTS_AVAILABLE_ACTION) return
          if (settled.compareAndSet(false, true)) {
            unregisterReceiverSafely(this)
            promise.resolve(readNetworks(options?.maxResults))
          }
        }
      }

      registerReceiver(receiver)
      val started = wifiManager.startScan()
      if (!started && settled.compareAndSet(false, true)) {
        unregisterReceiverSafely(receiver)
        promise.resolve(readNetworks(options?.maxResults))
        return promise
      }

      mainHandler.postDelayed({
        if (settled.compareAndSet(false, true)) {
          unregisterReceiverSafely(receiver)
          promise.reject(TimeoutException("munim-wifi: scan timed out after ${timeoutMs}ms"))
        }
      }, timeoutMs)
    } catch (error: Throwable) {
      if (settled.compareAndSet(false, true)) promise.reject(error)
    }

    return promise
  }

  override fun startScan(
    options: ScanOptions?,
    onNetworks: (networks: Array<WifiNetwork>) -> Unit,
    onError: ((message: String) -> Unit)?,
  ) {
    stopScan()
    try {
      ensureCanScan()
      val intervalMs = normalizedInterval(options?.interval)
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(receiverContext: Context, intent: Intent) {
          if (intent.action != WifiManager.SCAN_RESULTS_AVAILABLE_ACTION) return
          try {
            onNetworks(readNetworks(options?.maxResults))
          } catch (error: Throwable) {
            onError?.invoke(error.message ?: "munim-wifi: failed to read scan results")
          }
        }
      }
      continuousReceiver = receiver
      registerReceiver(receiver)

      lateinit var scanRunnable: Runnable
      scanRunnable = Runnable {
        if (continuousReceiver == null) return@Runnable
        try {
          if (!wifiManager.startScan()) {
            onNetworks(readNetworks(options?.maxResults))
          }
        } catch (error: Throwable) {
          onError?.invoke(error.message ?: "munim-wifi: continuous scan failed")
        } finally {
          if (continuousReceiver != null) mainHandler.postDelayed(scanRunnable, intervalMs)
        }
      }
      continuousRunnable = scanRunnable
      mainHandler.post(scanRunnable)
    } catch (error: Throwable) {
      stopScan()
      onError?.invoke(error.message ?: "munim-wifi: could not start scanning")
    }
  }

  override fun stopScan() {
    continuousRunnable?.let(mainHandler::removeCallbacks)
    continuousRunnable = null
    continuousReceiver?.let(::unregisterReceiverSafely)
    continuousReceiver = null
  }

  override fun getSSIDs(): Promise<Array<String>> = Promise.parallel {
    readNetworks(null).map { it.ssid }.filter { it.isNotBlank() }.distinct().toTypedArray()
  }

  override fun getWifiFingerprint(): Promise<WifiFingerprint> = Promise.parallel {
    WifiFingerprint(
      networks = readNetworks(null),
      timestamp = System.currentTimeMillis().toDouble(),
      location = null,
    )
  }

  override fun getRSSI(ssid: String): Promise<Variant_NullType_Double> = Promise.parallel {
    readNetworks(null).firstOrNull { it.ssid == ssid }?.rssi
      ?.let(Variant_NullType_Double::create)
      ?: Variant_NullType_Double.create(NullType.NULL)
  }

  override fun getBSSID(ssid: String): Promise<Variant_NullType_String> = Promise.parallel {
    readNetworks(null).firstOrNull { it.ssid == ssid }?.bssid
      ?.let(Variant_NullType_String::create)
      ?: Variant_NullType_String.create(NullType.NULL)
  }

  override fun getChannelInfo(ssid: String): Promise<Variant_NullType_ChannelInfo> = Promise.parallel {
    val network = readNetworks(null).firstOrNull { it.ssid == ssid }
    if (network?.channel != null && network.frequency != null) {
      Variant_NullType_ChannelInfo.create(ChannelInfo(network.channel, network.frequency))
    } else {
      Variant_NullType_ChannelInfo.create(NullType.NULL)
    }
  }

  override fun getNetworkInfo(ssid: String): Promise<Variant_NullType_WifiNetwork> = Promise.parallel {
    readNetworks(null).firstOrNull { it.ssid == ssid }
      ?.let(Variant_NullType_WifiNetwork::create)
      ?: Variant_NullType_WifiNetwork.create(NullType.NULL)
  }

  override fun getCurrentNetwork(): Promise<Variant_NullType_CurrentNetworkInfo> = Promise.parallel {
    currentNetworkInfo()?.let(Variant_NullType_CurrentNetworkInfo::create)
      ?: Variant_NullType_CurrentNetworkInfo.create(NullType.NULL)
  }

  override fun connectToNetwork(options: ConnectionOptions): Promise<Unit> {
    require(options.ssid.isNotBlank()) { "munim-wifi: SSID must not be empty" }
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      connectWithSpecifier(options)
    } else {
      connectLegacy(options)
    }
  }

  override fun disconnect(): Promise<Unit> = Promise.parallel {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      requestedNetworkCallback?.let {
        try {
          connectivityManager.unregisterNetworkCallback(it)
        } catch (_: IllegalArgumentException) {
          // Already unregistered by the system.
        }
      }
      requestedNetworkCallback = null
      connectivityManager.bindProcessToNetwork(null)
    } else {
      @Suppress("DEPRECATION")
      wifiManager.disconnect()
    }
    Unit
  }

  override fun getIPAddress(): Promise<Variant_NullType_String> = Promise.parallel {
    currentNetworkInfo()?.ipAddress?.let(Variant_NullType_String::create)
      ?: Variant_NullType_String.create(NullType.NULL)
  }

  override fun addListener(eventName: String) = Unit

  override fun removeListeners(count: Double) = Unit

  private fun connectWithSpecifier(options: ConnectionOptions): Promise<Unit> {
    if (options.isWEP == true) {
      return Promise.rejected(UnsupportedOperationException("munim-wifi: WEP is not supported on Android 10+"))
    }
    if (!hasNearbyPermission()) {
      return Promise.rejected(SecurityException("munim-wifi: Nearby Wi-Fi Devices permission is required"))
    }

    requestedNetworkCallback?.let {
      try {
        connectivityManager.unregisterNetworkCallback(it)
      } catch (_: IllegalArgumentException) {
        // Ignore stale callbacks.
      }
    }

    val builder = WifiNetworkSpecifier.Builder().setSsid(options.ssid)
    options.bssid?.takeIf { it.isNotBlank() }?.let { builder.setBssid(MacAddress.fromString(it)) }
    options.password?.takeIf { it.isNotEmpty() }?.let(builder::setWpa2Passphrase)
    val request = NetworkRequest.Builder()
      .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
      .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      .setNetworkSpecifier(builder.build())
      .build()

    val promise = Promise<Unit>()
    val settled = AtomicBoolean(false)
    val callback = object : ConnectivityManager.NetworkCallback() {
      override fun onAvailable(network: Network) {
        connectivityManager.bindProcessToNetwork(network)
        if (settled.compareAndSet(false, true)) promise.resolve(Unit)
      }

      override fun onUnavailable() {
        requestedNetworkCallback = null
        if (settled.compareAndSet(false, true)) {
          promise.reject(IllegalStateException("munim-wifi: Wi-Fi connection was unavailable or denied"))
        }
      }

      override fun onLost(network: Network) {
        connectivityManager.bindProcessToNetwork(null)
      }
    }
    requestedNetworkCallback = callback
    val timeoutMs = normalizedConnectionTimeout(options.timeout)
    connectivityManager.requestNetwork(request, callback, timeoutMs.toInt())
    return promise
  }

  @Suppress("DEPRECATION")
  private fun connectLegacy(options: ConnectionOptions): Promise<Unit> = Promise.parallel {
    val configuration = WifiConfiguration().apply {
      SSID = quote(options.ssid)
      if (options.password.isNullOrEmpty()) {
        allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
      } else if (options.isWEP == true) {
        wepKeys[0] = quote(options.password)
        wepTxKeyIndex = 0
        allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
        allowedGroupCiphers.set(WifiConfiguration.GroupCipher.WEP40)
      } else {
        preSharedKey = quote(options.password)
      }
    }
    val networkId = wifiManager.addNetwork(configuration)
    check(networkId >= 0) { "munim-wifi: Android rejected the Wi-Fi configuration" }
    check(wifiManager.disconnect()) { "munim-wifi: could not disconnect from the current network" }
    check(wifiManager.enableNetwork(networkId, true)) { "munim-wifi: could not enable the requested network" }
    check(wifiManager.reconnect()) { "munim-wifi: could not reconnect Wi-Fi" }
    Unit
  }

  private fun ensureCanScan() {
    check(wifiManager.isWifiEnabled) { "munim-wifi: Wi-Fi is disabled" }
    if (!hasScanPermission()) {
      throw SecurityException("munim-wifi: precise location permission is required for Wi-Fi scans")
    }
  }

  private fun hasRequiredPermissions(): Boolean = hasScanPermission() && hasNearbyPermission()

  private fun hasScanPermission(): Boolean = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)

  private fun hasNearbyPermission(): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
      hasPermission(Manifest.permission.NEARBY_WIFI_DEVICES)

  private fun hasPermission(permission: String): Boolean =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  private fun registerReceiver(receiver: BroadcastReceiver) {
    val filter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      context.registerReceiver(receiver, filter)
    }
  }

  private fun unregisterReceiverSafely(receiver: BroadcastReceiver) {
    try {
      context.unregisterReceiver(receiver)
    } catch (_: IllegalArgumentException) {
      // Receiver was already removed.
    }
  }

  private fun readNetworks(maxResults: Double?): Array<WifiNetwork> {
    ensureCanScan()
    val limit = normalizedMaxResults(maxResults)
    @Suppress("DEPRECATION")
    return wifiManager.scanResults
      .asSequence()
      .filter { it.SSID.isNotBlank() }
      .distinctBy { it.BSSID }
      .sortedByDescending { it.level }
      .take(limit)
      .map(::toWifiNetwork)
      .toList()
      .toTypedArray()
  }

  private fun toWifiNetwork(result: ScanResult): WifiNetwork {
    val capabilities = result.capabilities.orEmpty()
    return WifiNetwork(
      ssid = result.SSID.orEmpty(),
      bssid = result.BSSID.orEmpty(),
      rssi = result.level.toDouble(),
      frequency = result.frequency.toDouble(),
      channel = frequencyToChannel(result.frequency)?.toDouble(),
      capabilities = capabilities,
      isSecure = capabilities.contains("WEP", true) ||
        capabilities.contains("WPA", true) || capabilities.contains("EAP", true),
      timestamp = System.currentTimeMillis().toDouble(),
    )
  }

  @Suppress("DEPRECATION")
  private fun currentNetworkInfo(): CurrentNetworkInfo? {
    if (!hasScanPermission()) return null
    val info: WifiInfo = wifiManager.connectionInfo ?: return null
    val ssid = info.ssid?.removeSurrounding("\"").orEmpty()
    if (ssid.isBlank() || ssid == WifiManager.UNKNOWN_SSID) return null
    val dhcp = wifiManager.dhcpInfo
    return CurrentNetworkInfo(
      ssid = ssid,
      bssid = info.bssid?.takeUnless { it == "02:00:00:00:00:00" }.orEmpty(),
      ipAddress = ipv4(info.ipAddress),
      subnetMask = ipv4(dhcp?.netmask ?: 0),
      gateway = ipv4(dhcp?.gateway ?: 0),
      dnsServers = listOfNotNull(ipv4(dhcp?.dns1 ?: 0), ipv4(dhcp?.dns2 ?: 0)).toTypedArray(),
    )
  }

  private fun normalizedMaxResults(value: Double?): Int {
    if (value == null) return Int.MAX_VALUE
    require(value.isFinite() && value > 0 && value % 1.0 == 0.0) {
      "munim-wifi: maxResults must be a positive integer"
    }
    return value.coerceAtMost(10_000.0).toInt()
  }

  private fun normalizedTimeout(value: Double?): Long {
    val timeout = value ?: 10_000.0
    require(timeout.isFinite() && timeout in 250.0..30_000.0) {
      "munim-wifi: timeout must be between 250 and 30000 milliseconds"
    }
    return timeout.toLong()
  }

  private fun normalizedInterval(value: Double?): Long {
    val interval = value ?: 30_000.0
    require(interval.isFinite() && interval in 10_000.0..600_000.0) {
      "munim-wifi: interval must be between 10000 and 600000 milliseconds"
    }
    return interval.toLong()
  }

  private fun normalizedConnectionTimeout(value: Double?): Long {
    val timeout = value ?: 30_000.0
    require(timeout.isFinite() && timeout in 5_000.0..120_000.0) {
      "munim-wifi: connection timeout must be between 5000 and 120000 milliseconds"
    }
    return timeout.toLong()
  }

  private fun frequencyToChannel(frequency: Int): Int? = when {
    frequency == 2484 -> 14
    frequency in 2412..2472 -> (frequency - 2407) / 5
    frequency in 5170..5895 -> (frequency - 5000) / 5
    frequency == 5935 -> 2
    frequency in 5955..7115 -> (frequency - 5950) / 5
    frequency in 58_320..70_200 -> (frequency - 56_160) / 2_160
    else -> null
  }

  private fun ipv4(address: Int): String? {
    if (address == 0) return null
    return listOf(
      address and 0xff,
      address shr 8 and 0xff,
      address shr 16 and 0xff,
      address shr 24 and 0xff,
    ).joinToString(".")
  }

  private fun quote(value: String): String = "\"${value.replace("\"", "\\\"")}\""
}
