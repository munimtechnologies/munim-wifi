package com.margelo.nitro.munimwifi

import android.content.Context
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.net.wifi.rtt.RangingRequest
import android.net.wifi.rtt.RangingResult
import android.net.wifi.rtt.RangingResultCallback
import android.net.wifi.rtt.WifiRttManager
import android.os.Build
import android.os.Handler
import android.os.SystemClock
import androidx.annotation.RequiresApi
import java.util.concurrent.Executor
import java.util.concurrent.atomic.AtomicBoolean

/** Builds a ranging outcome; free of android.net.wifi.rtt types, so safe on any API level. */
internal fun rttOutcome(
  status: RttRangingStatus,
  message: String?,
  results: List<RttRangingResult> = emptyList(),
): RttRangingOutcome = RttRangingOutcome(status, results.toTypedArray(), message)

/**
 * Wi-Fi RTT (IEEE 802.11mc fine timing measurement) ranging to access points.
 * Kept out of HybridMunimWifi so devices below Android 9 never load the
 * android.net.wifi.rtt classes.
 */
internal object WifiRtt {
  /**
   * Ranges to [bssids] (or every 802.11mc responder in the latest scan) and
   * calls [onDone] exactly once, on [handler]'s thread.
   */
  @RequiresApi(Build.VERSION_CODES.P)
  fun range(
    context: Context,
    wifiManager: WifiManager,
    handler: Handler,
    bssids: List<String>?,
    includeOneSided: Boolean,
    timeoutMs: Long,
    onDone: (RttRangingOutcome) -> Unit,
  ) {
    val manager = context.getSystemService(Context.WIFI_RTT_RANGING_SERVICE) as? WifiRttManager
    if (manager == null) {
      onDone(rttOutcome(RttRangingStatus.UNSUPPORTED, "munim-wifi: the Wi-Fi RTT service is unavailable on this device"))
      return
    }
    if (!manager.isAvailable) {
      onDone(rttOutcome(
        RttRangingStatus.UNAVAILABLE,
        "munim-wifi: Wi-Fi RTT is unavailable right now (Wi-Fi or location is off, or the device is idle)",
      ))
      return
    }

    val oneSidedAllowed = includeOneSided && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    val scanResults = wifiManager.scanResults
    val byBssid = HashMap<String, ScanResult>(scanResults.size)
    for (result in scanResults) {
      val key = result.BSSID?.lowercase() ?: continue
      val existing = byBssid[key]
      if (existing == null || result.timestamp > existing.timestamp) byBssid[key] = result
    }
    val skipped = mutableListOf<RttRangingResult>()
    val missing = mutableListOf<String>()
    val candidates: List<ScanResult> = if (bssids != null) {
      bssids.map { it.lowercase() }.distinct().mapNotNull { bssid ->
        byBssid[bssid] ?: run {
          missing += bssid
          null
        }
      }
    } else {
      byBssid.values
        .filter { it.is80211mcResponder() || oneSidedAllowed }
        .sortedByDescending { it.level }
    }

    val builder = RangingRequest.Builder()
    val maxPeers = RangingRequest.getMaxPeers()
    val oneSided = HashSet<String>()
    var added = 0
    for (result in candidates) {
      if (added >= maxPeers) break
      val bssid = result.BSSID.lowercase()
      when {
        result.is80211mcResponder() -> builder.addAccessPoint(result)
        oneSidedAllowed -> {
          OneSidedApi31.add(builder, result)
          oneSided += bssid
        }
        else -> {
          skipped += RttRangingResult(
            bssid = bssid,
            status = RttResultStatus.RESPONDERUNSUPPORTED,
            distanceMeters = null,
            distanceStdDevMeters = null,
            rssi = null,
            attemptedMeasurements = null,
            successfulMeasurements = null,
            oneSided = false,
            timestamp = System.currentTimeMillis().toDouble(),
          )
          continue
        }
      }
      added++
    }

    if (added == 0) {
      val message = when {
        missing.isNotEmpty() ->
          "munim-wifi: not in the latest scan results: ${missing.joinToString()}; scan first"
        skipped.isNotEmpty() ->
          "munim-wifi: none of the access points is an 802.11mc responder" +
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) " (set includeOneSided to range anyway)" else ""
        else -> "munim-wifi: no 802.11mc responders in the latest scan results; scan first"
      }
      onDone(rttOutcome(RttRangingStatus.NOTARGETS, message, skipped))
      return
    }

