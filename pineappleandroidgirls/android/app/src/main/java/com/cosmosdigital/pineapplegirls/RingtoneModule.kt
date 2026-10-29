package com.cosmosdigital.pineapplegirls

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RingtoneModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  init {
    IncomingCallBridge.reactContext = context
  }

  override fun getName() = "RingtoneModule"

  @ReactMethod
  fun playRingtone() {
    CallNotificationHelper.playRingtone(context)
  }

  @ReactMethod
  fun stopRingtone() {
    CallNotificationHelper.stopRingtone()
  }

  @ReactMethod
  fun dismissCallNotification() {
    CallNotificationHelper.cancelIncomingCall(context)
  }

  @ReactMethod
  fun getInitialCallData(promise: Promise) {
    try {
      val data = IncomingCallBridge.pendingCallData
      if (data != null && data.isNotEmpty()) {
        val map = Arguments.createMap()
        for ((k, v) in data) {
          map.putString(k, v)
        }
        IncomingCallBridge.pendingCallData = null
        promise.resolve(map)
      } else {
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject("CALL_DATA_ERROR", e.message)
    }
  }
}
