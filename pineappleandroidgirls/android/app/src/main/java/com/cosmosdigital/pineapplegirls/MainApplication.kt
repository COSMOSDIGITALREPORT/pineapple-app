package com.cosmosdigital.pineapplegirls

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(RingtonePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NotificationManager::class.java) ?: return

      // Clean up legacy channels if present
      val oldChannels = listOf(
        "pineapple_calls_channel",
        "pineapple_calls_channel_v2",
        "pineapple_calls_channel_v3",
        "incoming_calls_v2",
        "incoming_calls_v3"
      )
      for (ch in oldChannels) {
        try {
          notificationManager.deleteNotificationChannel(ch)
        } catch (_: Exception) {}
      }

      val callChannel = NotificationChannel(
        "incoming_calls_v4",
        "Pineapple Incoming Calls",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Incoming call alerts and full screen intent"
        enableVibration(true)
        enableLights(true)
        vibrationPattern = longArrayOf(0, 1000, 500, 1000)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setBypassDnd(true)
        val soundUri = Settings.System.DEFAULT_RINGTONE_URI
        val audioAttributes = AudioAttributes.Builder()
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .build()
        setSound(soundUri, audioAttributes)
      }

      val defaultChannel = NotificationChannel(
        "pineapple_default_channel",
        "Pineapple Notifications",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Pineapple notifications"
        enableVibration(true)
        enableLights(true)
      }

      notificationManager.createNotificationChannel(callChannel)
      notificationManager.createNotificationChannel(defaultChannel)
    }
  }
}
