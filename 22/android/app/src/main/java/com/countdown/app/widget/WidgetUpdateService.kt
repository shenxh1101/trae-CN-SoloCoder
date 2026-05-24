package com.countdown.app.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Service
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.countdown.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class WidgetUpdateService : Service() {

    private val coroutineScope = CoroutineScope(Dispatchers.Default)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_UPDATE_ALL_WIDGETS -> {
                updateAllWidgets()
            }
            ACTION_SCHEDULE_PERIODIC_UPDATE -> {
                schedulePeriodicUpdates(applicationContext)
            }
        }

        stopSelf(startId)
        return START_NOT_STICKY
    }

    private fun updateAllWidgets() {
        coroutineScope.launch {
            val context = applicationContext

            CountdownWidgetProvider.updateAllWidgets(context)
            CountdownMediumWidgetProvider.updateAllWidgets(context)
            CountdownLargeWidgetProvider.updateAllWidgets(context)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_UPDATE_ALL_WIDGETS = "com.countdown.app.widget.UPDATE_ALL"
        const val ACTION_SCHEDULE_PERIODIC_UPDATE = "com.countdown.app.widget.SCHEDULE_PERIODIC"
        private const val UPDATE_INTERVAL_MINUTES = 15L

        fun schedulePeriodicUpdates(context: Context) {
            val workRequest = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
                .setInitialDelay(UPDATE_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .addTag("widget_update")
                .build()

            WorkManager.getInstance(context).enqueue(workRequest)
        }

        fun updateAllWidgetsNow(context: Context) {
            val intent = Intent(context, WidgetUpdateService::class.java)
            intent.action = ACTION_UPDATE_ALL_WIDGETS
            context.startService(intent)
        }
    }
}

class WidgetUpdateWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        val context = applicationContext

        CountdownWidgetProvider.updateAllWidgets(context)
        CountdownMediumWidgetProvider.updateAllWidgets(context)
        CountdownLargeWidgetProvider.updateAllWidgets(context)

        WidgetUpdateService.schedulePeriodicUpdates(context)

        return Result.success()
    }
}

class WidgetBootReceiver : android.content.BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                WidgetUpdateService.updateAllWidgetsNow(context)
                WidgetUpdateService.schedulePeriodicUpdates(context)
            }
        }
    }
}
