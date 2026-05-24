package com.countdown.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String {
        return "CountdownApp"
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,
            fabricEnabled
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "countdownapp") {
            val path = data.path
            val widgetId = data.lastPathSegment?.toIntOrNull()

            if (path?.startsWith("/widget") == true && widgetId != null) {
                val launchIntent = Intent()
                launchIntent.action = "com.countdown.app.OPEN_WIDGET_EVENT"
                launchIntent.putExtra("widgetId", widgetId)
                sendBroadcast(launchIntent)
            }
        }
    }
}
