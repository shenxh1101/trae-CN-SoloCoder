(function() {
    let isOnline = true
    let isContinuous = false
    let isRecognizing = false
    let lastResult = null
    let throttleTimer = null

    const $ = (id) => document.getElementById(id)

    function showToast(msg) {
        const toast = document.createElement('div')
        toast.textContent = msg
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#22d3ee',
            padding: '10px 24px',
            borderRadius: '8px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            fontWeight: '700',
            zIndex: '9999',
            border: '1px solid #22d3ee66',
            boxShadow: '0 0 20px #22d3ee44, 0 0 40px #22d3ee22',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        })
        document.body.appendChild(toast)
        requestAnimationFrame(() => { toast.style.opacity = '1' })
        setTimeout(() => {
            toast.style.opacity = '0'
            setTimeout(() => toast.remove(), 300)
        }, 2000)
    }

    function createSettingsButton() {
        const btn = document.createElement('button')
        btn.textContent = '⚙'
        Object.assign(btn.style, {
            background: 'none',
            border: '1px solid #22d3ee33',
            color: '#94a3b8',
            fontSize: '18px',
            cursor: 'pointer',
            marginLeft: '8px',
            padding: '4px 10px',
            borderRadius: '6px',
            transition: 'all 0.2s'
        })
        btn.addEventListener('mouseenter', () => {
            btn.style.color = '#22d3ee'
            btn.style.borderColor = '#22d3ee'
            btn.style.boxShadow = '0 0 12px #22d3ee44'
        })
        btn.addEventListener('mouseleave', () => {
            btn.style.color = '#94a3b8'
            btn.style.borderColor = '#22d3ee33'
            btn.style.boxShadow = 'none'
        })
        btn.addEventListener('click', () => {
            $('settingsPanel').classList.add('open')
        })
        document.querySelector('.mode-toggle').appendChild(btn)
    }

    function init() {
        CanvasDrawer.init('drawCanvas')
        ConfidenceChart.init('chartContainer')
        ErrorManager.init('errorList')
        createSettingsButton()

        CanvasDrawer.setOnDraw(() => {
            if (isContinuous) throttledRecognize()
        })

        bindAllEvents()
        loadModelsList()
    }

    function bindAllEvents() {
        $('btnClear').addEventListener('click', () => {
            CanvasDrawer.clear()
            $('resultDigit').textContent = '?'
            $('resultConfidence').textContent = '0%'
            $('processingTime').textContent = '0ms'
            ConfidenceChart.clear()
            lastResult = null
        })

        $('btnRecognize').addEventListener('click', recognize)

        $('btnRandom').addEventListener('click', () => {
            const digit = Math.floor(Math.random() * 10)
            CanvasDrawer.drawDigit(digit)
            setTimeout(recognize, 300)
        })

        $('toggleContinuous').addEventListener('change', (e) => {
            isContinuous = e.target.checked
        })

        $('toggleBinarize').addEventListener('change', () => {})

        $('brushSize').addEventListener('input', (e) => {
            CanvasDrawer.setBrushSize(Number(e.target.value))
        })

        $('btnSaveError').addEventListener('click', () => {
            if (!lastResult) {
                showToast('暂无识别结果可保存')
                return
            }
            const actual = $('actualDigit').value
            if (actual === '') {
                showToast('请选择实际数字')
                return
            }
            const errorCase = {
                predicted: lastResult.digit,
                actual: Number(actual),
                probabilities: lastResult.probabilities,
                model: lastResult.model || 'unknown',
                image: Preprocessor.process(CanvasDrawer.getImageData(), { binarize: $('toggleBinarize').checked })
            }
            ErrorManager.addCase(errorCase)
            API.saveErrorCase(errorCase)
            showToast('错误案例已保存')
        })

        $('btnModeOnline').addEventListener('click', () => {
            isOnline = true
            $('btnModeOnline').classList.add('active')
            $('btnModeOffline').classList.remove('active')
        })

        $('btnModeOffline').addEventListener('click', () => {
            isOnline = false
            $('btnModeOffline').classList.add('active')
            $('btnModeOnline').classList.remove('active')
            if (!OfflineEngine.isLoaded() && !OfflineEngine.isLoading()) {
                OfflineEngine.load().catch((e) => showToast('离线模型加载失败: ' + e.message))
            }
        })

        $('btnCloseSettings').addEventListener('click', () => {
            $('settingsPanel').classList.remove('open')
        })

        $('modelSelect').addEventListener('change', (e) => {
            API.switchModel(e.target.value)
                .then(() => {
                    $('modelInfo').textContent = e.target.value
                    showToast('模型已切换')
                })
                .catch((err) => showToast('切换失败: ' + err.message))
        })

        $('btnUpload').addEventListener('click', () => {
            const file = $('modelUpload').files[0]
            if (!file) {
                showToast('请选择模型文件')
                return
            }
            API.uploadModel(file)
                .then(() => {
                    showToast('模型上传成功')
                    loadModelsList()
                })
                .catch((err) => showToast('上传失败: ' + err.message))
        })

        $('btnToggleErrors').addEventListener('click', () => {
            $('errorPanel').classList.toggle('open')
        })

        $('btnExportErrors').addEventListener('click', () => {
            ErrorManager.exportCases()
        })
    }

    async function recognize() {
        if (isRecognizing) return
        if (CanvasDrawer.isEmpty()) {
            showToast('请先在画板上书写数字')
            return
        }
        isRecognizing = true

        const canvasWrapper = document.querySelector('.canvas-wrapper')
        canvasWrapper.classList.add('scan-active')

        try {
            const processedData = Preprocessor.process(
                CanvasDrawer.getImageData(),
                { binarize: $('toggleBinarize').checked }
            )

            let result
            const startTime = performance.now()

            if (isOnline) {
                result = await API.predict(processedData, $('modelSelect').value)
            } else {
                if (!OfflineEngine.isLoaded()) {
                    await OfflineEngine.load()
                }
                result = await OfflineEngine.predict(processedData)
            }

            const elapsed = Math.round(performance.now() - startTime)

            $('resultDigit').textContent = result.digit
            $('resultDigit').style.animation = 'none'
            $('resultDigit').offsetHeight
            $('resultDigit').style.animation = ''
            $('resultConfidence').textContent = (result.confidence * 100).toFixed(1) + '%'
            $('processingTime').textContent = elapsed + 'ms'
            ConfidenceChart.update(result.probabilities)

            lastResult = result
        } catch (err) {
            showToast('识别失败: ' + err.message)
        } finally {
            isRecognizing = false
            canvasWrapper.classList.remove('scan-active')
        }
    }

    function throttledRecognize() {
        if (throttleTimer) return
        throttleTimer = setTimeout(() => {
            throttleTimer = null
            recognize()
        }, 300)
    }

    async function loadModelsList() {
        try {
            const data = await API.getModels()
            const select = $('modelSelect')
            select.innerHTML = ''
            const models = data.available || data.models || []
            models.forEach((m) => {
                const name = typeof m === 'string' ? m : m.name
                const opt = document.createElement('option')
                opt.value = name
                opt.textContent = name
                if (data.active && name === data.active) opt.selected = true
                select.appendChild(opt)
            })
            if (data.active) {
                $('modelInfo').textContent = data.active
            } else if (models.length > 0) {
                const firstName = typeof models[0] === 'string' ? models[0] : models[0].name
                $('modelInfo').textContent = firstName
            }
        } catch {
            $('modelInfo').textContent = '无法加载模型列表'
        }
    }

    document.addEventListener('DOMContentLoaded', init)
})()
