package com.countdown.app.widget

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

data class WidgetEvent(
    val id: String,
    val name: String,
    val targetDate: Long,
    val backgroundColor: String,
    val categoryColor: String,
    val categoryName: String,
    val repeatInterval: String = "none",
    val isPinned: Boolean = false,
    val lastUpdated: Long = System.currentTimeMillis() / 1000
)

data class WidgetConfig(
    val id: String,
    val eventId: String,
    val size: String,
    val theme: String,
    val createdAt: Long = System.currentTimeMillis() / 1000
)

data class TimeRemaining(
    val days: Int,
    val hours: Int,
    val minutes: Int,
    val seconds: Int,
    val isPast: Boolean
)

data class WidgetDataStore(
    val events: List<WidgetEvent> = emptyList(),
    val widgetConfigs: List<WidgetConfig> = emptyList(),
    val lastSynced: Long = System.currentTimeMillis() / 1000
)

object WidgetDataManager {
    private const val PREFS_NAME = "countdown_widget_prefs"
    private const val KEY_DATA_STORE = "widget_data_store"
    private const val KEY_WIDGET_EVENT_MAP = "widget_event_map"

    private val gson = Gson()

    fun getSharedPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveEvents(context: Context, events: List<WidgetEvent>) {
        val currentStore = loadDataStore(context)
        val newStore = currentStore.copy(
            events = events,
            lastSynced = System.currentTimeMillis() / 1000
        )
        saveDataStore(context, newStore)
    }

    fun saveWidgetConfigs(context: Context, configs: List<WidgetConfig>) {
        val currentStore = loadDataStore(context)
        val newStore = currentStore.copy(
            widgetConfigs = configs,
            lastSynced = System.currentTimeMillis() / 1000
        )
        saveDataStore(context, newStore)
    }

    fun saveDataStore(context: Context, dataStore: WidgetDataStore) {
        val prefs = getSharedPreferences(context)
        val editor = prefs.edit()
        editor.putString(KEY_DATA_STORE, gson.toJson(dataStore))
        editor.apply()
    }

    fun loadDataStore(context: Context): WidgetDataStore {
        val prefs = getSharedPreferences(context)
        val json = prefs.getString(KEY_DATA_STORE, null)
        return if (json != null) {
            val type = object : TypeToken<WidgetDataStore>() {}.type
            gson.fromJson(json, type)
        } else {
            WidgetDataStore()
        }
    }

    fun getEventForWidget(context: Context, widgetId: Int): WidgetEvent? {
        val prefs = getSharedPreferences(context)
        val json = prefs.getString(KEY_WIDGET_EVENT_MAP, null)
        val eventMap: Map<Int, String> = if (json != null) {
            val type = object : TypeToken<Map<Int, String>>() {}.type
            gson.fromJson(json, type)
        } else {
            emptyMap()
        }

        val eventId = eventMap[widgetId] ?: return null
        val dataStore = loadDataStore(context)
        return dataStore.events.firstOrNull { it.id == eventId }
    }

    fun saveWidgetEventMapping(context: Context, widgetId: Int, eventId: String) {
        val prefs = getSharedPreferences(context)
        val json = prefs.getString(KEY_WIDGET_EVENT_MAP, null)
        val eventMap: MutableMap<Int, String> = if (json != null) {
            val type = object : TypeToken<Map<Int, String>>() {}.type
            gson.fromJson<Map<Int, String>>(json, type).toMutableMap()
        } else {
            mutableMapOf()
        }

        eventMap[widgetId] = eventId

        val editor = prefs.edit()
        editor.putString(KEY_WIDGET_EVENT_MAP, gson.toJson(eventMap))
        editor.apply()
    }

    fun removeWidgetEventMapping(context: Context, widgetId: Int) {
        val prefs = getSharedPreferences(context)
        val json = prefs.getString(KEY_WIDGET_EVENT_MAP, null)
        val eventMap: MutableMap<Int, String> = if (json != null) {
            val type = object : TypeToken<Map<Int, String>>() {}.type
            gson.fromJson<Map<Int, String>>(json, type).toMutableMap()
        } else {
            mutableMapOf()
        }

        eventMap.remove(widgetId)

        val editor = prefs.edit()
        editor.putString(KEY_WIDGET_EVENT_MAP, gson.toJson(eventMap))
        editor.apply()
    }

