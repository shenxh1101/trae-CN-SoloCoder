package com.countdown.app.wallpaper

import android.content.SharedPreferences
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import com.countdown.app.widget.WidgetDataManager
import com.countdown.app.widget.WidgetEvent
import com.countdown.app.widget.TimeRemaining
import java.text.SimpleDateFormat
import java.util.*

class CountdownWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine {
        return CountdownWallpaperEngine()
    }

    inner class CountdownWallpaperEngine : Engine(),
        SharedPreferences.OnSharedPreferenceChangeListener {

        private val handler = Handler(Looper.getMainLooper())
        private val drawRunner = Runnable { drawFrame() }
        private var isVisible = false
        private var currentEvent: WidgetEvent? = null
        private var eventId: String? = null
        private var theme: String = "colorful"

        private val backgroundColorPaint = Paint()
        private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val secondaryPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val timeUnitPaint = Paint(Paint.ANTI_ALIAS_FLAG)

        private var frameCount = 0
        private var lastTimeRemaining: TimeRemaining? = null
        private var isAnimating = false
        private var animationStartTime = 0L
        private val animationDuration = 300L

        private val dateFormat = SimpleDateFormat("yyyy年MM月dd日 EEEE", Locale.CHINA)

        override fun onCreate(surfaceHolder: SurfaceHolder) {
            super.onCreate(surfaceHolder)

            val prefs = getSharedPreferences("countdown_widget_prefs", MODE_PRIVATE)
            prefs.registerOnSharedPreferenceChangeListener(this)

            eventId = prefs.getString("wallpaper_event_id", null)
            theme = prefs.getString("wallpaper_theme", "colorful") ?: "colorful"

            initializePaints()
            loadEvent()
        }

        private fun initializePaints() {
            textPaint.apply {
                color = Color.WHITE
                textSize = 24f
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
                textAlign = Paint.Align.CENTER
            }

            accentPaint.apply {
                color = Color.parseColor("#6366F1")
                textSize = 120f
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
                textAlign = Paint.Align.CENTER
            }

            secondaryPaint.apply {
                color = Color.WHITE
                alpha = 180
                textSize = 18f
                textAlign = Paint.Align.CENTER
            }

            timeUnitPaint.apply {
                color = Color.WHITE
                textSize = 32f
                typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.MEDIUM)
                textAlign = Paint.Align.CENTER
            }
        }

        private fun loadEvent() {
            currentEvent = if (eventId != null) {
                val dataStore = WidgetDataManager.loadDataStore(this@CountdownWallpaperService)
                dataStore.events.firstOrNull { it.id == eventId }
            } else {
                WidgetDataManager.getNearestEvent(this@CountdownWallpaperService)
            }

            currentEvent?.let { event ->
                val accentColor = WidgetDataManager.parseColor(event.backgroundColor)
                accentPaint.color = accentColor
            }
        }

        override fun onVisibilityChanged(visible: Boolean) {
            super.onVisibilityChanged(visible)
            isVisible = visible

            if (visible) {
                loadEvent()
                handler.post(drawRunner)
            } else {
                handler.removeCallbacks(drawRunner)
            }
        }

        override fun onSurfaceChanged(
            holder: SurfaceHolder,
            format: Int,
            width: Int,
            height: Int
        ) {
            super.onSurfaceChanged(holder, format, width, height)
            if (isVisible) {
                handler.post(drawRunner)
            }
        }

        override fun onSurfaceDestroyed(holder: SurfaceHolder) {
            super.onSurfaceDestroyed(holder)
            isVisible = false
            handler.removeCallbacks(drawRunner)
        }

        override fun onDestroy() {
            super.onDestroy()
            val prefs = getSharedPreferences("countdown_widget_prefs", MODE_PRIVATE)
            prefs.unregisterOnSharedPreferenceChangeListener(this)
            handler.removeCallbacks(drawRunner)
        }

        override fun onSharedPreferenceChanged(sharedPreferences: SharedPreferences?, key: String?) {
            when (key) {
                "wallpaper_event_id" -> {
                    eventId = sharedPreferences?.getString(key, null)
                    loadEvent()
                }
                "wallpaper_theme" -> {
                    theme = sharedPreferences?.getString(key, "colorful") ?: "colorful"
                }
                "widget_data_store" -> {
                    loadEvent()
                }
            }
        }

        private fun drawFrame() {
            if (!isVisible || !isPreview) {
                holder?.surface?.let { surface ->
                    if (!surface.isValid) return
                }
            }

            val canvas = holder?.lockCanvas() ?: return

            try {
                drawBackground(canvas)

                if (currentEvent != null) {
                    drawCountdown(canvas)
                } else {
                    drawPlaceholder(canvas)
                }
            } finally {
                try {
                    holder.unlockCanvasAndPost(canvas)
                } catch (e: Exception) {
                }
            }

            frameCount++

            if (isVisible) {
                handler.postDelayed(drawRunner, 1000)
            }
        }

        private fun drawBackground(canvas: Canvas) {
            val width = canvas.width.toFloat()
            val height = canvas.height.toFloat()

            when (theme) {
                "dark" -> {
                    backgroundColorPaint.color = Color.parseColor("#0F172A")
                    canvas.drawRect(0f, 0f, width, height, backgroundColorPaint)

                    drawStars(canvas)
                }
                "colorful" -> {
                    val gradient = android.graphics.LinearGradient(
                        0f, 0f, width, height,
                        intArrayOf(
                            Color.parseColor("#1E1B4B"),
                            Color.parseColor("#312E81"),
                            Color.parseColor("#4338CA")
                        ),
                        null,
                        android.graphics.Shader.TileMode.CLAMP
                    )
                    backgroundColorPaint.shader = gradient
                    canvas.drawRect(0f, 0f, width, height, backgroundColorPaint)
                    backgroundColorPaint.shader = null
                }
                "minimal" -> {
                    backgroundColorPaint.color = Color.BLACK
                    canvas.drawRect(0f, 0f, width, height, backgroundColorPaint)
                }
                else -> {
                    val gradient = android.graphics.LinearGradient(
                        0f, 0f, width, height,
                        intArrayOf(
                            Color.parseColor("#1E293B"),
                            Color.parseColor("#0F172A")
                        ),
                        null,
                        android.graphics.Shader.TileMode.CLAMP
                    )
                    backgroundColorPaint.shader = gradient
                    canvas.drawRect(0f, 0f, width, height, backgroundColorPaint)
                    backgroundColorPaint.shader = null

                    drawStars(canvas)
                }
            }
        }

        private fun drawStars(canvas: Canvas) {
            val random = Random(42)
            val starPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            starPaint.color = Color.WHITE

            val starCount = 100
            for (i in 0 until starCount) {
                val x = random.nextInt(canvas.width).toFloat()
                val y = random.nextInt(canvas.height).toFloat()
                val size = random.nextFloat() * 2f + 0.5f
                val alpha = random.nextInt(150) + 50

                starPaint.alpha = alpha
                canvas.drawCircle(x, y, size, starPaint)
            }
        }

        private fun drawCountdown(canvas: Canvas) {
            val width = canvas.width.toFloat()
            val height = canvas.height.toFloat()
            val centerX = width / 2f
            val centerY = height * 0.4f

            val event = currentEvent ?: return
            val timeRemaining = WidgetDataManager.calculateTimeRemaining(event.targetDate)

            if (lastTimeRemaining != null && lastTimeRemaining!!.seconds != timeRemaining.seconds) {
                isAnimating = true
                animationStartTime = System.currentTimeMillis()
            }
            lastTimeRemaining = timeRemaining

            val animationProgress = if (isAnimating) {
                val elapsed = System.currentTimeMillis() - animationStartTime
                val progress = minOf(1f, elapsed.toFloat() / animationDuration)

                if (progress >= 1f) {
                    isAnimating = false
                }

                progress
            } else {
                1f
            }

            val scale = if (isAnimating) {
                1f + 0.1f * kotlin.math.sin(animationProgress * Math.PI * 2).toFloat()
            } else {
                1f
            }

            canvas.save()
            canvas.scale(scale, scale, centerX, centerY - 50f)

            val statusText = if (timeRemaining.isPast) "已经过去" else "距离目标还有"
            textPaint.textSize = height * 0.025f
            canvas.drawText(statusText, centerX, centerY - height * 0.18f, textPaint)

            accentPaint.textSize = height * 0.18f
            canvas.drawText(
                kotlin.math.abs(timeRemaining.days).toString(),
                centerX,
                centerY - height * 0.02f,
                accentPaint
            )

            secondaryPaint.textSize = height * 0.03f
            canvas.drawText("天", centerX, centerY + height * 0.05f, secondaryPaint)

            canvas.restore()

            val timeY = centerY + height * 0.18f
            val timeSpacing = width * 0.22f

            val hoursX = centerX - timeSpacing
            val minutesX = centerX
            val secondsX = centerX + timeSpacing

            val timeUnitY = timeY + height * 0.02f
            val labelY = timeY + height * 0.065f

            timeUnitPaint.textSize = height * 0.06f
            secondaryPaint.textSize = height * 0.025f

            canvas.drawText(
                String.format("%02d", kotlin.math.abs(timeRemaining.hours)),
                hoursX,
                timeUnitY,
                timeUnitPaint
            )
            canvas.drawText("时", hoursX, labelY, secondaryPaint)

            canvas.drawText(
                String.format("%02d", kotlin.math.abs(timeRemaining.minutes)),
                minutesX,
                timeUnitY,
                timeUnitPaint
            )
            canvas.drawText("分", minutesX, labelY, secondaryPaint)

            canvas.drawText(
                String.format("%02d", kotlin.math.abs(timeRemaining.seconds)),
                secondsX,
                timeUnitY,
                timeUnitPaint
            )
            canvas.drawText("秒", secondsX, labelY, secondaryPaint)

            val nameY = labelY + height * 0.08f
            textPaint.textSize = height * 0.03f
            canvas.drawText(event.name, centerX, nameY, textPaint)

            if (event.repeatInterval != "none") {
                val repeatLabel = WidgetDataManager.getRepeatLabel(event.repeatInterval)
                secondaryPaint.textSize = height * 0.02f
                canvas.drawText(
                    "$repeatLabel · ${event.categoryName}",
                    centerX,
                    nameY + height * 0.04f,
                    secondaryPaint
                )
            } else {
                secondaryPaint.textSize = height * 0.02f
                canvas.drawText(
                    event.categoryName,
                    centerX,
                    nameY + height * 0.04f,
                    secondaryPaint
                )
            }

            val dateY = nameY + height * 0.08f
            secondaryPaint.textSize = height * 0.022f
            val targetDateStr = WidgetDataManager.formatDate(event.targetDate)
            canvas.drawText(targetDateStr, centerX, dateY, secondaryPaint)

            val currentTimeY = height - height * 0.08f
            val currentTime = dateFormat.format(Date())
            secondaryPaint.alpha = 120
            secondaryPaint.textSize = height * 0.02f
            canvas.drawText(currentTime, centerX, currentTimeY, secondaryPaint)
            secondaryPaint.alpha = 180
        }

        private fun drawPlaceholder(canvas: Canvas) {
            val width = canvas.width.toFloat()
            val height = canvas.height.toFloat()
            val centerX = width / 2f
            val centerY = height / 2f

            textPaint.textSize = height * 0.03f
            textPaint.alpha = 150
            canvas.drawText("暂无倒计时事件", centerX, centerY, textPaint)

            secondaryPaint.textSize = height * 0.02f
            secondaryPaint.alpha = 100
            canvas.drawText(
                "在应用中添加事件以显示倒计时",
                centerX,
                centerY + height * 0.05f,
                secondaryPaint
            )

            textPaint.alpha = 255
            secondaryPaint.alpha = 180
        }
    }

    companion object {
        private const val TAG = "CountdownWallpaper"

        fun updateWallpaper(context: Context) {
            val intent = Intent(context, CountdownWallpaperService::class.java)
            intent.action = "com.countdown.app.wallpaper.UPDATE"
            context.startService(intent)
        }

        fun isRunning(context: Context): Boolean {
            val am = context.getSystemService(WALLPAPER_SERVICE) as android.app.WallpaperManager
            val info = am.wallpaperInfo
            return info != null && info.packageName == context.packageName
        }
    }
}
