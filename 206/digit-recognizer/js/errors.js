window.ErrorManager = (function() {
    let cases = []
    let listEl = null

    function init(listId) {
        listEl = document.getElementById(listId)
    }

    function addCase(errorCase) {
        const caseObj = {
            id: 'case_' + Date.now(),
            predicted: errorCase.predicted,
            actual: errorCase.actual,
            probabilities: errorCase.probabilities,
            model: errorCase.model,
            image: errorCase.image,
            timestamp: new Date().toISOString()
        }
        cases.push(caseObj)
        renderCase(caseObj)
        return caseObj
    }

    function renderCase(caseObj) {
        if (!listEl) return
        const item = document.createElement('div')
        item.className = 'error-item'

        const thumbCanvas = document.createElement('canvas')
        thumbCanvas.width = 28
        thumbCanvas.height = 28
        thumbCanvas.className = 'error-thumb'
        const ctx = thumbCanvas.getContext('2d')
        const imgData = ctx.createImageData(28, 28)
        for (let i = 0; i < caseObj.image.length; i++) {
            const v = Math.round(caseObj.image[i] * 255)
            imgData.data[i * 4] = v
            imgData.data[i * 4 + 1] = v
            imgData.data[i * 4 + 2] = v
            imgData.data[i * 4 + 3] = 255
        }
        ctx.putImageData(imgData, 0, 0)

        const info = document.createElement('div')
        info.className = 'error-info'
        info.innerHTML = '<span class="error-predicted">预测: ' + caseObj.predicted + '</span><span class="error-actual">实际: ' + caseObj.actual + '</span>'

        item.appendChild(thumbCanvas)
        item.appendChild(info)
        listEl.prepend(item)
    }

    function getCases() {
        return cases
    }

    function exportCases() {
        const blob = new Blob([JSON.stringify(cases, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'error_cases_' + new Date().toISOString().slice(0, 10) + '.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    function clearCases() {
        cases = []
        if (listEl) listEl.innerHTML = ''
    }

    return { init, addCase, getCases, exportCases, clearCases }
})()