    fun getConfigForWidget(context: Context, widgetId: Int): WidgetConfig? {
        val dataStore = loadDataStore(context)
        return dataStore.widgetConfigs.firstOrNull { it.id == widgetId.toString() }
    }

    fun calculateTimeRemaining(targetDateSeconds: Long): TimeRemaining {
        val nowSeconds = System.currentTimeMillis() / 1000
        val diff = targetDateSeconds - nowSeconds
        val isPast = diff < 0
        val absDiff = kotlin.math.abs(diff)

        val days = absDiff / 86400
        val hours = (absDiff % 86400) / 3600
        val minutes = (absDiff % 3600) / 60
        val seconds = absDiff % 60

        return TimeRemaining(
            days = days.toInt(),
            hours = hours.toInt(),
            minutes = minutes.toInt(),
            seconds = seconds.toInt(),
            isPast = isPast
        )
    }

    fun getNearestEvent(context: Context): WidgetEvent? {
        val dataStore = loadDataStore(context)
        val now = System.currentTimeMillis() / 1000

        return dataStore.events
            .filter { it.targetDate > now || it.repeatInterval != "none" }
            .sortedBy {
                if (it.targetDate > now) it.targetDate
                else calculateNextRepeatDate(it.targetDate, it.repeatInterval)
            }
            .firstOrNull()
    }

    fun getAllEvents(context: Context): List<WidgetEvent> {
        return loadDataStore(context).events
    }

    private fun calculateNextRepeatDate(targetDate: Long, repeatInterval: String): Long {
        val now = System.currentTimeMillis() / 1000
        var nextDate = targetDate

        while (nextDate <= now) {
            nextDate = when (repeatInterval) {
                "daily" -> nextDate + 86400
                "weekly" -> nextDate + 604800
                "monthly" -> addMonths(nextDate, 1)
                "yearly" -> addYears(nextDate, 1)
                else -> nextDate + 86400
            }
        }

        return nextDate
    }

    private fun addMonths(seconds: Long, months: Int): Long {
        val calendar = java.util.Calendar.getInstance()
        calendar.timeInMillis = seconds * 1000
        calendar.add(java.util.Calendar.MONTH, months)
        return calendar.timeInMillis / 1000
    }

    private fun addYears(seconds: Long, years: Int): Long {
        val calendar = java.util.Calendar.getInstance()
        calendar.timeInMillis = seconds * 1000
        calendar.add(java.util.Calendar.YEAR, years)
        return calendar.timeInMillis / 1000
    }

    fun parseColor(colorString: String): Int {
        val cleanColor = if (colorString.startsWith("#")) colorString else "#$colorString"
        return try {
            android.graphics.Color.parseColor(cleanColor)
        } catch (e: Exception) {
            android.graphics.Color.parseColor("#6366F1")
        }
    }

    fun isColorLight(color: Int): Boolean {
        val luminance = (0.299 * android.graphics.Color.red(color) +
                0.587 * android.graphics.Color.green(color) +
                0.114 * android.graphics.Color.blue(color)) / 255
        return luminance > 0.5
    }

    fun getContrastColor(backgroundColor: Int): Int {
        return if (isColorLight(backgroundColor)) {
            android.graphics.Color.BLACK
        } else {
            android.graphics.Color.WHITE
        }
    }

    fun formatDate(seconds: Long): String {
        val calendar = java.util.Calendar.getInstance()
        calendar.timeInMillis = seconds * 1000

        val year = calendar.get(java.util.Calendar.YEAR)
        val month = calendar.get(java.util.Calendar.MONTH) + 1
        val day = calendar.get(java.util.Calendar.DAY_OF_MONTH)

        return String.format("%d年%d月%d日", year, month, day)
    }

    fun getRepeatLabel(repeatInterval: String): String {
        return when (repeatInterval) {
            "daily" -> "每天"
            "weekly" -> "每周"
            "monthly" -> "每月"
            "yearly" -> "每年"
            else -> ""
        }
    }

    fun clearData(context: Context) {
        val prefs = getSharedPreferences(context)
        prefs.edit().clear().apply()
    }
}
