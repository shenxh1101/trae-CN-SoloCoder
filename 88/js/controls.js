const state = {
    currentGeometry: 'box',
    wireframe: false,
    metalness: 0.5,
    roughness: 0.3,
    scale: 1,
    autoRotate: true,
    animationMode: 'rotate',
    backgroundType: 'solid',
    ambientLightOn: true,
    pointLightOn: true,
    reflectionOn: true,
    multiGeometry: false
};

const listeners = {};

export function on(event, callback) {
    if (!listeners[event]) {
        listeners[event] = [];
    }
    listeners[event].push(callback);
}

function emit(event, data) {
    if (listeners[event]) {
        listeners[event].forEach(cb => cb(data));
    }
}

export function initControls() {
    const geometryType = document.getElementById('geometryType');
    geometryType.addEventListener('change', (e) => {
        state.currentGeometry = e.target.value;
        emit('geometryChange', state.currentGeometry);
    });

    const scaleSlider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    scaleSlider.addEventListener('input', (e) => {
        state.scale = parseFloat(e.target.value);
        scaleValue.textContent = state.scale.toFixed(2);
        emit('scaleChange', state.scale);
    });

    const metalnessSlider = document.getElementById('metalnessSlider');
    const metalnessValue = document.getElementById('metalnessValue');
    metalnessSlider.addEventListener('input', (e) => {
        state.metalness = parseFloat(e.target.value);
        metalnessValue.textContent = state.metalness.toFixed(2);
        emit('metalnessChange', state.metalness);
    });

    const roughnessSlider = document.getElementById('roughnessSlider');
    const roughnessValue = document.getElementById('roughnessValue');
    roughnessSlider.addEventListener('input', (e) => {
        state.roughness = parseFloat(e.target.value);
        roughnessValue.textContent = state.roughness.toFixed(2);
        emit('roughnessChange', state.roughness);
    });

    const wireframeToggle = document.getElementById('wireframeToggle');
    wireframeToggle.addEventListener('change', (e) => {
        state.wireframe = e.target.checked;
        emit('wireframeChange', state.wireframe);
    });

    const animationMode = document.getElementById('animationMode');
    animationMode.addEventListener('change', (e) => {
        state.animationMode = e.target.value;
        emit('animationModeChange', state.animationMode);
    });

    const autoRotateToggle = document.getElementById('autoRotateToggle');
    autoRotateToggle.addEventListener('change', (e) => {
        state.autoRotate = e.target.checked;
        emit('autoRotateChange', state.autoRotate);
    });

    const ambientLightToggle = document.getElementById('ambientLightToggle');
    ambientLightToggle.addEventListener('change', (e) => {
        state.ambientLightOn = e.target.checked;
        emit('ambientLightChange', state.ambientLightOn);
    });

    const pointLightToggle = document.getElementById('pointLightToggle');
    pointLightToggle.addEventListener('change', (e) => {
        state.pointLightOn = e.target.checked;
        emit('pointLightChange', state.pointLightOn);
    });

    const backgroundType = document.getElementById('backgroundType');
    backgroundType.addEventListener('change', (e) => {
        state.backgroundType = e.target.value;
        emit('backgroundChange', state.backgroundType);
    });

    const reflectionToggle = document.getElementById('reflectionToggle');
    reflectionToggle.addEventListener('change', (e) => {
        state.reflectionOn = e.target.checked;
        emit('reflectionChange', state.reflectionOn);
    });

    const multiGeometryToggle = document.getElementById('multiGeometryToggle');
    multiGeometryToggle.addEventListener('change', (e) => {
        state.multiGeometry = e.target.checked;
        emit('multiGeometryChange', state.multiGeometry);
    });

    const screenshotBtn = document.getElementById('screenshotBtn');
    screenshotBtn.addEventListener('click', () => {
        emit('screenshot');
    });

    const exportObjBtn = document.getElementById('exportObjBtn');
    exportObjBtn.addEventListener('click', () => {
        emit('exportObj');
    });

    document.querySelectorAll('.group-header').forEach(header => {
        header.addEventListener('click', () => {
            const group = header.closest('.control-group');
            group.classList.toggle('collapsed');
        });
    });

    const collapseBtn = document.getElementById('collapseBtn');
    const controlPanel = document.getElementById('controlPanel');
    collapseBtn.addEventListener('click', () => {
        controlPanel.classList.toggle('collapsed');
    });

    document.querySelector('.control-group:first-of-type')?.classList.remove('collapsed');

    return state;
}

export function getState() {
    return state;
}

export function updateStats(vertices, faces, geometryName) {
    document.getElementById('vertexCount').textContent = vertices.toLocaleString();
    document.getElementById('faceCount').textContent = faces.toLocaleString();
    document.getElementById('geometryName').textContent = geometryName;
}