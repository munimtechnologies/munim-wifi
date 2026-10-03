package com.margelo.nitro.munimwifi

import android.system.ErrnoException
import android.system.OsConstants
import java.net.Inet6Address
import java.net.InetAddress

/**
 * Android 17 (API 37) local network protection: apps targeting API 37+ need the
 * ACCESS_LOCAL_NETWORK runtime permission for mDNS/NSD and for TCP/UDP to LAN
 * addresses. Blocked UDP sends fail with EPERM, blocked TCP connects time out,
 * and NsdManager reports FAILURE_PERMISSION_DENIED.
 */
internal object LocalNetworkAccess {
  /** NsdManager.FAILURE_PERMISSION_DENIED (API 37). */
  const val NSD_FAILURE_PERMISSION_DENIED = 7

  /** Every message starts with this phrase so callers can match it. */
  const val DENIED_PHRASE = "local network permission denied"

  fun deniedMessage(action: String): String =
    "munim-wifi: $DENIED_PHRASE: $action needs android.permission.ACCESS_LOCAL_NETWORK on Android 17+. " +
      "Call requestLocalNetworkPermission() first, or browse with showPicker"

  /** True when [error] or one of its causes is an EPERM socket failure. */
  fun isEperm(error: Throwable): Boolean {
    var current: Throwable? = error
    var depth = 0
    while (current != null && depth < 8) {
      if (current is ErrnoException && current.errno == OsConstants.EPERM) return true
      if (current is SecurityException) return true
      val message = current.message.orEmpty()
      if (message.contains("EPERM") || message.contains("Operation not permitted")) return true
      current = current.cause
      depth++
    }
    return false
  }

  /** Private, link-local and unique-local addresses (the ones Android 17 gates); loopback is exempt. */
  fun isLocalAddress(address: InetAddress): Boolean {
    if (address.isLoopbackAddress) return false
    if (address.isSiteLocalAddress || address.isLinkLocalAddress || address.isMulticastAddress) return true
    if (address is Inet6Address) {
      val first = address.address[0].toInt() and 0xff
      return first and 0xfe == 0xfc
    }
    return false
  }
}
