package com.countdown.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import com.countdown.app.MainActivity
import com.countdown.app.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

abstract class BaseWidgetProvider : AppWidgetProvider() {

    protected abstract val widgetLayout: Int
    protected abstract val widgetSize: String

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { appWidgetId ->
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        scheduleNextUpdate(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle?
    ) {
        updateAppWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        appWidgetIds.forEach { widgetId ->
            WidgetDataManager.removeWidgetEventMapping(context, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_WIDGET_UPDATE -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val provider = ComponentName(context, javaClass)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(provider)
                appWidgetIds.forEach { id ->
                    updateAppWidget(context, appWidgetManager, id)
                }
                scheduleNextUpdate(context)
            }
            ACTION_WIDGET_TAP -> {
                val launchIntent = Intent(context, MainActivity::class.java)
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                launchIntent.data = Uri.parse("countdownapp://widget/${intent.getIntExtra(EXTRA_WIDGET_ID, -1)}")
                context.startActivity(launchIntent)
            }
        }
    }

    open fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        CoroutineScope(Dispatchers.Default).launch {
            val views = buildRemoteViews(context, appWidgetId)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    abstract suspend fun buildRemoteViews(
        context: Context,
        appWidgetId: Int
    ): RemoteViews

    protected fun createClickPendingIntent(
        context: Context,
        appWidgetId: Int,
        action: String
    ): PendingIntent {
        val intent = Intent(context, javaClass)
        intent.action = action
        intent.putExtra(EXTRA_WIDGET_ID, appWidgetId)

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        return PendingIntent.getBroadcast(context, appWidgetId, intent, flags)
    }

    protected fun createLaunchPendingIntent(
        context: Context,
        appWidgetId: Int
    ): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
        intent.data = Uri.parse("countdownapp://widget/$appWidgetId")
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        return PendingIntent.getActivity(context, appWidgetId, intent, flags)
    }

    private fun scheduleNextUpdate(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
        val intent = Intent(context, javaClass)
        intent.action = ACTION_WIDGET_UPDATE

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, flags)

        val triggerAtMillis = System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(1)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                android.app.AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent
            )
        } else {
            alarmManager.setExact(
                android.app.AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent
            )
        }
    }

    companion object {
        const val ACTION_WIDGET_UPDATE = "com.countdown.app.widget.UPDATE"
        const val ACTION_WIDGET_TAP = "com.countdown.app.widget.TAP"
        const val EXTRA_WIDGET_ID = "extra_widget_id"
        const val EXTRA_EVENT_ID = "extra_event_id"
    }
}