    val settled = AtomicBoolean(false)
    val timeout = Runnable {
      if (settled.compareAndSet(false, true)) {
        onDone(rttOutcome(RttRangingStatus.FAILED, "munim-wifi: ranging timed out after ${timeoutMs}ms", skipped))
      }
    }
    handler.postDelayed(timeout, timeoutMs)
    val executor = Executor { command -> handler.post(command) }
    try {
      manager.startRanging(builder.build(), executor, object : RangingResultCallback() {
        override fun onRangingFailure(code: Int) {
          if (!settled.compareAndSet(false, true)) return
          handler.removeCallbacks(timeout)
          onDone(
            if (code == RangingResultCallback.STATUS_CODE_FAIL_RTT_NOT_AVAILABLE) {
              rttOutcome(RttRangingStatus.UNAVAILABLE, "munim-wifi: Wi-Fi RTT became unavailable", skipped)
            } else {
              rttOutcome(RttRangingStatus.FAILED, "munim-wifi: ranging failed (code $code)", skipped)
            }
          )
        }

        override fun onRangingResults(results: List<RangingResult>) {
          if (!settled.compareAndSet(false, true)) return
          handler.removeCallbacks(timeout)
          val mapped = results.map { toResult(it, oneSided) }
          onDone(rttOutcome(RttRangingStatus.COMPLETED, null, mapped + skipped))
        }
      })
    } catch (error: SecurityException) {
      if (settled.compareAndSet(false, true)) {
        handler.removeCallbacks(timeout)
        onDone(rttOutcome(
          RttRangingStatus.PERMISSIONDENIED,
          "munim-wifi: Wi-Fi RTT permission denied (${error.message})",
          skipped,
        ))
      }
    }
  }

  @RequiresApi(Build.VERSION_CODES.P)
  private fun toResult(result: RangingResult, oneSided: Set<String>): RttRangingResult {
    val bssid = result.macAddress?.toString()?.lowercase().orEmpty()
    val now = System.currentTimeMillis()
    return when (result.status) {
      RangingResult.STATUS_SUCCESS -> {
        val ageMs = (SystemClock.elapsedRealtime() - result.rangingTimestampMillis).coerceAtLeast(0L)
        RttRangingResult(
          bssid = bssid,
          status = RttResultStatus.SUCCESS,
          distanceMeters = result.distanceMm / 1_000.0,
          distanceStdDevMeters = result.distanceStdDevMm / 1_000.0,
          rssi = result.rssi.toDouble(),
          attemptedMeasurements = result.numAttemptedMeasurements.toDouble(),
          successfulMeasurements = result.numSuccessfulMeasurements.toDouble(),
          oneSided = bssid in oneSided,
          timestamp = (now - ageMs).toDouble(),
        )
      }
      else -> RttRangingResult(
        bssid = bssid,
        status = if (result.status == RangingResult.STATUS_RESPONDER_DOES_NOT_SUPPORT_IEEE80211MC) {
          RttResultStatus.RESPONDERUNSUPPORTED
        } else {
          RttResultStatus.FAILED
        },
        distanceMeters = null,
        distanceStdDevMeters = null,
        rssi = null,
        attemptedMeasurements = null,
        successfulMeasurements = null,
        oneSided = bssid in oneSided,
        timestamp = now.toDouble(),
      )
    }
  }
}

/** Android 12 one-sided RTT, isolated so older ART never resolves the method. */
@RequiresApi(Build.VERSION_CODES.S)
private object OneSidedApi31 {
  fun add(builder: RangingRequest.Builder, result: ScanResult) {
    builder.addNon80211mcCapableAccessPoint(result)
  }
}
