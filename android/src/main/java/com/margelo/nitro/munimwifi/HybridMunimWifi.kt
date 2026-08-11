package com.margelo.nitro.munimwifi

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.MacAddress
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.ScanResult
import android.net.wifi.SoftApConfiguration
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.net.wifi.WifiNetworkSuggestion
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
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
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.TimeoutException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

@Keep
@DoNotStrip
class HybridMunimWifi : HybridMunimWifiSpec() {
  private data class LocalNetworkLease(
    val id: String,
    val ssid: String,
    val callback: ConnectivityManager.NetworkCallback,
    var network: Network? = null,
    var previousBoundNetwork: Network? = null,
    var boundProcess: Boolean = false,
  )

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
  private var temporaryLegacyNetworkId: Int? = null
  private val localNetworkLeases = ConcurrentHashMap<String, LocalNetworkLease>()
  private val suggestions = ConcurrentHashMap<String, WifiNetworkSuggestion>()
  private val hotspotReservations =
    ConcurrentHashMap<String, WifiManager.LocalOnlyHotspotReservation>()
  private var networkObserverCallback: ConnectivityManager.NetworkCallback? = null
  @Volatile
  private var networkObserverEmit: ((NetworkDiagnostics) -> Unit)? = null
  private val observerLock = Any()

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
    validateSsid(ssid)
    readNetworks(null).firstOrNull { it.ssid == ssid }?.rssi
      ?.let(Variant_NullType_Double::create)
      ?: Variant_NullType_Double.create(NullType.NULL)
  }

  override fun getBSSID(ssid: String): Promise<Variant_NullType_String> = Promise.parallel {
    validateSsid(ssid)
    readNetworks(null).firstOrNull { it.ssid == ssid }?.bssid
      ?.let(Variant_NullType_String::create)
      ?: Variant_NullType_String.create(NullType.NULL)
  }

  override fun getChannelInfo(ssid: String): Promise<Variant_NullType_ChannelInfo> = Promise.parallel {
    validateSsid(ssid)
    val network = readNetworks(null).firstOrNull { it.ssid == ssid }
    if (network?.channel != null && network.frequency != null) {
      Variant_NullType_ChannelInfo.create(ChannelInfo(network.channel, network.frequency))
    } else {
      Variant_NullType_ChannelInfo.create(NullType.NULL)
    }
  }

  override fun getNetworkInfo(ssid: String): Promise<Variant_NullType_WifiNetwork> = Promise.parallel {
    validateSsid(ssid)
    readNetworks(null).firstOrNull { it.ssid == ssid }
      ?.let(Variant_NullType_WifiNetwork::create)
      ?: Variant_NullType_WifiNetwork.create(NullType.NULL)
  }

  override fun getCurrentNetwork(): Promise<Variant_NullType_CurrentNetworkInfo> = Promise.parallel {
    currentNetworkInfo()?.let(Variant_NullType_CurrentNetworkInfo::create)
      ?: Variant_NullType_CurrentNetworkInfo.create(NullType.NULL)
  }

  override fun connectToNetwork(options: ConnectionOptions): Promise<Unit> {
    validateConnectionOptions(options)
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
      temporaryLegacyNetworkId?.let {
        @Suppress("DEPRECATION")
        wifiManager.removeNetwork(it)
      }
      temporaryLegacyNetworkId = null
      @Suppress("DEPRECATION")
      wifiManager.disconnect()
    }
    Unit
  }

  override fun getIPAddress(): Promise<Variant_NullType_String> = Promise.parallel {
    currentNetworkInfo()?.ipAddress?.let(Variant_NullType_String::create)
      ?: Variant_NullType_String.create(NullType.NULL)
  }

  override fun requestLocalNetwork(options: NativeConnectionOptions): Promise<ConnectionOutcome> {
    val promise = Promise<ConnectionOutcome>()
    try {
      validateSsid(options.ssid)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.resolve(localNetworkOutcome(
          ConnectionStatus.UNSUPPORTED,
          ssid = options.ssid,
          message = "munim-wifi: local network requests require Android 10+",
        ))
        return promise
      }
      if (!hasNearbyPermission()) {
        promise.resolve(localNetworkOutcome(
          ConnectionStatus.FAILED,
          ssid = options.ssid,
          message = "munim-wifi: Nearby Wi-Fi Devices permission is required",
        ))
        return promise
      }

      val builder = WifiNetworkSpecifier.Builder().setSsid(options.ssid)
      options.bssid?.takeIf { it.isNotBlank() }?.let { builder.setBssid(MacAddress.fromString(it)) }
      when (options.securityType) {
        WifiSecurityType.OPEN -> Unit
        WifiSecurityType.OWE -> {
          if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            promise.resolve(localNetworkOutcome(
              ConnectionStatus.UNSUPPORTED,
              ssid = options.ssid,
              message = "munim-wifi: OWE (Enhanced Open) requires Android 11+",
            ))
            return promise
          }
          builder.setIsEnhancedOpen(true)
        }
        WifiSecurityType.WPA2 -> builder.setWpa2Passphrase(requirePassphrase(options.passphrase))
        WifiSecurityType.WPA3 -> builder.setWpa3Passphrase(requirePassphrase(options.passphrase))
        else -> {
          promise.resolve(localNetworkOutcome(
            ConnectionStatus.UNSUPPORTED,
            ssid = options.ssid,
            message = "munim-wifi: ${options.securityType} networks cannot be requested with a network specifier",
          ))
          return promise
        }
      }

      val leaseId = UUID.randomUUID().toString()
      val bindProcess = options.bindProcess == true
      val settled = AtomicBoolean(false)
      lateinit var lease: LocalNetworkLease
      val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
          lease.network = network
          if (bindProcess) {
            lease.previousBoundNetwork = connectivityManager.boundNetworkForProcess
            connectivityManager.bindProcessToNetwork(network)
            lease.boundProcess = true
          }
          if (settled.compareAndSet(false, true)) {
            promise.resolve(localNetworkOutcome(
              ConnectionStatus.CONNECTED,
              ssid = options.ssid,
              leaseId = leaseId,
              boundProcess = bindProcess,
            ))
          }
        }

        override fun onUnavailable() {
          localNetworkLeases.remove(leaseId)
          if (settled.compareAndSet(false, true)) {
            promise.resolve(localNetworkOutcome(
              ConnectionStatus.FAILED,
              ssid = options.ssid,
              message = "munim-wifi: the Wi-Fi network was unavailable or the request was denied",
            ))
          }
        }

        override fun onLost(network: Network) {
          if (lease.boundProcess) {
            connectivityManager.bindProcessToNetwork(lease.previousBoundNetwork)
            lease.boundProcess = false
          }
          if (settled.get()) {
            networkObserverEmit?.invoke(buildDiagnostics(null, NetworkState.LOST))
          }
        }
      }
      lease = LocalNetworkLease(leaseId, options.ssid, callback)
      localNetworkLeases[leaseId] = lease

      val request = NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .setNetworkSpecifier(builder.build())
        .build()
      val timeoutMs = normalizedConnectionTimeout(options.timeout)
      connectivityManager.requestNetwork(request, callback, timeoutMs.toInt())
    } catch (error: Throwable) {
      promise.reject(error)
    }
    return promise
  }

  override fun configureNetwork(options: NativeConnectionOptions): Promise<ConnectionOutcome> = Promise.parallel {
    validateSsid(options.ssid)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return@parallel ConnectionOutcome(
        status = ConnectionStatus.UNSUPPORTED,
        mode = ConnectionMode.MANAGEDCONFIGURATION,
        ssid = options.ssid,
        leaseId = null,
        configurationId = null,
        boundProcess = false,
        message = "munim-wifi: network configuration requires Android 10+ network suggestions",
      )
    }
    val suggestion = try {
      buildSuggestion(
        ssid = options.ssid,
        securityType = options.securityType,
        passphrase = options.passphrase,
        bssid = options.bssid,
        hidden = null,
        appInteractionRequired = null,
      )
    } catch (error: UnsupportedOperationException) {
      return@parallel ConnectionOutcome(
        status = ConnectionStatus.UNSUPPORTED,
        mode = ConnectionMode.MANAGEDCONFIGURATION,
        ssid = options.ssid,
        leaseId = null,
        configurationId = null,
        boundProcess = false,
        message = error.message,
      )
    }
    val status = wifiManager.addNetworkSuggestions(listOf(suggestion))
    if (status == WifiManager.STATUS_NETWORK_SUGGESTIONS_SUCCESS ||
      status == WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_DUPLICATE
    ) {
      suggestions[options.ssid] = suggestion
      ConnectionOutcome(
        status = ConnectionStatus.CONFIGURED,
        mode = ConnectionMode.MANAGEDCONFIGURATION,
        ssid = options.ssid,
        leaseId = null,
        configurationId = options.ssid,
        boundProcess = false,
        message = "munim-wifi: configured through an Android network suggestion",
      )
    } else {
      ConnectionOutcome(
        status = ConnectionStatus.FAILED,
        mode = ConnectionMode.MANAGEDCONFIGURATION,
        ssid = options.ssid,
        leaseId = null,
        configurationId = null,
        boundProcess = false,
        message = suggestionStatusMessage(status),
      )
    }
  }

  override fun requestUserSavedNetwork(options: NativeConnectionOptions?): Promise<ConnectionOutcome> = Promise.parallel {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return@parallel ConnectionOutcome(
        status = ConnectionStatus.UNSUPPORTED,
        mode = ConnectionMode.USERSAVEDNETWORK,
        ssid = options?.ssid,
        leaseId = null,
        configurationId = null,
        boundProcess = false,
        message = "munim-wifi: the Wi-Fi settings panel requires Android 10+",
      )
    }
    val intent = buildUserSavedNetworkIntent(options)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
    ConnectionOutcome(
      status = ConnectionStatus.PRESENTED,
      mode = ConnectionMode.USERSAVEDNETWORK,
      ssid = options?.ssid,
      leaseId = null,
      configurationId = null,
      boundProcess = false,
      message = null,
    )
  }

  override fun releaseConnection(leaseOrConfigurationId: String): Promise<ConnectionOutcome> = Promise.parallel {
    val lease = localNetworkLeases.remove(leaseOrConfigurationId)
    if (lease != null) {
      try {
        connectivityManager.unregisterNetworkCallback(lease.callback)
      } catch (_: IllegalArgumentException) {
        // Already unregistered by the system.
      }
      if (lease.boundProcess) {
        connectivityManager.bindProcessToNetwork(lease.previousBoundNetwork)
        lease.boundProcess = false
      }
      return@parallel ConnectionOutcome(
        status = ConnectionStatus.RELEASED,
        mode = ConnectionMode.LOCALNETWORK,
        ssid = lease.ssid,
        leaseId = lease.id,
        configurationId = null,
        boundProcess = false,
        message = null,
      )
    }
    val suggestion = suggestions.remove(leaseOrConfigurationId)
    if (suggestion != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      wifiManager.removeNetworkSuggestions(listOf(suggestion))
      return@parallel ConnectionOutcome(
        status = ConnectionStatus.RELEASED,
        mode = ConnectionMode.MANAGEDCONFIGURATION,
        ssid = leaseOrConfigurationId,
        leaseId = null,
        configurationId = leaseOrConfigurationId,
        boundProcess = false,
        message = null,
      )
    }
    ConnectionOutcome(
      status = ConnectionStatus.FAILED,
      mode = ConnectionMode.LOCALNETWORK,
      ssid = null,
      leaseId = null,
      configurationId = null,
      boundProcess = false,
      message = "munim-wifi: no lease or configuration matches \"$leaseOrConfigurationId\"",
    )
  }

  override fun addNetworkSuggestion(options: NativeNetworkSuggestionOptions): Promise<SuggestionOutcome> = Promise.parallel {
    validateSsid(options.ssid)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return@parallel SuggestionOutcome(
        status = SuggestionStatus.UNSUPPORTED,
        suggestionId = null,
        message = "munim-wifi: network suggestions require Android 10+",
      )
    }
    val suggestion = try {
      buildSuggestion(
        ssid = options.ssid,
        securityType = options.securityType,
        passphrase = options.passphrase,
        bssid = options.bssid,
        hidden = options.hidden,
        appInteractionRequired = options.appInteractionRequired,
      )
    } catch (error: UnsupportedOperationException) {
      return@parallel SuggestionOutcome(
        status = SuggestionStatus.UNSUPPORTED,
        suggestionId = null,
        message = error.message,
      )
    }
    when (val status = wifiManager.addNetworkSuggestions(listOf(suggestion))) {
      WifiManager.STATUS_NETWORK_SUGGESTIONS_SUCCESS -> {
        suggestions[options.ssid] = suggestion
        SuggestionOutcome(SuggestionStatus.ADDED, options.ssid, null)
      }
      WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_DUPLICATE -> {
        suggestions[options.ssid] = suggestion
        SuggestionOutcome(SuggestionStatus.ALREADYEXISTS, options.ssid, null)
      }
      else -> SuggestionOutcome(SuggestionStatus.FAILED, null, suggestionStatusMessage(status))
    }
  }

  override fun removeNetworkSuggestion(options: NativeNetworkSuggestionOptions): Promise<SuggestionOutcome> = Promise.parallel {
    validateSsid(options.ssid)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return@parallel SuggestionOutcome(
        status = SuggestionStatus.UNSUPPORTED,
        suggestionId = null,
        message = "munim-wifi: network suggestions require Android 10+",
      )
    }
    val suggestion = suggestions.remove(options.ssid) ?: try {
      buildSuggestion(
        ssid = options.ssid,
        securityType = options.securityType,
        passphrase = options.passphrase,
        bssid = options.bssid,
        hidden = options.hidden,
        appInteractionRequired = options.appInteractionRequired,
      )
    } catch (error: UnsupportedOperationException) {
      return@parallel SuggestionOutcome(
        status = SuggestionStatus.UNSUPPORTED,
        suggestionId = null,
        message = error.message,
      )
    }
    when (val status = wifiManager.removeNetworkSuggestions(listOf(suggestion))) {
      WifiManager.STATUS_NETWORK_SUGGESTIONS_SUCCESS ->
        SuggestionOutcome(SuggestionStatus.REMOVED, options.ssid, null)
      WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_REMOVE_INVALID ->
        SuggestionOutcome(SuggestionStatus.NOTFOUND, options.ssid, null)
      else -> SuggestionOutcome(SuggestionStatus.FAILED, options.ssid, suggestionStatusMessage(status))
    }
  }

  override fun getNetworkSuggestionStatus(options: NativeNetworkSuggestionOptions): Promise<SuggestionOutcome> = Promise.parallel {
    validateSsid(options.ssid)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return@parallel SuggestionOutcome(
        status = SuggestionStatus.UNSUPPORTED,
        suggestionId = null,
        message = "munim-wifi: network suggestions require Android 10+",
      )
    }
    val installed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      wifiManager.networkSuggestions.any { it.ssid == options.ssid }
    } else {
      suggestions.containsKey(options.ssid)
    }
    when {
      !installed -> SuggestionOutcome(SuggestionStatus.NOTFOUND, options.ssid, null)
      currentNetworkInfo()?.ssid == options.ssid ->
        SuggestionOutcome(SuggestionStatus.ACTIVE, options.ssid, null)
      else -> SuggestionOutcome(SuggestionStatus.INACTIVE, options.ssid, null)
    }
  }

  override fun startLocalOnlyHotspot(): Promise<HotspotOutcome> {
    val promise = Promise<HotspotOutcome>()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      promise.resolve(HotspotOutcome(
        status = HotspotStatus.UNSUPPORTED,
        reservationId = null,
        ssid = null,
        passphrase = null,
        securityType = WifiSecurityType.UNKNOWN,
        message = "munim-wifi: local-only hotspots require Android 8+",
      ))
      return promise
    }
    if (!hasScanPermission() || !hasNearbyPermission()) {
      promise.resolve(HotspotOutcome(
        status = HotspotStatus.FAILED,
        reservationId = null,
        ssid = null,
        passphrase = null,
        securityType = WifiSecurityType.UNKNOWN,
        message = "munim-wifi: location and Nearby Wi-Fi Devices permissions are required to start a hotspot",
      ))
      return promise
    }

    val settled = AtomicBoolean(false)
    try {
      wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
        override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation) {
          if (!settled.compareAndSet(false, true)) return
          val reservationId = UUID.randomUUID().toString()
          hotspotReservations[reservationId] = reservation
          promise.resolve(describeHotspot(reservation, reservationId))
        }

        override fun onFailed(reason: Int) {
          if (!settled.compareAndSet(false, true)) return
          promise.resolve(HotspotOutcome(
            status = HotspotStatus.FAILED,
            reservationId = null,
            ssid = null,
            passphrase = null,
            securityType = WifiSecurityType.UNKNOWN,
            message = "munim-wifi: the hotspot failed to start (reason $reason)",
          ))
        }
      }, mainHandler)
    } catch (error: Throwable) {
      if (settled.compareAndSet(false, true)) {
        promise.resolve(HotspotOutcome(
          status = HotspotStatus.FAILED,
          reservationId = null,
          ssid = null,
          passphrase = null,
          securityType = WifiSecurityType.UNKNOWN,
          message = error.message ?: "munim-wifi: the hotspot failed to start",
        ))
      }
    }
    return promise
  }

  override fun stopLocalOnlyHotspot(reservationId: String): Promise<HotspotOutcome> = Promise.parallel {
    val reservation = hotspotReservations.remove(reservationId)
    if (reservation == null) {
      HotspotOutcome(
        status = HotspotStatus.FAILED,
        reservationId = reservationId,
        ssid = null,
        passphrase = null,
        securityType = WifiSecurityType.UNKNOWN,
        message = "munim-wifi: no hotspot reservation matches \"$reservationId\"",
      )
    } else {
      reservation.close()
      HotspotOutcome(
        status = HotspotStatus.STOPPED,
        reservationId = reservationId,
        ssid = null,
        passphrase = null,
        securityType = WifiSecurityType.UNKNOWN,
        message = null,
      )
    }
  }

  override fun getWifiCapabilityStatus(): Promise<WifiCapabilityStatus> = Promise.parallel {
    val packageManager = context.packageManager
    val atLeastQ = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
    WifiCapabilityStatus(
      platform = "android",
      scan = CapabilityAvailability.SUPPORTED,
      localNetworkRequest = availability(atLeastQ),
      managedConfiguration = availability(atLeastQ),
      networkSuggestions = availability(atLeastQ),
      userSavedNetworkIntent = availability(atLeastQ),
      localOnlyHotspot = availability(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O),
      wifiDirect = availability(packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT)),
      wifiAware = availability(
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
          packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_AWARE)
      ),
      wifiRtt = availability(
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
          packageManager.hasSystemFeature(PackageManager.FEATURE_WIFI_RTT)
      ),
      locationPermission = permissionState(hasScanPermission()),
      nearbyWifiPermission = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        PermissionState.UNAVAILABLE
      } else {
        permissionState(hasPermission(Manifest.permission.NEARBY_WIFI_DEVICES))
      },
      wifiInformationPermission = permissionState(hasPermission(Manifest.permission.ACCESS_WIFI_STATE)),
    )
  }

  override fun getNetworkDiagnostics(): Promise<NetworkDiagnostics> = Promise.parallel {
    buildDiagnostics(connectivityManager.activeNetwork, null)
  }

  override fun startNetworkObserver(onUpdate: (diagnostics: NetworkDiagnostics) -> Unit) {
    synchronized(observerLock) {
      stopNetworkObserverLocked()
      val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = emit(network, NetworkState.AVAILABLE)

        override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) =
          emit(network, NetworkState.AVAILABLE)

        override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) =
          emit(network, NetworkState.AVAILABLE)

        override fun onLost(network: Network) = emit(null, NetworkState.LOST)

        override fun onUnavailable() = emit(null, NetworkState.UNAVAILABLE)

        private fun emit(network: Network?, state: NetworkState) {
          val emitter = networkObserverEmit ?: return
          try {
            emitter(buildDiagnostics(network, state))
          } catch (_: Throwable) {
            // Never crash the app because a JS listener threw.
          }
        }
      }
      networkObserverEmit = onUpdate
      networkObserverCallback = callback
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
          connectivityManager.registerDefaultNetworkCallback(callback, mainHandler)
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.N ->
          connectivityManager.registerDefaultNetworkCallback(callback)
        else -> connectivityManager.registerNetworkCallback(NetworkRequest.Builder().build(), callback)
      }
    }
  }

  override fun stopNetworkObserver() {
    synchronized(observerLock) {
      stopNetworkObserverLocked()
    }
  }

  private fun stopNetworkObserverLocked() {
    networkObserverEmit = null
    networkObserverCallback?.let {
      try {
        connectivityManager.unregisterNetworkCallback(it)
      } catch (_: IllegalArgumentException) {
        // Already unregistered.
      }
    }
    networkObserverCallback = null
  }

  override fun addListener(eventName: String) = Unit

  override fun removeListeners(count: Double) = Unit

  private fun localNetworkOutcome(
    status: ConnectionStatus,
    ssid: String? = null,
    leaseId: String? = null,
    boundProcess: Boolean = false,
    message: String? = null,
  ): ConnectionOutcome = ConnectionOutcome(
    status = status,
    mode = ConnectionMode.LOCALNETWORK,
    ssid = ssid,
    leaseId = leaseId,
    configurationId = null,
    boundProcess = boundProcess,
    message = message,
  )

  private fun requirePassphrase(passphrase: String?): String {
    require(!passphrase.isNullOrEmpty()) { "munim-wifi: a passphrase is required for this security type" }
    return passphrase
  }

  private fun buildSuggestion(
    ssid: String,
    securityType: WifiSecurityType,
    passphrase: String?,
    bssid: String?,
    hidden: Boolean?,
    appInteractionRequired: Boolean?,
  ): WifiNetworkSuggestion {
    val builder = WifiNetworkSuggestion.Builder().setSsid(ssid)
    bssid?.takeIf { it.isNotBlank() }?.let { builder.setBssid(MacAddress.fromString(it)) }
    when (securityType) {
      WifiSecurityType.OPEN -> Unit
      WifiSecurityType.OWE -> builder.setIsEnhancedOpen(true)
      WifiSecurityType.WPA2 -> builder.setWpa2Passphrase(requirePassphrase(passphrase))
      WifiSecurityType.WPA3 -> builder.setWpa3Passphrase(requirePassphrase(passphrase))
      else -> throw UnsupportedOperationException(
        "munim-wifi: $securityType networks are not supported by this suggestion API yet"
      )
    }
    if (hidden == true) builder.setIsHiddenSsid(true)
    if (appInteractionRequired == true) builder.setIsAppInteractionRequired(true)
    return builder.build()
  }

  private fun buildUserSavedNetworkIntent(options: NativeConnectionOptions?): Intent {
    if (options != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val suggestion = buildSuggestion(
          ssid = options.ssid,
          securityType = options.securityType,
          passphrase = options.passphrase,
          bssid = options.bssid,
          hidden = null,
          appInteractionRequired = null,
        )
        return Intent(Settings.ACTION_WIFI_ADD_NETWORKS).putParcelableArrayListExtra(
          Settings.EXTRA_WIFI_NETWORK_LIST,
          arrayListOf(suggestion),
        )
      } catch (_: UnsupportedOperationException) {
        // Fall through to the generic Wi-Fi panel.
      }
    }
    return Intent(Settings.Panel.ACTION_WIFI)
  }

  private fun suggestionStatusMessage(status: Int): String = when (status) {
    WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_APP_DISALLOWED ->
      "munim-wifi: the user has disallowed suggestions from this app"
    WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_EXCEEDS_MAX_PER_APP ->
      "munim-wifi: this app has reached the per-app suggestion limit"
    WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_NOT_ALLOWED ->
      "munim-wifi: this app is not allowed to add suggestions"
    WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_INVALID ->
      "munim-wifi: Android rejected the suggestion as invalid"
    WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_INTERNAL ->
      "munim-wifi: an internal Wi-Fi service error occurred"
    else -> "munim-wifi: the suggestion operation failed with status $status"
  }

  @Suppress("DEPRECATION")
  private fun describeHotspot(
    reservation: WifiManager.LocalOnlyHotspotReservation,
    reservationId: String,
  ): HotspotOutcome {
    var ssid: String? = null
    var passphrase: String? = null
    var securityType = WifiSecurityType.UNKNOWN
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val config = reservation.softApConfiguration
      ssid = config.ssid
      passphrase = config.passphrase
      securityType = when (config.securityType) {
        SoftApConfiguration.SECURITY_TYPE_OPEN -> WifiSecurityType.OPEN
        SoftApConfiguration.SECURITY_TYPE_WPA2_PSK -> WifiSecurityType.WPA2
        SoftApConfiguration.SECURITY_TYPE_WPA3_SAE,
        SoftApConfiguration.SECURITY_TYPE_WPA3_SAE_TRANSITION,
        -> WifiSecurityType.WPA3
        else -> WifiSecurityType.UNKNOWN
      }
    } else {
      @Suppress("DEPRECATION")
      val config = reservation.wifiConfiguration
      ssid = config?.SSID?.removeSurrounding("\"")
      passphrase = config?.preSharedKey?.removeSurrounding("\"")
      securityType = if (passphrase.isNullOrEmpty()) WifiSecurityType.OPEN else WifiSecurityType.WPA2
    }
    return HotspotOutcome(
      status = HotspotStatus.STARTED,
      reservationId = reservationId,
      ssid = ssid,
      passphrase = passphrase,
      securityType = securityType,
      message = null,
    )
  }

  private fun availability(supported: Boolean): CapabilityAvailability =
    if (supported) CapabilityAvailability.SUPPORTED else CapabilityAvailability.UNSUPPORTED

  private fun permissionState(granted: Boolean): PermissionState =
    if (granted) PermissionState.GRANTED else PermissionState.DENIED

  private fun buildDiagnostics(networkOverride: Network?, stateOverride: NetworkState?): NetworkDiagnostics {
    val network = networkOverride ?: if (stateOverride == null) connectivityManager.activeNetwork else null
    val capabilities = network?.let { connectivityManager.getNetworkCapabilities(it) }
    val linkProperties = network?.let { connectivityManager.getLinkProperties(it) }
    val state = stateOverride
      ?: if (network != null && capabilities != null) NetworkState.AVAILABLE else NetworkState.UNAVAILABLE
    val isWifi = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    return NetworkDiagnostics(
      timestamp = System.currentTimeMillis().toDouble(),
      state = state,
      validated = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
      captivePortal = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_CAPTIVE_PORTAL),
      metered = capabilities?.let { !it.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) },
      constrained = if (capabilities != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_CONGESTED)
      } else {
        null
      },
      currentNetwork = if (isWifi) currentNetworkInfo() else null,
      linkProperties = linkProperties?.let(::toNetworkLinkProperties),
    )
  }

  private fun toNetworkLinkProperties(linkProperties: LinkProperties): NetworkLinkProperties =
    NetworkLinkProperties(
      interfaceName = linkProperties.interfaceName,
      addresses = linkProperties.linkAddresses.mapNotNull { it.address?.hostAddress }.toTypedArray(),
      dnsServers = linkProperties.dnsServers.mapNotNull { it.hostAddress }.toTypedArray(),
      routes = linkProperties.routes.map { route ->
        route.gateway?.hostAddress?.let { gateway -> "${route.destination} via $gateway" }
          ?: route.destination.toString()
      }.toTypedArray(),
      mtu = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && linkProperties.mtu > 0) {
        linkProperties.mtu.toDouble()
      } else {
        null
      },
    )

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
    val password = options.password?.takeIf { it.isNotEmpty() }
    when (options.security) {
      WifiSecurityType.WPA3 -> password?.let(builder::setWpa3Passphrase)
      WifiSecurityType.OWE ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) builder.setIsEnhancedOpen(true)
      WifiSecurityType.OPEN -> Unit
      else -> password?.let(builder::setWpa2Passphrase)
    }
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
    try {
      check(wifiManager.disconnect()) { "munim-wifi: could not disconnect from the current network" }
      check(wifiManager.enableNetwork(networkId, true)) { "munim-wifi: could not enable the requested network" }
      check(wifiManager.reconnect()) { "munim-wifi: could not reconnect Wi-Fi" }
      if (options.joinOnce != false) {
        temporaryLegacyNetworkId = networkId
      }
    } catch (error: Throwable) {
      wifiManager.removeNetwork(networkId)
      throw error
    }
    Unit
  }

  private fun validateConnectionOptions(options: ConnectionOptions) {
    validateSsid(options.ssid)
    options.password?.let { password ->
      require(password.isNotEmpty() && '\u0000' !in password) {
        "munim-wifi: password must be non-empty and contain no null characters"
      }
      require(password.toByteArray(Charsets.UTF_8).size <= 64) {
        "munim-wifi: password must not exceed 64 UTF-8 bytes"
      }
    }
    normalizedConnectionTimeout(options.timeout)
  }

  private fun validateSsid(ssid: String) {
    require(ssid.isNotBlank() && '\u0000' !in ssid) {
      "munim-wifi: SSID must be non-empty and contain no null characters"
    }
    require(ssid.toByteArray(Charsets.UTF_8).size <= 32) {
      "munim-wifi: SSID must not exceed 32 UTF-8 bytes"
    }
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
      securityType = classifySecurity(capabilities),
      timestamp = System.currentTimeMillis().toDouble(),
    )
  }

  private fun classifySecurity(capabilities: String): WifiSecurityType {
    val value = capabilities.uppercase()
    return when {
      "PASSPOINT" in value -> WifiSecurityType.PASSPOINT
      "EAP" in value -> WifiSecurityType.ENTERPRISE
      "SAE" in value || "WPA3" in value -> WifiSecurityType.WPA3
      "OWE" in value -> WifiSecurityType.OWE
      "WEP" in value -> WifiSecurityType.WEP
      "PSK" in value || "WPA" in value -> WifiSecurityType.WPA2
      else -> WifiSecurityType.OPEN
    }
  }

  private fun currentSecurityType(info: WifiInfo): WifiSecurityType {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return WifiSecurityType.UNKNOWN
    return when (info.currentSecurityType) {
      WifiInfo.SECURITY_TYPE_OPEN -> WifiSecurityType.OPEN
      WifiInfo.SECURITY_TYPE_OWE -> WifiSecurityType.OWE
      WifiInfo.SECURITY_TYPE_WEP -> WifiSecurityType.WEP
      WifiInfo.SECURITY_TYPE_PSK -> WifiSecurityType.WPA2
      WifiInfo.SECURITY_TYPE_SAE -> WifiSecurityType.WPA3
      WifiInfo.SECURITY_TYPE_EAP,
      WifiInfo.SECURITY_TYPE_EAP_WPA3_ENTERPRISE,
      -> WifiSecurityType.ENTERPRISE
      WifiInfo.SECURITY_TYPE_PASSPOINT_R1_R2,
      WifiInfo.SECURITY_TYPE_PASSPOINT_R3,
      -> WifiSecurityType.PASSPOINT
      else -> WifiSecurityType.UNKNOWN
    }
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
      securityType = currentSecurityType(info),
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
