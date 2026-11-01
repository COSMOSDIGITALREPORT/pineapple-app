package com.cosmosdigital.pineapplegirls

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.WindowManager
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.TextView
import java.net.URL
import kotlin.concurrent.thread

class IncomingCallActivity : Activity() {

    companion object {
        private const val TAG = "PineappleCall"

        @Volatile
        var activeInstance: IncomingCallActivity? = null

        fun closeIfActive() {
            activeInstance?.let { activity ->
                Handler(Looper.getMainLooper()).post {
                    Log.d(TAG, "Closing IncomingCallActivity due to cancel/ended signal")
                    activity.stopCallAndFinish()
                }
            }
        }
    }

    private var callId: String = ""
    private var callerId: String = ""
    private var callerName: String = ""
    private var callerAvatar: String = ""
    private var callType: String = "audio"
    private val handler = Handler(Looper.getMainLooper())
    private var autoTimeoutRunnable: Runnable? = null

    override fun onResume() {
        super.onResume()
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.cancel(CallNotificationHelper.CALL_NOTIFICATION_ID)
        } catch (_: Exception) {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        setupWakeAndLockscreen()
        super.onCreate(savedInstanceState)
        activeInstance = this

        handler.postDelayed({
            try {
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                nm?.cancel(CallNotificationHelper.CALL_NOTIFICATION_ID)
            } catch (_: Exception) {}
        }, 400)

        // Dismiss the top notification banner immediately so the user has ONLY the clean full-screen UI!
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.cancel(CallNotificationHelper.CALL_NOTIFICATION_ID)
        } catch (_: Exception) {}

        setContentView(R.layout.activity_incoming_call)

        callId = intent.getStringExtra("callId") ?: ""
        callerId = intent.getStringExtra("callerId") ?: ""
        callerName = intent.getStringExtra("callerName") ?: "Caller"
        callerAvatar = intent.getStringExtra("callerAvatar") ?: ""
        callType = intent.getStringExtra("callType") ?: intent.getStringExtra("type") ?: "audio"

        Log.d(TAG, "IncomingCallActivity onCreate: callId=$callId, callerId=$callerId, callerName=$callerName, callType=$callType")

        val tvCallerName = findViewById<TextView>(R.id.tvCallerName)
        val tvCallType = findViewById<TextView>(R.id.tvCallType)
        val tvRingingStatus = findViewById<TextView>(R.id.tvRingingStatus)
        val ivAvatar = findViewById<ImageView>(R.id.ivAvatar)
        val btnDecline = findViewById<ImageButton>(R.id.btnDecline)
        val btnAccept = findViewById<ImageButton>(R.id.btnAccept)

        tvCallerName.text = callerName
        tvCallType.text = if (callType.equals("video", ignoreCase = true)) "Incoming Video Call" else "Incoming Audio Call"

        // Pulsing animation for Ringing... text
        val pulseAnimation = AlphaAnimation(0.4f, 1.0f).apply {
            duration = 800
            repeatMode = Animation.REVERSE
            repeatCount = Animation.INFINITE
        }
        tvRingingStatus.startAnimation(pulseAnimation)

        // Load avatar if URL is provided
        if (callerAvatar.isNotEmpty() && (callerAvatar.startsWith("http://") || callerAvatar.startsWith("https://"))) {
            thread {
                try {
                    val url = URL(callerAvatar)
                    val bitmap: Bitmap? = BitmapFactory.decodeStream(url.openStream())
                    if (bitmap != null) {
                        runOnUiThread {
                            if (!isFinishing && !isDestroyed) {
                                ivAvatar.setImageBitmap(getCircularBitmap(bitmap))
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to load caller avatar: ${e.message}")
                }
            }
        }

        // Ensure ringtone is active
        CallNotificationHelper.playRingtone(this)

        // Decline Button
        btnDecline.setOnClickListener {
            Log.d(TAG, "IncomingCallActivity: Decline tapped for callId=$callId")
            CallNotificationHelper.stopRingtone()
            CallNotificationHelper.cancelIncomingCall(this)
            stopCallAndFinish()
            CallActionReceiver.sendRejectCall(this, callId, callerId)
        }

        // Accept Button
        btnAccept.setOnClickListener {
            Log.d(TAG, "IncomingCallActivity: Accept tapped for callId=$callId")
            CallNotificationHelper.stopRingtone()
            CallNotificationHelper.cancelIncomingCall(this)
            stopCallAndFinish()

            // Launch MainActivity with all call extras so React Native Agora connects immediately
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                action = "ACTION_ANSWER_CALL"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                intent.extras?.let { putExtras(it) }
                putExtra("callId", callId)
                putExtra("callerId", callerId)
                putExtra("callerName", callerName)
                putExtra("callerAvatar", callerAvatar)
                putExtra("callType", callType)
                putExtra("type", callType)
                putExtra("autoAccept", "true")
            }
            startActivity(mainIntent)
        }

        // Auto timeout after 45 seconds if unhandled
        autoTimeoutRunnable = Runnable {
            Log.d(TAG, "IncomingCallActivity: Auto-timeout after 45s without answer")
            CallNotificationHelper.stopRingtone()
            CallNotificationHelper.cancelIncomingCall(this)
            stopCallAndFinish()
        }
        handler.postDelayed(autoTimeoutRunnable!!, 45000L)
    }

        private fun getCircularBitmap(bitmap: Bitmap): Bitmap {
        val size = Math.min(bitmap.width, bitmap.height)
        val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(output)
        val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
        val rect = android.graphics.Rect(0, 0, size, size)
        val srcRect = android.graphics.Rect(
            (bitmap.width - size) / 2,
            (bitmap.height - size) / 2,
            (bitmap.width + size) / 2,
            (bitmap.height + size) / 2
        )
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
        paint.xfermode = android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(bitmap, srcRect, rect, paint)
        return output
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

    private fun stopCallAndFinish() {
        CallNotificationHelper.stopRingtone()
        autoTimeoutRunnable?.let { handler.removeCallbacks(it) }
        autoTimeoutRunnable = null
        if (!isFinishing && !isDestroyed) {
            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (activeInstance == this) {
            activeInstance = null
        }
        autoTimeoutRunnable?.let { handler.removeCallbacks(it) }
        autoTimeoutRunnable = null
        CallNotificationHelper.stopRingtone()
        Log.d(TAG, "IncomingCallActivity onDestroy")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        super.onBackPressed()
        CallNotificationHelper.stopRingtone()
    }
}
