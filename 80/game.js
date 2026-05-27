import * as THREE from 'three';

let scene, camera, renderer;
let torusGroup, stars = null, flowLights = [];
let objects = [];
let config = {
    radius: 5,
    count: 200,
    speed: 0.005,
    shape: 'cube',
    material: 'standard',
    stars: true,
    flow: false,
    autorotate: false
};

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngle = { theta: 0, phi: Math.PI / 4 };
let cameraDistance = 15;

function init() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();
    
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0xffffff, 1, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x667eea, 0.8, 100);
    pointLight2.position.set(-10, 5, -10);
    scene.add(pointLight2);
    
    torusGroup = new THREE.Group();
    scene.add(torusGroup);
    
    createTorus();
    createStars();
    setupControls();
    setupEventListeners();
    updateUI();
    animate();
}

function createTorus() {
    objects.forEach(obj => {
        torusGroup.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
    });
    objects = [];
    
    flowLights.forEach(light => {
        scene.remove(light);
        light.geometry.dispose();
        light.material.dispose();
    });
    flowLights = [];
    
    const { radius, count, shape, material } = config;
    const objectSize = 0.15 + (50 / count) * 0.1;
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const hue = i / count;
        const color = new THREE.Color().setHSL(hue, 1, 0.5);
        
        let geometry;
        switch (shape) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(objectSize, 16, 16);
                break;
            case 'tetrahedron':
                geometry = new THREE.TetrahedronGeometry(objectSize);
                break;
            default:
                geometry = new THREE.BoxGeometry(objectSize, objectSize, objectSize);
        }
        
        const meshMaterial = createMaterial(material, color);
        const mesh = new THREE.Mesh(geometry, meshMaterial);
        mesh.position.set(x, 0, z);
        mesh.userData = { angle, baseY: 0, index: i };
        
        torusGroup.add(mesh);
        objects.push(mesh);
    }
    
    document.getElementById('object-count').textContent = count;
    
    if (config.flow) {
        createFlowLights();
    }
}

function createMaterial(type, color) {
    switch (type) {
        case 'metal':
            return new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.9,
                roughness: 0.1
            });
        case 'emissive':
            return new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.5
            });
        case 'transparent':
            return new THREE.MeshStandardMaterial({
                color: color,
                transparent: true,
                opacity: 0.6,
                roughness: 0.3
            });
        default:
            return new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.5,
                metalness: 0.3
            });
    }
}

function createStars() {
    if (stars) {
        scene.remove(stars);
        stars.geometry.dispose();
        stars.material.dispose();
        stars = null;
    }
    
    if (!config.stars) return;
    
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8
    });
    
    const starsVertices = [];
    for (let i = 0; i < 3000; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function setupControls() {
    renderer.domElement.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || config.autorotate) return;
        if (e.target.closest('.control-panel')) {
            isDragging = false;
            return;
        }
        
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        cameraAngle.theta -= deltaX * 0.005;
        cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngle.phi + deltaY * 0.005));
        
        updateCameraPosition();
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraDistance = Math.max(5, Math.min(50, cameraDistance + e.deltaY * 0.02));
        updateCameraPosition();
    }, { passive: false });
    
    let touchStartDistance = 0;
    
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            touchStartDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging && !config.autorotate) {
            const deltaX = e.touches[0].clientX - previousMousePosition.x;
            const deltaY = e.touches[0].clientY - previousMousePosition.y;
            
            cameraAngle.theta -= deltaX * 0.005;
            cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngle.phi + deltaY * 0.005));
            
            updateCameraPosition();
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = touchStartDistance - currentDistance;
            cameraDistance = Math.max(5, Math.min(50, cameraDistance + delta * 0.05));
            updateCameraPosition();
            touchStartDistance = currentDistance;
        }
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function updateCameraPosition() {
    camera.position.x = cameraDistance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);
    camera.position.y = cameraDistance * Math.cos(cameraAngle.phi);
    camera.position.z = cameraDistance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
    camera.lookAt(0, 0, 0);
}

