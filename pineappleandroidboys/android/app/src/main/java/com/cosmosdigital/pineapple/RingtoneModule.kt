package com.cosmosdigital.pineapple

import android.media.Ringtone
import android.media.RingtoneManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RingtoneModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  private var ringtone: Ringtone? = null

  override fun getName() = "RingtoneModule"

  @ReactMethod
  fun playRingtone() {
    try {
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ringtone = RingtoneManager.getRingtone(context, uri)
      ringtone?.play()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  @ReactMethod
  fun stopRingtone() {
    try {
      ringtone?.stop()
      ringtone = null
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
