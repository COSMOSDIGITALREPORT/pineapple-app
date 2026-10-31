package com.cosmosdigital.pineapplegirls

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

class PineappleFirebaseMessagingService : ReactNativeFirebaseMessagingService() {

    companion object {
        private const val TAG = "PineappleCall"
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "onNewToken: $token")
        try {
            val prefs = getSharedPreferences("pineapple_prefs", Context.MODE_PRIVATE)
            prefs.edit().putString("fcm_token", token).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error caching fcm_token in SharedPreferences: ${e.message}")
        }

        try {
            super.onNewToken(token)
        } catch (e: Exception) {
            Log.e(TAG, "super.onNewToken error: ${e.message}")
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val type = data["type"] ?: ""

        Log.d(TAG, "onMessageReceived: type=$type, full payload=$data")

        if (type == "incoming_call") {
            CallNotificationHelper.showIncomingCall(this, data)
            IncomingCallBridge.onIncomingCall(data)
        } else if (type == "call_cancelled" || type == "call_ended") {
            CallNotificationHelper.cancelIncomingCall(this)
            IncomingCallActivity.closeIfActive()
            IncomingCallBridge.onCallCancelled(data)
        }

        try {
            super.onMessageReceived(remoteMessage)
        } catch (e: Exception) {
            Log.e(TAG, "super.onMessageReceived error: ${e.message}")
        }
    }
}
