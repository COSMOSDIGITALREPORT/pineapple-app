package com.cosmosdigital.pineapplegirls

import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

class PineappleFirebaseMessagingService : ReactNativeFirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val type = data["type"] ?: ""

        if (type == "incoming_call") {
            CallNotificationHelper.showIncomingCall(this, data)
            IncomingCallBridge.onIncomingCall(data)
        } else if (type == "call_cancelled" || type == "call_ended") {
            CallNotificationHelper.cancelIncomingCall(this)
            IncomingCallBridge.onCallCancelled(data)
        }

        try {
            super.onMessageReceived(remoteMessage)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

