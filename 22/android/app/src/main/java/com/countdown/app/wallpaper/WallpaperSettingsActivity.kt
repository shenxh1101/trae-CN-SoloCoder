package com.countdown.app.wallpaper

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.countdown.app.R
import com.countdown.app.widget.WidgetDataManager

class WallpaperSettingsActivity : AppCompatActivity() {

    private val PERMISSION_REQUEST_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_wallpaper_settings)

        val eventSpinner = findViewById<Spinner>(R.id.eventSpinner)
        val themeSpinner = findViewById<Spinner>(R.id.themeSpinner)
        val setWallpaperButton = findViewById<Button>(R.id.setWallpaperButton)
        val previewButton = findViewById<Button>(R.id.previewButton)
        val statusTextView = findViewById<TextView>(R.id.statusTextView)

        val events = WidgetDataManager.getAllEvents(this)
        val eventNames = mutableListOf("最近的事件")
        eventNames.addAll(events.map { it.name })

        val eventAdapter = android.widget.ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            eventNames
        )
        eventAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        eventSpinner.adapter = eventAdapter

        val themes = listOf("深色", "彩色", "简约", "浅色")
        val themeAdapter = android.widget.ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            themes
        )
        themeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        themeSpinner.adapter = themeAdapter

        val prefs = getSharedPreferences("countdown_widget_prefs", MODE_PRIVATE)
        val savedEventId = prefs.getString("wallpaper_event_id", null)
        val savedTheme = prefs.getString("wallpaper_theme", "colorful")

        if (savedEventId != null) {
            val eventIndex = events.indexOfFirst { it.id == savedEventId }
            if (eventIndex >= 0) {
                eventSpinner.setSelection(eventIndex + 1)
            }
        }

        themeSpinner.setSelection(
            when (savedTheme) {
                "dark" -> 0
                "colorful" -> 1
                "minimal" -> 2
                "light" -> 3
                else -> 1
            }
        )

        updateStatus(statusTextView)

        previewButton.setOnClickListener {
            val selectedTheme = when (themeSpinner.selectedItemPosition) {
                0 -> "dark"
                1 -> "colorful"
                2 -> "minimal"
                3 -> "light"
                else -> "colorful"
            }

            prefs.edit()
                .putString("wallpaper_theme", selectedTheme)
                .apply()

            val intent = Intent(android.app.WallpaperManager.ACTION_SET_WALLPAPER)
            startActivity(intent)
        }

        setWallpaperButton.setOnClickListener {
            if (!checkPermissions()) {
                requestPermissions()
                return@setOnClickListener
            }

            val selectedEventPosition = eventSpinner.selectedItemPosition
            val selectedTheme = when (themeSpinner.selectedItemPosition) {
                0 -> "dark"
                1 -> "colorful"
                2 -> "minimal"
                3 -> "light"
                else -> "colorful"
            }

            val eventId = if (selectedEventPosition == 0) {
                null
            } else {
                events[selectedEventPosition - 1].id
            }

            prefs.edit()
                .putString("wallpaper_event_id", eventId)
                .putString("wallpaper_theme", selectedTheme)
                .putBoolean("wallpaper_enabled", true)
                .apply()

            val intent = Intent(android.app.WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
            intent.putExtra(
                android.app.WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                android.content.ComponentName(this, CountdownWallpaperService::class.java)
            )
            startActivityForResult(intent, PERMISSION_REQUEST_CODE)
        }

        findViewById<Button>(R.id.disableButton).setOnClickListener {
            try {
                val wallpaperManager = getSystemService(WALLPAPER_SERVICE) as android.app.WallpaperManager
                wallpaperManager.clear()

                prefs.edit()
                    .putBoolean("wallpaper_enabled", false)
                    .apply()

                updateStatus(statusTextView)
                Toast.makeText(this, "动态壁纸已关闭", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "关闭失败: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateStatus(textView: TextView) {
        val isRunning = CountdownWallpaperService.isRunning(this)
        if (isRunning) {
            textView.text = "状态: 动态壁纸运行中 ✓"
            textView.setTextColor(android.graphics.Color.parseColor("#10B981"))
        } else {
            textView.text = "状态: 未启用"
            textView.setTextColor(android.graphics.Color.parseColor("#6B7280"))
        }
    }

    private fun checkPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun requestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                PERMISSION_REQUEST_CODE
            )
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                Toast.makeText(this, "动态壁纸设置成功", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "取消设置", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "权限已授予", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "需要通知权限", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
