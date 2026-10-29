package com.cosmosdigital.pineapplegirls

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

object IncomingCallBridge {
    var reactContext: ReactContext? = null
    var pendingCallData: MutableMap<String, String>? = null

    fun onIncomingCall(data: Map<String, String>) {
        pendingCallData = HashMap(data)
        sendEvent("onIncomingCall", data)
    }

    fun onCallCancelled(data: Map<String, String>) {
        pendingCallData = null
        sendEvent("onCallCancelled", data)
    }

    private fun sendEvent(eventName: String, data: Map<String, String>) {
        try {
            val context = reactContext ?: return
            if (!context.hasActiveReactInstance()) return
            val map = Arguments.createMap()
            for ((k, v) in data) {
                map.putString(k, v)
            }
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, map)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

