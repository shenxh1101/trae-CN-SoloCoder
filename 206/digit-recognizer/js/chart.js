window.ConfidenceChart = (function() {
    let container = null
    let bars = []

    function init(containerId) {
        container = document.getElementById(containerId)
        container.innerHTML = ''
        bars = []
        for (let i = 0; i < 10; i++) {
            const row = document.createElement('div')
            row.className = 'chart-row'

            const label = document.createElement('span')
            label.className = 'chart-label'
            label.textContent = i

            const barWrap = document.createElement('div')
            barWrap.className = 'chart-bar-wrap'

            const bar = document.createElement('div')
            bar.className = 'chart-bar'
            bar.style.width = '0%'

            const value = document.createElement('span')
            value.className = 'chart-value'
            value.textContent = '0.0%'

            barWrap.appendChild(bar)
            row.appendChild(label)
            row.appendChild(barWrap)
            row.appendChild(value)
            container.appendChild(row)
            bars.push({ bar, value, row })
        }
    }

    function update(probabilities) {
        if (!bars.length) return
        const maxIdx = probabilities.indexOf(Math.max(...probabilities))
        for (let i = 0; i < 10; i++) {
            const pct = (probabilities[i] * 100)
            bars[i].bar.style.width = pct + '%'
            bars[i].value.textContent = pct.toFixed(1) + '%'
            if (i === maxIdx) {
                bars[i].row.classList.add('chart-row-top')
                bars[i].bar.classList.add('chart-bar-top')
            } else {
                bars[i].row.classList.remove('chart-row-top')
                bars[i].bar.classList.remove('chart-bar-top')
            }
        }
    }

    function clear() {
        bars.forEach(function(b) {
            b.bar.style.width = '0%'
            b.value.textContent = '0.0%'
            b.row.classList.remove('chart-row-top')
            b.bar.classList.remove('chart-bar-top')
        })
    }

    return { init, update, clear }
})()