function setupEventListeners() {
    document.getElementById('radius-slider').addEventListener('input', (e) => {
        config.radius = parseFloat(e.target.value);
        document.getElementById('radius-value').textContent = config.radius.toFixed(1);
        createTorus();
    });
    
    document.getElementById('count-slider').addEventListener('input', (e) => {
        config.count = parseInt(e.target.value);
        document.getElementById('count-value').textContent = config.count;
        createTorus();
    });
    
    document.getElementById('speed-slider').addEventListener('input', (e) => {
        config.speed = parseFloat(e.target.value);
        document.getElementById('speed-value').textContent = config.speed.toFixed(3);
    });
    
    document.getElementById('shape-select').addEventListener('change', (e) => {
        config.shape = e.target.value;
        createTorus();
    });
    
    document.getElementById('material-select').addEventListener('change', (e) => {
        config.material = e.target.value;
        createTorus();
    });
    
    document.getElementById('stars-toggle').addEventListener('change', (e) => {
        config.stars = e.target.checked;
        createStars();
    });
    
    document.getElementById('flow-toggle').addEventListener('change', (e) => {
        config.flow = e.target.checked;
        if (config.flow) {
            createFlowLights();
        } else {
            flowLights.forEach(light => {
                scene.remove(light);
                light.geometry.dispose();
                light.material.dispose();
            });
            flowLights = [];
        }
    });
    
    document.getElementById('autorotate-toggle').addEventListener('change', (e) => {
        config.autorotate = e.target.checked;
    });
    
    document.getElementById('screenshot-btn').addEventListener('click', takeScreenshot);
    document.getElementById('export-btn').addEventListener('click', exportConfig);
    document.getElementById('import-input').addEventListener('change', importConfig);
    
    window.addEventListener('resize', onWindowResize);
}

function createFlowLights() {
    flowLights.forEach(light => {
        scene.remove(light);
        light.geometry.dispose();
        light.material.dispose();
    });
    flowLights = [];
    
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    
    for (let i = 0; i < 6; i++) {
        const lightGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: colors[i],
            transparent: true,
            opacity: 0.9
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.userData = { offset: (i / 6) * Math.PI * 2, color: colors[i] };
        scene.add(light);
        flowLights.push(light);
    }
}

function takeScreenshot() {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `torus-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

function exportConfig() {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `torus-config-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedConfig = JSON.parse(event.target.result);
            Object.assign(config, importedConfig);
            applyConfig();
        } catch (err) {
            alert('配置文件格式错误');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function applyConfig() {
    document.getElementById('radius-slider').value = config.radius;
    document.getElementById('radius-value').textContent = config.radius.toFixed(1);
    
    document.getElementById('count-slider').value = config.count;
    document.getElementById('count-value').textContent = config.count;
    
    document.getElementById('speed-slider').value = config.speed;
    document.getElementById('speed-value').textContent = config.speed.toFixed(3);
    
    document.getElementById('shape-select').value = config.shape;
    document.getElementById('material-select').value = config.material;
    document.getElementById('stars-toggle').checked = config.stars;
    document.getElementById('flow-toggle').checked = config.flow;
    document.getElementById('autorotate-toggle').checked = config.autorotate;
    
    createTorus();
    createStars();
}

function updateUI() {
    document.getElementById('object-count').textContent = config.count;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    torusGroup.rotation.y += config.speed;
    
    objects.forEach((obj, i) => {
        const time = Date.now() * 0.001;
        obj.rotation.x += 0.01;
        obj.rotation.y += 0.015;
        obj.position.y = Math.sin(time * 2 + i * 0.1) * 0.2;
    });
    
    if (config.flow && flowLights.length > 0) {
        const time = Date.now() * 0.001;
        flowLights.forEach((light, i) => {
            const angle = time * 1.5 + light.userData.offset;
            const x = Math.cos(angle) * config.radius;
            const z = Math.sin(angle) * config.radius;
            light.position.set(x, Math.sin(time * 3 + i) * 0.5, z);
            
            const scale = 1 + Math.sin(time * 5 + i) * 0.3;
            light.scale.set(scale, scale, scale);
        });
    }
    
    if (config.autorotate) {
        cameraAngle.theta += 0.002;
        updateCameraPosition();
    }
    
    renderer.render(scene, camera);
}

init();
