window.API = (function() {
    const BASE_URL = '/api'

    async function predict(imageData, modelName) {
        const body = { image: imageData }
        if (modelName) body.model = modelName
        const response = await fetch(BASE_URL + '/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            throw new Error(err.error || '识别请求失败')
        }
        return response.json()
    }

    async function getModels() {
        const response = await fetch(BASE_URL + '/models')
        if (!response.ok) throw new Error('获取模型列表失败')
        return response.json()
    }

    async function switchModel(modelName) {
        const response = await fetch(BASE_URL + '/models/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_name: modelName })
        })
        if (!response.ok) throw new Error('切换模型失败')
        return response.json()
    }

    async function uploadModel(file) {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch(BASE_URL + '/models/upload', {
            method: 'POST',
            body: formData
        })
        if (!response.ok) throw new Error('上传模型失败')
        return response.json()
    }

    async function saveErrorCase(errorCase) {
        const response = await fetch(BASE_URL + '/error-cases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorCase)
        })
        if (!response.ok) throw new Error('保存错误案例失败')
        return response.json()
    }

    async function getErrorCases() {
        const response = await fetch(BASE_URL + '/error-cases')
        if (!response.ok) throw new Error('获取错误案例失败')
        return response.json()
    }

    return { predict, getModels, switchModel, uploadModel, saveErrorCase, getErrorCases }
})()
