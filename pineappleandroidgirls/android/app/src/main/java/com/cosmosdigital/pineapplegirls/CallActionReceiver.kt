package com.cosmosdigital.pineapplegirls

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class CallActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "PineappleCall"

        fun sendRejectCall(context: Context, callId: String, callerId: String) {
            Log.d(TAG, "CallActionReceiver.sendRejectCall initiated for callId=$callId, callerId=$callerId")
            IncomingCallActivity.closeIfActive()
            CallNotificationHelper.cancelIncomingCall(context)
            IncomingCallBridge.onCallCancelled(mapOf("callId" to callId, "type" to "call_cancelled"))

            if (callId.isNotEmpty()) {
                thread {
                    try {
                        val url = URL("https://admin.pineapplemeetups.com/api/calls/reject")
                        val conn = url.openConnection() as HttpURLConnection
                        conn.requestMethod = "POST"
                        conn.setRequestProperty("Content-Type", "application/json")
                        conn.connectTimeout = 4000
                        conn.readTimeout = 4000
                        conn.doOutput = true
                        val json = JSONObject().apply {
                            put("callId", callId)
                            put("callerId", callerId)
                        }.toString()
                        OutputStreamWriter(conn.outputStream).use { it.write(json) }
                        val code = conn.responseCode
                        Log.d(TAG, "Reject call API response code: $code for callId=$callId")
                        conn.disconnect()
                    } catch (e: Exception) {
                        Log.e(TAG, "Reject call API failed for callId=$callId: ${e.message}", e)
                    }
                }
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action
        val callId = intent?.getStringExtra("callId") ?: ""
        val callerId = intent?.getStringExtra("callerId") ?: ""
        Log.d(TAG, "CallActionReceiver.onReceive: action=$action, callId=$callId, callerId=$callerId")

        if (action == "ACTION_DECLINE_CALL") {
            sendRejectCall(context, callId, callerId)
        }
    }
}
