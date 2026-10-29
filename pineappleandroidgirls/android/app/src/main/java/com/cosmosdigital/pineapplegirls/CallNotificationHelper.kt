package com.cosmosdigital.pineapplegirls

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
import androidx.core.app.NotificationCompat

object CallNotificationHelper {
    const val CALL_NOTIFICATION_ID = 2026
    const val CALL_CHANNEL_ID = "pineapple_calls_channel"
    private var wakeLock: PowerManager.WakeLock? = null
    private var ringtone: Ringtone? = null

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            val channel = NotificationChannel(
                CALL_CHANNEL_ID,
                "Pineapple Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming call notifications"
                enableVibration(true)
                enableLights(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
                setSound(soundUri, audioAttributes)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            nm.createNotificationChannel(channel)
        }
    }

    fun showIncomingCall(context: Context, data: Map<String, String>) {
        ensureChannel(context)

        // 1. Wake the screen
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm != null) {
                @Suppress("DEPRECATION")
                val flags = PowerManager.FULL_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE
                wakeLock = pm.newWakeLock(flags, "Pineapple:IncomingCallWakeLock")
                wakeLock?.acquire(35000L) // 35 sec max timeout
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val callerName = data["callerName"] ?: "Someone"
        val callType = data["callType"] ?: data["type"] ?: "video"
        val title = "Incoming " + (if (callType == "video") "Video" else "Audio") + " Call"
        val body = "$callerName is calling you..."

        // Full-screen Activity Intent (opens MainActivity over lock screen)
        val fullScreenIntent = Intent(context, MainActivity::class.java).apply {
            action = "ACTION_INCOMING_CALL"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
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

        // Answer action
        val answerIntent = Intent(context, MainActivity::class.java).apply {
            action = "ACTION_ANSWER_CALL"
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            for ((k, v) in data) {
                putExtra(k, v)
            }
            putExtra("autoAccept", true)
        }
        val answerPendingIntent = PendingIntent.getActivity(
            context,
            2002,
            answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decline action
        val declineIntent = Intent(context, CallActionReceiver::class.java).apply {
            action = "ACTION_DECLINE_CALL"
            putExtra("callId", data["callId"] ?: "")
            putExtra("callerId", data["callerId"] ?: "")
        }
        val declinePendingIntent = PendingIntent.getBroadcast(
            context,
            2003,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val builder = NotificationCompat.Builder(context, CALL_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 1000, 500, 1000))
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
            .addAction(android.R.drawable.ic_menu_call, "Accept", answerPendingIntent)

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        nm?.notify(CALL_NOTIFICATION_ID, builder.build())

        // Play ringtone
        playRingtone(context)
    }

    fun cancelIncomingCall(context: Context) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.cancel(CALL_NOTIFICATION_ID)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        stopRingtone()

        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun playRingtone(context: Context) {
        try {
            if (ringtone == null) {
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ringtone = RingtoneManager.getRingtone(context.applicationContext, uri)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ringtone?.isLooping = true
                }
            }
            if (ringtone?.isPlaying == false) {
                ringtone?.play()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stopRingtone() {
        try {
            ringtone?.stop()
            ringtone = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

