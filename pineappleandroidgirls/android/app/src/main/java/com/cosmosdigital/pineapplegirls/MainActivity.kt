package com.cosmosdigital.pineapplegirls

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    setupWakeAndLockscreen()
    super.onCreate(savedInstanceState)
    handleCallIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    setupWakeAndLockscreen()
    handleCallIntent(intent)
  }

  override fun onResume() {
    super.onResume()
    setupWakeAndLockscreen()
  }

  private fun setupWakeAndLockscreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      km?.requestDismissKeyguard(this, null)
    }
    @Suppress("DEPRECATION")
    window.addFlags(
      WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
      WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    )
  }

  private fun handleCallIntent(intent: Intent?) {
    if (intent == null) return
    val callId = intent.getStringExtra("callId")
    if (!callId.isNullOrEmpty()) {
      val map = mutableMapOf<String, String>()
      val extras = intent.extras
      if (extras != null) {
        for (key in extras.keySet()) {
          val v = extras.get(key)
          if (v != null) {
            map[key] = v.toString()
          }
        }
      }
      if (intent.action == "ACTION_ANSWER_CALL") {
        map["autoAccept"] = "true"
      }
      IncomingCallBridge.pendingCallData = map
      IncomingCallBridge.onIncomingCall(map)
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "pineapple"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
