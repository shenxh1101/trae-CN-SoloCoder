window.OfflineEngine = (function() {
    let model = null
    let loaded = false
    let loading = false

    async function load(modelPath) {
        if (loaded || loading) return
        loading = true
        try {
            if (typeof tf === 'undefined') {
                throw new Error('TensorFlow.js 未加载')
            }
            model = await tf.loadLayersModel(modelPath || '/tfjs_model/model.json')
            loaded = true
            loading = false
        } catch (e) {
            loading = false
            throw e
        }
    }

    async function predict(imageData) {
        if (!loaded || !model) {
            throw new Error('离线模型未加载')
        }
        const tensor = tf.tensor2d(imageData, [1, 784])
        const reshaped = tensor.reshape([1, 28, 28, 1])
        const output = model.predict(reshaped)
        const probabilities = await output.data()
        const probsArray = Array.from(probabilities)
        const maxIdx = probsArray.indexOf(Math.max(...probsArray))
        tensor.dispose()
        reshaped.dispose()
        output.dispose()
        return {
            digit: maxIdx,
            confidence: probsArray[maxIdx],
            probabilities: probsArray,
            model: 'tfjs_offline',
            processing_time_ms: 0
        }
    }

    function isLoaded() {
        return loaded
    }

    function isLoading() {
        return loading
    }

    function unload() {
        if (model) {
            model.dispose()
            model = null
        }
        loaded = false
    }

    return { load, predict, isLoaded, isLoading, unload }
})()
