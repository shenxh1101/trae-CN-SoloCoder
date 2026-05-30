window.Preprocessor = (function() {
    function grayscale(imageData) {
        const data = imageData.data
        const gray = new Float32Array(imageData.width * imageData.height)
        for (let i = 0; i < gray.length; i++) {
            const idx = i * 4
            gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
        }
        return gray
    }

    function resize(grayData, srcWidth, srcHeight, dstWidth, dstHeight) {
        const result = new Float32Array(dstWidth * dstHeight)
        const scaleX = srcWidth / dstWidth
        const scaleY = srcHeight / dstHeight
        for (let y = 0; y < dstHeight; y++) {
            for (let x = 0; x < dstWidth; x++) {
                const srcX = x * scaleX
                const srcY = y * scaleY
                const x0 = Math.floor(srcX)
                const y0 = Math.floor(srcY)
                const x1 = Math.min(x0 + 1, srcWidth - 1)
                const y1 = Math.min(y0 + 1, srcHeight - 1)
                const fx = srcX - x0
                const fy = srcY - y0
                const v00 = grayData[y0 * srcWidth + x0]
                const v10 = grayData[y0 * srcWidth + x1]
                const v01 = grayData[y1 * srcWidth + x0]
                const v11 = grayData[y1 * srcWidth + x1]
                result[y * dstWidth + x] = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy
            }
        }
        return result
    }

    function binarize(grayData, threshold) {
        threshold = threshold || 128
        const result = new Float32Array(grayData.length)
        for (let i = 0; i < grayData.length; i++) {
            result[i] = grayData[i] > threshold ? 255 : 0
        }
        return result
    }

    function normalize(grayData) {
        const result = new Float32Array(grayData.length)
        for (let i = 0; i < grayData.length; i++) {
            result[i] = grayData[i] / 255.0
        }
        return result
    }

    function process(imageData, options) {
        options = options || {}
        let gray = grayscale(imageData)

        gray = resize(gray, imageData.width, imageData.height, 28, 28)

        if (options.binarize) {
            gray = binarize(gray, options.threshold || 128)
        }

        gray = normalize(gray)

        return Array.from(gray)
    }

    function getPreviewCanvas(imageData, options) {
        const processed = process(imageData, options)
        const previewCanvas = document.createElement('canvas')
        previewCanvas.width = 28
        previewCanvas.height = 28
        const ctx = previewCanvas.getContext('2d')
        const imgData = ctx.createImageData(28, 28)
        for (let i = 0; i < processed.length; i++) {
            const v = Math.round(processed[i] * 255)
            imgData.data[i * 4] = v
            imgData.data[i * 4 + 1] = v
            imgData.data[i * 4 + 2] = v
            imgData.data[i * 4 + 3] = 255
        }
        ctx.putImageData(imgData, 0, 0)
        return previewCanvas
    }

    return { process, grayscale, resize, binarize, normalize, getPreviewCanvas }
})()
