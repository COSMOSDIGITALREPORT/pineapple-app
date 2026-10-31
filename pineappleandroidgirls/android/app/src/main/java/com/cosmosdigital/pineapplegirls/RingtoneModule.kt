package com.cosmosdigital.pineapplegirls

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
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
  fun showCallNotification(data: com.facebook.react.bridge.ReadableMap) {
    try {
      val map = HashMap<String, String>()
      val iterator = data.keySetIterator()
      while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        val str = try { data.getString(key) ?: "" } catch (e: Exception) { "" }
        map[key] = str
      }
      CallNotificationHelper.showIncomingCall(context, map)
    } catch (e: Exception) {
      e.printStackTrace()
    }
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

      // 1. Post Notifications (Android 13+ / API 33+)
      val notifEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()

      // 2. Full-Screen Intent (Android 14+ / API 34+)
      val canUseFullScreen = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.canUseFullScreenIntent() ?: true
      } else {
        true
      }

      // 3. Draw Over Other Apps (SYSTEM_ALERT_WINDOW)
      val canDrawOverlays = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else {
        true
      }

      // 4. Battery Optimization Exemption
      val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      val isBatteryIgnoring = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
        pm.isIgnoringBatteryOptimizations(context.packageName)
      } else {
        true
      }

      val manufacturer = Build.MANUFACTURER.lowercase()

      map.putBoolean("postNotifications", notifEnabled)
      map.putBoolean("fullScreenIntent", canUseFullScreen)
      map.putBoolean("canDrawOverlays", canDrawOverlays)
      map.putBoolean("ignoringBatteryOptimizations", isBatteryIgnoring)
      map.putString("manufacturer", manufacturer)
      map.putBoolean("allGranted", notifEnabled && canUseFullScreen && canDrawOverlays && isBatteryIgnoring)

      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("PERMISSION_CHECK_ERROR", e.message)
    }
  }

  @ReactMethod
  fun requestFullScreenIntentPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      try {
        val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
          data = Uri.parse("package:" + context.packageName)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
      } catch (e: Exception) {
        openAppSettings()
      }
    } else {
      openAppSettings()
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
        openAppSettings()
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
        try {
          val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
          }
          context.startActivity(intent)
        } catch (_: Exception) {
          openAppSettings()
        }
      }
    }
  }

  @ReactMethod
  fun openAutostartSettings() {
    val manufacturer = Build.MANUFACTURER.lowercase()
    val intents = mutableListOf<Intent>()

    when {
      manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
        intents.add(Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")))
        intents.add(Intent("miui.intent.action.OP_AUTO_START").addCategory(Intent.CATEGORY_DEFAULT))
      }
      manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
        intents.add(Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")))
        intents.add(Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")))
        intents.add(Intent().setComponent(ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")))
      }
      manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> {
        intents.add(Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")))
        intents.add(Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")))
        intents.add(Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")))
      }
      manufacturer.contains("samsung") -> {
        intents.add(Intent().setComponent(ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")))
        intents.add(Intent().setComponent(ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")))
      }
      manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
        intents.add(Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")))
        intents.add(Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity")))
      }
    }

    var started = false
    for (it in intents) {
      try {
        it.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(it)
        started = true
        break
      } catch (_: Exception) {}
    }

    if (!started) {
      openAppSettings()
    }
  }

  @ReactMethod
  fun openNotificationSettings() {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
          putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:" + context.packageName)
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
      }
      context.startActivity(intent)
    } catch (e: Exception) {
      openAppSettings()
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
