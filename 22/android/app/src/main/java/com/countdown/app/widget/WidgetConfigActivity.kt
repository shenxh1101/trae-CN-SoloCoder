package com.countdown.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.countdown.app.R

class WidgetConfigActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_widget_config)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        val resultValue = Intent()
        resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(Activity.RESULT_CANCELED, resultValue)

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        val eventSpinner = findViewById<Spinner>(R.id.eventSpinner)
        val themeSpinner = findViewById<Spinner>(R.id.themeSpinner)
        val confirmButton = findViewById<Button>(R.id.confirmButton)
        val cancelButton = findViewById<Button>(R.id.cancelButton)

        val events = WidgetDataManager.getAllEvents(this)
        if (events.isEmpty()) {
            Toast.makeText(this, "请先在应用中添加倒计时事件", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        val eventNames = events.map { it.name }
        val eventAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, eventNames)
        eventAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        eventSpinner.adapter = eventAdapter

        val themes = listOf("浅色", "深色", "彩色", "简约")
        val themeAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, themes)
        themeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        themeSpinner.adapter = themeAdapter

        confirmButton.setOnClickListener {
            val selectedPosition = eventSpinner.selectedItemPosition
            if (selectedPosition >= 0 && selectedPosition < events.size) {
                val selectedEvent = events[selectedPosition]
                val selectedTheme = when (themeSpinner.selectedItemPosition) {
                    0 -> "light"
                    1 -> "dark"
                    2 -> "colorful"
                    3 -> "minimal"
                    else -> "colorful"
                }

                WidgetDataManager.saveWidgetEventMapping(this, appWidgetId, selectedEvent.id)

                val config = WidgetConfig(
                    id = appWidgetId.toString(),
                    eventId = selectedEvent.id,
                    size = getWidgetSize(),
                    theme = selectedTheme
                )

                val currentConfigs = WidgetDataManager.loadDataStore(this).widgetConfigs.toMutableList()
                currentConfigs.removeAll { it.id == appWidgetId.toString() }
                currentConfigs.add(config)
                WidgetDataManager.saveWidgetConfigs(this, currentConfigs)

                updateWidget()

                val resultValue = Intent()
                resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                setResult(Activity.RESULT_OK, resultValue)
                finish()
            }
        }

        cancelButton.setOnClickListener {
            finish()
        }
    }

    private fun getWidgetSize(): String {
        val info = AppWidgetManager.getInstance(this).getAppWidgetInfo(appWidgetId)
        val minWidth = info.minWidth
        val minHeight = info.minHeight

        return when {
            minWidth <= 150 && minHeight <= 150 -> "small"
            minWidth <= 300 && minHeight <= 200 -> "medium"
            else -> "large"
        }
    }

    private fun updateWidget() {
        val size = getWidgetSize()
        when (size) {
            "small" -> CountdownWidgetProvider.updateAllWidgets(this)
            "medium" -> CountdownMediumWidgetProvider.updateAllWidgets(this)
            "large" -> CountdownLargeWidgetProvider.updateAllWidgets(this)
        }
    }
}
