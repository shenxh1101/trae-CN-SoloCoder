package com.countdown.app.widget

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.countdown.app.wallpaper.CountdownWallpaperService
import com.countdown.app.wallpaper.WallpaperSettingsActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CountdownWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val coroutineScope = CoroutineScope(Dispatchers.Default)
    private val gson = Gson()

    override fun getName(): String {
        return "CountdownWidgetModule"
    }

    override fun getConstants(): MutableMap<String, Any> {
        val constants = HashMap<String, Any>()
        constants["WIDGET_SMALL"] = "small"
        constants["WIDGET_MEDIUM"] = "medium"
        constants["WIDGET_LARGE"] = "large"
        constants["THEME_LIGHT"] = "light"
        constants["THEME_DARK"] = "dark"
        constants["THEME_COLORFUL"] = "colorful"
        constants["THEME_MINIMAL"] = "minimal"
        return constants
    }

    @ReactMethod
    fun syncEvents(events: ReadableArray, promise: Promise) {
        coroutineScope.launch {
            try {
                val widgetEvents = mutableListOf<WidgetEvent>()

                for (i in 0 until events.size()) {
                    val eventMap = events.getMap(i)
                    val categories = eventMap.getArray("_categories")
                    val categoryId = eventMap.getString("categoryId"
                    val categoryMap = categories?.let {
                        for (j in 0 until it.size()) {
                            val cat = it.getMap(j)
                            if (cat?.getString("id") == categoryId) {
                                return@let cat
                            }
                        }
                        null
                    }

                    val event = WidgetEvent(
                        id = eventMap.getString("id") ?: continue,
                        name = eventMap.getString("name") ?: continue,
                        targetDate = (eventMap.getDouble("targetDate") / 1000.0).toLong(),
                        backgroundColor = eventMap.getString("backgroundColor") ?: "#6366F1",
                        categoryColor = categoryMap?.getString("color") ?: "#6B7280",
                        categoryName = categoryMap?.getString("name") ?: "其他",
                        repeatInterval = eventMap.getString("repeatInterval") ?: "none",
                        isPinned = eventMap.getBoolean("isPinned")
                    )

                    widgetEvents.add(event)
                }

                WidgetDataManager.saveEvents(reactApplicationContext, widgetEvents)
                updateAllWidgets()
                CountdownWallpaperService.updateWallpaper(reactApplicationContext)

                val result = WritableNativeMap()
                result.putBoolean("success", true)
                result.putInt("eventCount", widgetEvents.size)
                result.putString("message", "Widget data synced successfully")

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("SYNC_ERROR", "Failed to sync events", e)
            }
        }
    }

    @ReactMethod
    fun syncWidgetConfigs(configs: ReadableArray, promise: Promise) {
        coroutineScope.launch {
            try {
                val widgetConfigs = mutableListOf<WidgetConfig>()

                for (i in 0 until configs.size()) {
                    val configMap = configs.getMap(i)
                    val config = WidgetConfig(
                        id = configMap.getString("id") ?: continue,
                        eventId = configMap.getString("eventId") ?: continue,
                        size = configMap.getString("size") ?: "medium",
                        theme = configMap.getString("theme") ?: "colorful",
                        createdAt = (configMap.getDouble("createdAt") / 1000.0).toLong()
                    )

                    widgetConfigs.add(config)
                }

                WidgetDataManager.saveWidgetConfigs(reactApplicationContext, widgetConfigs)
                updateAllWidgets()

                val result = WritableNativeMap()
                result.putBoolean("success", true)
                result.putInt("configCount", widgetConfigs.size)
                result.putString("message", "Widget configs synced successfully")

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("SYNC_ERROR", "Failed to sync configs", e)
            }
        }
    }

    @ReactMethod
    fun syncAllData(
        events: ReadableArray,
        configs: ReadableArray,
        categories: ReadableArray,
        promise: Promise
    ) {
        coroutineScope.launch {
            try {
                val eventsWithCategories = mutableListOf<WidgetEvent>()

                for (i in 0 until events.size()) {
                    val eventMap = events.getMap(i)
                    val categoryId = eventMap.getString("categoryId")
                    val categoryMap = categories.let {
                        for (j in 0 until it.size()) {
                            val cat = it.getMap(j)
                            if (cat?.getString("id") == categoryId) {
                                return@let cat
                            }
                        }
                        null
                    }

                    val event = WidgetEvent(
                        id = eventMap.getString("id") ?: continue,
                        name = eventMap.getString("name") ?: continue,
                        targetDate = (eventMap.getDouble("targetDate") / 1000.0).toLong(),
                        backgroundColor = eventMap.getString("backgroundColor") ?: "#6366F1",
                        categoryColor = categoryMap?.getString("color") ?: "#6B7280",
                        categoryName = categoryMap?.getString("name") ?: "其他",
                        repeatInterval = eventMap.getString("repeatInterval") ?: "none",
                        isPinned = eventMap.getBoolean("isPinned")
                    )

                    eventsWithCategories.add(event)
                }

                val widgetConfigs = mutableListOf<WidgetConfig>()
                for (i in 0 until configs.size()) {
                    val configMap = configs.getMap(i)
                    val config = WidgetConfig(
                        id = configMap.getString("id") ?: continue,
                        eventId = configMap.getString("eventId") ?: continue,
                        size = configMap.getString("size") ?: "medium",
                        theme = configMap.getString("theme") ?: "colorful",
                        createdAt = (configMap.getDouble("createdAt") / 1000.0).toLong()
                    )
                    widgetConfigs.add(config)
                }

                WidgetDataManager.saveEvents(reactApplicationContext, eventsWithCategories)
                WidgetDataManager.saveWidgetConfigs(reactApplicationContext, widgetConfigs)
                updateAllWidgets()
                CountdownWallpaperService.updateWallpaper(reactApplicationContext)

                val result = WritableNativeMap()
                result.putBoolean("success", true)
                result.putInt("eventsSynced", eventsWithCategories.size)
                result.putInt("configsSynced", widgetConfigs.size)

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("SYNC_ERROR", "Failed to sync all data", e)
            }
        }
    }

    @ReactMethod
    fun forceUpdateWidgets(promise: Promise) {
        try {
            updateAllWidgets()
            CountdownWallpaperService.updateWallpaper(reactApplicationContext)

            val result = WritableNativeMap()
            result.putBoolean("success", true)
            result.putString("message", "All widgets updated")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", "Failed to update widgets", e)
        }
    }

    @ReactMethod
    fun updateWidgetOfKind(kind: String, promise: Promise) {
        try {
            when (kind) {
                "small" -> CountdownWidgetProvider.updateAllWidgets(reactApplicationContext)
                "medium" -> CountdownMediumWidgetProvider.updateAllWidgets(reactApplicationContext)
                "large" -> CountdownLargeWidgetProvider.updateAllWidgets(reactApplicationContext)
                else -> updateAllWidgets()
            }

            val result = WritableNativeMap()
            result.putBoolean("success", true)
            result.putString("message", "Widget $kind updated")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", "Failed to update widget", e)
        }
    }

    @ReactMethod
    fun getWidgetData(promise: Promise) {
        try {
            val dataStore = WidgetDataManager.loadDataStore(reactApplicationContext)

            val eventsArray = WritableNativeArray()
            dataStore.events.forEach { event ->
                val eventMap = WritableNativeMap()
                eventMap.putString("id", event.id)
                eventMap.putString("name", event.name)
                eventMap.putDouble("targetDate", event.targetDate * 1000.0)
                eventMap.putString("backgroundColor", event.backgroundColor)
                eventMap.putString("categoryColor", event.categoryColor)
                eventMap.putString("categoryName", event.categoryName)
                eventMap.putString("repeatInterval", event.repeatInterval)
                eventMap.putBoolean("isPinned", event.isPinned)
                eventMap.putDouble("lastUpdated", event.lastUpdated * 1000.0)
                eventsArray.pushMap(eventMap)
            }

            val configsArray = WritableNativeArray()
            dataStore.widgetConfigs.forEach { config ->
                val configMap = WritableNativeMap()
                configMap.putString("id", config.id)
                configMap.putString("eventId", config.eventId)
                configMap.putString("size", config.size)
                configMap.putString("theme", config.theme)
                configMap.putDouble("createdAt", config.createdAt * 1000.0)
                configsArray.pushMap(configMap)
            }

            val result = WritableNativeMap()
            result.putArray("events", eventsArray)
            result.putArray("widgetConfigs", configsArray)
            result.putDouble("lastSynced", dataStore.lastSynced * 1000.0)

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GET_ERROR", "Failed to get widget data", e)
        }
    }

    @ReactMethod
    fun clearWidgetData(promise: Promise) {
        try {
            WidgetDataManager.clearData(reactApplicationContext)
            updateAllWidgets()

            val result = WritableNativeMap()
            result.putBoolean("success", true)
            result.putString("message", "Widget data cleared")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", "Failed to clear widget data", e)
        }
    }

    @ReactMethod
    fun setWallpaper(eventId: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                "countdown_widget_prefs",
                android.content.Context.MODE_PRIVATE
            )
            prefs.edit()
                .putString("wallpaper_event_id", eventId)
                .putBoolean("wallpaper_enabled", true)
                .apply()

            CountdownWallpaperService.updateWallpaper(reactApplicationContext)

            val result = WritableNativeMap()
            result.putBoolean("success", true)
            result.putString("message", "Wallpaper event set")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("WALLPAPER_ERROR", "Failed to set wallpaper", e)
        }
    }

    @ReactMethod
    fun startWallpaperService(promise: Promise) {
        try {
            val intent = Intent(android.app.WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
            intent.putExtra(
                android.app.WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                android.content.ComponentName(
                    reactApplicationContext,
                    CountdownWallpaperService::class.java
                )
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

            val currentActivity = currentActivity
            if (currentActivity != null) {
                currentActivity.startActivityForResult(intent, 1001)
            } else {
                reactApplicationContext.startActivity(intent)
            }

            val result = WritableNativeMap()
            result.putBoolean("success", true)
            result.putString("message", "Wallpaper service started")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("WALLPAPER_ERROR", "Failed to start wallpaper service", e)
        }
    }

    @ReactMethod
    fun openWallpaperSettings(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, WallpaperSettingsActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)

            val result = WritableNativeMap()
            result.putBoolean("success", true)
            result.putString("message", "Opened wallpaper settings")
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", "Failed to open wallpaper settings", e)
        }
    }

    @ReactMethod
    fun isWallpaperRunning(promise: Promise) {
        try {
            val isRunning = CountdownWallpaperService.isRunning(reactApplicationContext)
            val result = WritableNativeMap()
            result.putBoolean("isRunning", isRunning)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check wallpaper status", e)
        }
    }

    @ReactMethod
    fun updateWidgets(promise: Promise) {
        forceUpdateWidgets(promise)
    }

    private fun updateAllWidgets() {
        CountdownWidgetProvider.updateAllWidgets(reactApplicationContext)
        CountdownMediumWidgetProvider.updateAllWidgets(reactApplicationContext)
        CountdownLargeWidgetProvider.updateAllWidgets(reactApplicationContext)
        WidgetUpdateService.schedulePeriodicUpdates(reactApplicationContext)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }

    companion object {
        const val NAME = "CountdownWidgetModule"
    }
}
