package com.cosmosdigital.pineapplegirls

import android.app.Application
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

      val callChannel = NotificationChannel(
        "pineapple_calls_channel",
        "Pineapple Calls",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Incoming call notifications"
        enableVibration(true)
        enableLights(true)
        vibrationPattern = longArrayOf(0, 1000, 500, 1000)
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
