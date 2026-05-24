package com.countdown.app.widget

import android.content.Context
import android.widget.RemoteViews
import com.countdown.app.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CountdownMediumWidgetProvider : BaseWidgetProvider() {

    override val widgetLayout: Int = R.layout.widget_medium
    override val widgetSize: String = "medium"

    override suspend fun buildRemoteViews(
        context: Context,
        appWidgetId: Int
    ): RemoteViews {
        return withContext(Dispatchers.Default) {
            val views = RemoteViews(context.packageName, widgetLayout)

            val event = WidgetDataManager.getEventForWidget(context, appWidgetId)
                ?: WidgetDataManager.getNearestEvent(context)

            if (event != null) {
                val timeRemaining = WidgetDataManager.calculateTimeRemaining(event.targetDate)
                val accentColor = WidgetDataManager.parseColor(event.backgroundColor)
                val textColor = WidgetDataManager.getContrastColor(accentColor)

                val statusText = if (timeRemaining.isPast) {
                    context.getString(R.string.widget_counting_up)
                } else {
                    context.getString(R.string.widget_counting_down)
                }

                views.setTextViewText(R.id.widgetName, event.name)
                views.setTextViewText(R.id.widgetCategory, event.categoryName)
                views.setTextViewText(R.id.widgetStatus, statusText)
                views.setTextViewText(R.id.widgetDays, kotlin.math.abs(timeRemaining.days).toString())
                views.setTextViewText(R.id.widgetDaysLabel, "天")
                views.setTextViewText(R.id.widgetHours, String.format("%02d", kotlin.math.abs(timeRemaining.hours)))
                views.setTextViewText(R.id.widgetMinutes, String.format("%02d", kotlin.math.abs(timeRemaining.minutes)))
                views.setTextViewText(R.id.widgetSeconds, String.format("%02d", kotlin.math.abs(timeRemaining.seconds)))

                views.setTextColor(R.id.widgetName, textColor)
                views.setTextColor(R.id.widgetCategory, textColor)
                views.setTextColor(R.id.widgetStatus, textColor)
                views.setTextColor(R.id.widgetDays, accentColor)
                views.setTextColor(R.id.widgetDaysLabel, textColor)
                views.setTextColor(R.id.widgetHours, textColor)
                views.setTextColor(R.id.widgetMinutes, textColor)
                views.setTextColor(R.id.widgetSeconds, textColor)

                views.setInt(R.id.widgetCategory, "setBackgroundTint", accentColor)

                if (event.isPinned) {
                    views.setTextViewText(R.id.widgetCategory, "★ ${event.categoryName}")
                }
            } else {
                views.setTextViewText(R.id.widgetName, context.getString(R.string.widget_no_event))
                views.setTextViewText(R.id.widgetCategory, "")
                views.setTextViewText(R.id.widgetStatus, "")
                views.setTextViewText(R.id.widgetDays, "0")
                views.setTextViewText(R.id.widgetDaysLabel, "天")
                views.setTextViewText(R.id.widgetHours, "00")
                views.setTextViewText(R.id.widgetMinutes, "00")
                views.setTextViewText(R.id.widgetSeconds, "00")
            }

            val clickIntent = createLaunchPendingIntent(context, appWidgetId)
            views.setOnClickPendingIntent(R.id.widgetDays, clickIntent)
            views.setOnClickPendingIntent(R.id.widgetName, clickIntent)

            views
        }
    }

    companion object {
        fun updateAllWidgets(context: Context) {
            val intent = android.content.Intent(context, CountdownMediumWidgetProvider::class.java)
            intent.action = ACTION_WIDGET_UPDATE
            context.sendBroadcast(intent)
        }
    }
}
