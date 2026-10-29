package com.cosmosdigital.pineapplegirls

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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

  @ReactMethod
  fun checkCallPermissions(promise: Promise) {
    try {
      val map = Arguments.createMap()
      val canDraw = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else {
        true
      }
      val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      val isBatteryOptimized = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
        pm.isIgnoringBatteryOptimizations(context.packageName)
      } else {
        true
      }
      map.putBoolean("canDrawOverlays", canDraw)
      map.putBoolean("ignoringBatteryOptimizations", isBatteryOptimized)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("PERMISSION_CHECK_ERROR", e.message)
    }
  }

  @ReactMethod
  fun requestOverlayPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      try {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:" + context.packageName)
        ).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  @ReactMethod
  fun requestBatteryOptimization() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      try {
        val intent = Intent(
          Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          Uri.parse("package:" + context.packageName)
        ).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  @ReactMethod
  fun openAppSettings() {
    try {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.parse("package:" + context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      context.startActivity(intent)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
