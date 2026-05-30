window.CanvasDrawer = (function() {
    let canvas, ctx
    let isDrawing = false
    let lastX = 0, lastY = 0
    let brushSize = 16
    let onDrawCallback = null

    function init(canvasId) {
        canvas = document.getElementById(canvasId)
        ctx = canvas.getContext('2d')
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = brushSize

        canvas.addEventListener('mousedown', startDraw)
        canvas.addEventListener('mousemove', draw)
        canvas.addEventListener('mouseup', endDraw)
        canvas.addEventListener('mouseout', endDraw)

        canvas.addEventListener('touchstart', handleTouch)
        canvas.addEventListener('touchmove', handleTouch)
        canvas.addEventListener('touchend', endDraw)
    }

    function startDraw(e) {
        isDrawing = true
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        lastX = (e.clientX - rect.left) * scaleX
        lastY = (e.clientY - rect.top) * scaleY
    }

    function draw(e) {
        if (!isDrawing) return
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        ctx.beginPath()
        ctx.moveTo(lastX, lastY)
        ctx.lineTo(x, y)
        ctx.stroke()

        lastX = x
        lastY = y

        if (onDrawCallback) onDrawCallback()
    }

    function endDraw() {
        isDrawing = false
    }

    function handleTouch(e) {
        e.preventDefault()
        const touch = e.touches[0]
        const mouseEvent = new MouseEvent(
            e.type === 'touchstart' ? 'mousedown' : 'mousemove',
            { clientX: touch.clientX, clientY: touch.clientY }
        )
        canvas.dispatchEvent(mouseEvent)
    }

    function clear() {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    function setBrushSize(size) {
        brushSize = size
        ctx.lineWidth = size
    }

    function setOnDraw(cb) {
        onDrawCallback = cb
    }

    function getImageData() {
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
    }

    function isEmpty() {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 10 || data[i+1] > 10 || data[i+2] > 10) return false
        }
        return true
    }

    function drawDigit(digit) {
        clear()
        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 200px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const offsetX = (Math.random() - 0.5) * 20
        const offsetY = (Math.random() - 0.5) * 20
        const rotation = (Math.random() - 0.5) * 0.15
        ctx.translate(canvas.width/2 + offsetX, canvas.height/2 + offsetY)
        ctx.rotate(rotation)
        ctx.fillText(digit.toString(), 0, 0)
        ctx.restore()
        if (onDrawCallback) onDrawCallback()
    }

    function getCanvas() {
        return canvas
    }

    return {
        init, clear, setBrushSize, setOnDraw, getImageData, isEmpty,
        drawDigit, getCanvas
    }
})()
