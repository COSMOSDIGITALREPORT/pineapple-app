package com.cosmosdigital.pineapplegirls

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person

object CallNotificationHelper {
    private const val TAG = "PineappleCall"
    const val CALL_NOTIFICATION_ID = 2026
    const val CALL_CHANNEL_ID = "incoming_calls_v4"
    private var wakeLock: PowerManager.WakeLock? = null
    private var ringtone: Ringtone? = null

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            // Delete frozen previous channels so Android creates this one fresh with high importance & sound
            val oldChannels = listOf(
                "pineapple_calls_channel",
                "pineapple_calls_channel_v2",
                "pineapple_calls_channel_v3",
                "incoming_calls_v2",
                "incoming_calls_v3"
            )
            for (ch in oldChannels) {
                try {
                    nm.deleteNotificationChannel(ch)
                } catch (_: Exception) {}
            }

            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            val channel = NotificationChannel(
                CALL_CHANNEL_ID,
                "Pineapple Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming call alerts and full screen intent"
                enableVibration(true)
                enableLights(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
                setSound(soundUri, audioAttributes)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            nm.createNotificationChannel(channel)
            Log.d(TAG, "Notification channel ensured: $CALL_CHANNEL_ID")
        }
    }

    fun showIncomingCall(context: Context, data: Map<String, String>) {
        val callId = data["callId"] ?: ""
        val callerId = data["callerId"] ?: ""
        val callerName = data["callerName"] ?: "Someone"
        val callType = data["callType"] ?: data["type"] ?: "audio"

        Log.d(TAG, "showIncomingCall called for callId=$callId, caller=$callerName, type=$callType")
        ensureChannel(context)

        // 1. Hardware Wake Lock to wake up the screen
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm != null) {
                @Suppress("DEPRECATION")
                val flags = PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE
                wakeLock = pm.newWakeLock(flags, "Pineapple:IncomingCallWakeLock")
                wakeLock?.acquire(45000L) // 45 sec max
                Log.d(TAG, "WakeLock acquired for 45s")
            }
        } catch (e: Exception) {
            Log.e(TAG, "WakeLock acquisition error: ${e.message}", e)
        }

        // 2. Direct Activity Launch (WhatsApp / Telegram incoming call behavior)
        try {
            val directIntent = Intent(context, IncomingCallActivity::class.java).apply {
                action = "ACTION_INCOMING_CALL"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                for ((k, v) in data) {
                    putExtra(k, v)
                }
            }
            context.startActivity(directIntent)
            Log.d(TAG, "Direct startActivity for IncomingCallActivity executed")
        } catch (e: Exception) {
            Log.w(TAG, "Direct startActivity for IncomingCallActivity failed: ${e.message}")
        }

        val title = "Incoming " + (if (callType.equals("video", ignoreCase = true)) "Video" else "Audio") + " Call"
        val body = "$callerName is calling you..."

        // 3. Full-screen Activity Intent targeting IncomingCallActivity
        Log.d(TAG, "Creating full-screen PendingIntent for IncomingCallActivity with callId=$callId")
        val fullScreenIntent = Intent(context, IncomingCallActivity::class.java).apply {
            action = "ACTION_INCOMING_CALL"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            for ((k, v) in data) {
                putExtra(k, v)
            }
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            2001,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Answer action PendingIntent
        val answerIntent = Intent(context, MainActivity::class.java).apply {
            action = "ACTION_ANSWER_CALL"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            for ((k, v) in data) {
                putExtra(k, v)
            }
            putExtra("autoAccept", "true")
        }
        val answerPendingIntent = PendingIntent.getActivity(
            context,
            2002,
            answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decline action PendingIntent
        val declineIntent = Intent(context, CallActionReceiver::class.java).apply {
            action = "ACTION_DECLINE_CALL"
            putExtra("callId", callId)
            putExtra("callerId", callerId)
        }
        val declinePendingIntent = PendingIntent.getBroadcast(
            context,
            2003,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val callerPerson = Person.Builder()
            .setName(callerName)
            .setImportant(true)
            .build()

        val callStyle = NotificationCompat.CallStyle.forIncomingCall(
            callerPerson,
            declinePendingIntent,
            answerPendingIntent
        )

        val builder = NotificationCompat.Builder(context, CALL_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(callStyle)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 1000, 500, 1000))
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
            .addAction(android.R.drawable.ic_menu_call, "Accept", answerPendingIntent)

        Log.d(TAG, "Posting incoming call notification id=$CALL_NOTIFICATION_ID to channel=$CALL_CHANNEL_ID")
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.notify(CALL_NOTIFICATION_ID, builder.build())

        // Play Ringtone
        playRingtone(context)
    }

    fun cancelIncomingCall(context: Context) {
        Log.d(TAG, "cancelIncomingCall: Dismissing notification and stopping ringtone")
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.cancel(CALL_NOTIFICATION_ID)
        } catch (e: Exception) {
            Log.e(TAG, "cancelIncomingCall notification dismiss error: ${e.message}", e)
        }

        stopRingtone()
        IncomingCallActivity.closeIfActive()

        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "WakeLock released")
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.e(TAG, "WakeLock release error: ${e.message}", e)
        }
    }

    fun playRingtone(context: Context) {
        try {
            if (ringtone == null) {
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ringtone = RingtoneManager.getRingtone(context.applicationContext, uri)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ringtone?.isLooping = true
                }
            }
            if (ringtone?.isPlaying == false) {
                ringtone?.play()
            }
            Log.d(TAG, "Ringtone started successfully (isPlaying=${ringtone?.isPlaying})")
        } catch (e: Exception) {
            Log.e(TAG, "Ringtone play error: ${e.message}", e)
        }
    }

    fun stopRingtone() {
        try {
            if (ringtone?.isPlaying == true) {
                ringtone?.stop()
                Log.d(TAG, "Ringtone stopped")
            }
            ringtone = null
        } catch (e: Exception) {
            Log.e(TAG, "Ringtone stop error: ${e.message}", e)
        }
    }
}
