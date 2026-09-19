package com.margelo.nitro.munimwifi

import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import java.util.ArrayDeque
import java.util.concurrent.atomic.AtomicBoolean

/**
 * One NsdManager browse. Found services are resolved one at a time (Android
 * below 14 rejects concurrent resolves with FAILURE_ALREADY_ACTIVE), each with
 * a timeout so a stuck resolve cannot stall the queue. All state is touched on
 * [handler]'s thread.
 */
internal class NsdDiscoverySession(
  private val nsdManager: NsdManager,
  private val handler: Handler,
  val id: String,
  private val type: String,
  private val domain: String,
  private val resolve: Boolean,
  private val resolveTimeoutMs: Long,
  private val onFound: (DiscoveredService) -> Unit,
  private val onLost: (DiscoveredService) -> Unit,
  private val onError: ((String) -> Unit)?,
) {
  private val stopped = AtomicBoolean(false)
  private val pending = ArrayDeque<NsdServiceInfo>()
  private var resolving: NsdServiceInfo? = null
  private var activeResolveListener: NsdManager.ResolveListener? = null

  private val discoveryListener = object : NsdManager.DiscoveryListener {
    override fun onDiscoveryStarted(serviceType: String) = Unit

    override fun onDiscoveryStopped(serviceType: String) = Unit

    override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
      handler.post {
        stopped.set(true)
        emitError("munim-wifi: service discovery for $type failed to start (${errorName(errorCode)})")
      }
    }

    override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit

    override fun onServiceFound(serviceInfo: NsdServiceInfo) {
      handler.post {
        if (stopped.get()) return@post
        if (resolve) {
          pending.removeAll { sameService(it, serviceInfo) }
          pending.add(serviceInfo)
          resolveNext()
        } else {
          emitFound(toService(serviceInfo, resolved = false))
        }
      }
    }

    override fun onServiceLost(serviceInfo: NsdServiceInfo) {
      handler.post {
        if (stopped.get()) return@post
        pending.removeAll { sameService(it, serviceInfo) }
        try {
          onLost(toService(serviceInfo, resolved = false))
        } catch (_: Throwable) {
          // Never crash because a JS listener threw.
        }
      }
    }
  }

  fun start() {
    try {
      nsdManager.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
    } catch (error: Throwable) {
      stopped.set(true)
      emitError(error.message ?: "munim-wifi: service discovery for $type failed to start")
    }
  }

  fun stop() {
    if (!stopped.compareAndSet(false, true)) return
    try {
      nsdManager.stopServiceDiscovery(discoveryListener)
    } catch (_: IllegalArgumentException) {
      // Discovery never started or was already stopped.
    }
    handler.post {
      pending.clear()
      cancelActiveResolve()
    }
  }

  private fun resolveNext() {
    if (stopped.get() || resolving != null) return
    val next = pending.poll() ?: return
    resolving = next
    val finished = AtomicBoolean(false)

    val finish: (NsdServiceInfo, Boolean) -> Unit = { info, resolved ->
      handler.post {
        if (finished.compareAndSet(false, true) && resolving === next) {
          resolving = null
          activeResolveListener = null
          if (!stopped.get()) emitFound(toService(info, resolved))
          resolveNext()
        }
      }
    }

    val listener = object : NsdManager.ResolveListener {
      override fun onServiceResolved(serviceInfo: NsdServiceInfo) = finish(serviceInfo, true)

      override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = finish(next, false)
    }
    activeResolveListener = listener
    try {
      @Suppress("DEPRECATION")
      nsdManager.resolveService(next, listener)
    } catch (_: Throwable) {
      finish(next, false)
      return
    }
    handler.postDelayed({
      if (!finished.get() && resolving === next) {
        cancelActiveResolve()
        finish(next, false)
      }
    }, resolveTimeoutMs)
  }

  private fun cancelActiveResolve() {
    val listener = activeResolveListener ?: return
    activeResolveListener = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      try {
        nsdManager.stopServiceResolution(listener)
      } catch (_: Throwable) {
        // Resolution already finished.
      }
    }
  }

  private fun emitFound(service: DiscoveredService) {
    try {
      onFound(service)
    } catch (_: Throwable) {
      // Never crash because a JS listener threw.
    }
  }

  private fun emitError(message: String) {
    try {
      onError?.invoke(message)
    } catch (_: Throwable) {
      // Never crash because a JS listener threw.
    }
  }

  private fun sameService(a: NsdServiceInfo, b: NsdServiceInfo): Boolean =
    a.serviceName == b.serviceName

  private fun toService(info: NsdServiceInfo, resolved: Boolean): DiscoveredService {
    val addresses = if (!resolved) {
      emptyList()
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      info.hostAddresses.mapNotNull { it.hostAddress }
    } else {
      @Suppress("DEPRECATION")
      listOfNotNull(info.host?.hostAddress)
    }
    val txt = if (resolved) {
      info.attributes.map { (key, value) ->
        ServiceTxtEntry(key = key, value = value?.toString(Charsets.UTF_8))
      }
    } else {
      emptyList()
    }
    val name = info.serviceName.orEmpty()
    return DiscoveredService(
      id = "$name.$type.$domain",
      name = name,
      type = type,
      domain = domain,
      host = addresses.firstOrNull(),
      port = info.port.takeIf { resolved && it > 0 }?.toDouble(),
      addresses = addresses.toTypedArray(),
      txt = txt.toTypedArray(),
      interfaceName = null,
      resolved = resolved && addresses.isNotEmpty(),
    )
  }

  private fun errorName(code: Int): String = when (code) {
    NsdManager.FAILURE_INTERNAL_ERROR -> "internal error"
    NsdManager.FAILURE_ALREADY_ACTIVE -> "already active"
    NsdManager.FAILURE_MAX_LIMIT -> "too many requests"
    else -> "error $code"
  }
}
