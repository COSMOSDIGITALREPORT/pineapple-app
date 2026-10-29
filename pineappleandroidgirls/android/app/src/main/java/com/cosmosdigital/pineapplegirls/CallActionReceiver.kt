package com.cosmosdigital.pineapplegirls

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class CallActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action
        if (action == "ACTION_DECLINE_CALL") {
            val callId = intent.getStringExtra("callId") ?: ""
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
                        val json = JSONObject().apply { put("callId", callId) }.toString()
                        OutputStreamWriter(conn.outputStream).use { it.write(json) }
                        conn.responseCode
                        conn.disconnect()
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        }
    }
}

